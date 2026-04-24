"""
CLI script to run fine-tuning outside the web server.
Usage:
    python train_cli.py
    python train_cli.py --epochs 10 --batch_size 4 --lr 3e-5
    python train_cli.py --data_file my_data.jsonl
"""

import argparse
import sys
from pathlib import Path

# Make sure we can import app.*
sys.path.insert(0, str(Path(__file__).parent))

from loguru import logger
from app.models.trainer import trainer
from app.config import settings


def parse_args():
    p = argparse.ArgumentParser(description="Fine-tune GPT-2 for status suggestions")
    p.add_argument("--data_file", type=str, default=None,
                   help="JSONL/JSON/TXT file inside data/ to use for training")
    p.add_argument("--epochs", type=int, default=settings.TRAIN_EPOCHS)
    p.add_argument("--batch_size", type=int, default=settings.TRAIN_BATCH_SIZE)
    p.add_argument("--lr", type=float, default=settings.LEARNING_RATE)
    return p.parse_args()


def main():
    args = parse_args()
    logger.info("=== AI Status Suggestion — Fine-tuning CLI ===")
    logger.info(f"  Epochs      : {args.epochs}")
    logger.info(f"  Batch size  : {args.batch_size}")
    logger.info(f"  LR          : {args.lr}")
    logger.info(f"  Data file   : {args.data_file or '(all files in data/)'}")

    try:
        training_id = trainer.train(
            data_file=args.data_file,
            epochs=args.epochs,
            batch_size=args.batch_size,
            learning_rate=args.lr,
        )
        logger.success(f"Training complete! ID: {training_id}")
        logger.success(f"Model saved to: {settings.FINE_TUNED_MODEL_DIR}")
    except Exception as exc:
        logger.error(f"Training failed: {exc}")
        sys.exit(1)


if __name__ == "__main__":
    main()
