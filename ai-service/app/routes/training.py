import asyncio
from concurrent.futures import ThreadPoolExecutor

from fastapi import APIRouter, BackgroundTasks, HTTPException, status

from app.models.gpt2_model import model_manager
from app.models.trainer import trainer
from app.schemas.request import TrainRequest, TrainResponse, ModelInfoResponse
from app.config import settings
from loguru import logger

router = APIRouter(prefix="/ai", tags=["Training"])

_executor = ThreadPoolExecutor(max_workers=1)


def _run_training(req: TrainRequest) -> None:
    """Blocking training call — executed in a thread pool."""
    try:
        training_id = trainer.train(
            data_file=req.data_file,
            epochs=req.epochs,
            batch_size=req.batch_size,
            learning_rate=req.learning_rate,
        )
        logger.info(f"Training [{training_id}] finished. Reloading model …")
        model_manager.reload()
        logger.info("Model reloaded successfully.")
    except Exception as exc:
        logger.error(f"Training failed: {exc}")


@router.post(
    "/train",
    response_model=TrainResponse,
    summary="Khởi động fine-tuning model",
    description=(
        "Bắt đầu quá trình fine-tuning trong background. "
        "Dùng dữ liệu trong thư mục data/ hoặc file được chỉ định. "
        "Model sẽ tự reload sau khi train xong."
    ),
)
async def start_training(
    req: TrainRequest = TrainRequest(),
    background_tasks: BackgroundTasks = None,
) -> TrainResponse:
    if trainer.is_training:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Đang có quá trình training chạy. Vui lòng chờ.",
        )

    loop = asyncio.get_event_loop()
    loop.run_in_executor(_executor, _run_training, req)

    return TrainResponse(
        status="started",
        message="Quá trình fine-tuning đã được khởi động ở background.",
    )


@router.get(
    "/train/status",
    summary="Trạng thái training",
)
async def training_status():
    return {
        "is_training": trainer.is_training,
        "training_id": trainer.training_id,
    }


@router.get(
    "/model/info",
    response_model=ModelInfoResponse,
    summary="Thông tin model hiện tại",
)
async def model_info() -> ModelInfoResponse:
    return ModelInfoResponse(
        base_model=settings.BASE_MODEL_NAME,
        fine_tuned=model_manager.is_fine_tuned,
        fine_tuned_model_path=(
            settings.FINE_TUNED_MODEL_DIR if model_manager.is_fine_tuned else None
        ),
        total_parameters=model_manager.total_parameters,
        vocab_size=model_manager.vocab_size,
        device=model_manager.device,
    )
