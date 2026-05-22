"""
Test fine-tuned model nhanh, khong can chay FastAPI server.

Cach dung:
    # Che do interactive (go prompt va xem ket qua):
    python test_model.py

    # Test 1 prompt cu the:
    python test_model.py --prompt "đi ăn"
    python test_model.py --prompt "coffee" --lang en

    # Doi so suggestions tra ve:
    python test_model.py --prompt "du lịch" --n 10

    # Test ca bo prompt mau:
    python test_model.py --demo
"""

from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer


# ====================================================================
# Config — sua o day neu can
# ====================================================================
BASE_DIR = Path(__file__).resolve().parent
MODEL_DIR = BASE_DIR / "saved_models" / "fine_tuned"

# Inference params (khop voi app/config.py)
MAX_NEW_TOKENS = 35
MIN_NEW_TOKENS = 8
TEMPERATURE = 0.85
TOP_K = 50
TOP_P = 0.92
REPETITION_PENALTY = 1.25
NO_REPEAT_NGRAM_SIZE = 3


# Demo prompts cho ca 2 ngon ngu
DEMO_PROMPTS = [
    ("vi", "đi ăn"),
    ("vi", "cà phê sáng"),
    ("vi", "du lịch Đà Lạt"),
    ("vi", "gia đình"),
    ("vi", "gym"),
    ("vi", "tâm trạng buồn"),
    ("vi", "mùa thu Hà Nội"),
    ("vi", "thú cưng"),
    ("en", "food"),
    ("en", "coffee"),
    ("en", "travel"),
    ("en", "motivation"),
]


# ====================================================================
# Loaders
# ====================================================================

def load_model():
    """Load model va tokenizer tu thu muc fine_tuned/."""
    if not MODEL_DIR.exists() or not any(MODEL_DIR.iterdir()):
        print(f"[X] Khong tim thay model tai: {MODEL_DIR}")
        print(f"    Vui long giai nen fine_tuned_model.zip vao thu muc nay.")
        sys.exit(1)

    print(f"[*] Loading model tu: {MODEL_DIR}")
    t0 = time.time()

    tokenizer = AutoTokenizer.from_pretrained(str(MODEL_DIR), local_files_only=True)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    model = AutoModelForCausalLM.from_pretrained(str(MODEL_DIR), local_files_only=True)
    device = "cuda" if torch.cuda.is_available() else "cpu"
    model = model.to(device)
    model.eval()

    elapsed = time.time() - t0
    params = sum(p.numel() for p in model.parameters())
    print(f"[OK] Loaded tren {device} trong {elapsed:.1f}s. Params: {params:,}\n")

    return model, tokenizer, device


def build_prompt(text: str, lang: str = "vi") -> str:
    """Build prompt theo dung format dataset da train."""
    text = text.strip()
    if lang == "en":
        return f"Topic: {text}. Status:"
    return f"Chủ đề: {text}. Status:"


# ====================================================================
# Inference
# ====================================================================

def generate(model, tokenizer, device, prompt: str, n: int = 5) -> list[str]:
    """Sinh n suggestions tu prompt."""
    inputs = tokenizer(prompt, return_tensors="pt", truncation=True, max_length=128).to(device)
    prompt_len = inputs["input_ids"].shape[1]

    # Sinh du hon 1 chut de loc bo trung
    over_n = n * 2

    with torch.inference_mode():
        out = model.generate(
            **inputs,
            max_new_tokens=MAX_NEW_TOKENS,
            min_new_tokens=MIN_NEW_TOKENS,
            num_return_sequences=over_n,
            do_sample=True,
            temperature=TEMPERATURE,
            top_k=TOP_K,
            top_p=TOP_P,
            repetition_penalty=REPETITION_PENALTY,
            no_repeat_ngram_size=NO_REPEAT_NGRAM_SIZE,
            pad_token_id=tokenizer.pad_token_id,
        )

    results: list[str] = []
    seen: set[str] = set()
    for i in range(out.shape[0]):
        text = tokenizer.decode(out[i][prompt_len:], skip_special_tokens=True)
        # Cat tai marker dau tien (model co the lap lai format)
        for marker in ("Chủ đề:", "Topic:", "\n\n"):
            idx = text.find(marker)
            if idx > 0:
                text = text[:idx]
                break
        text = text.split("\n")[0].strip()
        # Bo dau cau du thua o dau
        while text and text[0] in ",.!?;:- ":
            text = text[1:].strip()

        if len(text) >= 10 and text not in seen:
            seen.add(text)
            results.append(text)
            if len(results) >= n:
                break

    return results


# ====================================================================
# UI modes
# ====================================================================

def run_one(model, tokenizer, device, text: str, lang: str, n: int):
    prompt = build_prompt(text, lang)
    print(f"\n>>> Prompt: {prompt!r}")

    t0 = time.time()
    results = generate(model, tokenizer, device, prompt, n=n)
    elapsed = time.time() - t0

    print(f"    ({elapsed:.2f}s)\n")
    for i, r in enumerate(results, 1):
        print(f"   {i}. {r}")
    if not results:
        print("   (Khong sinh duoc ket qua chat luong — thu prompt khac)")


def run_demo(model, tokenizer, device, n: int):
    print("=" * 70)
    print("DEMO MODE — chay qua mot loat prompt mau")
    print("=" * 70)
    for lang, text in DEMO_PROMPTS:
        run_one(model, tokenizer, device, text, lang, n)
    print("\n" + "=" * 70)
    print("Demo xong.")


def run_interactive(model, tokenizer, device, n: int):
    print("=" * 70)
    print("INTERACTIVE MODE")
    print("  Go chu de bat ky (vi du: đi ăn, gym, coffee, ...)")
    print("  Bo trong de thoat.")
    print("  Them ' /en' o cuoi de chuyen sang tieng Anh (vi du: 'travel /en')")
    print("=" * 70)

    while True:
        try:
            raw = input("\n> ").strip()
        except (EOFError, KeyboardInterrupt):
            print()
            break

        if not raw:
            break

        lang = "vi"
        if raw.endswith("/en"):
            lang = "en"
            raw = raw[:-3].strip()
        elif raw.endswith("/vi"):
            raw = raw[:-3].strip()

        if not raw:
            continue

        run_one(model, tokenizer, device, raw, lang, n)

    print("Bye!")


# ====================================================================
# Main
# ====================================================================

def main():
    parser = argparse.ArgumentParser(description="Test fine-tuned status model")
    parser.add_argument("--prompt", "-p", type=str, default=None,
                        help="Chu de can sinh status (vi du: 'đi ăn')")
    parser.add_argument("--lang", "-l", type=str, default="vi", choices=["vi", "en"],
                        help="Ngon ngu (vi/en). Mac dinh vi.")
    parser.add_argument("--n", "-n", type=int, default=5,
                        help="So suggestions tra ve. Mac dinh 5.")
    parser.add_argument("--demo", action="store_true",
                        help="Chay demo voi bo prompt mau.")
    args = parser.parse_args()

    model, tokenizer, device = load_model()

    if args.demo:
        run_demo(model, tokenizer, device, args.n)
    elif args.prompt:
        run_one(model, tokenizer, device, args.prompt, args.lang, args.n)
    else:
        run_interactive(model, tokenizer, device, args.n)


if __name__ == "__main__":
    main()
