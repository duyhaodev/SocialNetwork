import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Image as ImageIcon, X } from "lucide-react";
import { toast } from "sonner";
import EmojiPickerButton from "../EmojiPickerButton/EmojiPickerButton";

export default function CommentForm({
  avatarUrl,
  fullName = "Bạn",
  submitting = false,
  onSubmit,

  // ===== REPLY SUPPORT =====
  isReply = false,
  onCancelReply,
  placeholder,
}) {
  const [commentContent, setCommentContent] = useState("");
  const [commentFiles, setCommentFiles] = useState([]);

  /* ================= CLEANUP PREVIEW ================= */

  useEffect(() => {
    return () => {
      commentFiles.forEach((m) => {
        if (m.preview) URL.revokeObjectURL(m.preview);
      });
    };
  }, [commentFiles]);

  /* ================= FILE HANDLING ================= */

  const handleCommentFilesChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const newItems = [];

    for (const file of files) {
      const type = file.type || "";
      const isImage = type.startsWith("image/");
      const isVideo = type.startsWith("video/");

      if (!isImage && !isVideo) {
        toast.error(`File "${file.name}" không phải hình hoặc video`);
        continue;
      }

      newItems.push({
        id: crypto.randomUUID(),
        file,
        kind: isImage ? "image" : "video",
        preview: URL.createObjectURL(file),
      });
    }

    setCommentFiles((prev) => [...prev, ...newItems]);
    e.target.value = "";
  };

  const handleRemoveOne = (index) => {
    setCommentFiles((prev) => {
      const clone = [...prev];
      const removed = clone.splice(index, 1)[0];

      if (removed?.preview) URL.revokeObjectURL(removed.preview);
      return clone;
    });
  };

  const handleRemoveAll = () => {
    commentFiles.forEach((m) => {
      if (m.preview) URL.revokeObjectURL(m.preview);
    });

    setCommentFiles([]);
  };

  /* ================= SUBMIT ================= */

  const handleSubmit = async (e) => {
  e.preventDefault();

  if (!commentContent.trim() && commentFiles.length === 0) {
    toast.error("Vui lòng nhập nội dung bình luận");
    return;
  }

  // Chuyển mảng object files hiện tại thành mảng File thuần túy
  const filesOnly = commentFiles.map(m => m.file);

  try {
    // Gửi Object sạch lên cho cha xử lý upload
    await onSubmit({
      content: commentContent,
      files: filesOnly
    });

    // Thành công thì reset
    setCommentContent("");
    handleRemoveAll();
  } catch (error) {
    // Lỗi thì giữ nguyên text cho người dùng sửa
  }
};

  /* ================= DRAG SCROLL PREVIEW ================= */

  const dragStateRef = useRef({
    isDragging: false,
    el: null,
    startX: 0,
    scrollLeft: 0,
  });

  const hasDraggedRef = useRef(false);

  const handlePreviewMouseDown = (e) => {
    if (e.button !== 0) return;

    const el = e.currentTarget;

    dragStateRef.current = {
      isDragging: true,
      el,
      startX: e.pageX - el.offsetLeft,
      scrollLeft: el.scrollLeft,
    };

    hasDraggedRef.current = false;
    el.classList.add("cursor-grabbing");
  };

  const handlePreviewMouseMove = (e) => {
    const state = dragStateRef.current;
    if (!state.isDragging || !state.el) return;

    e.preventDefault();

    const x = e.pageX - state.el.offsetLeft;
    const walk = x - state.startX;

    if (Math.abs(walk) > 5) {
      hasDraggedRef.current = true;
    }

    state.el.scrollLeft = state.scrollLeft - walk;
  };

  useEffect(() => {
    const stopDrag = () => {
      const state = dragStateRef.current;
      if (!state.isDragging || !state.el) return;

      state.isDragging = false;
      state.el.classList.remove("cursor-grabbing");
    };

    window.addEventListener("mouseup", stopDrag);
    window.addEventListener("mouseleave", stopDrag);

    return () => {
      window.removeEventListener("mouseup", stopDrag);
      window.removeEventListener("mouseleave", stopDrag);
    };
  }, []);

  /* ================= RENDER ================= */

  return (
    <div className="px-4 py-3 border-b">
      <form onSubmit={handleSubmit} noValidate>
        <div className="flex gap-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src={avatarUrl} />
            <AvatarFallback>
              {fullName?.[0]?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="border border-zinc-800 rounded-lg bg-transparent">
              {/* TEXTAREA */}
              <div className="relative">
                <Textarea
                  placeholder={
                    placeholder ??
                    (isReply ? "Viết phản hồi..." : "Viết bình luận...")
                  }
                  value={commentContent}
                  onChange={(e) => setCommentContent(e.target.value)}
                  className="
                    min-h-[40px]
                    w-full
                    border-0
                    resize-none
                    focus-visible:ring-0
                    bg-transparent
                    [padding-inline-end:2rem]
                  "
                />

                <EmojiPickerButton
                  onSelectEmoji={(emoji) =>
                    setCommentContent((prev) => prev + emoji)
                  }
                  className="absolute right-2 top-2 z-10"
                />
              </div>

              {/* MEDIA PREVIEW */}
              {commentFiles.length > 0 && (
                <div className="mt-2 px-3 pb-2 space-y-2">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-xs text-muted-foreground">
                      {commentFiles.length} media
                    </span>

                    <button
                      type="button"
                      onClick={handleRemoveAll}
                      className="text-xs text-red-400 hover:underline"
                    >
                      Gỡ tất cả
                    </button>
                  </div>

                  <div className="w-full max-w-full rounded-2xl border border-border/40 bg-black/20 overflow-hidden">
                    <div
                      className="
                        media-scroll
                        flex gap-3
                        overflow-x-auto
                        px-3 py-3
                        cursor-grab
                        flex-nowrap
                        select-none
                      "
                      onMouseDown={handlePreviewMouseDown}
                      onMouseMove={handlePreviewMouseMove}
                      onDragStart={(e) => e.preventDefault()}
                    >
                      {commentFiles.map((m, idx) => (
                        <div
                          key={m.id}
                          className="
                            relative
                            flex-shrink-0
                            max-w-[150px]
                            aspect-[3/4]
                            rounded-xl
                            overflow-hidden
                          "
                        >
                          <button
                            type="button"
                            onClick={() => {
                              if (hasDraggedRef.current) return;
                              handleRemoveOne(idx);
                            }}
                            className="
                              absolute
                              top-2
                              right-2
                              z-20
                              bg-black/60
                              hover:bg-black/80
                              rounded-full
                              p-1
                            "
                          >
                            <X className="w-4 h-4 text-white" />
                          </button>

                          {m.kind === "video" ? (
                            <video
                              src={m.preview}
                              draggable={false}
                              autoPlay
                              muted
                              loop
                              playsInline
                              className="block w-full h-full object-cover"
                            />
                          ) : (
                            <img
                              src={m.preview}
                              draggable={false}
                              className="block w-full h-full object-cover"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ACTION BAR */}
              <div className="flex items-center justify-between px-2 py-1 border-t border-zinc-800">
                <label className="flex items-center gap-1 text-xs cursor-pointer">
                  <ImageIcon className="w-4 h-4" />
                  <span>Thêm ảnh / video</span>

                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    hidden
                    onChange={handleCommentFilesChange}
                  />
                </label>

                <div className="flex items-center gap-2">
                  {isReply && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={onCancelReply}
                      className="
                        h-7 px-2 text-[12px] rounded-full
                        border border-transparent
                        hover:border-border
                        hover:bg-muted/40
                      "
                    >
                      Hủy
                    </Button>
                  )}

                  <Button
                    type="submit"
                    size="sm"
                    disabled={submitting}
                    className="h-7 px-4 text-[12px] rounded-full"
                  >
                    Gửi
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}