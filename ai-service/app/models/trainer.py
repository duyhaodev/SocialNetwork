"""
Fine-tuning pipeline for the status suggestion model.
Uses HuggingFace Trainer API with Causal Language Modelling objective.
"""

from __future__ import annotations

import json
import math
import uuid
from pathlib import Path
from typing import Optional

from loguru import logger
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    DataCollatorForLanguageModeling,
    Trainer,
    TrainerCallback,
    TrainerControl,
    TrainerState,
    TrainingArguments,
)

from app.config import settings
from app.data.dataset import (
    StatusDataset,
    get_all_training_texts,
    train_val_split,
)


class MetricsLoggerCallback(TrainerCallback):
    """Ghi train loss + eval loss mỗi epoch vào file JSON để vẽ biểu đồ báo cáo."""

    def __init__(self, output_path: str) -> None:
        self.output_path = Path(output_path)
        self.records: list = []
        self._current: dict = {}

    def on_log(self, args, state: TrainerState, control: TrainerControl, logs=None, **kwargs):
        if logs is None:
            return
        step = state.global_step
        epoch = round(state.epoch or 0, 2)

        if "loss" in logs:
            self._current = {
                "epoch": epoch,
                "step": step,
                "train_loss": round(logs["loss"], 4),
                "train_perplexity": round(math.exp(logs["loss"]), 2),
            }

        if "eval_loss" in logs:
            record = {
                **self._current,
                "eval_loss": round(logs["eval_loss"], 4),
                "eval_perplexity": round(math.exp(logs["eval_loss"]), 2),
            }
            self.records.append(record)
            logger.info(
                f"[Metrics] epoch={epoch} "
                f"train_loss={record.get('train_loss', '?')} "
                f"eval_loss={record['eval_loss']} "
                f"eval_ppl={record['eval_perplexity']}"
            )
            self._save()

    def _save(self) -> None:
        self.output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(self.output_path, "w", encoding="utf-8") as f:
            json.dump(self.records, f, ensure_ascii=False, indent=2)


class StatusModelTrainer:
    """Handles fine-tuning the base model on social media status data."""

    def __init__(self) -> None:
        self.training_id: Optional[str] = None
        self._is_training: bool = False

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def train(
        self,
        data_file: Optional[str] = None,
        epochs: Optional[int] = None,
        batch_size: Optional[int] = None,
        learning_rate: Optional[float] = None,
    ) -> str:
        """
        Fine-tune the model and save to FINE_TUNED_MODEL_DIR.
        Returns a training_id for tracking.
        """
        if self._is_training:
            raise RuntimeError("Training already in progress.")

        self._is_training = True
        self.training_id = str(uuid.uuid4())[:8]
        logger.info(f"[{self.training_id}] Starting fine-tuning …")

        try:
            _epochs = epochs or settings.TRAIN_EPOCHS
            _batch = batch_size or settings.TRAIN_BATCH_SIZE
            _lr = learning_rate or settings.LEARNING_RATE

            # ----- Load tokenizer & model -----
            fine_tuned_dir = Path(settings.FINE_TUNED_MODEL_DIR)
            if fine_tuned_dir.exists() and any(fine_tuned_dir.iterdir()):
                source = str(fine_tuned_dir)
                logger.info(f"[{self.training_id}] Continuing from fine-tuned model")
            else:
                source = settings.BASE_MODEL_NAME
                logger.info(f"[{self.training_id}] Fine-tuning from base model: {source}")

            tokenizer = AutoTokenizer.from_pretrained(source)
            if tokenizer.pad_token is None:
                tokenizer.pad_token = tokenizer.eos_token
            if tokenizer.bos_token is None:
                tokenizer.bos_token = tokenizer.eos_token

            model = AutoModelForCausalLM.from_pretrained(source)

            # ----- Prepare dataset -----
            extra = (
                str(Path(settings.DATA_DIR) / data_file) if data_file else None
            )
            all_texts = get_all_training_texts(settings.DATA_DIR, extra_file=extra)

            if len(all_texts) < 10:
                raise ValueError("Not enough training data (< 10 samples).")

            train_texts, val_texts = train_val_split(all_texts, val_ratio=0.1)
            logger.info(
                f"[{self.training_id}] Train: {len(train_texts)}, Val: {len(val_texts)}"
            )

            train_dataset = StatusDataset(train_texts, tokenizer, settings.MAX_SEQ_LENGTH)
            val_dataset = StatusDataset(val_texts, tokenizer, settings.MAX_SEQ_LENGTH)

            data_collator = DataCollatorForLanguageModeling(
                tokenizer=tokenizer, mlm=False
            )

            # ----- Training arguments -----
            checkpoint_dir = str(Path(settings.MODEL_SAVE_DIR) / f"checkpoint_{self.training_id}")
            metrics_path = str(Path(settings.LOGS_DIR) / f"metrics_{self.training_id}.json")

            args = TrainingArguments(
                output_dir=checkpoint_dir,
                overwrite_output_dir=True,
                num_train_epochs=_epochs,
                per_device_train_batch_size=_batch,
                per_device_eval_batch_size=settings.EVAL_BATCH_SIZE,
                learning_rate=_lr,
                warmup_steps=settings.WARMUP_STEPS,
                weight_decay=settings.WEIGHT_DECAY,
                gradient_accumulation_steps=settings.GRADIENT_ACCUMULATION_STEPS,
                eval_strategy="epoch",
                save_strategy="epoch",
                load_best_model_at_end=True,
                metric_for_best_model="eval_loss",
                greater_is_better=False,
                logging_dir=settings.LOGS_DIR,
                logging_steps=10,
                save_total_limit=2,
                report_to="none",
                fp16=False,
                dataloader_num_workers=0,
            )

            metrics_callback = MetricsLoggerCallback(output_path=metrics_path)

            trainer = Trainer(
                model=model,
                args=args,
                train_dataset=train_dataset,
                eval_dataset=val_dataset,
                data_collator=data_collator,
                callbacks=[metrics_callback],
            )

            logger.info(f"[{self.training_id}] Trainer ready. Starting …")
            trainer.train()
            logger.info(f"[{self.training_id}] Training complete. Metrics → {metrics_path}")

            # ----- Save fine-tuned model -----
            fine_tuned_path = Path(settings.FINE_TUNED_MODEL_DIR)
            fine_tuned_path.mkdir(parents=True, exist_ok=True)
            trainer.save_model(str(fine_tuned_path))
            tokenizer.save_pretrained(str(fine_tuned_path))
            logger.info(f"[{self.training_id}] Model saved to {fine_tuned_path}")

            # ----- Lưu thông tin training run -----
            run_info = {
                "training_id": self.training_id,
                "base_model": source,
                "epochs": _epochs,
                "batch_size": _batch,
                "learning_rate": _lr,
                "train_samples": len(train_texts),
                "val_samples": len(val_texts),
                "metrics_file": metrics_path,
            }
            run_info_path = Path(settings.LOGS_DIR) / f"run_{self.training_id}.json"
            with open(run_info_path, "w", encoding="utf-8") as f:
                json.dump(run_info, f, ensure_ascii=False, indent=2)
            logger.info(f"[{self.training_id}] Run info → {run_info_path}")

        finally:
            self._is_training = False

        return self.training_id

    # ------------------------------------------------------------------

    @property
    def is_training(self) -> bool:
        return self._is_training


trainer = StatusModelTrainer()
