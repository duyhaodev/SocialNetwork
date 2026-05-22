"""
Dataset utilities: load, validate, va prepare training data.

Format file JSONL (data/training_data.jsonl) do data/build_dataset.py sinh ra:
    {"text": "Chủ đề: đi ăn. Status: Hôm nay đi ăn bún bò Huế ngon quá!"}
    {"text": "Chủ đề: cà phê. Status: Sáng nay pha một ly cà phê đen…"}

Cau truc "Chủ đề: <X>. Status: <Y>" giup model hoc duoc mapping
"chu de X → status lien quan toi X" khi fine-tune.
"""

import json
import random
from pathlib import Path
from typing import List, Dict, Tuple, Optional

import torch
from torch.utils.data import Dataset
from transformers import PreTrainedTokenizer
from loguru import logger


# ------------------------------------------------------------------
# Dataset class for fine-tuning
# ------------------------------------------------------------------

class StatusDataset(Dataset):
    """Dataset cho Causal LM. Tokenize toi max_length, padding deu."""

    def __init__(
        self,
        texts: List[str],
        tokenizer: PreTrainedTokenizer,
        max_length: int = 96,
    ) -> None:
        self.tokenizer = tokenizer
        self.max_length = max_length
        self.examples: List[Dict] = []

        pad_id = tokenizer.pad_token_id

        for text in texts:
            enc = tokenizer(
                text,
                truncation=True,
                max_length=max_length,
                padding="max_length",
                return_tensors="pt",
            )
            input_ids = enc["input_ids"].squeeze(0)
            attention_mask = enc["attention_mask"].squeeze(0)

            # Labels: ignore loss tren cac token padding (-100)
            labels = input_ids.clone()
            labels[labels == pad_id] = -100

            self.examples.append(
                {
                    "input_ids": input_ids,
                    "attention_mask": attention_mask,
                    "labels": labels,
                }
            )

    def __len__(self) -> int:
        return len(self.examples)

    def __getitem__(self, idx: int) -> Dict[str, torch.Tensor]:
        return self.examples[idx]


# ------------------------------------------------------------------
# File loaders
# ------------------------------------------------------------------

def load_texts_from_file(file_path: str) -> List[str]:
    texts: List[str] = []
    path = Path(file_path)

    if not path.exists():
        logger.warning(f"File not found: {file_path}")
        return texts

    suffix = path.suffix.lower()
    with open(path, "r", encoding="utf-8") as f:
        if suffix == ".jsonl":
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    obj = json.loads(line)
                    t = obj.get("text", "").strip()
                    if t:
                        texts.append(t)
                except json.JSONDecodeError:
                    continue
        elif suffix == ".json":
            data = json.load(f)
            if isinstance(data, list):
                for item in data:
                    if isinstance(item, str):
                        texts.append(item.strip())
                    elif isinstance(item, dict):
                        t = item.get("text", "").strip()
                        if t:
                            texts.append(t)
        elif suffix == ".txt":
            texts = [line.strip() for line in f if line.strip()]

    return [t for t in texts if t and len(t) >= 10]


def get_all_training_texts(data_dir: str, extra_file: Optional[str] = None) -> List[str]:
    """Doc tat ca file JSONL/JSON/TXT trong data_dir, dedupe va tra ve."""
    texts: List[str] = []

    data_path = Path(data_dir)
    if data_path.exists():
        for file in sorted(data_path.iterdir()):
            if file.suffix.lower() in (".jsonl", ".json", ".txt"):
                loaded = load_texts_from_file(str(file))
                texts.extend(loaded)
                logger.info(f"Loaded {len(loaded)} samples from {file.name}")

    if extra_file:
        loaded = load_texts_from_file(extra_file)
        texts.extend(loaded)
        logger.info(f"Loaded {len(loaded)} samples from extra file {extra_file}")

    # Dedupe giu thu tu
    seen = set()
    unique: List[str] = []
    for t in texts:
        if t not in seen:
            seen.add(t)
            unique.append(t)

    logger.info(f"Total training samples: {len(unique)}")
    return unique


def train_val_split(
    texts: List[str], val_ratio: float = 0.1, seed: int = 42
) -> Tuple[List[str], List[str]]:
    rng = random.Random(seed)
    shuffled = list(texts)
    rng.shuffle(shuffled)
    split = max(1, int(len(shuffled) * val_ratio))
    return shuffled[split:], shuffled[:split]
