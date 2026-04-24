from fastapi import APIRouter
from loguru import logger

from app.schemas.request import ModerateRequest, ModerateResponse, FlaggedItemSchema
from app.utils.content_moderator import moderate

router = APIRouter(prefix="/ai", tags=["Moderation"])


@router.post(
    "/moderate",
    response_model=ModerateResponse,
    summary="Kiểm tra nội dung bài đăng",
    description=(
        "Phân tích bài viết và cảnh báo nếu có từ ngữ nhạy cảm. "
        "Phân loại: từ tục tĩu, ngôn ngữ kỳ thị, bạo lực, nội dung người lớn, "
        "thông tin cá nhân, spam. "
        "Chạy hoàn toàn local — không gửi dữ liệu ra ngoài."
    ),
)
async def moderate_content(req: ModerateRequest) -> ModerateResponse:
    logger.info(
        f"[Moderate] strict={req.strict_mode} "
        f"content_len={len(req.content)}"
    )

    result = moderate(content=req.content, strict=req.strict_mode)

    logger.info(
        f"[Moderate] level={result.warning_level} "
        f"categories={result.categories} "
        f"flagged={len(result.flagged_items)}"
    )

    return ModerateResponse(
        is_safe=result.is_safe,
        warning_level=result.warning_level,
        categories=result.categories,
        flagged_items=[
            FlaggedItemSchema(
                word=item.word,
                category=item.category,
                category_label=item.category_label,
                severity=item.severity,
            )
            for item in result.flagged_items
        ],
        message=result.message,
        suggestion=result.suggestion,
    )
