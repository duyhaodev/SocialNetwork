"""
Content Moderator — phát hiện nội dung nhạy cảm trong bài đăng mạng xã hội.

Chạy hoàn toàn local, không cần API ngoài.

Phân loại:
  profanity      — từ tục tĩu, chửi thề
  hate_speech    — kỳ thị, phân biệt đối xử
  violence       — đe dọa, kêu gọi bạo lực
  adult_content  — nội dung người lớn, tình dục
  personal_info  — thông tin cá nhân (SĐT, CCCD, tài khoản ngân hàng)
  spam           — quảng cáo, spam, lừa đảo

Mức cảnh báo:
  safe      — không phát hiện vấn đề
  mild      — có thể gây hiểu lầm, nên cân nhắc
  moderate  — chứa nội dung nhạy cảm, cần chỉnh sửa
  severe    — vi phạm nghiêm trọng, không nên đăng
"""

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

# ---------------------------------------------------------------------------
# Từ điển nhạy cảm
# ---------------------------------------------------------------------------

_PROFANITY: List[str] = [
    # ── Viết tắt chửi thề tiếng Việt ──────────────────────────────────────
    "đmm", "đm", "đkm", "đcm", "dmm", "dm", "vl", "vkl",
    "clgt", "clm", "đl", "đll", "wtf", "stfu", "omfg",
    # ── Câu chửi đầy đủ tiếng Việt ────────────────────────────────────────
    "mẹ kiếp", "mẹ mày", "tiên sư mày", "tiên sư cha mày",
    "cha mày", "má mày", "bố mày chết", "đồ con hoang",
    "đồ mả cha", "mả cha mày", "mả mẹ mày",
    "cút xéo", "cút đi", "xéo đi", "biến đi",
    # ── Xúc phạm cá nhân tiếng Việt ───────────────────────────────────────
    "chó chết", "thằng chó", "con chó", "đồ chó", "như chó",
    "đồ khốn", "thằng khốn", "con khốn", "đồ khốn nạn", "khốn nạn",
    "đồ ngu", "thằng ngu", "con ngu", "ngu như bò", "ngu như chó",
    "ngu vl", "ngu xuẩn", "ngu dốt", "ngu ngốc", "ngu si",
    "đồ điên", "thằng điên", "con điên", "điên khùng",
    "đồ chết", "mày chết đi", "đồ súc vật", "đồ mất dạy",
    "đĩ thúi", "gái điếm", "đồ điếm", "cave bẩn",
    "đồ rác", "đồ bỏ đi", "rác rưởi", "cặn bã", "đồ phế",
    "vô dụng", "vô học", "vô lại", "hèn hạ", "hèn mạt",
    "đần độn", "óc lợn", "não cá vàng", "não bã đậu",
    "đầu óc bã đậu", "nói chuyện như chó",
    # ── Từ tục tiếng Việt ──────────────────────────────────────────────────
    "địt", "địt mẹ", "địt cha", "cặc", "lồn", "buồi",
    "đụ", "đụ mẹ", "đụ má", "đụ cha",
    # ── Từ xúc phạm đứng độc lập (word-boundary) ──────────────────────────
    "ngu", "khốn", "điên", "đần", "ngốc",
    "hèn", "dốt", "tởm", "ghê tởm",
    # ── Tiếng Anh — chửi thề / tục tĩu ───────────────────────────────────
    "fuck", "fucking", "fucker", "fck", "f*ck", "fuk",
    "shit", "bullshit", "shitty", "sht",
    "bitch", "son of a bitch", "sob",
    "asshole", "ass", "bastard", "dumbass",
    "crap", "damn", "dammit", "hell",
    "motherfucker", "mf", "mfer",
    "dick", "cock", "pussy", "cunt",
    "whore", "slut", "hoe",
    "jackass", "idiot", "moron", "retard", "stupid",
    "loser", "jerk", "douche", "douchebag",
    "piss off", "get lost", "go to hell", "shut up",
    "screw you", "go fuck yourself",
]

