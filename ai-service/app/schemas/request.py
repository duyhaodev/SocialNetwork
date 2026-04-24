from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum


class Mood(str, Enum):
    happy = "happy"
    sad = "sad"
    excited = "excited"
    thoughtful = "thoughtful"
    motivated = "motivated"
    relaxed = "relaxed"
    angry = "angry"
    grateful = "grateful"
    funny = "funny"
    romantic = "romantic"


class PostCategory(str, Enum):
    travel = "travel"
    food = "food"
    fitness = "fitness"
    lifestyle = "lifestyle"
    work = "work"
    family = "family"
    friendship = "friendship"
    nature = "nature"
    motivation = "motivation"
    general = "general"


class SuggestRequest(BaseModel):
    keywords: Optional[List[str]] = Field(
        default=None,
        description="Danh sách từ khoá liên quan đến nội dung bài đăng",
        example=["đi biển", "hè", "gia đình"],
    )
    mood: Optional[Mood] = Field(
        default=None,
        description="Cảm xúc/tông giọng của bài đăng",
        example="happy",
    )
    category: Optional[PostCategory] = Field(
        default=None,
        description="Chủ đề bài đăng",
        example="travel",
    )
    language: str = Field(
        default="vi",
        description="Ngôn ngữ gợi ý: 'vi' hoặc 'en'",
        example="vi",
    )
    num_suggestions: int = Field(
        default=5,
        ge=1,
        le=10,
        description="Số lượng gợi ý trả về",
    )
    context: Optional[str] = Field(
        default=None,
        description="Nội dung thêm để AI hiểu ngữ cảnh hơn",
        example="Đang ngồi cà phê sáng",
    )


class SuggestionItem(BaseModel):
    text: str
    score: float


class SuggestResponse(BaseModel):
    suggestions: List[SuggestionItem]
    model_version: str
    keywords_used: Optional[List[str]] = None
    mood_used: Optional[str] = None
    category_used: Optional[str] = None


class TrainRequest(BaseModel):
    data_file: Optional[str] = Field(
        default=None,
        description="Tên file JSON trong thư mục data/ để train (mặc định: training_data.jsonl)",
    )
    epochs: Optional[int] = Field(default=None, ge=1, le=50)
    batch_size: Optional[int] = Field(default=None, ge=1, le=32)
    learning_rate: Optional[float] = Field(default=None, gt=0, lt=1)


class TrainResponse(BaseModel):
    status: str
    message: str
    training_id: Optional[str] = None


class ModelInfoResponse(BaseModel):
    base_model: str
    fine_tuned: bool
    fine_tuned_model_path: Optional[str] = None
    total_parameters: Optional[int] = None
    vocab_size: Optional[int] = None
    device: str


# ---------------------------------------------------------------------------
# Moderation
# ---------------------------------------------------------------------------

class ModerateRequest(BaseModel):
    content: str = Field(
        description="Nội dung bài viết cần kiểm tra",
        example="Hôm nay trời đẹp, đi cà phê thôi!",
        min_length=1,
        max_length=5000,
    )
    strict_mode: bool = Field(
        default=False,
        description=(
            "True → coi mức 'mild' là không an toàn; "
            "False → chỉ cảnh báo, cho phép đăng nếu chỉ là mild"
        ),
    )


class FlaggedItemSchema(BaseModel):
    word: str = Field(description="Từ / cụm từ bị gắn cờ")
    category: str = Field(description="Danh mục vi phạm (profanity, violence, ...)")
    category_label: str = Field(description="Tên danh mục tiếng Việt")
    severity: str = Field(description="Mức độ: mild / moderate / severe")


class ModerateResponse(BaseModel):
    is_safe: bool = Field(description="True nếu nội dung an toàn để đăng")
    warning_level: str = Field(description="safe | mild | moderate | severe")
    categories: List[str] = Field(description="Các danh mục vi phạm phát hiện được")
    flagged_items: List[FlaggedItemSchema] = Field(
        description="Chi tiết từng từ / cụm từ bị phát hiện"
    )
    message: str = Field(description="Thông điệp cảnh báo tổng quát")
    suggestion: str = Field(description="Gợi ý chỉnh sửa cụ thể")
