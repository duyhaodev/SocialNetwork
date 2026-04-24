from pydantic_settings import BaseSettings
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    # Server
    APP_NAME: str = "AI Status Suggestion Service"
    APP_VERSION: str = "1.0.0"
    HOST: str = "0.0.0.0"
    PORT: int = 8087
    DEBUG: bool = False

    # Model
    # facebook/xglm-564M — multilingual Causal LM, public, hỗ trợ tiếng Việt tốt (~564M params)
    BASE_MODEL_NAME: str = "facebook/xglm-564M"
    MODEL_SAVE_DIR: str = str(BASE_DIR / "saved_models")
    FINE_TUNED_MODEL_DIR: str = str(BASE_DIR / "saved_models" / "fine_tuned")
    DATA_DIR: str = str(BASE_DIR / "data")
    LOGS_DIR: str = str(BASE_DIR / "logs")

    # Training hyper-parameters
    TRAIN_EPOCHS: int = 5
    TRAIN_BATCH_SIZE: int = 4
    EVAL_BATCH_SIZE: int = 4
    LEARNING_RATE: float = 5e-5
    MAX_SEQ_LENGTH: int = 128
    WARMUP_STEPS: int = 100
    WEIGHT_DECAY: float = 0.01
    SAVE_STEPS: int = 500
    LOGGING_STEPS: int = 100
    EVAL_STEPS: int = 500
    GRADIENT_ACCUMULATION_STEPS: int = 4

    # Inference
    MAX_NEW_TOKENS: int = 60   # status ngắn gọn, không dài dòng
    MIN_NEW_TOKENS: int = 10
    NUM_RETURN_SEQUENCES: int = 5
    TEMPERATURE: float = 0.9
    TOP_K: int = 40
    TOP_P: float = 0.90
    REPETITION_PENALTY: float = 1.5   # tăng để tránh lặp cụm từ
    NO_REPEAT_NGRAM_SIZE: int = 4

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
