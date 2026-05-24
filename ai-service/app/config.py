from pydantic_settings import BaseSettings
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    # Server
    APP_NAME: str = "AI Status Suggestion Service"
    APP_VERSION: str = "2.0.0"
    HOST: str = "0.0.0.0"
    PORT: int = 8092
    DEBUG: bool = False

    # ------------------------------------------------------------------
    # Model
    # ------------------------------------------------------------------
    # Mac dinh: NlpHUST/gpt2-vietnamese (125M params, ~500MB)
    #   - Pretrain tren tieng Viet → tieng Viet rat tot
    #   - Tieng Anh: hoc duoc qua fine-tune (do byte-level BPE tokenizer)
    #     voi dataset hien tai (3K+ EN samples), du de sinh EN tu nhien
    #   - Nhe + nhanh tren CPU laptop (~3-5s/request sau fine-tune)
    #
    # NEU MUON TIENG ANH MANH HON (chap nhan cham hon ~3x):
    #   "facebook/xglm-564M"        (564M, multilingual chinh hieu)
    #   "bigscience/bloom-560m"     (560M, multilingual moi hon)
    # Doi BASE_MODEL_NAME ben duoi va re-train tren Colab.
    BASE_MODEL_NAME: str = "NlpHUST/gpt2-vietnamese"

    MODEL_SAVE_DIR: str = str(BASE_DIR / "saved_models")
    FINE_TUNED_MODEL_DIR: str = str(BASE_DIR / "saved_models" / "fine_tuned")
    DATA_DIR: str = str(BASE_DIR / "data")
    LOGS_DIR: str = str(BASE_DIR / "logs")

    # ------------------------------------------------------------------
    # Training hyper-parameters — toi uu cho GPT-2 small (~125M)
    # ------------------------------------------------------------------
    TRAIN_EPOCHS: int = 15
    TRAIN_BATCH_SIZE: int = 16
    EVAL_BATCH_SIZE: int = 16
    LEARNING_RATE: float = 3e-5
    MAX_SEQ_LENGTH: int = 96
    WARMUP_RATIO: float = 0.1
    WEIGHT_DECAY: float = 0.01
    SAVE_STEPS: int = 200
    LOGGING_STEPS: int = 20
    EVAL_STEPS: int = 200
    GRADIENT_ACCUMULATION_STEPS: int = 1

    # ------------------------------------------------------------------
    # Inference — toi uu cho toc do tren CPU
    # ------------------------------------------------------------------
    # Token sinh ngan hon -> nhanh hon (mot status thuong ~30-40 tokens)
    MAX_NEW_TOKENS: int = 35
    MIN_NEW_TOKENS: int = 8
    NUM_RETURN_SEQUENCES: int = 5
    TEMPERATURE: float = 0.85
    TOP_K: int = 50
    TOP_P: float = 0.92
    REPETITION_PENALTY: float = 1.25
    NO_REPEAT_NGRAM_SIZE: int = 3

    # Co go bat che do batch generate (sinh nhieu sequences trong 1 lan goi).
    # Nhanh hon nhieu so voi loop tung sequence.
    BATCH_GENERATE: bool = True

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