_HATE_SPEECH: List[str] = [
    # ── Kỳ thị chủng tộc / sắc tộc (VI) ──────────────────────────────────
    "mọi rợ", "man di mọi rợ", "dân mọi", "mọi đen",
    "dân da đen", "bọn da đen", "đồ da đen",
    "dân tàu", "đồ tàu khựa", "tàu khựa",
    "mán", "thằng mán", "đồ mán",
    # ── Kỳ thị vùng miền (VI) ─────────────────────────────────────────────
    "dân tỉnh lẻ quê mùa", "dân quê mùa", "dân nhà quê",
    "đồ miền quê", "bắc kỳ", "nam kỳ", "trung kỳ", "mọi miền núi",
    # ── Kỳ thị giới tính / LGBT+ (VI) ─────────────────────────────────────
    "pê đê", "bê đê", "lại cái", "bóng lộ",
    "đồng tính bệnh hoạn", "gay bệnh", "les bệnh",
    "người chuyển giới bệnh hoạn", "tranny",
    "đàn bà mà làm lãnh đạo", "phụ nữ không biết lái xe",
    "đàn bà vào bếp đi", "phụ nữ chỉ biết nội trợ",
    # ── Kỳ thị tôn giáo (VI) ──────────────────────────────────────────────
    "đạo giả", "tà đạo", "đạo hồi khủng bố", "bọn theo đạo",
    # ── Xúc phạm nhóm người (VI) ──────────────────────────────────────────
    "người già vô dụng", "người tàn tật vô dụng", "người khuyết tật ăn hại",
    "đám ăn hại", "bọn nghèo hèn", "đám dốt nát", "bọn thất học",
    "người béo đáng bị ghét", "đồ mập xấu xí",
    "phụ nữ không đáng được tôn trọng", "đàn bà chỉ là đồ vật",
    # ── Tiếng Anh — hate speech ───────────────────────────────────────────
    "nigger", "nigga", "negro",
    "chink", "gook", "spic", "wetback", "kike", "towelhead",
    "white trash", "redneck",
    "faggot", "fag", "dyke", "tranny", "shemale",
    "women belong in kitchen", "go back to your country",
    "white supremacy", "ethnic cleansing", "kill all",
    "inferior race", "subhuman",
    "all muslims are terrorists", "all jews are",
    "disabled people are useless", "retards should be",
]

_VIOLENCE: List[str] = [
    # ── Đe dọa trực tiếp (VI) ─────────────────────────────────────────────
    "tao giết mày", "tao sẽ giết", "tao giết chết", "tao định giết",
    "mày sẽ chết", "mày chết đi", "cho mày chết", "mày không sống được đâu",
    "tao chém mày", "tao sẽ chém", "chém mày", "chém chết mày", "cho mày ăn dao",
    "tao đánh mày", "tao sẽ đánh", "đánh mày", "đánh đến chết", "đánh chết mày",
    "tao xử mày", "xử đẹp mày", "tao sẽ xử", "sẽ xử mày", "xử mày",
    "tao hành mày", "hành mày", "ra đây tao đánh", "đợi tao ra đó",
    "tao bắn mày", "tao sẽ bắn", "bắn chết", "tao thịt mày",
    "đập tan xác", "băm xác", "chặt đầu", "chặt tay",
    "tạt axit", "đổ axit lên", "thiêu sống",
    "đâm chết", "đâm mày", "cầm dao đâm", "rút dao đâm",
    # ── Từ hành động nguy hiểm đứng độc lập ──────────────────────────────
    "chém", "đâm", "bắn", "thiêu", "tạt axit",
    # ── Kêu gọi bạo lực nhóm (VI) ────────────────────────────────────────
    "đánh chết bọn", "giết hết bọn", "tiêu diệt bọn",
    "đánh hội đồng", "kéo nhau đi đánh", "rủ nhau đi đánh",
    "ném đá vào", "đốt nhà", "đốt xe", "phá nhà",
    "đập phá", "cướp", "hành hung",
    # ── Hành động nguy hiểm / máu me ──────────────────────────────────────
    "máu me", "chảy máu", "đổ máu", "giết người",
    "chém người", "băng đảng", "giang hồ xử nhau",
    "thanh toán nhau", "thanh trừng", "thủ tiêu",
    "bắt cóc", "tống tiền", "cướp của", "giết người cướp của",
    "tra tấn", "hành hạ", "bạo hành",
    # ── Tự làm hại bản thân (VI) ──────────────────────────────────────────
    "tự tử thôi", "muốn tự tử", "sẽ tự tử",
    "không muốn sống nữa", "muốn chết đi", "chán sống",
    "sẽ kết thúc tất cả", "lấy tính mạng", "kết liễu",
    "tự cắt tay", "tự làm đau bản thân",
    # ── Tiếng Anh — threats & violence ───────────────────────────────────
    "i will kill you", "i'll kill you", "gonna kill",
    "i will hurt you", "you will die", "you're dead",
    "i will stab", "i will shoot", "gonna shoot",
    "beat you up", "beat the shit", "smash your face",
    "burn your house", "blow up", "bomb threat",
    "want to die", "want to kill myself", "going to end it",
    "suicide", "self harm", "cut myself",
    "kill them all", "wipe them out",
    "shoot up", "mass shooting", "school shooting",
    "terrorist attack", "blow myself up",
    "murder", "slaughter", "massacre",
]

