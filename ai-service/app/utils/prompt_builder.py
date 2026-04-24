"""
Build few-shot prompts for the status suggestion model.

Few-shot prompting: cung cấp vài ví dụ mẫu trong prompt để model
hiểu rõ định dạng đầu ra mong muốn (social media status).
"""

import random
from typing import List, Optional

# ---------------------------------------------------------------------------
# Few-shot example pools — chọn ngẫu nhiên mỗi lần để tăng đa dạng
# ---------------------------------------------------------------------------

_FEW_SHOT_VI = [
    "Hôm nay đi biển cùng gia đình, tuyệt vời quá! 🌊☀️",
    "Chuyến đi Đà Lạt cuối tuần, thời tiết se lạnh và hoa nở đẹp quá 🌸🍃",
    "Bún bò Huế sáng nay ngon không tưởng, ăn xong rồi vẫn còn thèm 😍🍜",
    "Chạy bộ 5km sáng nay, cơ thể tỉnh táo và năng lượng dồi dào suốt ngày 🏃‍♂️💪",
    "Cà phê sáng nay bên cửa sổ, nhìn mưa rơi, thư giãn hoàn toàn ☕🌧️",
    "Deadline hôm nay hoàn thành trước giờ, cảm giác này đỉnh lắm 🙌",
    "Họp mặt gia đình sau bao lâu xa cách, ấm áp và hạnh phúc quá ❤️",
    "Hoàng hôn chiều nay đẹp đến ngẩn ngơ, đứng nhìn mãi không chán 🌅",
    "Mỗi ngày là một cơ hội mới để trở thành phiên bản tốt hơn của chính mình 🌟",
    "Ngày mưa ở nhà pha trà, nghe nhạc, thế là đủ hạnh phúc rồi 🍵🎶",
    "Gym xong rồi mới thấy ngày hôm nay trọn vẹn. Đừng lười nha mọi người! 💪🔥",
    "Sinh nhật mẹ hôm nay, chúc mẹ mãi khỏe mạnh và hạnh phúc! ❤️🎂",
    "Vừa đặt chân đến Hội An, phố cổ đèn lồng lung linh huyền ảo quá ✨🏮",
    "Biết ơn vì hôm nay vẫn được thức dậy, thở, và yêu thương ❤️",
    "Sống chậm lại, tận hưởng từng khoảnh khắc nhỏ bé trong cuộc sống 🌿",
]

_FEW_SHOT_EN = [
    "Just had the most amazing beach day with family. These moments are everything 🌅❤️",
    "Morning run done! 5K complete and feeling unstoppable 🏃‍♂️💪",
    "Coffee + good book + rainy day = perfect Saturday ☕📚🌧️",
    "Finally finished that project. Hard work always pays off! 🙌",
    "Grateful for every little thing today. Life is beautiful 🌸✨",
    "Weekend brunch with the best people. Nothing beats good food and great company 🥞❤️",
    "New week, new goals, new energy. Let's do this! 💪🔥",
    "Nature walks are the best therapy. Cleared my head completely 🌿🧘",
    "Set a personal record at the gym today. Progress feels so good 💪",
    "Laughed so hard today my stomach hurts. Good friends are everything 😂❤️",
]

# Mood → Vietnamese descriptive phrase
_MOOD_DESC_VI = {
    "happy":       "vui vẻ, hạnh phúc",
    "sad":         "buồn bã, tâm tư",
    "excited":     "phấn khích, hào hứng",
    "thoughtful":  "suy tư, chiêm nghiệm",
    "motivated":   "đầy động lực, quyết tâm",
    "relaxed":     "thư giãn, bình yên",
    "angry":       "bực bội nhưng vẫn ổn",
    "grateful":    "biết ơn, trân trọng",
    "funny":       "hài hước, vui nhộn",
    "romantic":    "lãng mạn, ngọt ngào",
}

_MOOD_DESC_EN = {
    "happy":       "happy and joyful",
    "sad":         "a bit sad",
    "excited":     "excited and thrilled",
    "thoughtful":  "reflective and thoughtful",
    "motivated":   "motivated and determined",
    "relaxed":     "relaxed and at peace",
    "angry":       "frustrated but okay",
    "grateful":    "grateful and appreciative",
    "funny":       "funny and lighthearted",
    "romantic":    "romantic and sweet",
}

