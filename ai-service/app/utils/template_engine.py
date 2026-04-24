"""
Template Engine — sinh status từ templates có sẵn.
Hoạt động ngay không cần fine-tune, luôn đúng chủ đề.

Nguyên tắc thiết kế template:
- {ctx} là cụm từ mô tả ngữ cảnh (danh từ HOẶC hành động)
- Template KHÔNG bắt đầu bằng "Vừa {ctx}" hay "Sau khi {ctx}"
  vì sẽ sai khi ctx là danh từ ("Sinh nhật vui vẻ", "Kỳ nghỉ hè")
- Dùng "Hôm nay {ctx}" hoặc đặt {ctx} ở giữa/cuối câu
"""

import random
import re
from typing import List, Optional, Tuple


# ---------------------------------------------------------------------------
# Template library  (category, mood) → list[str]
# {ctx} = normalized context / keywords
# ---------------------------------------------------------------------------

_TEMPLATES_VI: dict = {

    # ── TRAVEL ──────────────────────────────────────────────────────────────
    ("travel", "happy"): [
        "Hôm nay {ctx} 🌿☀️ Cuộc sống thật đẹp!",
        "{ctx} — khoảnh khắc này sẽ nhớ mãi ❤️✨",
        "{ctx}. Mệt nhưng xứng đáng từng giây! 🙌🔥",
        "Chuyến đi thật đáng nhớ: {ctx} 🌈",
        "{ctx} — không thể không chia sẻ điều này! 📸✨",
        "{ctx}. Yêu cuộc sống này thêm một chút nữa 🌟",
    ],
    ("travel", "excited"): [
        "{ctx}! Phấn khích lắm luôn 🎉🔥",
        "Không thể tin được — {ctx}. Tuyệt đỉnh! ⚡✨",
        "{ctx}. Hào hứng quá, muốn hét lên một tiếng 😍🌟",
        "{ctx} — cảm giác này không có gì sánh được 🚀",
        "Ngày hôm nay đỉnh lắm: {ctx} 🔥🎊",
        "{ctx}. Ai đồng cảm không? 🙋‍♀️🎉",
    ],
    ("travel", "relaxed"): [
        "{ctx} — bình yên và thư thái 🌿🌊",
        "Hôm nay {ctx}. Tâm hồn nhẹ nhàng hơn bao giờ hết 🌸",
        "{ctx}. Tạm quên hết lo toan, chỉ tận hưởng khoảnh khắc này 🍃",
        "{ctx} — đây mới là cuộc sống 😌☁️",
    ],
    ("travel", "grateful"): [
        "Biết ơn vì có ngày hôm nay: {ctx} 🙏❤️",
        "{ctx} — nhắc mình rằng cuộc sống có rất nhiều điều đẹp 🌸",
        "Cảm ơn cuộc đời vì {ctx}. Hạnh phúc giản dị thôi 🍃",
    ],

    # ── FOOD ────────────────────────────────────────────────────────────────
    ("food", "happy"): [
        "Hôm nay {ctx} 😋🍜 Ngon không thể tả!",
        "{ctx} — một trong những khoảnh khắc ngon nhất! 😍",
        "{ctx}. Ẩm thực là nghệ thuật, đúng không nào! 🍽️✨",
        "{ctx} rồi mà vẫn còn thèm 😂🤤",
        "Không cần đi đâu xa, {ctx} là đủ hạnh phúc 🍚❤️",
    ],
    ("food", "funny"): [
        "Nói ăn kiêng mà hôm nay lại: {ctx}... thôi mai tính 😅🍕",
        "Kế hoạch ăn kiêng: THẤT BẠI vì {ctx} quá hấp dẫn 😂",
        "{ctx} xong thì hối hận nhưng không hối hận 😂🤷",
        "Dạ dày mình quyết định mọi thứ: {ctx} 😂🍽️",
    ],
    ("food", "grateful"): [
        "{ctx} — bữa ăn cùng người thân luôn là hạnh phúc nhất 🍚❤️",
        "Biết ơn vì có {ctx} ấm áp bên gia đình 🙏",
    ],

    # ── FITNESS ─────────────────────────────────────────────────────────────
    ("fitness", "motivated"): [
        "{ctx}! Không có lý do gì để dừng lại 💪🔥",
        "{ctx} — mỗi ngày một chút, thành quả sẽ đến 💯",
        "Hôm nay {ctx} rồi, ngày mai tiếp tục! 🏃‍♂️",
        "{ctx}. Cơ thể khỏe, tinh thần tốt — bắt đầu ngày mới thôi! ⚡",
        "{ctx} — không có shortcut nào ngoài chăm chỉ 🌟",
    ],
    ("fitness", "excited"): [
        "Personal record hôm nay! {ctx} 🎉💪",
        "{ctx} — cảm giác chinh phục bản thân không gì sánh được! 🔥",
        "{ctx}. Phấn khích lắm luôn! 🏋️‍♂️⚡",
    ],
    ("fitness", "happy"): [
        "{ctx}. Cảm thấy sống lại rồi! 🌟💪",
        "Hôm nay {ctx}, ngày hoàn hảo hơn nhiều 😊",
        "{ctx} — đây là loại hạnh phúc không mua được 💚",
    ],

    # ── LIFESTYLE ───────────────────────────────────────────────────────────
    ("lifestyle", "relaxed"): [
        "Hôm nay {ctx}. Đơn giản vậy mà hạnh phúc 😌🍃",
        "{ctx} — những khoảnh khắc nhỏ bé làm nên cuộc sống đẹp 🌿",
        "{ctx}. Chậm lại và tận hưởng — đó là bí quyết 🌸",
        "{ctx}. Tắt thông báo, sống trọn khoảnh khắc này 😊",
        "Không cần gì nhiều, {ctx} là đủ 🏡☕",
    ],
    ("lifestyle", "happy"): [
        "Hôm nay {ctx} 😊✨ Cuộc sống thật tươi đẹp!",
        "{ctx} — một ngày bình thường mà trọn vẹn ❤️",
        "{ctx}. Mình thật may mắn 🌟",
    ],
    ("lifestyle", "thoughtful"): [
        "{ctx}. Đôi khi dừng lại mới thấy cuộc sống có nhiều điều đáng trân trọng 💭",
        "{ctx} — những điều nhỏ bé mới là điều thực sự quan trọng 🌿",
        "Ngày hôm nay: {ctx}. Bình yên lạ thường 💭🌙",
    ],

    # ── WORK ────────────────────────────────────────────────────────────────
    ("work", "motivated"): [
        "{ctx}! Cảm giác hoàn thành công việc thật tuyệt 🙌",
        "Hôm nay {ctx}. Cố gắng hôm nay, thành quả ngày mai 💪🔥",
        "{ctx} — không có thứ gì thay thế được sự chăm chỉ 🌟",
        "{ctx}. Mỗi ngày đều là cơ hội để tiến bộ 🚀",
    ],
    ("work", "thoughtful"): [
        "{ctx}. Mỗi ngày đều là bài học mới để trưởng thành hơn 💡",
        "{ctx} — hành trình quan trọng hơn đích đến 💭",
        "Nhìn lại {ctx}, thấy mình đã đi được một đoạn đường dài 🌱",
    ],
    ("work", "happy"): [
        "{ctx}! Ngày hôm nay thật sự hiệu quả 🎉✨",
        "{ctx} — không gì vui hơn khi hoàn thành điều mình đặt ra 🙌",
        "Kết thúc ngày với {ctx}. Hài lòng lắm 😊",
    ],

    # ── FAMILY ──────────────────────────────────────────────────────────────
    ("family", "happy"): [
        "{ctx} cùng gia đình — khoảnh khắc này vô giá ❤️👨‍👩‍👧‍👦",
        "Hôm nay {ctx}. Gia đình là tất cả 🏡❤️",
        "{ctx} bên người thân yêu — hạnh phúc thật sự là đây 🌸",
        "{ctx} — nhớ mãi những khoảnh khắc như thế này 💛",
        "Không có gì hơn {ctx} bên gia đình 🫶",
    ],
    ("family", "grateful"): [
        "Biết ơn vì có gia đình trong ngày {ctx} 🙏❤️",
        "{ctx} — nhắc mình rằng gia đình là điều quý giá nhất 💛",
        "Cảm ơn gia đình vì {ctx}. Yêu lắm ❤️",
    ],

    # ── FRIENDSHIP ──────────────────────────────────────────────────────────
    ("friendship", "happy"): [
        "{ctx} cùng hội bạn thân 😂❤️ Cười đau cả bụng!",
        "Hôm nay {ctx} với những người bạn tuyệt vời nhất 🫶✨",
        "{ctx} — không có bạn tốt thì còn gì là tuổi trẻ 😊",
        "{ctx}. Bạn bè là gia đình mình tự chọn ❤️",
    ],
    ("friendship", "funny"): [
        "{ctx} với bạn bè, chuyện gì cũng thành chuyện cười được 😂",
        "Bạn bè làm cho {ctx} trở nên 10 lần vui hơn 🎉",
        "{ctx} — chỉ có bạn thân mới hiểu cái này 😂🫶",
    ],

    # ── NATURE ──────────────────────────────────────────────────────────────
    ("nature", "relaxed"): [
        "{ctx} — thiên nhiên thật kỳ diệu 🌿🌊",
        "Hôm nay {ctx}. Tâm hồn được gột rửa hoàn toàn 🌸",
        "{ctx}. Không gì bằng thiên nhiên để tìm lại bình yên 🍃",
        "{ctx} — tạm quên thế giới ồn ào 🌲😌",
    ],
    ("nature", "happy"): [
        "{ctx} — vẻ đẹp thiên nhiên luôn làm mình ngây ngất 🌅✨",
        "Hôm nay {ctx}. Đẹp đến ngẩn ngơ 😍🌈",
        "{ctx}. Thiên nhiên chữa lành mọi thứ 🌿💚",
    ],

    # ── MOTIVATION ──────────────────────────────────────────────────────────
    ("motivation", "motivated"): [
        "{ctx}. Hành trình ngàn dặm bắt đầu từ một bước chân 🚀",
        "{ctx} — lại càng tin rằng không có gì là không thể 💪🔥",
        "{ctx} — khó khăn chỉ là bước đệm để tiến xa hơn 🌟",
        "Hôm nay {ctx}. Đừng bao giờ bỏ cuộc! 🔥",
    ],
    ("motivation", "thoughtful"): [
        "{ctx}. Đôi khi thất bại chính là bài học quý giá nhất 💡",
        "Nhìn lại {ctx}, thấy mình đã trưởng thành hơn rất nhiều 🌱",
        "{ctx} — mỗi trải nghiệm đều có giá trị riêng của nó 💭",
    ],

    # ── GENERAL ─────────────────────────────────────────────────────────────
    ("general", "happy"): [
        "Hôm nay {ctx} 😊✨ Vui lắm!",
        "{ctx} — một ngày đáng nhớ ❤️",
        "{ctx}. Cuộc sống thật tuyệt! 🌟",
        "{ctx}. Trân trọng từng khoảnh khắc 🌸",
        "{ctx}. Cảm giác tuyệt vời lắm 😄",
        "Ngày hôm nay đặc biệt vì {ctx} ✨",
        "{ctx} — không cần gì thêm, thế này là đủ ❤️",
    ],
    ("general", "excited"): [
        "{ctx}! Phấn khích lắm luôn 🎉🔥",
        "{ctx} — không thể chill được, hào hứng quá 😍⚡",
        "Hôm nay {ctx}, năng lượng tràn đầy không biết để đâu cho hết ⚡🌟",
        "{ctx}. Ai đồng cảm không? Phấn khích thật sự! 🎊",
        "Không ngờ {ctx} lại hay đến thế, hào hứng lắm 😄🎉",
        "{ctx} và mình đang trên mây luôn ☁️✨🔥",
        "{ctx}. Ngày hôm nay quá đỉnh! 🚀🎉",
    ],
    ("general", "motivated"): [
        "Hôm nay {ctx}. Không dừng lại, tiếp tục tiến về phía trước! 💪🔥",
        "{ctx}. Mỗi ngày đều là cơ hội mới 🌅✨",
        "{ctx} — khó thế nào cũng vượt qua được 💯",
        "{ctx}. Mỗi bước nhỏ đều đang xây nên ước mơ lớn 🚀",
        "Hôm nay {ctx}, tự hào về bản thân một chút 🙌",
        "{ctx} — hành trình ngàn dặm bắt đầu từ đây 🗺️💪",
        "{ctx}. Đừng bao giờ bỏ cuộc! 🔥",
    ],
    ("general", "relaxed"): [
        "{ctx}. Cuộc sống đơn giản đôi khi lại hạnh phúc nhất 😌🍃",
        "Hôm nay {ctx}, thư thái và bình yên ☕🌿",
        "{ctx} — dừng lại, hít thở, và tận hưởng 🌸",
        "Không cần nhiều, {ctx} thôi là đủ vui rồi 😊",
        "{ctx}. Chậm lại một chút, cuộc sống đẹp hơn mình tưởng 🌿",
        "{ctx}. Bình yên thật sự là đây 🍵",
        "{ctx}. Tắt thông báo, tận hưởng hiện tại 😌✨",
    ],
    ("general", "sad"): [
        "{ctx}. Buồn một chút nhưng rồi sẽ ổn thôi 🌧️💙",
        "Hôm nay {ctx}. Tâm trạng không tốt lắm... nhưng ngày mai sẽ tốt hơn 🌱",
        "{ctx}. Có những ngày như vậy, cũng không sao 🌙",
        "{ctx}. Cho mình một khoảng lặng để lấy lại sức 🌿",
        "{ctx} — nhưng mình sẽ ổn ❤️‍🩹",
    ],
    ("general", "thoughtful"): [
        "{ctx}. Đời người ngắn lắm, sống trọn từng khoảnh khắc 💭🌿",
        "Hôm nay {ctx} — ngồi suy nghĩ về những điều thực sự quan trọng 🌙",
        "{ctx} — nhắc mình rằng mọi thứ đều có lý do của nó 💡",
        "Hôm nay {ctx}, học được điều gì đó mới về bản thân 🌱",
        "{ctx}. Cuộc sống luôn có nhiều điều để suy ngẫm hơn mình nghĩ 💭",
        "Nhìn lại {ctx}, thấy mình đã trưởng thành hơn một chút 🌿✨",
    ],
    ("general", "grateful"): [
        "Biết ơn vì hôm nay có {ctx} 🙏❤️",
        "{ctx} — nhắc mình đếm những điều may mắn trong cuộc sống 🌸",
        "Cảm ơn cuộc đời vì {ctx}. Trân trọng lắm 🙏✨",
        "{ctx}. Những điều nhỏ bé như thế này mới là hạnh phúc thật sự ❤️",
        "Hôm nay có {ctx}, nhận ra mình may mắn hơn mình nghĩ 🌟🙏",
        "{ctx} — biết ơn từng khoảnh khắc như thế này 💛",
    ],
    ("general", "funny"): [
        "{ctx} 😂 Cuộc đời không có kịch bản trước!",
        "Ai ngờ hôm nay lại có {ctx}... không nhịn được cười 😂",
        "{ctx} — không biết nên vui hay buồn nữa 😅",
        "Hôm nay {ctx}, chính mình cũng bất ngờ với bản thân 😂🤷",
        "{ctx}. Cười xong rồi mới thấy cuộc sống thú vị thật 🤣",
        "Plot twist của ngày hôm nay: {ctx} 😂✨",
        "{ctx} và mình vẫn chưa hết choáng 😅😂",
    ],
    ("general", "romantic"): [
        "{ctx} — những khoảnh khắc như thế này khiến trái tim ấm áp 💕",
        "Hôm nay {ctx}. Hạnh phúc giản dị là đây ❤️",
        "{ctx}. Yêu cuộc sống này thêm một chút nữa 🌹💫",
        "{ctx} — có những điều nhỏ bé lại đủ khiến tim tan chảy 💕",
        "Hôm nay {ctx}, lòng nhẹ nhàng lạ thường 🌸❤️",
        "{ctx}. Đây là cảm giác mình muốn giữ mãi 💖",
        "{ctx} — không cần nhiều hơn, chỉ cần khoảnh khắc này thôi 🌙💕",
    ],
}