_ADULT_CONTENT: List[str] = [
    # ── Từ ngữ tình dục tiếng Việt ────────────────────────────────────────
    "khiêu dâm", "phim khiêu dâm", "nội dung khiêu dâm",
    "phim sex", "video sex", "clip sex", "ảnh sex",
    "ảnh nude", "ảnh nóng", "clip nóng", "video nóng",
    "gái gọi", "trai gọi", "dịch vụ tình dục",
    "mua dâm", "bán dâm", "mại dâm",
    "massage kích dục", "massage tình dục", "massage happy ending",
    "tìm bạn qua đêm", "ngủ qua đêm có thù lao",
    "quan hệ tình dục", "làm tình", "giao cấu",
    "sờ soạng", "sàm sỡ", "quấy rối tình dục",
    "hiếp dâm", "cưỡng hiếp", "xâm hại tình dục",
    "ấu dâm", "xâm hại trẻ em",
    "dâm ô", "dâm dục", "trụy lạc",
    "phim người lớn", "nội dung 18+",
    # ── Tiếng Anh — adult content ─────────────────────────────────────────
    "porn", "pornography", "xxx",
    "nude photo", "nude video", "naked picture",
    "sex tape", "sex video", "adult film",
    "prostitution", "escort service", "call girl",
    "one night stand for money", "sugar daddy arrangement",
    "sexual harassment", "rape", "sexual assault",
    "child abuse", "child pornography", "pedophile", "cp",
    "molest", "grope",
    "nsfw", "onlyfans leak", "leaked nudes",
    "hookup for cash", "pay for sex",
]