# Category → Vietnamese label
_CATEGORY_LABEL_VI = {
    "travel":      "du lịch, khám phá",
    "food":        "ẩm thực, món ăn",
    "fitness":     "thể thao, sức khỏe",
    "lifestyle":   "lối sống, cuộc sống hàng ngày",
    "work":        "công việc, sự nghiệp",
    "family":      "gia đình",
    "friendship":  "bạn bè",
    "nature":      "thiên nhiên",
    "motivation":  "động lực, cảm hứng",
    "general":     "cuộc sống",
}

_CATEGORY_LABEL_EN = {
    "travel":      "travel and exploration",
    "food":        "food and dining",
    "fitness":     "fitness and health",
    "lifestyle":   "lifestyle and daily life",
    "work":        "work and career",
    "family":      "family",
    "friendship":  "friendship",
    "nature":      "nature",
    "motivation":  "motivation and inspiration",
    "general":     "life",
}


def build_prompt(
    keywords: Optional[List[str]] = None,
    mood: Optional[str] = None,
    category: Optional[str] = None,
    context: Optional[str] = None,
    language: str = "vi",
    num_shots: int = 3,
) -> str:
    """
    Build a few-shot prompt so the model understands:
      1. Format: short social-media status lines
      2. Topic:  derived from keywords / mood / category / context
    """
    if language == "vi":
        return _build_vi(keywords, mood, category, context, num_shots)
    return _build_en(keywords, mood, category, context, num_shots)


# ---------------------------------------------------------------------------
# Vietnamese prompt
# ---------------------------------------------------------------------------

def _build_vi(
    keywords: Optional[List[str]],
    mood: Optional[str],
    category: Optional[str],
    context: Optional[str],
    num_shots: int,
) -> str:
    examples = random.sample(_FEW_SHOT_VI, min(num_shots, len(_FEW_SHOT_VI)))
    shot_block = "\n".join(f"- {e}" for e in examples)

    # Build topic description
    topic_parts: List[str] = []
    if keywords:
        topic_parts.append(", ".join(keywords))
    if category and category in _CATEGORY_LABEL_VI:
        topic_parts.append(_CATEGORY_LABEL_VI[category])
    if context:
        topic_parts.append(context.strip())

    topic = "; ".join(topic_parts) if topic_parts else "cuộc sống"

    mood_str = ""
    if mood and mood in _MOOD_DESC_VI:
        mood_str = f" (cảm xúc: {_MOOD_DESC_VI[mood]})"

    prompt = (
        f"Dưới đây là các status mạng xã hội ngắn, tự nhiên, tiếng Việt:\n"
        f"{shot_block}\n\n"
        f"Viết một status mạng xã hội về chủ đề: {topic}{mood_str}.\n"
        f"Status:"
    )
    return prompt


# ---------------------------------------------------------------------------
# English prompt
# ---------------------------------------------------------------------------

def _build_en(
    keywords: Optional[List[str]],
    mood: Optional[str],
    category: Optional[str],
    context: Optional[str],
    num_shots: int,
) -> str:
    examples = random.sample(_FEW_SHOT_EN, min(num_shots, len(_FEW_SHOT_EN)))
    shot_block = "\n".join(f"- {e}" for e in examples)

    topic_parts: List[str] = []
    if keywords:
        topic_parts.append(", ".join(keywords))
    if category and category in _CATEGORY_LABEL_EN:
        topic_parts.append(_CATEGORY_LABEL_EN[category])
    if context:
        topic_parts.append(context.strip())

    topic = "; ".join(topic_parts) if topic_parts else "everyday life"

    mood_str = ""
    if mood and mood in _MOOD_DESC_EN:
        mood_str = f" (tone: {_MOOD_DESC_EN[mood]})"

    prompt = (
        f"Here are some short, natural social media status posts:\n"
        f"{shot_block}\n\n"
        f"Write a social media status about: {topic}{mood_str}.\n"
        f"Status:"
    )
    return prompt
