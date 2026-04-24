"""
Dataset utilities: load, validate, and prepare training data.
Training file format (JSONL):
  {"text": "Hôm nay đi biển cùng gia đình, tuyệt vời quá! 🌊"}
  {"text": "Mệt mỏi sau một ngày dài nhưng hài lòng với những gì đã làm."}
"""

import json
import os
import random
from pathlib import Path
from typing import List, Dict, Tuple

import torch
from torch.utils.data import Dataset
from transformers import PreTrainedTokenizer
from loguru import logger


# ------------------------------------------------------------------
# Built-in seed data (Vietnamese + English social-media statuses)
# ------------------------------------------------------------------

SEED_DATA_VI: List[str] = [
    # Travel
    "Hôm nay đi biển cùng gia đình, tuyệt vời quá! Những khoảnh khắc như thế này thật đáng trân trọng 🌊☀️",
    "Chuyến đi Đà Lạt cuối tuần, thời tiết se lạnh và hoa nở đẹp quá. Muốn ở lại mãi không về 🌸🍃",
    "Hà Nội mùa thu lá vàng rơi, cà phê nóng trên tay, không gì tuyệt hơn ☕🍂",
    "Vừa đặt chân đến Hội An, phố cổ đèn lồng lung linh huyền ảo quá ✨🏮",
    "Đỉnh Fansipan mây mù bao phủ, leo núi mệt nhưng xứng đáng khi ngắm cảnh từ trên cao ⛰️",
    # Food
    "Bún bò Huế sáng nay ngon không tưởng, ăn xong rồi vẫn còn thèm 😍🍜",
    "Tự nấu bữa cơm gia đình cuối tuần, đơn giản nhưng ấm áp lắm 🍚❤️",
    "Cơm tấm sườn bì chả buổi sáng là đỉnh của đỉnh, không tranh luận 🔥",
    "Thử làm bánh mì tại nhà lần đầu, ra lò thơm lắm luôn! 🥖✨",
    "Ốc sên xào bơ tỏi, ngồi ăn vỉa hè Sài Gòn, cuộc sống thế là đủ 🐌",
    # Fitness
    "Chạy bộ 5km sáng nay, cơ thể tỉnh táo và năng lượng dồi dào suốt ngày 🏃‍♂️💪",
    "Gym xong rồi mới thấy ngày hôm nay trọn vẹn. Đừng lười nha mọi người! 💪🔥",
    "Yoga buổi sáng giúp tâm trí thanh thản trước một ngày bận rộn 🧘‍♀️☀️",
    "Hôm nay hoàn thành mục tiêu 10.000 bước đi bộ, nhỏ thôi nhưng vui lắm 👟",
    # Lifestyle
    "Cà phê sáng nay bên cửa sổ, nhìn mưa rơi, thư giãn hoàn toàn ☕🌧️",
    "Cuối tuần không làm gì ngoài đọc sách và nghe nhạc, bình yên lắm 📚🎵",
    "Mua được bộ đồ ưng ý, hôm nay mood lên 100% rồi 🛍️✨",
    "Không cần đi xa, ở nhà tự pha cà phê ngon vẫn là chill nhất ☕🏠",
    "Dọn phòng xong tự nhiên thấy đời sáng sủa hơn nhiều 🧹✨",
    # Work & Motivation
    "Deadline hôm nay hoàn thành trước giờ, cảm giác này đỉnh lắm 🙌",
    "Bắt đầu một tuần mới với mục tiêu rõ ràng và tinh thần tích cực 💪🌅",
    "Khó khăn là bước đệm để ta trưởng thành hơn. Đừng bỏ cuộc! 🔥",
    "Học xong khoá học mới hôm nay, kiến thức mới nạp đầy rồi 📖🎓",
    "Thất bại không phải điểm kết thúc, là điểm khởi đầu của bài học mới 💡",
    # Family & Friends
    "Họp mặt gia đình sau bao lâu xa cách, ấm áp và hạnh phúc quá ❤️👨‍👩‍👧‍👦",
    "Bạn bè lâu ngày gặp lại, cười đau cả bụng, tuổi trẻ đẹp thật 😂❤️",
    "Sinh nhật mẹ hôm nay, chúc mẹ mãi khỏe mạnh và hạnh phúc! ❤️🎂",
    "Cùng hội bạn thân ngồi ăn chè, kể chuyện tới tận khuya 🫶",
    # Nature
    "Hoàng hôn chiều nay đẹp đến ngẩn ngơ, đứng nhìn mãi không chán 🌅",
    "Sau cơn mưa trời lại sáng, cầu vồng hiện ra tươi đẹp quá 🌈",
    "Buổi sáng sớm ra vườn nghe chim hót, bình yên như tranh vẽ 🐦🌿",
    # Funny
    "Đặt báo thức 6h sáng, tắt và ngủ tiếp đến 10h, không hối hận 😂⏰",
    "Hôm nay cố ăn kiêng nhưng nhìn đồ ăn ngon quá nên thôi, mai tính tiếp 😅🍕",
    "Họp online mà quên tắt mic, may là chỉ ngáp thôi chứ không nói gì xấu 😅",
    # Romantic
    "Yêu là khi bên cạnh nhau không cần nói gì vẫn thấy ấm lòng ❤️",
    "Mỗi ngày trôi qua bên em là một ngày đáng nhớ nhất cuộc đời anh 💑",
    "Hạnh phúc không cần hoàn hảo, chỉ cần có nhau là đủ rồi 💕",
    # General
    "Mỗi ngày là một cơ hội mới để trở thành phiên bản tốt hơn của chính mình 🌟",
    "Sống chậm lại, tận hưởng từng khoảnh khắc nhỏ bé trong cuộc sống 🌿",
    "Điều quan trọng không phải bao nhiêu ngày bạn sống, mà sống những ngày đó như thế nào 💭",
    "Biết ơn vì hôm nay vẫn được thức dậy, thở, và yêu thương ❤️",
    "Cuộc sống không phải lúc nào cũng như ý, nhưng mình vẫn ổn 😊",
    "Hôm nay có muôn vàn lý do để mỉm cười, chỉ cần để ý thôi 😊✨",
    "Tắt điện thoại, bước ra ngoài, hít thở không khí tươi mới 🌿",
    "Đôi khi dừng lại và nhìn xung quanh, cuộc sống đẹp hơn ta nghĩ 🌸",
    "Ngày mưa ở nhà pha trà, nghe nhạc, thế là đủ hạnh phúc rồi 🍵🎶",
    "Cảm ơn tất cả những người đã đồng hành cùng mình trên hành trình này 🙏",
]