_SPAM_PATTERNS: List[str] = [
    # ── Kiếm tiền nhanh / đa cấp (VI) ────────────────────────────────────
    "kiếm tiền online dễ dàng", "kiếm triệu mỗi ngày",
    "kiếm tiền không cần làm việc", "thu nhập khủng tại nhà",
    "làm giàu nhanh chóng", "bí quyết làm giàu",
    "kinh doanh đa cấp", "mô hình kim tự tháp",
    "đầu tư 0 rủi ro", "lợi nhuận 100%", "cam kết hoàn vốn",
    "lãi suất cao bất thường", "lãi 30% mỗi tháng",
    "tiền ảo đảm bảo lãi", "crypto đảm bảo sinh lời",
    "forex uy tín cam kết", "sàn forex hoàn tiền",
    # ── Lừa đảo (VI) ──────────────────────────────────────────────────────
    "bạn đã trúng thưởng", "bạn trúng thưởng", "chúc mừng bạn trúng",
    "nhấp vào link", "nhấp link", "click link", "click vào link",
    "nhận quà ngay", "nhận thưởng ngay", "click nhận thưởng ngay",
    "nhận iphone miễn phí", "nhận xe máy miễn phí",
    "nhận tiền mặt ngay", "quà tặng hấp dẫn chờ bạn",
    "nạp tiền nhận bonus khủng", "cá độ uy tín hoàn tiền",
    "link cược uy tín", "xổ số online uy tín",
    "hack tài khoản ngân hàng", "hack tiền điện thoại",
    "thẻ cào miễn phí", "nạp thẻ miễn phí",
    # ── Spam bán hàng / hàng giả (VI) ────────────────────────────────────
    "hàng nhái y hệt hàng thật", "hàng fake chất lượng cao",
    "thuốc giảm cân thần kỳ", "giảm cân không cần ăn kiêng",
    "thuốc tăng cường sinh lý", "thuốc cường dương",
    "thuốc ngoài luồng", "thuốc không rõ nguồn gốc",
    "mua followers", "tăng like ảo", "view ảo giá rẻ",
    # ── Tiếng Anh — spam / scam ───────────────────────────────────────────
    "click here to claim", "you have won", "congratulations you won",
    "free iphone", "free gift", "claim your prize", "limited time offer",
    "make money fast", "make money online easy", "earn money from home",
    "earn fast cash", "passive income guaranteed", "financial freedom fast",
    "investment with guaranteed return", "zero risk investment",
    "guaranteed profit", "100% profit", "risk free investment",
    "buy followers", "buy likes cheap", "fake views", "buy real followers",
    "pyramid scheme", "mlm opportunity", "get rich quick", "quick money",
    "wire transfer scam", "nigerian prince", "send me money",
    "your account has been compromised", "verify your account now",
    "click the link below to win", "you are selected", "lucky winner",
    "lose weight fast", "miracle diet pill", "lose 10kg in 1 week",
    "magic weight loss", "diet pill no exercise",
    "enlargement pill", "male enhancement", "sexual performance pill",
]

# Regex để phát hiện thông tin cá nhân
_PERSONAL_INFO_PATTERNS: List[Tuple[str, str, str]] = [
    # (pattern, category_label, description)
    (
        r"\b0[3-9]\d{8}\b",
        "phone_number",
        "Số điện thoại",
    ),
    (
        r"\b0[1-9]\d{10}\b",
        "phone_number",
        "Số điện thoại",
    ),
    (
        r"\b\d{9}\b",
        "id_card",
        "Có thể là số CMND (9 chữ số)",
    ),
    (
        r"\b\d{12}\b",
        "id_card",
        "Có thể là số CCCD (12 chữ số)",
    ),
    (
        r"\b[0-9]{6,20}\b(?=.*(?:tài khoản|tk|stk|số tài khoản|account))",
        "bank_account",
        "Số tài khoản ngân hàng",
    ),
    (
        r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}",
        "email",
        "Địa chỉ email",
    ),
]

# ---------------------------------------------------------------------------
# Cấu hình mức cảnh báo
# ---------------------------------------------------------------------------

# category → mức tối thiểu khi phát hiện
_CATEGORY_SEVERITY: Dict[str, str] = {
    "profanity":     "mild",
    "hate_speech":   "moderate",
    "violence":      "severe",
    "adult_content": "severe",
    "personal_info": "moderate",
    "spam":          "mild",
}

_LEVEL_ORDER = ["safe", "mild", "moderate", "severe"]

_CATEGORY_LABELS_VI: Dict[str, str] = {
    "profanity":     "Từ tục tĩu / chửi thề",
    "hate_speech":   "Ngôn ngữ kỳ thị / phân biệt",
    "violence":      "Nội dung bạo lực / đe dọa",
    "adult_content": "Nội dung người lớn",
    "personal_info": "Thông tin cá nhân",
    "spam":          "Quảng cáo / spam",
}

