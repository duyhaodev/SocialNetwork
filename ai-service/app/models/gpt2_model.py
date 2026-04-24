"""
GPT-2 model manager: load base model, load fine-tuned model, generate text.
Runs 100% locally — no external API calls.
"""

from __future__ import annotations

import os
import re
from pathlib import Path
from typing import List, Optional, Tuple

import torch
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    GenerationConfig,
    PreTrainedModel,
    PreTrainedTokenizer,
)
from loguru import logger

from app.config import settings


_DEVICE = "cuda" if torch.cuda.is_available() else "cpu"


class GPT2ModelManager:
    """Singleton that manages loading and inference of the GPT-2 model."""

    _instance: Optional[GPT2ModelManager] = None

    def __new__(cls) -> GPT2ModelManager:
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self) -> None:
        if self._initialized:
            return
        self._model: Optional[PreTrainedModel] = None
        self._tokenizer: Optional[PreTrainedTokenizer] = None
        self._is_fine_tuned: bool = False
        self._initialized = True

    # ------------------------------------------------------------------
    # Loading
    # ------------------------------------------------------------------

    def load(self) -> None:
        """Load fine-tuned model if available, else load base model."""
        fine_tuned_dir = Path(settings.FINE_TUNED_MODEL_DIR)
        if fine_tuned_dir.exists() and any(fine_tuned_dir.iterdir()):
            logger.info(f"Loading fine-tuned model from {fine_tuned_dir}")
            self._load_from(str(fine_tuned_dir))
            self._is_fine_tuned = True
        else:
            logger.info(f"Loading base model: {settings.BASE_MODEL_NAME}")
            self._load_from(settings.BASE_MODEL_NAME)
            self._is_fine_tuned = False

    def _load_from(self, model_path: str) -> None:
        is_local = model_path != settings.BASE_MODEL_NAME
        self._tokenizer = AutoTokenizer.from_pretrained(
            model_path,
            local_files_only=is_local,
        )
        # XGLM uses <pad> token; GPT-2 does not — handle both cases
        if self._tokenizer.pad_token is None:
            self._tokenizer.pad_token = self._tokenizer.eos_token
        if self._tokenizer.bos_token is None:
            self._tokenizer.bos_token = self._tokenizer.eos_token

        self._model = AutoModelForCausalLM.from_pretrained(
            model_path,
            local_files_only=is_local,
        )
        # Resize embeddings in case tokenizer was extended during fine-tuning
        self._model.resize_token_embeddings(len(self._tokenizer))
        self._model.to(_DEVICE)
        self._model.eval()
        logger.info(f"Model loaded on {_DEVICE}. Parameters: {self._count_params():,}")

    def reload(self) -> None:
        """Reload model (call after fine-tuning)."""
        self._model = None
        self._tokenizer = None
        self.load()

    # ------------------------------------------------------------------
    # Inference
    # ------------------------------------------------------------------

    def generate(
        self,
        prompt: str,
        num_return_sequences: int = 5,
        max_new_tokens: int = 100,
        min_new_tokens: int = 20,
        temperature: float = 0.85,
        top_k: int = 50,
        top_p: float = 0.92,
        repetition_penalty: float = 1.3,
        no_repeat_ngram_size: int = 3,
    ) -> List[Tuple[str, float]]:
        """
        Generate status suggestions given a prompt.
        Returns list of (text, score) tuples.
        """
        if self._model is None or self._tokenizer is None:
            raise RuntimeError("Model not loaded. Call load() first.")

        inputs = self._tokenizer(
            prompt,
            return_tensors="pt",
            padding=True,
            truncation=True,
            max_length=settings.MAX_SEQ_LENGTH - max_new_tokens,
        ).to(_DEVICE)

        with torch.no_grad():
            output_ids = self._model.generate(
                **inputs,
                max_new_tokens=max_new_tokens,
                min_new_tokens=min_new_tokens,
                num_return_sequences=num_return_sequences,
                do_sample=True,
                temperature=temperature,
                top_k=top_k,
                top_p=top_p,
                repetition_penalty=repetition_penalty,
                no_repeat_ngram_size=no_repeat_ngram_size,
                pad_token_id=self._tokenizer.eos_token_id,
                output_scores=True,
                return_dict_in_generate=True,
            )

        sequences = output_ids.sequences
        # Compute a simple score from transition scores
        try:
            scores = torch.stack(output_ids.scores, dim=1)  # [num_seq, seq_len, vocab]
            log_probs = torch.log_softmax(scores, dim=-1)
            # Gather log-probs of chosen tokens
            chosen = sequences[:, inputs["input_ids"].shape[1]:]  # generated portion
            seq_scores: List[float] = []
            for i in range(num_return_sequences):
                toks = chosen[i]
                valid = toks[toks != self._tokenizer.pad_token_id]
                lp = log_probs[i, : len(valid), :]
                gathered = lp[range(len(valid)), valid].sum().item()
                seq_scores.append(round(gathered / max(len(valid), 1), 4))
        except Exception:
            seq_scores = [0.0] * num_return_sequences

        prompt_len = inputs["input_ids"].shape[1]
        results: List[Tuple[str, float]] = []
        for i, ids in enumerate(sequences):
            generated_ids = ids[prompt_len:]
            text = self._tokenizer.decode(generated_ids, skip_special_tokens=True)
            text = self._clean(text)
            if text:
                results.append((text, seq_scores[i] if i < len(seq_scores) else 0.0))

        # Deduplicate
        seen: set = set()
        unique: List[Tuple[str, float]] = []
        for text, score in results:
            if text not in seen:
                seen.add(text)
                unique.append((text, score))

        return unique

    # ------------------------------------------------------------------
    # Utilities
    # ------------------------------------------------------------------

    @staticmethod
    def _clean(text: str) -> str:
        text = text.strip()
        # Chỉ lấy dòng đầu tiên — tránh model sinh nhiều đoạn liên tiếp
        first_line = text.split("\n")[0].strip()
        if first_line:
            text = first_line
        # Bỏ dấu đầu dòng thừa
        text = re.sub(r"^[-–—•*]+\s*", "", text)
        text = re.sub(r"^[,\.!?;:]+\s*", "", text)
        # Collapse multiple spaces
        text = re.sub(r" {2,}", " ", text)
        return text.strip()

    def _count_params(self) -> int:
        if self._model is None:
            return 0
        return sum(p.numel() for p in self._model.parameters())

    # ------------------------------------------------------------------
    # Properties
    # ------------------------------------------------------------------

    @property
    def is_loaded(self) -> bool:
        return self._model is not None

    @property
    def is_fine_tuned(self) -> bool:
        return self._is_fine_tuned

    @property
    def tokenizer(self) -> Optional[PreTrainedTokenizer]:
        return self._tokenizer

    @property
    def model(self) -> Optional[PreTrainedModel]:
        return self._model

    @property
    def device(self) -> str:
        return _DEVICE

    @property
    def vocab_size(self) -> Optional[int]:
        if self._tokenizer:
            return len(self._tokenizer)
        return None

    @property
    def total_parameters(self) -> Optional[int]:
        if self._model:
            return self._count_params()
        return None


# Module-level singleton
model_manager = GPT2ModelManager()