SEED_DATA_EN: List[str] = [
    "Just had the most amazing beach sunset with family. These moments are everything 🌅❤️",
    "Morning run done! 5K complete and feeling unstoppable 🏃‍♂️💪",
    "Coffee + good book + rainy day = perfect Saturday ☕📚🌧️",
    "Finally finished that project I've been working on. Hard work pays off! 🙌",
    "Grateful for every little thing today. Life is beautiful 🌸✨",
    "Weekend brunch with the best people. Nothing beats good food and great company 🥞❤️",
    "New week, new goals, new energy. Let's do this! 💪🔥",
    "Tried cooking a new recipe today and it actually turned out amazing! 🍳✨",
    "Nature walks are the best therapy. Cleared my head completely 🌿🧘",
    "Set a personal record at the gym today. Progress feels so good 💪🏋️",
    "Spontaneous road trip with friends. The best memories are unplanned 🚗🎶",
    "Staying in, watching movies, and absolutely zero guilt about it 🍿😌",
    "Small wins matter. Celebrated finishing my to-do list with ice cream 🍦✅",
    "Sometimes you just need to stop, breathe, and appreciate the view 🌄",
    "Laughed so hard today my stomach hurts. Good friends are everything 😂❤️",
    "Proud of how far I've come. The journey continues 🌟",
    "Sunday meal prep done. Future me is going to be so grateful 🥗🙌",
    "Found a new coffee shop today. It's officially my new favourite spot ☕",
    "Woke up early and watched the sunrise. 10/10 would recommend 🌅",
    "Challenging day but I got through it. Stronger every time 💫",
]