_WARNING_MESSAGES: Dict[str, str] = {
    "safe":     "Nội dung bài viết có vẻ phù hợp để đăng.",
    "mild":     "Bài viết có một số từ ngữ có thể gây hiểu lầm. Bạn nên cân nhắc trước khi đăng.",
    "moderate": "Bài viết chứa nội dung nhạy cảm. Hãy chỉnh sửa trước khi đăng.",
    "severe":   "Bài viết vi phạm tiêu chuẩn cộng đồng. Không nên đăng nội dung này.",
}


# ---------------------------------------------------------------------------
# Kết quả phát hiện
# ---------------------------------------------------------------------------

@dataclass
class FlaggedItem:
    word: str
    category: str
    category_label: str
    severity: str


@dataclass
class ModerationResult:
    is_safe: bool
    warning_level: str                        # safe / mild / moderate / severe
    categories: List[str]                     # danh sách category vi phạm
    flagged_items: List[FlaggedItem]
    message: str
    suggestion: str


# ---------------------------------------------------------------------------
# Chuẩn hóa văn bản
# ---------------------------------------------------------------------------

def _normalize(text: str) -> str:
    """
    Chuẩn hóa để phát hiện cách viết biến thể:
      - lowercase
      - bỏ khoảng trắng thừa
      - thu gọn ký tự lặp (đmmmmm → đmm)
      - một số substitution phổ biến (@ → a, 0 → o)
    """
    text = text.lower().strip()
    # Thay thế ký tự phổ biến
    substitutions = {
        "@": "a", "0": "o", "1": "i", "3": "e",
        "4": "a", "5": "s", "8": "b", "$": "s",
        "*": "", "!": "",
    }
    for k, v in substitutions.items():
        text = text.replace(k, v)
    # Thu gọn ký tự lặp (>2 lần)
    text = re.sub(r"(.)\1{2,}", r"\1\1", text)
    # Collapse spaces
    text = re.sub(r"\s+", " ", text)
    return text


def _build_pattern(word: str) -> re.Pattern:
    """
    Tạo regex cho từ / cụm từ:
    - Từ ngắn ≤3 ký tự, không chứa khoảng trắng
        → word-boundary để tránh false positive ("cl" trong "click")
    - Cụm từ 2 từ có dạng "X Y" (chủ ngữ + hành động)
        → cho phép 0-3 từ đệm giữa X và Y
          vd: "tao chém mày" khớp cả "tao sẽ chém mày"
    - Các cụm từ khác
        → cho phép khoảng trắng / ký tự ngăn cách thông thường
    """
    is_short_abbrev = len(word) <= 3 and " " not in word

    if is_short_abbrev:
        escaped = re.escape(word)
        pattern = r"(?<![a-zA-ZÀ-ỹ\d])" + escaped + r"(?![a-zA-ZÀ-ỹ\d])"
        return re.compile(pattern, re.IGNORECASE | re.UNICODE)

    parts = word.split()

    if len(parts) == 3:
        # "A B C" → cho phép tối đa 2 từ đệm giữa mỗi cặp
        a, b, c = (re.escape(p) for p in parts)
        GAP = r"(?:\s+\S+){0,2}\s+"
        pattern = a + GAP + b + GAP + c
    elif len(parts) == 2:
        # "A B" → cho phép tối đa 2 từ đệm ở giữa
        a, b = (re.escape(p) for p in parts)
        GAP = r"(?:\s+\S+){0,2}\s+"
        pattern = a + GAP + b
    else:
        # cụm dài hơn → match linh hoạt khoảng trắng
        escaped = re.escape(word)
        pattern = re.sub(r"\\ ", r"[\\s]+", escaped)

    return re.compile(pattern, re.IGNORECASE | re.UNICODE)


# Pre-compile tất cả pattern một lần
_WORD_LISTS: Dict[str, List[str]] = {
    "profanity":    _PROFANITY,
    "hate_speech":  _HATE_SPEECH,
    "violence":     _VIOLENCE,
    "adult_content": _ADULT_CONTENT,
    "spam":         _SPAM_PATTERNS,
}

_COMPILED: Dict[str, List[Tuple[re.Pattern, str]]] = {}
for _cat, _words in _WORD_LISTS.items():
    _COMPILED[_cat] = [(_build_pattern(w), w) for w in _words]

