"""
Smart Suggest — nhận diện chủ đề từ context/keywords,
sau đó chọn các bài viết sáng tạo phù hợp từ content_library.
"""

import random
import re
from typing import List, Optional, Tuple

from app.utils.content_library import TOPIC_LIBRARY

# ---------------------------------------------------------------------------
# Bảng từ khóa nhận diện chủ đề
# ---------------------------------------------------------------------------

_TOPIC_KEYWORDS = {
    "birthday": [
        "sinh nhật", "birthday", "tuổi mới", "bánh kem",
        "chúc mừng sinh nhật", "happy birthday", "nến", "thổi nến",
    ],
    "new_year": [
        "năm mới", "tết", "tết nguyên đán", "chúc mừng năm mới",
        "happy new year", "xuân", "mùa xuân", "pháo hoa",
        "giao thừa", "ngày tết", "đầu năm", "năm nay", "năm tới",
        "lì xì", "hoa đào", "hoa mai", "tất niên",
    ],
    "graduation": [
        "tốt nghiệp", "ra trường", "graduation", "bảo vệ luận văn",
        "nhận bằng", "đại học", "học xong", "thi xong", "kết thúc",
        "ra trường rồi", "tốt nghiệp rồi",
    ],
    "travel": [
        "du lịch", "chuyến đi", "đi chơi", "khám phá", "travel",
        "hành trình", "đặt vé", "xuất phát", "lên đường", "phượt",
        "biển", "núi", "đà lạt", "hà nội", "sài gòn", "hội an",
        "đi biển", "đi núi", "nghỉ mát", "resort", "check-in",
        "vũng tàu", "phú quốc", "nha trang", "đà nẵng",
    ],
    "fitness": [
        "gym", "tập gym", "chạy bộ", "thể dục", "workout", "thể thao",
        "yoga", "bơi lội", "đạp xe", "leo núi", "marathon",
        "personal record", "tập luyện", "cơ thể khỏe",
    ],
    "food": [
        "ăn ngon", "món ăn", "bữa ăn", "nhà hàng", "quán ăn", "nấu ăn",
        "phở", "bún bò", "cơm tấm", "lẩu", "bánh mì", "ẩm thực",
        "đặt đồ ăn", "food", "thưởng thức", "đi ăn",
    ],
    "coffee": [
        "cà phê", "coffee", "cafe", "pha cà phê", "ly cà phê",
        "cà phê sáng", "ngồi cà phê",
    ],
    "rain": [
        "mưa", "rain", "trời mưa", "mưa rơi", "mưa to",
        "mưa phùn", "trời lạnh", "lạnh",
    ],
    "morning": [
        "sáng", "buổi sáng", "thức dậy", "dậy sớm",
        "good morning", "ngày mới", "thứ hai", "đầu tuần",
        "bắt đầu ngày", "sáng nay", "trà sáng",
    ],
    "family": [
        "gia đình", "ba mẹ", "bố mẹ", "anh chị em", "con cái",
        "về nhà", "sum họp", "họp mặt gia đình", "ông bà", "người thân",
    ],
    "friendship": [
        "bạn bè", "hội bạn", "bạn thân", "bạn cũ",
        "hội tụ", "gặp gỡ", "tụ tập", "gặp bạn",
    ],
    "love": [
        "tình yêu", "người yêu", "yêu nhau", "hẹn hò",
        "kỷ niệm tình yêu", "anniversary", "couple", "lãng mạn",
        "nhớ em", "nhớ anh", "yêu mình", "valentine",
    ],
    "achievement": [
        "thành công", "hoàn thành", "đạt được", "thăng chức",
        "kết quả tốt", "chiến thắng", "vượt qua", "milestone",
        "mục tiêu", "deadline xong", "pass", "đậu", "trúng tuyển",
    ],
    "weekend": [
        "cuối tuần", "weekend", "thứ 7", "chủ nhật",
        "saturday", "sunday", "nghỉ cuối tuần",
    ],
    "holiday": [
        "nghỉ lễ", "nghỉ hè", "kỳ nghỉ", "holiday", "vacation",
        "nghỉ phép", "ngày nghỉ", "30/4", "2/9", "1/1",
    ],
    "work_stress": [
        "mệt", "áp lực", "stress", "căng thẳng", "deadline",
        "overtime", "làm thêm giờ", "công việc mệt", "kiệt sức",
        "burnout", "áp lực công việc",
    ],
    "promotion": [
        "thăng chức", "tăng lương", "promotion", "sếp mới",
        "vị trí mới", "công việc mới", "job mới", "offer",
        "nhận việc", "first day",
    ],
    "moving": [
        "dọn nhà", "nhà mới", "chuyển nhà", "moving",
        "dọn phòng", "không gian mới", "địa chỉ mới",
    ],
    "pet": [
        "thú cưng", "chó", "mèo", "pet", "cún", "boss",
        "adopt", "nhận nuôi", "mèo con", "chó con",
    ],
    "self_love": [
        "yêu bản thân", "bản thân", "me time", "chăm sóc bản thân",
        "tự yêu", "tự chăm sóc", "spa", "thư giãn", "nghỉ ngơi",
        "tắm bồn", "đọc sách", "xem phim một mình", "solo", "tự do",
        "không cần ai", "chỉ cần mình", "sống cho mình",
    ],
    "nature": [
        "hoàng hôn", "bình minh", "thiên nhiên", "nature", "sunset", "sunrise",
        "trời xanh", "mây trắng", "cánh đồng", "rừng", "biển xanh",
        "gió mát", "ánh nắng", "trăng", "sao", "đêm", "bầu trời",
        "hoa nở", "lá rụng", "mùa thu", "mùa hè",
    ],
}

