"""
Build prompt cho model sinh status.

Format khop voi du lieu train trong data/build_dataset.py:
    "Chủ đề: <topic>. Status: <status text>"

Khi infer, prompt = "Chủ đề: <topic>. Status:" — model se sinh phan tiep theo.

Topic duoc xay dung tu (theo thu tu uu tien):
  1. context (chuoi tu nhien user nhap, vi du "đi ăn")
  2. keywords (list tu khoa)
  3. category (enum) — map sang ten tieng Viet
Mood neu co se duoc append vao prefix (vi du "đi ăn vui vẻ").
"""

from typing import List, Optional


# Mood -> tinh tu ngan gon de bo vao prefix
_MOOD_HINT_VI = {
    "happy":      "vui vẻ",
    "sad":        "buồn",
    "excited":    "hào hứng",
    "thoughtful": "suy tư",
    "motivated":  "đầy động lực",
    "relaxed":    "thư giãn",
    "angry":      "bực bội",
    "grateful":   "biết ơn",
    "funny":      "hài hước",
    "romantic":   "lãng mạn",
}

_MOOD_HINT_EN = {
    "happy":      "happy",
    "sad":        "sad",
    "excited":    "excited",
    "thoughtful": "thoughtful",
    "motivated":  "motivated",
    "relaxed":    "relaxed",
    "angry":      "angry",
    "grateful":   "grateful",
    "funny":      "funny",
    "romantic":   "romantic",
}

# Category -> nhan tieng Viet
_CATEGORY_LABEL_VI = {
    "travel":     "du lịch",
    "food":       "đi ăn",
    "fitness":    "thể thao",
    "lifestyle":  "lối sống",
    "work":       "công việc",
    "family":     "gia đình",
    "friendship": "bạn bè",
    "nature":     "thiên nhiên",
    "motivation": "động lực",
    "general":    "cuộc sống",
}

_CATEGORY_LABEL_EN = {
    "travel":     "travel",
    "food":       "food",
    "fitness":    "fitness",
    "lifestyle":  "lifestyle",
    "work":       "work",
    "family":     "family",
    "friendship": "friendship",
    "nature":     "nature",
    "motivation": "motivation",
    "general":    "life",
}


def build_prompt(
    keywords: Optional[List[str]] = None,
    mood: Optional[str] = None,
    category: Optional[str] = None,
    context: Optional[str] = None,
    language: str = "vi",
    **_kwargs,  # backward-compat
) -> str:
    """Build prompt theo format "Chủ đề: <topic>. Status:" (vi) hoac "Topic: ..." (en)."""
    if language == "vi":
        topic = _build_topic_vi(keywords, mood, category, context)
        return f"Chủ đề: {topic}. Status:"
    topic = _build_topic_en(keywords, mood, category, context)
    return f"Topic: {topic}. Status:"


def _build_topic_vi(
    keywords: Optional[List[str]],
    mood: Optional[str],
    category: Optional[str],
    context: Optional[str],
) -> str:
    parts: List[str] = []

    if context and context.strip():
        parts.append(context.strip())

    if keywords:
        kw_str = ", ".join(k for k in keywords if k.strip())
        if kw_str and kw_str not in parts:
            parts.append(kw_str)

    if category and category in _CATEGORY_LABEL_VI:
        cat_label = _CATEGORY_LABEL_VI[category]
        if not parts or not any(cat_label in p for p in parts):
            parts.append(cat_label)

    topic = " ".join(parts) if parts else "cuộc sống"

    if mood and mood in _MOOD_HINT_VI:
        topic = f"{topic} {_MOOD_HINT_VI[mood]}"

    return topic.strip()


def _build_topic_en(
    keywords: Optional[List[str]],
    mood: Optional[str],
    category: Optional[str],
    context: Optional[str],
) -> str:
    parts: List[str] = []
    if context and context.strip():
        parts.append(context.strip())
    if keywords:
        parts.append(", ".join(k for k in keywords if k.strip()))
    if category and category in _CATEGORY_LABEL_EN:
        parts.append(_CATEGORY_LABEL_EN[category])

    topic = " ".join(p for p in parts if p) or "everyday life"
    if mood and mood in _MOOD_HINT_EN:
        topic = f"{topic} ({_MOOD_HINT_EN[mood]})"
    return topic.strip()