MOOD_PROMPTS: Dict[str, str] = {
    "happy": "Hôm nay vui quá,",
    "sad": "Buồn một chút nhưng",
    "excited": "Phấn khích lắm luôn!",
    "thoughtful": "Nghĩ mãi mới hiểu ra rằng",
    "motivated": "Hãy cùng nhau cố gắng,",
    "relaxed": "Thư giãn thôi,",
    "angry": "Thật sự khó chịu nhưng",
    "grateful": "Biết ơn vô cùng vì",
    "funny": "Haha không nhịn được,",
    "romantic": "Trái tim mình đang",
}

CATEGORY_PROMPTS: Dict[str, str] = {
    "travel": "Chuyến đi lần này",
    "food": "Món ăn hôm nay",
    "fitness": "Sau buổi tập hôm nay,",
    "lifestyle": "Cuộc sống đơn giản là",
    "work": "Công việc hôm nay",
    "family": "Gia đình là",
    "friendship": "Bạn bè là",
    "nature": "Thiên nhiên tuyệt đẹp,",
    "motivation": "Đừng bao giờ bỏ cuộc,",
    "general": "Hôm nay mình muốn chia sẻ",
}


# ------------------------------------------------------------------
# Dataset class for fine-tuning
# ------------------------------------------------------------------

class StatusDataset(Dataset):
    def __init__(
        self,
        texts: List[str],
        tokenizer: PreTrainedTokenizer,
        max_length: int = 128,
    ):
        self.tokenizer = tokenizer
        self.max_length = max_length
        self.examples: List[Dict] = []

        for text in texts:
            encoding = tokenizer(
                text,
                truncation=True,
                max_length=max_length,
                padding="max_length",
                return_tensors="pt",
            )
            input_ids = encoding["input_ids"].squeeze()
            self.examples.append(
                {
                    "input_ids": input_ids,
                    "attention_mask": encoding["attention_mask"].squeeze(),
                    "labels": input_ids.clone(),
                }
            )

    def __len__(self) -> int:
        return len(self.examples)

    def __getitem__(self, idx: int) -> Dict[str, torch.Tensor]:
        return self.examples[idx]


# ------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------

def load_texts_from_file(file_path: str) -> List[str]:
    texts: List[str] = []
    path = Path(file_path)

    if not path.exists():
        logger.warning(f"File not found: {file_path}")
        return texts

    suffix = path.suffix.lower()
    with open(path, "r", encoding="utf-8") as f:
        if suffix == ".jsonl":
            for line in f:
                line = line.strip()
                if line:
                    obj = json.loads(line)
                    texts.append(obj.get("text", "").strip())
        elif suffix == ".json":
            data = json.load(f)
            if isinstance(data, list):
                for item in data:
                    if isinstance(item, str):
                        texts.append(item.strip())
                    elif isinstance(item, dict):
                        texts.append(item.get("text", "").strip())
        elif suffix == ".txt":
            texts = [l.strip() for l in f if l.strip()]

    return [t for t in texts if t]


def get_all_training_texts(data_dir: str, extra_file: Optional[str] = None) -> List[str]:
    from typing import Optional  # local import to avoid circular

    texts: List[str] = list(SEED_DATA_VI) + list(SEED_DATA_EN)

    # Load all .jsonl / .json / .txt in data_dir
    data_path = Path(data_dir)
    if data_path.exists():
        for file in data_path.iterdir():
            if file.suffix in (".jsonl", ".json", ".txt"):
                loaded = load_texts_from_file(str(file))
                texts.extend(loaded)
                logger.info(f"Loaded {len(loaded)} samples from {file.name}")

    if extra_file:
        loaded = load_texts_from_file(extra_file)
        texts.extend(loaded)

    # Deduplicate while preserving order
    seen = set()
    unique: List[str] = []
    for t in texts:
        if t not in seen:
            seen.add(t)
            unique.append(t)

    logger.info(f"Total training samples: {len(unique)}")
    return unique


def train_val_split(
    texts: List[str], val_ratio: float = 0.1
) -> Tuple[List[str], List[str]]:
    random.shuffle(texts)
    split = max(1, int(len(texts) * val_ratio))
    return texts[split:], texts[:split]
