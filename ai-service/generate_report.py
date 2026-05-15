"""
Đọc file metrics JSON sau khi training xong và xuất biểu đồ + bảng thống kê cho báo cáo.
Dùng: python generate_report.py [--metrics logs/metrics_<id>.json]
"""

import argparse
import json
import os
from pathlib import Path

try:
    import matplotlib.pyplot as plt
    import matplotlib.ticker as ticker
    HAS_MATPLOTLIB = True
except ImportError:
    HAS_MATPLOTLIB = False
    print("[WARNING] matplotlib chưa cài. Chạy: pip install matplotlib")


def find_latest_metrics(logs_dir: str) -> str | None:
    logs = Path(logs_dir)
    files = sorted(logs.glob("metrics_*.json"), key=lambda f: f.stat().st_mtime, reverse=True)
    return str(files[0]) if files else None


def load_metrics(path: str) -> list[dict]:
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def print_table(records: list[dict]) -> None:
    print("\n" + "=" * 72)
    print(f"{'Epoch':>6}  {'Step':>6}  {'Train Loss':>11}  {'Eval Loss':>10}  {'Train PPL':>10}  {'Eval PPL':>9}")
    print("-" * 72)
    for r in records:
        print(
            f"{r.get('epoch', '?'):>6}  "
            f"{r.get('step', '?'):>6}  "
            f"{r.get('train_loss', float('nan')):>11.4f}  "
            f"{r.get('eval_loss', float('nan')):>10.4f}  "
            f"{r.get('train_perplexity', float('nan')):>10.2f}  "
            f"{r.get('eval_perplexity', float('nan')):>9.2f}"
        )
    print("=" * 72 + "\n")


def plot_metrics(records: list[dict], out_dir: str) -> None:
    if not HAS_MATPLOTLIB:
        return

    epochs = [r["epoch"] for r in records]
    train_loss = [r.get("train_loss", None) for r in records]
    eval_loss = [r.get("eval_loss", None) for r in records]
    train_ppl = [r.get("train_perplexity", None) for r in records]
    eval_ppl = [r.get("eval_perplexity", None) for r in records]

    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)

    # --- Loss curve ---
    fig, ax = plt.subplots(figsize=(8, 5))
    ax.plot(epochs, train_loss, marker="o", label="Train Loss", color="#2196F3")
    ax.plot(epochs, eval_loss,  marker="s", label="Validation Loss", color="#F44336")
    ax.set_xlabel("Epoch")
    ax.set_ylabel("Loss (Cross-Entropy)")
    ax.set_title("Training & Validation Loss")
    ax.legend()
    ax.xaxis.set_major_locator(ticker.MaxNLocator(integer=True))
    ax.grid(True, linestyle="--", alpha=0.5)
    loss_path = out / "loss_curve.png"
    fig.savefig(loss_path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"[OK] Loss curve saved → {loss_path}")

    # --- Perplexity curve ---
    fig, ax = plt.subplots(figsize=(8, 5))
    ax.plot(epochs, train_ppl, marker="o", label="Train Perplexity", color="#4CAF50")
    ax.plot(epochs, eval_ppl,  marker="s", label="Validation Perplexity", color="#FF9800")
    ax.set_xlabel("Epoch")
    ax.set_ylabel("Perplexity")
    ax.set_title("Training & Validation Perplexity")
    ax.legend()
    ax.xaxis.set_major_locator(ticker.MaxNLocator(integer=True))
    ax.grid(True, linestyle="--", alpha=0.5)
    ppl_path = out / "perplexity_curve.png"
    fig.savefig(ppl_path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"[OK] Perplexity curve saved → {ppl_path}")

    # --- Summary bar chart (first vs last epoch) ---
    if len(records) >= 2:
        labels = ["Epoch 1", f"Epoch {int(epochs[-1])}"]
        tl = [train_loss[0], train_loss[-1]]
        vl = [eval_loss[0], eval_loss[-1]]
        x = range(len(labels))
        fig, ax = plt.subplots(figsize=(6, 5))
        width = 0.35
        ax.bar([i - width/2 for i in x], tl, width, label="Train Loss", color="#2196F3")
        ax.bar([i + width/2 for i in x], vl, width, label="Val Loss",   color="#F44336")
        ax.set_xticks(list(x))
        ax.set_xticklabels(labels)
        ax.set_ylabel("Loss")
        ax.set_title("Loss Improvement: First vs Last Epoch")
        ax.legend()
        ax.grid(True, axis="y", linestyle="--", alpha=0.5)
        bar_path = out / "loss_improvement.png"
        fig.savefig(bar_path, dpi=150, bbox_inches="tight")
        plt.close(fig)
        print(f"[OK] Improvement chart saved → {bar_path}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate training report from metrics JSON")
    parser.add_argument("--metrics", type=str, default=None, help="Path to metrics_<id>.json")
    parser.add_argument("--logs-dir", type=str, default="logs", help="Folder to search for latest metrics file")
    parser.add_argument("--out-dir", type=str, default="report_charts", help="Output directory for charts")
    args = parser.parse_args()

    metrics_path = args.metrics or find_latest_metrics(args.logs_dir)
    if not metrics_path or not Path(metrics_path).exists():
        print("[ERROR] Không tìm thấy file metrics. Hãy chạy training trước!")
        return

    print(f"[INFO] Đọc metrics từ: {metrics_path}")
    records = load_metrics(metrics_path)

    if not records:
        print("[ERROR] File metrics rỗng. Training có thể chưa hoàn thành.")
        return

    print_table(records)
    plot_metrics(records, args.out_dir)

    # Tóm tắt
    first = records[0]
    last = records[-1]
    improvement = ((first.get("eval_loss", 0) - last.get("eval_loss", 0)) / first.get("eval_loss", 1)) * 100
    print(f"Tóm tắt kết quả training:")
    print(f"  - Số epoch:             {len(records)}")
    print(f"  - Eval loss ban đầu:    {first.get('eval_loss', '?'):.4f}  (ppl={first.get('eval_perplexity', '?'):.2f})")
    print(f"  - Eval loss cuối cùng:  {last.get('eval_loss', '?'):.4f}  (ppl={last.get('eval_perplexity', '?'):.2f})")
    print(f"  - Cải thiện eval loss:  {improvement:.1f}%")
    print(f"\nBiểu đồ đã lưu vào thư mục: {args.out_dir}/")


if __name__ == "__main__":
    main()
