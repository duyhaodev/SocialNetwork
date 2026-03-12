import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Dialog, DialogContent, DialogDescription } from "../ui/dialog";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Image as ImageIcon, Smile, AtSign, X } from "lucide-react";
import EmojiPicker from "emoji-picker-react";
import { toast } from "sonner";
import { createPost, selectPostsCreating } from "../../store/postsSlice";

export function CreatePost({ open, onOpenChange }) {

  // REDUX & USER PROFILE
  const dispatch = useDispatch();
  const profile = useSelector((s) => s.user.profile) ?? {};
  const displayName = profile.fullName ?? "Unknown";
  const username = profile.userName ?? "unknown";
  const avatarUrl = profile.avatarUrl ?? null;
  const creating = useSelector(selectPostsCreating);

  // LOCAL STATE
  const [content, setContent] = useState("");
  const [mediaFiles, setMediaFiles] = useState([]);
  const [emojiOpen, setEmojiOpen] = useState(false);

  // REFS
  const fileInputRef = useRef(null);
  const emojiRef = useRef(null);

  // REFS cho drag-to-scroll
  const mediaScrollRef = useRef(null);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);

  // POST
  // cleanup preview khi component hủy
  useEffect(() => {
    return () => {
      mediaFiles.forEach((m) => {
        if (m.preview) URL.revokeObjectURL(m.preview);
      });
    };
  }, []);

  // chọn nhiều file (ảnh / video)
  const onFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const newItems = [];
    for (const file of files) {
      const type = file.type || "";
      const isImage = type.startsWith("image/");
      const isVideo = type.startsWith("video/");

      if (!isImage && !isVideo) {
        toast.error(`File "${file.name}" is not an image or video. Please select again.`);
        continue;
      }

      const previewUrl = URL.createObjectURL(file); // URL tạm để preview
      newItems.push({
        file,
        kind: isImage ? "image" : "video",
        preview: previewUrl,
      });
    }

    if (!newItems.length) {
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setMediaFiles((prev) => [...prev, ...newItems]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // gỡ 1 file
  const handleRemoveOne = (index) => {
    setMediaFiles((prev) => {
      const clone = [...prev];
      const removed = clone.splice(index, 1)[0];
      if (removed?.preview) URL.revokeObjectURL(removed.preview);
      return clone;
    });
  };

  // gỡ tất cả file
  const handleRemoveAll = () => {
    mediaFiles.forEach((m) => {
      if (m.preview) URL.revokeObjectURL(m.preview);
    });
    setMediaFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async () => {
    const trimContent = (content || "").trim();
    if (!trimContent && mediaFiles.length === 0) return;

    const fd = new FormData();
    if (trimContent) fd.append("content", trimContent);
    mediaFiles.forEach((m) => {
      fd.append("files", m.file); // key phải trùng với BE
    });

    const action = await dispatch(createPost(fd));
    if (createPost.fulfilled.match(action)) {
      toast.success("Posted successfully!");
      setContent("");
      handleRemoveAll();
      setEmojiOpen(false);
      onOpenChange(false);
    } else {
      toast.error(action.payload?.message || "Post failed!");
    }
  };

  // EMOJI 
  // đóng emoji khi click ra ngoài
  useEffect(() => {
    if (!emojiOpen) return;

    const handleClickOutside = (e) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target)) {
        setEmojiOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [emojiOpen]);

  // chèn emoji vào content
  const handleEmojiClick = (emojiData) => {
    setContent((prev) => prev + emojiData.emoji);
  };

  // SCROLL: DRAG-TO-SCROLL
  // kết thúc kéo
  useEffect(() => {
    const handleUp = () => {
      const el = mediaScrollRef.current;
      if (!isDraggingRef.current || !el) return;
      isDraggingRef.current = false;
      el.classList.remove("cursor-grabbing");
    };

    window.addEventListener("mouseup", handleUp);
    window.addEventListener("mouseleave", handleUp);

    return () => {
      window.removeEventListener("mouseup", handleUp);
      window.removeEventListener("mouseleave", handleUp);
    };
  }, []);

  // bắt đầu kéo
  const handleMediaMouseDown = (e) => {
    if (!mediaScrollRef.current) return;
    if (e.button !== 0) return; // chỉ chuột trái

    const el = mediaScrollRef.current;
    isDraggingRef.current = true;
    el.classList.add("cursor-grabbing");

    startXRef.current = e.pageX - el.offsetLeft;
    scrollLeftRef.current = el.scrollLeft;
  };

  // đang kéo
  const handleMediaMouseMove = (e) => {
    const el = mediaScrollRef.current;
    if (!isDraggingRef.current || !el) return;

    e.preventDefault();
    const x = e.pageX - el.offsetLeft;
    const walk = x - startXRef.current;
    el.scrollLeft = scrollLeftRef.current - walk;
  };
  const hasMedia = mediaFiles.length > 0;
  
  return (
    <Dialog open={open} onOpenChange={(v) => (!v ? onOpenChange(false) : onOpenChange(true))}>
      <DialogContent
        className="max-w-[420px] p-0 gap-0 bg-[#181818] border-[#2a2a2a] [&>button]:hidden"
        aria-describedby="dialog-description"
      >
        <style>
          {`
            .media-scroll {
              scrollbar-width: none;
              -ms-overflow-style: none;
            }
            .media-scroll::-webkit-scrollbar {
              display: none;
            }
          `}
        </style>

        <DialogDescription id="dialog-description" className="sr-only">
          Create new thread with content, emoji and control options
        </DialogDescription>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2a]">
          <Button
            variant="ghost"
            onClick={() => {
              setEmojiOpen(false);
              onOpenChange(false);
            }}
            className="h-auto p-0 hover:bg-transparent cursor-pointer"
          >
            Cancel
          </Button>
          <h2 className="font-semibold">New thread</h2>
          <div className="w-16"></div>
        </div>

        {/* Content */}
        <div className="px-4 py-4">
          <div className="flex gap-3">
            <Avatar className="w-10 h-10 flex-shrink-0">
              <AvatarImage
                src={avatarUrl}
                alt={displayName}
                onError={(e) => {
                  e.currentTarget.src = "/default-avatar.png";
                }}
              />
              <AvatarFallback>
                {(displayName || "U").charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="mb-3">
                <div className="mb-1">
                  <span className="font-semibold">@{username}</span>
                </div>

                <Textarea
                  placeholder="What's new?"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="min-h-[25px] resize-none border-none p-0 focus-visible:ring-0 text-base bg-transparent placeholder:text-muted-foreground w-full max-w-full"
                  style={{ wordBreak: "break-word", overflowWrap: "break-word" }}
                  maxLength={500}
                  autoFocus
                />
              </div>

              {/* Tools */}
              <div className="mt-3 flex items-center gap-3 relative">
                {/* Chọn ảnh/video */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="p-2 h-auto text-muted-foreground hover:text-foreground cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImageIcon className="w-5 h-5" />
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  className="hidden"
                  onChange={onFileChange}
                />

                {/* Mention */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-2 h-auto text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <AtSign className="w-5 h-5" />
                </Button>

                {/* Emoji */}
                <div className="relative" ref={emojiRef}>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="p-2 h-auto text-muted-foreground hover:text-foreground cursor-pointer"
                    onClick={() => setEmojiOpen((v) => !v)}
                  >
                    <Smile className="w-5 h-5" />
                  </Button>

                  {emojiOpen && (
                    <div className="absolute left-0 top-9 z-50 w-72 rounded-xl border border-border bg-[#111] shadow-lg">
                      <EmojiPicker
                        theme="dark"
                        width="100%"
                        height={400}
                        emojiStyle="native"
                        searchDisabled
                        previewConfig={{ showPreview: false }}
                        onEmojiClick={handleEmojiClick}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Media preview */}
              {hasMedia && (
                <div className="mt-3 space-y-2">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-xs text-muted-foreground">
                      {mediaFiles.length} media
                    </span>
                    <button
                      type="button"
                      onClick={handleRemoveAll}
                      className="text-xs text-red-400 hover:underline"
                    >
                      Remove all
                    </button>
                  </div>

                  <div className="w-full max-w-full rounded-2xl border border-border/40 bg-black/20 overflow-hidden">
                    <div
                      ref={mediaScrollRef}
                      className="media-scroll flex gap-3 overflow-x-auto px-3 py-3 cursor-grab"
                      onMouseDown={handleMediaMouseDown}
                      onMouseMove={handleMediaMouseMove}
                      onDragStart={(e) => e.preventDefault()} // chặn native drag
                    >
                      {mediaFiles.map((m, idx) => (
                        <div
                          key={idx}
                          className="relative group flex-shrink-0 max-w-[150px] aspect-[3/4] rounded-xl overflow-hidden"
                        >
                          <button
                            type="button"
                            onClick={() => handleRemoveOne(idx)}
                            className="absolute top-2 right-2 z-20 bg-black/60 hover:bg-black/80 rounded-full p-1"
                            title="Remove media"
                          >
                            <X className="w-4 h-4 text-white" />
                          </button>

                          {m.kind === "video" ? (
                            <video
                              src={m.preview}
                              controls
                              preload="metadata"
                              draggable={false}
                              className="block w-full h-full object-cover"
                            />
                          ) : (
                            <img
                              src={m.preview}
                              alt="preview"
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
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-[#2a2a2a] flex items-center justify-between">
          <span
            className={`text-sm ${
              content.length > 450 ? "text-red-500" : "text-muted-foreground"
            }`}
          >
            {content.length}/500
          </span>
          <Button
            onClick={handleSubmit}
            disabled={creating || (!content.trim() && mediaFiles.length === 0)}
            size="sm"
            className="px-6 cursor-pointer"
          >
            {creating ? "Posting..." : "Post"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default CreatePost;