_TEMPLATES_EN: dict = {
    ("travel", "happy"): [
        "{ctx}. What an amazing experience! 🌟✨",
        "{ctx} — moments like this are what life is all about ❤️",
        "Today: {ctx}. Feeling so alive! 🌿☀️",
        "{ctx}. Memories made! 🌈📸",
    ],
    ("travel", "excited"): [
        "{ctx}! So excited right now 🎉🔥",
        "{ctx} — absolutely incredible! ⚡✨",
        "{ctx}. Can't contain this energy 😍🌟",
    ],
    ("fitness", "motivated"): [
        "{ctx}! No excuses, just results 💪🔥",
        "{ctx} — every rep counts, every day matters 💯",
        "{ctx}. Keep pushing, future you will be grateful 🏃‍♂️",
        "{ctx}. Progress over perfection 🌟",
    ],
    ("fitness", "happy"): [
        "{ctx}. Feeling amazing! 🌟💪",
        "{ctx} — this kind of happiness can't be bought 💚",
    ],
    ("general", "happy"): [
        "Today: {ctx}. Life is good! 😊✨",
        "{ctx} — loving every moment ❤️",
        "{ctx} and feeling amazing! 🌟",
        "{ctx}. Grateful for days like this 🌸",
        "This made my day: {ctx} 😄✨",
    ],
    ("general", "excited"): [
        "{ctx}! SO excited right now 🎉🔥",
        "{ctx} — can't contain this energy 😍⚡",
        "{ctx}. Best feeling ever! 🚀🌟",
        "Today: {ctx}. Off the charts!! 🎊",
    ],
    ("general", "motivated"): [
        "{ctx}. Let's keep going! 💪🔥",
        "Today: {ctx}. Tomorrow: even better 🌅",
        "{ctx} — nothing is impossible 💯",
        "{ctx}. Every step counts 🚀",
    ],
    ("general", "grateful"): [
        "Grateful for {ctx} today 🙏❤️",
        "{ctx} — counting my blessings 🌸",
        "{ctx}. So lucky to have this ✨",
    ],
    ("general", "relaxed"): [
        "{ctx} today. Simple moments, big happiness 😌🍃",
        "{ctx}. Peaceful and content ☕🌿",
        "{ctx} — slow down and enjoy the moment 🌸",
    ],
    ("general", "thoughtful"): [
        "{ctx}. Life has a way of teaching you things 💭",
        "{ctx} — grateful for every lesson 🌱",
        "{ctx}. Some moments make you pause and think 🌙",
    ],
    ("general", "funny"): [
        "{ctx} 😂 Life has no script!",
        "Nobody expected {ctx} today... and yet here we are 😅",
        "{ctx}. I can't even 😂🤷",
    ],
    ("general", "romantic"): [
        "{ctx} — moments like this warm the heart 💕",
        "{ctx}. Simple happiness ❤️",
        "{ctx}. This is the feeling I want to hold onto 💖",
    ],
    ("general", "sad"): [
        "{ctx}. Tough day but tomorrow will be better 🌱",
        "{ctx}. It's okay not to be okay sometimes 💙",
    ],
}

