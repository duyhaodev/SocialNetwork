import { useEffect, useState, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Image as ImageIcon, Heart, X, Smile } from "lucide-react";
import EmojiPicker from "emoji-picker-react";
import { toast } from "sonner";
import { ImageViewer } from "@/components/ImageViewer/ImageViewer.jsx";
import { fetchCommentsByPost, createComment as createCommentThunk, selectCommentsByPostId, selectCommentsLoadingByPostId, selectCommentsErrorByPostId, selectCommentSubmittingByPostId, selectCommentsPageByPostId, selectCommentsHasMoreByPostId, } from "@/store/commentsSlice";
import { toggleCommentLike } from "@/store/commentsSlice";
import {formatTimeAgo} from "../../utils/dateUtils.js"

const PAGE_SIZE = 10;
export function PostComments({ postId, onProfileClick, onCommentCreated }) {
  const dispatch = useDispatch();

  // USER HIỆN TẠI TỪ REDUX
  const profile = useSelector((s) => s.user.profile) ?? {};
  const fullName = profile.fullName ?? "Bạn";
  const avatarUrl = profile.avatarUrl ?? null;

  // COMMENTS từ Redux
  const comments = useSelector((state) => selectCommentsByPostId(state, postId));
  const loadingComments = useSelector((state) => selectCommentsLoadingByPostId(state, postId));
  const commentsError = useSelector((state) => selectCommentsErrorByPostId(state, postId));
  const submittingComment = useSelector((state) => selectCommentSubmittingByPostId(state, postId));
  const commentsPage = useSelector((state) => selectCommentsPageByPostId(state, postId));
  const hasMoreComments = useSelector((state) => selectCommentsHasMoreByPostId(state, postId));

  // LOCAL UI STATE
  const [commentContent, setCommentContent] = useState("");
  const [commentFiles, setCommentFiles] = useState([]);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const emojiRef = useRef(null);
  const loadMoreRef = useRef(null);
  const loadDelayRef = useRef(null); // delay trước khi load thêm

  // Build URL media
  const buildMediaUrl = (raw) => {
    if (!raw) return "";
    return /^https?:\/\//i.test(raw)
      ? raw
      : `${import.meta.env.VITE_BACKEND_URL || ""}${raw}`;
  };

  // ImageViewer cho comment
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [viewerMediaList, setViewerMediaList] = useState([]);
  const openViewerForComment = (comment, index) => {
    const list = (comment.mediaList || []).map((m) => ({
      ...m,
      mediaUrl: buildMediaUrl(m.mediaUrl),
    }));
    setViewerMediaList(list);
    setViewerIndex(index);
    setViewerOpen(true);
  };

  // cleanup preview khi unmount
  useEffect(() => {
    return () => {
      commentFiles.forEach((m) => {
        if (m.preview) URL.revokeObjectURL(m.preview);
      });
    };
  }, []);

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

  const handleEmojiSelect = (emojiData) => {
    setCommentContent((prev) => prev + emojiData.emoji);
  };

  // ======== LOAD COMMENTS ========
  useEffect(() => {
    if (!postId) return;
    dispatch(fetchCommentsByPost({ postId, page: 0, size: PAGE_SIZE }));
  }, [postId, dispatch]);

  // Auto load thêm khi cuộn tới cuối (infinite scroll, có delay)
  useEffect(() => {
    if (!postId) return;
    if (!hasMoreComments) return;
    if (loadingComments) return;
    if (commentsError) return;

    const el = loadMoreRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry.isIntersecting) return;
        if (loadingComments || !hasMoreComments || commentsError) return;

        // nếu đang chờ load rồi thì không set thêm
        if (loadDelayRef.current) return;

        loadDelayRef.current = setTimeout(() => {
          dispatch(
            fetchCommentsByPost({
              postId,
              page: commentsPage + 1,
              size: PAGE_SIZE,
            })
          );
          loadDelayRef.current = null;
        }, 300);
      },
      {
        root: null,
        threshold: 0.1,
      }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
      if (loadDelayRef.current) {
        clearTimeout(loadDelayRef.current);
        loadDelayRef.current = null;
      }
    };
  }, [postId, hasMoreComments, loadingComments, commentsPage, dispatch, commentsError]);

  // Hiện toast khi lỗi load comment
  useEffect(() => {
    if (commentsError) {
      toast.error(commentsError);
    }
  }, [commentsError]);

  // ======== TOGGLE LIKE COMMENT ========
  const handleToggleLikeComment = async (commentId) => {
  if (!postId || !commentId) return;
  try {
    await dispatch(toggleCommentLike({ postId, commentId })).unwrap();
  } catch (err) {
    toast.error(err?.message || "Không thể thích bình luận");
  }
};

  // ======== CHỌN FILE + PREVIEW ========
  const handleCommentFilesChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const newItems = [];
    for (const file of files) {
      if (!file) continue;
      const type = file.type || "";
      const isImage = type.startsWith("image/");
      const isVideo = type.startsWith("video/");

      if (!isImage && !isVideo) {
        toast.error(`File "${file.name}" không phải hình hoặc video, bỏ qua.`);
        continue;
      }
      const previewUrl = URL.createObjectURL(file);
      newItems.push({
        file,
        kind: isImage ? "image" : "video",
        preview: previewUrl,
      });
    }

    if (!newItems.length) return;
    setCommentFiles((prev) => [...prev, ...newItems]);
    if (e.target) e.target.value = "";
  };

  // XÓA 1 MEDIA TRONG PREVIEW
  const handleRemoveOne = (index) => {
    setCommentFiles((prev) => {
      const clone = [...prev];
      const removed = clone.splice(index, 1)[0];
      if (removed?.preview) URL.revokeObjectURL(removed.preview);
      return clone;
    });
  };

  // GỠ TẤT CẢ MEDIA
  const handleRemoveAll = () => {
    commentFiles.forEach((m) => {
      if (m.preview) URL.revokeObjectURL(m.preview);
    });
    setCommentFiles([]);
  };

  // ======== SUBMIT COMMENT ========
  const handleSubmitComment = async (e) => {
    e.preventDefault();

    if (!commentContent.trim() && commentFiles.length === 0) {
      toast.error("Bạn chưa nhập nội dung / chọn media");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("content", commentContent);
      commentFiles.forEach((item) => {
        formData.append("files", item.file);
      });

      await dispatch(createCommentThunk({ postId, formData })).unwrap();

      setCommentContent("");

      // clear preview
      commentFiles.forEach((m) => {
        if (m.preview) URL.revokeObjectURL(m.preview);
      });
      setCommentFiles([]);
      setEmojiOpen(false);

      if (typeof onCommentCreated === "function") {
        onCommentCreated();
      }
    } catch (err) {
      console.error("Lỗi gửi comment:", err);
      toast.error(err?.message || "Không gửi được bình luận");
    }
  };

  // ===== DRAG-TO-SCROLL CHUNG =====
  const dragState = useRef({
    isDragging: false,
    el: null,
    startX: 0,
    scrollLeft: 0,
  });
  const hasDraggedRef = useRef(false); // phân biệt kéo vs click

  const handleDragStart = (e) => {
    if (e.button !== 0) return; // chỉ chuột trái
    const el = e.currentTarget;
    dragState.current = {
      isDragging: true,
      el,
      startX: e.pageX - el.offsetLeft,
      scrollLeft: el.scrollLeft,
    };
    hasDraggedRef.current = false;
    el.classList.add("cursor-grabbing");
  };

  const handleDragMove = (e) => {
    const state = dragState.current;
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
      const state = dragState.current;
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

  return (
    <>
      {/* Ẩn scrollbar */}
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

      {/* FORM COMMENT */}
      <div className="px-4 py-3 border-b">
        <form onSubmit={handleSubmitComment} noValidate>
          <div className="flex gap-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src={avatarUrl} alt={fullName} />
              <AvatarFallback>
                {fullName?.[0]?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <div className="border border-zinc-800 rounded-lg bg-transparent">
                {/* Textarea + emoji */}
                <div className="relative">
                  <Textarea
                    placeholder="Viết bình luận..."
                    value={commentContent}
                    onChange={(e) => setCommentContent(e.target.value)}
                    className="w-full max-w-full min-h-[40px] text-sm border-0 bg-transparent 
                               resize-none focus-visible:ring-0 placeholder:text-muted-foreground
                               pr-10"
                    style={{
                      paddingRight: "2rem",
                      wordBreak: "break-word",
                      overflowWrap: "break-word",
                    }}
                  />

                  <button
                    type="button"
                    onClick={() => setEmojiOpen((v) => !v)}
                    className="absolute right-2 top-1.5 text-muted-foreground hover:text-foreground"
                  >
                    <Smile className="w-5 h-5" />
                  </button>

                  {emojiOpen && (
                    <div
                      ref={emojiRef}
                      className="absolute right-0 top-9 z-50 w-72 rounded-xl border border-border bg-[#111] shadow-lg"
                    >
                      <EmojiPicker
                        theme="dark"
                        width="100%"
                        height={400}
                        emojiStyle="native"
                        searchDisabled
                        previewConfig={{ showPreview: false }}
                        onEmojiClick={handleEmojiSelect}
                      />
                    </div>
                  )}
                </div>

                {/* MEDIA PREVIEW khi đang gõ */}
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
                        className="media-scroll flex gap-3 overflow-x-auto px-3 py-3 cursor-grab"
                        onMouseDown={handleDragStart}
                        onMouseMove={handleDragMove}
                        onDragStart={(e) => e.preventDefault()}
                      >
                        {commentFiles.map((m, idx) => (
                          <div
                            key={idx}
                            className="relative group flex-shrink-0 max-w-[150px] aspect-[3/4] rounded-xl overflow-hidden"
                          >
                            <button
                              type="button"
                              onClick={() => handleRemoveOne(idx)}
                              className="absolute top-2 right-2 z-20 bg-black/60 hover:bg-black/80 rounded-full p-1"
                              title="Gỡ media"
                            >
                              <X className="w-4 h-4 text-white" />
                            </button>

                            {m.kind === "video" ? (
                              <video
                                src={m.preview}
                                preload="metadata"
                                draggable={false}
                                className="block w-full h-full object-cover"
                                autoPlay
                                muted
                                loop
                                playsInline
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

                <div className="flex items-center justify-between px-2 py-1 border-t border-zinc-800">
                  <label className="inline-flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                    <ImageIcon className="w-4 h-4" />
                    <span>Thêm ảnh / video</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*,video/*"
                      className="hidden"
                      onChange={handleCommentFilesChange}
                    />
                  </label>

                  <Button
                    type="submit"
                    size="sm"
                    disabled={
                      submittingComment ||
                      (!commentContent.trim() && commentFiles.length === 0)
                    }
                    className="h-7 px-4 text-[12px] rounded-full"
                  >
                    {submittingComment ? "Đang gửi..." : "Gửi"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* DANH SÁCH COMMENT */}
      <div className="px-4 py-3">
        {/* loading lần đầu (chưa có comment nào) */}
        {!comments.length && loadingComments ? (
          <div className="flex justify-center py-4">
            <Spinner />
          </div>
        ) : !comments.length ? (
          <div className="text-sm text-muted-foreground">
            Chưa có bình luận nào.
          </div>
        ) : (
          <div className="space-y-4">
            {comments.map((c) => (
              <div
                key={c.id}
                className="flex gap-3 pb-4 border-b border-border"
              >
                <Avatar
                  className="w-10 h-10 cursor-pointer"
                  onClick={() => onProfileClick?.(c.userName)}
                >
                  <AvatarImage src={c.avatarUrl} alt={c.fullName} />
                  <AvatarFallback>
                    {c.fullName?.[0]?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 space-y-1">
                  <div className="flex items-baseline gap-2">
                    <span
                      className="font-semibold text-sm cursor-pointer hover:underline"
                      onClick={() => onProfileClick?.(c.userName)}
                    >
                      {c.fullName}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      @{c.userName}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      · {formatTimeAgo(c.createdAt)}
                    </span>
                  </div>

                  <div className="text-sm whitespace-pre-wrap leading-relaxed">
                    {c.content}
                  </div>

                  {c.mediaList?.length > 0 && (
                    <div className="mt-2 w-full max-w-full overflow-hidden rounded-2xl">
                      <div
                        className="media-scroll flex gap-3 overflow-x-auto px-3 py-3 cursor-grab flex-nowrap"
                        onMouseDown={handleDragStart}
                        onMouseMove={handleDragMove}
                        onDragStart={(e) => e.preventDefault()}
                      >
                        {c.mediaList.map((m, idx) => {
                          const url = buildMediaUrl(m.mediaUrl);
                          const isVideo = m.mediaType === "video";

                          return (
                            <div
                              key={m.id ?? idx}
                              className="relative flex-shrink-0 max-w-[170px] aspect-[3/4] rounded-xl overflow-hidden bg-black/40"
                              onClick={() => {
                                if (hasDraggedRef.current) return;
                                openViewerForComment(c, idx);
                              }}
                            >
                              {isVideo ? (
                                <video
                                  src={url}
                                  className="w-full h-full object-cover"
                                  autoPlay
                                  muted
                                  loop
                                  playsInline
                                />
                              ) : (
                                <img
                                  src={url}
                                  alt="comment media"
                                  className="w-full h-full object-cover"
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-4 pt-2">
                    <button
                      onClick={() => handleToggleLikeComment(c.id)}
                      className={`flex items-center gap-1 text-xs transition-colors ${
                        c.likedByCurrentUser ? "text-red-500" : "text-muted-foreground hover:text-red-500"
                      }`}
                    >
                      <Heart className={`w-3 h-3 ${c.likedByCurrentUser ? "fill-red-500" : ""}`} />
                      <span className="ml-1">{c.likeCount ?? 0}</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* LOAD MORE */}
            <div className="pt-3">
              {loadingComments && hasMoreComments && (
                <div className="flex justify-center py-2">
                  <Spinner />
                </div>
              )}
              {hasMoreComments && !commentsError && <div ref={loadMoreRef} className="h-1" />}
            </div>
          </div>
        )}
      </div>

      {/* ImageViewer cho media trong comment */}
      <ImageViewer
        open={viewerOpen}
        onClose={() => setViewerOpen(false)}
        mediaList={viewerMediaList}
        index={viewerIndex}
      />
    </>
  );
}

export default PostComments;
