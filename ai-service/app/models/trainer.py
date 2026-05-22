"""
Fine-tuning pipeline cho model goi y status.

- Dung HuggingFace Trainer voi Causal Language Modeling
- Loss da bo qua padding token (labels=-100 trong StatusDataset)
- Fp16 tu dong neu co CUDA — giam toc do training xuong nhieu
"""

from __future__ import annotations

import json
import math
import uuid
from pathlib import Path
from typing import Optional

import torch
from loguru import logger
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    EarlyStoppingCallback,
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
    """Ghi train loss + eval loss moi epoch vao file JSON de ve bieu do bao cao."""

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
            loss = float(logs["loss"])
            self._current = {
                "epoch": epoch,
                "step": step,
                "train_loss": round(loss, 4),
                "train_perplexity": round(math.exp(min(loss, 20)), 2),
            }

        if "eval_loss" in logs:
            eval_loss = float(logs["eval_loss"])
            record = {
                **self._current,
                "eval_loss": round(eval_loss, 4),
                "eval_perplexity": round(math.exp(min(eval_loss, 20)), 2),
            }
            self.records.append(record)
            self._save()

    def _save(self) -> None:
        self.output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(self.output_path, "w", encoding="utf-8") as f:
            json.dump(self.records, f, ensure_ascii=False, indent=2)


class StatusModelTrainer:
    """Quan ly fine-tune model tren du lieu status mang xa hoi."""

    def __init__(self) -> None:
        self.training_id: Optional[str] = None
        self._is_training: bool = False

    def train(
        self,
        data_file: Optional[str] = None,
        epochs: Optional[int] = None,
        batch_size: Optional[int] = None,
        learning_rate: Optional[float] = None,
    ) -> str:
        """Fine-tune model va luu vao FINE_TUNED_MODEL_DIR. Tra ve training_id."""
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
                logger.info(f"[{self.training_id}] Fine-tuning from base: {source}")

            tokenizer = AutoTokenizer.from_pretrained(source)
            if tokenizer.pad_token is None:
                tokenizer.pad_token = tokenizer.eos_token
            if tokenizer.bos_token is None:
                tokenizer.bos_token = tokenizer.eos_token

            model = AutoModelForCausalLM.from_pretrained(source)

            # ----- Prepare dataset -----
            extra = str(Path(settings.DATA_DIR) / data_file) if data_file else None
            all_texts = get_all_training_texts(settings.DATA_DIR, extra_file=extra)

            if len(all_texts) < 50:
                raise ValueError(
                    f"Khong du du lieu training (chi co {len(all_texts)} samples). "
                    f"Vui long chay 'python data/build_dataset.py' truoc."
                )

            train_texts, val_texts = train_val_split(all_texts, val_ratio=0.1)
            logger.info(
                f"[{self.training_id}] Train: {len(train_texts)} | Val: {len(val_texts)}"
            )

            train_dataset = StatusDataset(train_texts, tokenizer, settings.MAX_SEQ_LENGTH)
            val_dataset = StatusDataset(val_texts, tokenizer, settings.MAX_SEQ_LENGTH)

            # ----- Training arguments -----
            checkpoint_dir = str(Path(settings.MODEL_SAVE_DIR) / f"checkpoint_{self.training_id}")
            metrics_path = str(Path(settings.LOGS_DIR) / f"metrics_{self.training_id}.json")

            steps_per_epoch = max(1, math.ceil(len(train_dataset) / _batch))
            total_steps = steps_per_epoch * _epochs
            warmup_steps = max(10, int(total_steps * settings.WARMUP_RATIO))

            use_fp16 = torch.cuda.is_available()

            args = TrainingArguments(
                output_dir=checkpoint_dir,
                num_train_epochs=_epochs,
                per_device_train_batch_size=_batch,
                per_device_eval_batch_size=settings.EVAL_BATCH_SIZE,
                learning_rate=_lr,
                warmup_steps=warmup_steps,
                weight_decay=settings.WEIGHT_DECAY,
                gradient_accumulation_steps=settings.GRADIENT_ACCUMULATION_STEPS,
                max_grad_norm=1.0,
                eval_strategy="epoch",
                save_strategy="epoch",
                load_best_model_at_end=True,
                metric_for_best_model="eval_loss",
                greater_is_better=False,
                logging_dir=settings.LOGS_DIR,
                logging_steps=max(1, steps_per_epoch // 4),
                save_total_limit=2,
                report_to="none",
                fp16=use_fp16,
                dataloader_num_workers=0,
            )

            metrics_callback = MetricsLoggerCallback(output_path=metrics_path)

            trainer_obj = Trainer(
                model=model,
                args=args,
                train_dataset=train_dataset,
                eval_dataset=val_dataset,
                callbacks=[
                    metrics_callback,
                    EarlyStoppingCallback(early_stopping_patience=2),
                ],
            )

            logger.info(
                f"[{self.training_id}] Trainer ready. "
                f"steps/epoch={steps_per_epoch} | total_steps={total_steps} | "
                f"warmup={warmup_steps} | fp16={use_fp16}"
            )
            trainer_obj.train()
            logger.info(f"[{self.training_id}] Training complete. Metrics → {metrics_path}")

            # ----- Save fine-tuned model -----
            fine_tuned_path = Path(settings.FINE_TUNED_MODEL_DIR)
            fine_tuned_path.mkdir(parents=True, exist_ok=True)
            trainer_obj.save_model(str(fine_tuned_path))
            tokenizer.save_pretrained(str(fine_tuned_path))
            logger.info(f"[{self.training_id}] Model saved to {fine_tuned_path}")

            run_info = {
                "training_id": self.training_id,
                "base_model": source,
                "epochs": _epochs,
                "batch_size": _batch,
                "learning_rate": _lr,
                "warmup_steps": warmup_steps,
                "train_samples": len(train_texts),
                "val_samples": len(val_texts),
                "fp16": use_fp16,
                "metrics_file": metrics_path,
            }
            run_info_path = Path(settings.LOGS_DIR) / f"run_{self.training_id}.json"
            with open(run_info_path, "w", encoding="utf-8") as f:
                json.dump(run_info, f, ensure_ascii=False, indent=2)
            logger.info(f"[{self.training_id}] Run info → {run_info_path}")

        finally:
            self._is_training = False

        return self.training_id

    @property
    def is_training(self) -> bool:
        return self._is_training


trainer = StatusModelTrainer()
