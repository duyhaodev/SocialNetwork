"""
GPT-2 model manager: load base model, load fine-tuned model, generate text.
Runs 100% locally — no external API calls.

Toi uu cho toc do:
  - Batch generate (1 lan goi sinh N sequences) thay vi loop N lan
  - Cache key theo prompt -> suggest lap lai cuc nhanh
  - Quality filter: loai noise (BBT:, PVNR, so dien thoai, URL, cau chua xong)
  - Smart dedup: hai cau co cung body (chi khac duoi emoji) -> coi la trung
"""

from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path
from typing import List, Optional, Tuple

import torch
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    PreTrainedModel,
    PreTrainedTokenizer,
)
from loguru import logger

from app.config import settings


_DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

# Cac token dac biet trong prompt (de cat output sach)
_STATUS_PREFIX = "Status:"
_TOPIC_PREFIX = "Chủ đề:"


class GPT2ModelManager:
    """Singleton that manages loading and inference of the GPT-2 model."""

    _instance: Optional["GPT2ModelManager"] = None

    def __new__(cls) -> "GPT2ModelManager":
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
        self._cache: dict = {}
        self._cache_max: int = 200
        self._initialized = True

    # ------------------------------------------------------------------
    # Loading
    # ------------------------------------------------------------------

    def load(self) -> None:
        """Load fine-tuned model if available, else load base model."""
        fine_tuned_dir = Path(settings.FINE_TUNED_MODEL_DIR)
        if fine_tuned_dir.exists() and any(fine_tuned_dir.iterdir()):
            logger.info(f"Loading fine-tuned model from {fine_tuned_dir}")
            self._load_from(str(fine_tuned_dir), is_local=True)
            self._is_fine_tuned = True
        else:
            logger.info(f"Loading base model: {settings.BASE_MODEL_NAME}")
            self._load_from(settings.BASE_MODEL_NAME, is_local=False)
            self._is_fine_tuned = False

    def _load_from(self, model_path: str, is_local: bool) -> None:
        self._tokenizer = AutoTokenizer.from_pretrained(
            model_path,
            local_files_only=is_local,
        )
        if self._tokenizer.pad_token is None:
            self._tokenizer.pad_token = self._tokenizer.eos_token
        if self._tokenizer.bos_token is None:
            self._tokenizer.bos_token = self._tokenizer.eos_token

        self._model = AutoModelForCausalLM.from_pretrained(
            model_path,
            local_files_only=is_local,
        )
        self._model.resize_token_embeddings(len(self._tokenizer))
        self._model.to(_DEVICE)
        self._model.eval()

        try:
            torch.set_grad_enabled(False)
        except Exception:
            pass

        logger.info(f"Model loaded on {_DEVICE}. Parameters: {self._count_params():,}")

    def reload(self) -> None:
        """Reload model (call after fine-tuning)."""
        self._model = None
        self._tokenizer = None
        self._cache.clear()
        self.load()

    # ------------------------------------------------------------------
    # Inference — batch generate
    # ------------------------------------------------------------------

    def generate(
        self,
        prompt: str,
        num_return_sequences: int = 5,
        max_new_tokens: int = 35,
        min_new_tokens: int = 8,
        temperature: float = 0.85,
        top_k: int = 50,
        top_p: float = 0.92,
        repetition_penalty: float = 1.25,
        no_repeat_ngram_size: int = 3,
    ) -> List[Tuple[str, float]]:
        """Generate status suggestions. Returns list of (text, score) tuples."""
        if self._model is None or self._tokenizer is None:
            raise RuntimeError("Model not loaded. Call load() first.")

        cache_key = hashlib.md5(
            json.dumps(
                {
                    "prompt": prompt,
                    "n": num_return_sequences,
                    "max": max_new_tokens,
                    "temp": round(temperature, 2),
                },
                sort_keys=True,
            ).encode()
        ).hexdigest()
        if cache_key in self._cache:
            logger.info("Cache hit")
            return self._cache[cache_key]

        # Token hoa input
        inputs = self._tokenizer(
            prompt,
            return_tensors="pt",
            truncation=True,
            max_length=128,
        ).to(_DEVICE)

        prompt_len = inputs["input_ids"].shape[1]

        # Sinh N sequences trong 1 lan goi -> nhanh hon nhieu so voi loop N lan.
        # Sinh du hon nhieu (over_n=3x) de bo lai khi loc khat khe.
        over_n = max(num_return_sequences + 5, num_return_sequences * 3)

        with torch.inference_mode():
            out = self._model.generate(
                **inputs,
                max_new_tokens=max_new_tokens,
                min_new_tokens=min_new_tokens,
                num_return_sequences=over_n,
                do_sample=True,
                temperature=temperature,
                top_k=top_k,
                top_p=top_p,
                repetition_penalty=repetition_penalty,
                no_repeat_ngram_size=no_repeat_ngram_size,
                pad_token_id=self._tokenizer.pad_token_id,
                eos_token_id=self._tokenizer.eos_token_id,
            )

        # Decode + clean. Dedup THONG MINH: hai cau co cung phan body
        # (chi khac duoi emoji) bi coi la trung -> chi giu mot.
        results: List[Tuple[str, float]] = []
        seen_exact: set = set()
        seen_body: set = set()
        for i in range(out.shape[0]):
            generated_ids = out[i][prompt_len:]
            text = self._tokenizer.decode(generated_ids, skip_special_tokens=True)
            text = self._clean(text)
            if not text or text in seen_exact:
                continue
            if not self._is_quality(text):
                continue

            # Lay "body" (text khong co emoji/cham cau cuoi) de check trung
            body = self._normalize_body(text)
            if body in seen_body:
                continue

            seen_exact.add(text)
            seen_body.add(body)
            results.append((text, 1.0))
            if len(results) >= num_return_sequences:
                break

        if len(self._cache) >= self._cache_max:
            self._cache.pop(next(iter(self._cache)))
        self._cache[cache_key] = results
        return results

    # ------------------------------------------------------------------
    # Utilities
    # ------------------------------------------------------------------

    # Regex bat tat ca emoji + modifiers
    _EMOJI_RE = re.compile(
        "["
        "\U0001F300-\U0001F9FF"     # symbols & pictographs
        "\U0001FA00-\U0001FAFF"     # extended-A
        "\U0001F600-\U0001F64F"     # emoticons
        "\U0001F680-\U0001F6FF"     # transport
        "\U0001F900-\U0001F9FF"     # supplemental
        "☀-➿"             # misc symbols, dingbats
        "⌀-⏿"             # technical
        "⬀-⯿"             # arrows
        "︀-️"             # variation selectors (❤️ = ❤ + U+FE0F)
        "‍"                    # zero-width joiner (cho compound emoji)
        "\U0001F1E6-\U0001F1FF"     # regional indicator (flags)
        "\U0001F3FB-\U0001F3FF"     # skin tone modifiers
        "]"
    )

    # Tu noi/lien tu — neu cau ket thuc bang nhung tu nay -> cau chua hoan chinh
    # CHU Y: KHONG include "quá", "lắm", "rồi" — la endings hop le trong tieng Viet
    _INCOMPLETE_ENDERS = {
        # Vietnamese lien tu/gioi tu KHONG dung de ket cau
        "vì", "mà", "và", "thì", "nhưng", "cũng",
        "để", "cho", "của", "với", "sau", "trước", "như", "rằng",
        "do", "nên", "bởi", "tuy", "nếu", "hay", "hoặc",
        # English articles, conjunctions, prepositions
        "and", "but", "or", "so", "for", "to", "in", "on", "at",
        "with", "from", "by", "of", "the", "a", "an", "is", "was",
        "are", "were", "be", "been", "being", "have", "has", "had",
        "that", "which", "who", "what", "when", "where", "why", "how",
    }

    @classmethod
    def _normalize_body(cls, text: str) -> str:
        """
        Lay phan 'body' cua text (bo emoji, dau cau cuoi, chu cai don le).
        Dung de dedup: hai cau co cung body nhung khac emoji se bi coi la trung.

        Vi du:
          "Mua được đôi giày 50% 👞🏠"  -> "mua được đôi giày 50%"
          "Mua được đôi giày 50% 👠🌟"  -> "mua được đôi giày 50%"
          Cung body -> coi la trung.
        """
        text = cls._EMOJI_RE.sub(" ", text)
        text = re.sub(r"\b[A-Za-z]\b", " ", text)
        text = re.sub(r"[\s.,!?;:\-—–]+$", "", text)
        text = re.sub(r"\s+", " ", text).strip().lower()
        return text[:80]

    @classmethod
    def _clean(cls, text: str) -> str:
        text = text.strip()

        # 1. Cat tai dau "Chu de:" / "Topic:" tiep theo (model lap lai format)
        for marker in (_TOPIC_PREFIX, "Topic:", _STATUS_PREFIX, "\n\n"):
            idx = text.find(marker)
            if idx > 0:
                text = text[:idx].strip()
                break

        # 2. Chi lay dong dau tien
        text = text.split("\n")[0].strip()

        # 3. Bo prefix thua
        text = re.sub(r"^[-–—•*]+\s*", "", text)
        text = re.sub(r"^[,\.!?;:]+\s*", "", text)

        # 4. Bo URL + Twitter artifacts
        text = re.sub(r"https?://\S+", "", text)
        text = re.sub(r"pic\.twitter\S*", "", text)

        # 5. Cat tai EMOJI CLUSTER hoac dau cau DAU TIEN (sau khoang text du dai)
        # Status mang xa hoi thuong co format: "<text>. <emoji cluster>"
        # Sau cluster nay = model bat dau sinh cau MOI = rac -> cat.
        MIN_END_POS = 15
        end_pos = -1
        i = 0
        n = len(text)
        while i < n:
            c = text[i]
            if i >= MIN_END_POS and (c in ".!?…" or cls._EMOJI_RE.match(c)):
                # Tim duoc diem ket thuc dau tien. Mo rong qua cac emoji lien tiep
                # (va space giua chung) de giu cluster nguyen ven.
                end_pos = i
                j = i + 1
                while j < n:
                    cj = text[j]
                    if cls._EMOJI_RE.match(cj):
                        end_pos = j
                        j += 1
                    elif cj == " ":
                        j += 1  # skip space
                    else:
                        break
                break
            i += 1

        if end_pos >= 0:
            text = text[: end_pos + 1]

        # Gioi han so emoji o cuoi cau (max 4) — tranh chuoi emoji vo nghia
        # do model overfit pattern "text + cluster emoji dai".
        text = cls._limit_trailing_emojis(text, max_count=4)

        text = re.sub(r"\s{2,}", " ", text)
        return text.strip()

    # Modifier khong dem la emoji rieng biet (vi du ❤+U+FE0F = 1 emoji ❤️)
    _EMOJI_MODIFIER_RE = re.compile(
        "["
        "︀-️"             # variation selectors U+FE00-FE0F
        "‍"                    # zero-width joiner
        "\U0001F3FB-\U0001F3FF"     # skin tone modifiers
        "]"
    )

    @classmethod
    def _limit_trailing_emojis(cls, text: str, max_count: int = 4) -> str:
        """
        Gioi han so emoji o cuoi cau xuong toi da `max_count`.
        Chu y: ❤️ = ❤ + U+FE0F la 1 emoji (modifier khong dem rieng).
        """
        n = len(text)

        # Tim vi tri bat dau cua khoi emoji cuoi
        i = n - 1
        while i >= 0 and (cls._EMOJI_RE.match(text[i]) or text[i] == " "):
            i -= 1
        start = i + 1

        if start >= n:
            return text  # khong co emoji cuoi

        trailing = text[start:]

        # Dem so emoji "core" (khong tinh modifier/variation selector)
        core_count = sum(
            1
            for c in trailing
            if cls._EMOJI_RE.match(c) and not cls._EMOJI_MODIFIER_RE.match(c)
        )

        if core_count <= max_count:
            return text

        # Cat bot: giu max_count core emoji + modifiers theo sau moi cai
        kept_chars = []
        kept_cores = 0
        for c in trailing:
            if cls._EMOJI_MODIFIER_RE.match(c):
                # Modifier — giu lai cung core emoji vua giu
                if kept_chars:
                    kept_chars.append(c)
            elif cls._EMOJI_RE.match(c):
                # Core emoji
                if kept_cores < max_count:
                    kept_chars.append(c)
                    kept_cores += 1
                else:
                    break

        return text[:start].rstrip() + " " + "".join(kept_chars)

    @classmethod
    def _is_quality(cls, text: str) -> bool:
        """Loc output rac — tra False neu text khong dat chat luong toi thieu."""
        if not text or len(text) < 15 or len(text) > 300:
            return False

        words = text.split()
        if len(words) < 4:
            return False

        # Loai cau co so dien thoai (>=9 chu so lien tiep)
        if re.search(r"\d{9,}", text):
            return False

        # Loai cau co attribution kieu "BBT:", "RCPE:", "ABC:"
        if re.search(r"\b[A-Z]{2,6}:\s", text):
            return False

        # Loai cau co URL/domain
        if re.search(r"\b(https?|\.com|\.vn|\.net|\.org|\.io)\b", text, re.IGNORECASE):
            return False

        # Loai cau co cum chu cai random viet hoa lien tuc 3+ ky tu
        # (vi du "BBT", "RCPE", "FFT", "EPVNRP" — dac trung noise)
        if re.search(r"\b[A-Z]{3,}\b", text):
            return False

        # CAU CHUA HOAN CHINH — ket thuc bang lien tu/gioi tu
        text_no_trail = cls._EMOJI_RE.sub(" ", text)
        text_no_trail = re.sub(r"\b[A-Za-z]\b", " ", text_no_trail)
        text_no_trail = re.sub(r"\s+", " ", text_no_trail).strip()
        text_no_trail = re.sub(r"[\s.,!?;:\-—–]+$", "", text_no_trail)
        last_words = text_no_trail.split()
        if last_words:
            last_word = last_words[-1].lower().strip(".,!?;:")
            if last_word in cls._INCOMPLETE_ENDERS:
                return False

        # Ti le tu viet hoa
        upper_ratio = sum(1 for w in words if w.isupper() and len(w) > 1) / max(len(words), 1)
        if upper_ratio > 0.3:
            return False

        # Spam pattern khac
        spam_patterns = [r"pic\.twitter", r"http", r"#\w+#\w+", r"——+"]
        if any(re.search(p, text) for p in spam_patterns):
            return False

        return True

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
