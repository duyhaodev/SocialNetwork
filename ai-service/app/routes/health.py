from fastapi import APIRouter
from app.models.gpt2_model import model_manager

router = APIRouter(tags=["Health"])


@router.get("/health", summary="Health check")
async def health():
    return {
        "status": "UP",
        "model_loaded": model_manager.is_loaded,
        "fine_tuned": model_manager.is_fine_tuned,
        "device": model_manager.device,
    }
