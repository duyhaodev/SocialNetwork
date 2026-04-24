from fastapi import APIRouter, HTTPException, status

from app.config import settings
from app.models.gpt2_model import model_manager
from app.schemas.request import SuggestRequest, SuggestResponse, SuggestionItem
from app.utils.prompt_builder import build_prompt
from app.utils.smart_suggest import generate_smart_suggestions
from loguru import logger

router = APIRouter(prefix="/ai", tags=["Suggest"])


@router.post(
    "/suggest",
    response_model=SuggestResponse,
    summary="Gợi ý viết status bài đăng",
    description=(
        "Trả về danh sách gợi ý status cho bài đăng mạng xã hội. "
        "Dùng Template Engine khi chưa fine-tune, "
        "dùng AI model sau khi đã fine-tune."
    ),
)
async def suggest_status(req: SuggestRequest) -> SuggestResponse:
    if not model_manager.is_loaded:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Model chưa được load. Vui lòng thử lại sau.",
        )

    mood_val = req.mood.value if req.mood else None
    category_val = req.category.value if req.category else None

    # ------------------------------------------------------------------
    # Chưa fine-tune → dùng Template Engine (luôn đúng chủ đề)
    # Đã fine-tune   → dùng AI model (sáng tạo, tự nhiên hơn)
    # ------------------------------------------------------------------
    if not model_manager.is_fine_tuned:
        logger.info(
            f"[Template] keywords={req.keywords} mood={mood_val} "
            f"category={category_val} context={req.context!r}"
        )
        raw_results = generate_smart_suggestions(
            keywords=req.keywords,
            mood=mood_val,
            category=category_val,
            context=req.context,
            language=req.language,
            num_suggestions=req.num_suggestions,
        )
        model_version = "smart-suggest"
    else:
        prompt = build_prompt(
            keywords=req.keywords,
            mood=mood_val,
            category=category_val,
            context=req.context,
            language=req.language,
        )
        logger.info(f"[Model] prompt={prompt!r}")
        try:
            raw_results = model_manager.generate(
                prompt=prompt,
                num_return_sequences=req.num_suggestions,
                max_new_tokens=settings.MAX_NEW_TOKENS,
                min_new_tokens=settings.MIN_NEW_TOKENS,
                temperature=settings.TEMPERATURE,
                top_k=settings.TOP_K,
                top_p=settings.TOP_P,
                repetition_penalty=settings.REPETITION_PENALTY,
                no_repeat_ngram_size=settings.NO_REPEAT_NGRAM_SIZE,
            )
        except Exception as exc:
            logger.error(f"Generation error: {exc}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Lỗi sinh văn bản: {str(exc)}",
            )
        model_version = f"{settings.BASE_MODEL_NAME}-fine-tuned"

    suggestions = [
        SuggestionItem(text=text, score=score) for text, score in raw_results
    ]

    return SuggestResponse(
        suggestions=suggestions,
        model_version=model_version,
        keywords_used=req.keywords,
        mood_used=mood_val,
        category_used=category_val,
    )