# Mood → style ưu tiên
_MOOD_TO_STYLES = {
    "happy":       ["casual", "heartfelt", "poetic"],
    "excited":     ["casual", "inspirational", "funny"],
    "motivated":   ["inspirational", "casual", "heartfelt"],
    "thoughtful":  ["poetic", "heartfelt", "inspirational"],
    "relaxed":     ["poetic", "casual", "heartfelt"],
    "grateful":    ["heartfelt", "poetic", "inspirational"],
    "sad":         ["heartfelt", "poetic", "inspirational"],
    "funny":       ["funny", "casual", "heartfelt"],
    "romantic":    ["poetic", "heartfelt", "casual"],
    "angry":       ["inspirational", "heartfelt", "casual"],
}

_DEFAULT_STYLES = ["casual", "poetic", "inspirational", "heartfelt", "funny"]


def _detect_topic(
    context: Optional[str],
    keywords: Optional[List[str]],
    category: Optional[str],
) -> str:
    """Nhận diện chủ đề từ context + keywords + category."""

    # 1. Category từ user → map trực tiếp
    _CAT_TO_TOPIC = {
        "travel":     "travel",
        "food":       "food",
        "fitness":    "fitness",
        "family":     "family",
        "friendship": "friendship",
        "motivation": "achievement",
        "work":       "work_stress",
        "lifestyle":  "self_love",
        "nature":     "nature",
        "general":    "general",
    }
    if category and category in _CAT_TO_TOPIC:
        mapped = _CAT_TO_TOPIC[category]
        if mapped != "general":
            return mapped

    # 2. Phân tích context + keywords
    combined = " ".join(filter(None, [
        context or "",
        " ".join(keywords or []),
    ])).lower()

    if not combined.strip():
        return "general"

    scores = {topic: 0 for topic in _TOPIC_KEYWORDS}
    for topic, kws in _TOPIC_KEYWORDS.items():
        for kw in kws:
            if kw in combined:
                # Từ khóa dài/cụ thể → điểm cao hơn
                scores[topic] += len(kw.split())

    best_topic = max(scores, key=lambda t: scores[t])
    if scores[best_topic] == 0:
        return "general"
    return best_topic


def _pick_styles(mood: Optional[str], n: int) -> List[str]:
    """Chọn n phong cách dựa trên mood, đảm bảo đa dạng."""
    style_priority = _MOOD_TO_STYLES.get(mood or "", _DEFAULT_STYLES)
    # Xoay vòng để đủ n phong cách
    styles = []
    i = 0
    while len(styles) < n:
        styles.append(style_priority[i % len(style_priority)])
        i += 1
    return styles


def generate_smart_suggestions(
    keywords: Optional[List[str]] = None,
    mood: Optional[str] = None,
    category: Optional[str] = None,
    context: Optional[str] = None,
    language: str = "vi",
    num_suggestions: int = 5,
) -> List[Tuple[str, float]]:
    """
    Sinh gợi ý status thông minh:
    1. Nhận diện chủ đề từ context/keywords/category
    2. Lấy nội dung từ thư viện theo chủ đề + phong cách phù hợp mood
    3. Trả về num_suggestions gợi ý đa dạng phong cách
    """
    if language != "vi":
        return _generate_en(keywords, mood, category, context, num_suggestions)

    topic = _detect_topic(context, keywords, category)
    topic_data = TOPIC_LIBRARY.get(topic, TOPIC_LIBRARY["general"])

    styles = _pick_styles(mood, num_suggestions)
    all_styles = list(topic_data.keys())

    results: List[Tuple[str, float]] = []
    seen: set = set()

    for style in styles:
        # Nếu style không có trong topic → dùng style ngẫu nhiên có sẵn
        actual_style = style if style in topic_data else random.choice(all_styles)
        pool = topic_data[actual_style].copy()
        random.shuffle(pool)

        for post in pool:
            if post not in seen:
                seen.add(post)
                results.append((post, 1.0))
                break  # Mỗi style 1 post

        if len(results) >= num_suggestions:
            break

    # Nếu vẫn chưa đủ → lấy thêm từ các style còn lại
    if len(results) < num_suggestions:
        for style in all_styles:
            pool = topic_data[style].copy()
            random.shuffle(pool)
            for post in pool:
                if post not in seen:
                    seen.add(post)
                    results.append((post, 1.0))
            if len(results) >= num_suggestions:
                break

    # Nếu vẫn thiếu → lấy từ general
    if len(results) < num_suggestions and topic != "general":
        general_data = TOPIC_LIBRARY["general"]
        for style in general_data:
            for post in general_data[style]:
                if post not in seen:
                    seen.add(post)
                    results.append((post, 1.0))
                if len(results) >= num_suggestions:
                    break

    return results[:num_suggestions]


def _generate_en(
    keywords, mood, category, context, num_suggestions
) -> List[Tuple[str, float]]:
    """English fallback — dùng general posts."""
    en_posts = [
        "Just had the most amazing experience. These moments are everything ❤️✨",
        "Grateful for today and all the little moments that made it special 🙏🌸",
        "New day, new energy. Let's make it count! 💪🔥",
        "Sometimes the best moments are the unplanned ones 🌟",
        "Life is good when you choose to see the good in it 😊",
        "Every day is a chance to do better, be better 🚀",
        "Simple moments, big happiness ☕🌿",
        "Proud of how far I've come. The journey continues 💫",
        "Laughed until my stomach hurt today. Good people = good life 😂❤️",
        "Slow down. Breathe. Appreciate the view 🌅",
    ]
    random.shuffle(en_posts)
    return [(p, 1.0) for p in en_posts[:num_suggestions]]