_COMPILED_PERSONAL = [
    (re.compile(pat, re.IGNORECASE), label, desc)
    for pat, label, desc in _PERSONAL_INFO_PATTERNS
]


# ---------------------------------------------------------------------------
# Core logic
# ---------------------------------------------------------------------------

def _bump_level(current: str, new: str) -> str:
    """Trả về mức cao hơn giữa current và new."""
    return _LEVEL_ORDER[max(_LEVEL_ORDER.index(current), _LEVEL_ORDER.index(new))]


def moderate(content: str, strict: bool = False) -> ModerationResult:
    """
    Kiểm tra nội dung bài đăng.

    Args:
        content:  Văn bản cần kiểm tra.
        strict:   True → cảnh báo cả mức "mild" (không đăng được);
                  False → chỉ cảnh báo, người dùng tự quyết định.

    Returns:
        ModerationResult với đầy đủ thông tin cảnh báo.
    """
    normalized = _normalize(content)
    flagged: List[FlaggedItem] = []
    seen_words: set = set()

    # 1. Kiểm tra từ điển
    for cat, patterns in _COMPILED.items():
        for pattern, original_word in patterns:
            if pattern.search(normalized):
                if original_word not in seen_words:
                    seen_words.add(original_word)
                    flagged.append(FlaggedItem(
                        word=original_word,
                        category=cat,
                        category_label=_CATEGORY_LABELS_VI[cat],
                        severity=_CATEGORY_SEVERITY[cat],
                    ))

    # 2. Kiểm tra thông tin cá nhân (dùng text gốc, không normalize)
    for pattern, label, desc in _COMPILED_PERSONAL:
        match = pattern.search(content)
        if match:
            matched_text = match.group(0)
            key = f"personal_info:{matched_text}"
            if key not in seen_words:
                seen_words.add(key)
                flagged.append(FlaggedItem(
                    word=matched_text,
                    category="personal_info",
                    category_label=f"{_CATEGORY_LABELS_VI['personal_info']} ({desc})",
                    severity=_CATEGORY_SEVERITY["personal_info"],
                ))

    # 3. Tính mức cảnh báo tổng hợp
    warning_level = "safe"
    for item in flagged:
        warning_level = _bump_level(warning_level, item.severity)

    # 4. Danh sách category duy nhất
    categories = list(dict.fromkeys(item.category for item in flagged))

    # 5. Xác định is_safe
    if strict:
        is_safe = (warning_level == "safe")
    else:
        is_safe = warning_level in ("safe", "mild")

    # 6. Thông điệp + gợi ý
    message = _WARNING_MESSAGES[warning_level]
    suggestion = _build_suggestion(categories, warning_level)

    return ModerationResult(
        is_safe=is_safe,
        warning_level=warning_level,
        categories=categories,
        flagged_items=flagged,
        message=message,
        suggestion=suggestion,
    )


def _build_suggestion(categories: List[str], level: str) -> str:
    """Sinh gợi ý cụ thể dựa trên category vi phạm."""
    if not categories:
        return "Bài viết của bạn sẵn sàng để đăng!"

    tips = []
    if "profanity" in categories:
        tips.append("Thay thế các từ tục tĩu bằng ngôn ngữ lịch sự hơn.")
    if "hate_speech" in categories:
        tips.append("Bỏ các từ ngữ kỳ thị hoặc phân biệt đối xử.")
    if "violence" in categories:
        tips.append("Loại bỏ nội dung đe dọa hoặc kêu gọi bạo lực.")
    if "adult_content" in categories:
        tips.append("Nội dung người lớn không được phép đăng công khai.")
    if "personal_info" in categories:
        tips.append("Cân nhắc che/xóa thông tin cá nhân nhạy cảm (SĐT, CCCD, email).")
    if "spam" in categories:
        tips.append("Bỏ các nội dung quảng cáo hoặc có dấu hiệu lừa đảo.")

    return " ".join(tips)
