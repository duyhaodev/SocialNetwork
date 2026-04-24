"""
AI Status Suggestion Service
Chạy hoàn toàn local — không dùng API ngoài.
Model: DistilGPT-2 (fine-tuned trên dữ liệu mạng xã hội)
"""

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from app.config import settings
from app.models.gpt2_model import model_manager
from app.routes import suggest, training, health, moderation


# ------------------------------------------------------------------
# Startup / shutdown
# ------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create required directories
    for d in [settings.MODEL_SAVE_DIR, settings.FINE_TUNED_MODEL_DIR, settings.LOGS_DIR]:
        Path(d).mkdir(parents=True, exist_ok=True)

    logger.info("Loading AI model …")
    model_manager.load()
    logger.info(f"Service ready on port {settings.PORT}")

    yield

    logger.info("Shutting down AI service.")


# ------------------------------------------------------------------
# App
# ------------------------------------------------------------------

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "Microservice gợi ý viết status bài đăng mạng xã hội. "
        "Sử dụng mô hình GPT-2 được fine-tune, chạy hoàn toàn local."
    ),
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(suggest.router)
app.include_router(training.router)
app.include_router(moderation.router)


@app.get("/", include_in_schema=False)
async def root():
    return {
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs",
    }
