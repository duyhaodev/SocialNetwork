import { useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

export function ImageViewer({ open, onClose, mediaList = [], index = 0 }) {
    // index hiện tại trong viewer (tách khỏi index bên ngoài)
    const [currentIndex, setCurrentIndex] = useState(index || 0);

    // đồng bộ index khi mở viewer
    useEffect(() => {
        if (open) {
        setCurrentIndex(index || 0);
        }
    }, [open, index]);

    // khóa scroll khi mở
    useEffect(() => {
        if (!open) return;
        const old = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
        document.body.style.overflow = old;
        };
    }, [open]);

    // điều hướng bằng phím + Esc
    useEffect(() => {
        if (!open) return;
        const handleKey = (e) => {
            if (e.key === "ArrowLeft") {
            setCurrentIndex((prev) =>
                prev === 0 ? mediaList.length - 1 : prev - 1
            );
            } else if (e.key === "ArrowRight") {
            setCurrentIndex((prev) =>
                prev === mediaList.length - 1 ? 0 : prev + 1
            );
            } else if (e.key === "Escape") {
            onClose();
            }
        };
        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
        }, [open, mediaList.length]);

    // không hiện nếu không mở hoặc không có media
    if (!open || !mediaList.length) return null;
    // media hiện tại
    const media = mediaList[currentIndex];
    if (!media) return null;
    const rawUrl = media.mediaUrl ?? "";
    const url = /^https?:\/\//i.test(rawUrl)
        ? rawUrl
        : `${import.meta.env.VITE_BACKEND_URL || ""}${rawUrl}`;

    const canNavigate = mediaList.length > 1;

    // xử lý nút prev
    const handlePrev = (e) => {
        e.stopPropagation();
        setCurrentIndex((prev) =>
        prev === 0 ? mediaList.length - 1 : prev - 1
        );
    };

    // xử lý nút next
    const handleNext = (e) => {
        e.stopPropagation();
        setCurrentIndex((prev) =>
        prev === mediaList.length - 1 ? 0 : prev + 1
        );
    };

  return (
    <div
      className="fixed inset-0 bg-black/90 z-[9999] flex items-center justify-center overflow-hidden"
      onClick={onClose}
    >
      {/* nút đóng */}
      <button
        className="absolute top-6 right-6 text-white bg-black/40 hover:bg-black/60 p-2 rounded-full"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      >
        <X className="w-6 h-6" />
      </button>

      {/* nút prev/next – chỉ hiện khi có >1 media */}
      {canNavigate && (
        <>
          {/* NÚT PREV */}
            <button
            onClick={handlePrev}
            className="
                absolute left-6 top-1/2 -translate-y-1/2
                w-12 h-12
                flex items-center justify-center
                rounded-full
                bg-white/10 backdrop-blur-sm
                hover:bg-white/20
                transition
                shadow-lg
            "
            >
            <ChevronLeft className="w-6 h-6 text-white" />
            </button>

            {/* NÚT NEXT */}
            <button
            onClick={handleNext}
            className="
                absolute right-6 top-1/2 -translate-y-1/2
                w-12 h-12
                flex items-center justify-center
                rounded-full
                bg-white/10 backdrop-blur-sm
                hover:bg-white/20
                transition
                shadow-lg
            "
            >
            <ChevronRight className="w-6 h-6 text-white" />
            </button>
        </>
      )}

      {media.mediaType === "video" ? (
        <video
          src={url}
          controls
          autoPlay
          className="max-h-[90vh] max-w-[90vw] object-contain rounded-2xl"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <img
          src={url}
          className="max-h-[90vh] max-w-[90vw] object-contain rounded-2xl"
          onClick={(e) => e.stopPropagation()}
        />
      )}
    </div>
  );
}