_FALLBACK_VI = [
    "Hôm nay {ctx} ❤️",
    "{ctx} — cuộc sống thật đẹp 🌿",
    "{ctx}. Trân trọng từng ngày 🙏",
    "{ctx}. Khoảnh khắc đáng nhớ ✨",
    "{ctx}. Vui và trọn vẹn 😊",
]

_FALLBACK_EN = [
    "Today {ctx}. What a day! ✨",
    "{ctx}! Living my best life 😊",
    "{ctx} — grateful for moments like this ❤️",
]


# ---------------------------------------------------------------------------
# Normalize context
# ---------------------------------------------------------------------------

def _normalize_context(ctx: str) -> str:
    """
    Chuẩn hóa ctx để dùng trong template.
    Xóa các từ dẫn đầu thừa, giữ nguyên nội dung chính.
    """
    ctx = ctx.strip().rstrip(".,!?")
    # Bỏ "hôm nay", "vừa", "đã", "just", "today" ở đầu nếu template đã có sẵn
    ctx = re.sub(
        r"^(hôm nay\s+|vừa\s+|đã\s+|just\s+|today\s+i?\s*)",
        "",
        ctx,
        flags=re.IGNORECASE,
    )
    return ctx.strip().rstrip(".,!?")


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def generate_from_templates(
    keywords: Optional[List[str]] = None,
    mood: Optional[str] = None,
    category: Optional[str] = None,
    context: Optional[str] = None,
    language: str = "vi",
    num_suggestions: int = 5,
) -> List[Tuple[str, float]]:
    """
    Sinh status từ templates. Luôn trả về đúng chủ đề.
    Score = 1.0 (template-based).
    """
    templates_db = _TEMPLATES_VI if language == "vi" else _TEMPLATES_EN
    fallback = _FALLBACK_VI if language == "vi" else _FALLBACK_EN

    # Giá trị điền vào {ctx}
    if context:
        fill_ctx = _normalize_context(context)
    elif keywords:
        fill_ctx = " ".join(keywords)
    else:
        fill_ctx = "trải nghiệm hôm nay" if language == "vi" else "today's experience"

    cat = category or "general"
    m = mood or "happy"

    # Merge nhiều pool: exact → (general, mood) → (general, happy) → fallback
    pool: List[str] = []
    for key in [(cat, m), ("general", m), ("general", "happy")]:
        for t in (templates_db.get(key) or []):
            if t not in pool:
                pool.append(t)
    if not pool:
        pool = fallback.copy()

    # Shuffle, lặp lại nếu chưa đủ
    shuffled = pool.copy()
    random.shuffle(shuffled)
    while len(shuffled) < num_suggestions * 2:
        extra = pool.copy()
        random.shuffle(extra)
        shuffled.extend(extra)

    results: List[Tuple[str, float]] = []
    seen: set = set()
    for tmpl in shuffled:
        text = tmpl.replace("{ctx}", fill_ctx)
        if text not in seen:
            seen.add(text)
            results.append((text, 1.0))
        if len(results) >= num_suggestions:
            break

    return results
