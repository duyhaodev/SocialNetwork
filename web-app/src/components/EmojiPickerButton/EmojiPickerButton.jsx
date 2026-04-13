import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Smile } from "lucide-react";
import EmojiPicker from "emoji-picker-react";
import clsx from "clsx";

export default function EmojiPickerButton({ onSelectEmoji, className }) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef(null);
  const pickerRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  // ===== TÍNH VỊ TRÍ =====
  const updatePosition = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();

    setPos({
      top: rect.bottom + 8,
      left: rect.right - 300,
    });
  };

  useEffect(() => {
    if (!open) return;

    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);

    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open]);

  // ===== CLICK OUTSIDE =====
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e) => {
      if (
        pickerRef.current?.contains(e.target) ||
        buttonRef.current?.contains(e.target)
      ) {
        return;
      }
      setOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={clsx(
          "text-muted-foreground hover:text-foreground",
          className
        )}
      >
        <Smile size={18} />
      </button>

      {open &&
        createPortal(
          <div
            ref={pickerRef}
            className="fixed z-[99999]"
            style={{ top: pos.top, left: pos.left }}
          >
            <EmojiPicker
              theme="dark"
              emojiStyle="native"
              onEmojiClick={(emojiData) => {
                onSelectEmoji?.(emojiData.emoji);
              }}
              height={350}
              width={300}
              searchDisabled
              previewConfig={{ showPreview: false }}
            />
          </div>,
          document.body
        )}
    </>
  );
}
