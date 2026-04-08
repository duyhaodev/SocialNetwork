import { useEffect, useState, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Image as ImageIcon, Heart, X } from "lucide-react";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { ImageViewer } from "@/components/ImageViewer/ImageViewer.jsx";
import { fetchCommentsByPost, createComment as createCommentThunk, selectCommentsByPostId, selectCommentsLoadingByPostId, selectCommentsErrorByPostId, selectCommentSubmittingByPostId, selectCommentsPageByPostId, selectCommentsHasMoreByPostId, } from "@/store/commentsSlice";
import { toggleCommentLike, deleteComment } from "@/store/commentsSlice";
import {formatTimeAgo} from "../../utils/dateUtils.js"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,} from "../ui/dropdown-menu";
import { Trash2 } from "lucide-react";
import CommentForm from "./CommentForm";

const PAGE_SIZE = 10;
export function PostComments({ postId, onProfileClick, onCommentCreated }) {
  const dispatch = useDispatch();

  // USER HIỆN TẠI TỪ REDUX
  const profile = useSelector((s) => s.user.profile) ?? {};
  const fullName = profile.fullName ?? "Bạn";
  const avatarUrl = profile.avatarUrl ?? null;
  const currentUserId = profile?.id || profile?._id;


  // COMMENTS từ Redux
  const comments = useSelector((state) => selectCommentsByPostId(state, postId));
  const loadingComments = useSelector((state) => selectCommentsLoadingByPostId(state, postId));
  const commentsError = useSelector((state) => selectCommentsErrorByPostId(state, postId));
  const submittingComment = useSelector((state) => selectCommentSubmittingByPostId(state, postId));
  const commentsPage = useSelector((state) => selectCommentsPageByPostId(state, postId));
  const hasMoreComments = useSelector((state) => selectCommentsHasMoreByPostId(state, postId));

  // LOCAL UI STATE
  const [replyTo, setReplyTo] = useState(null); 
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

  // Tạo comment
  const handleCreateComment = async (formData) => {
  try {
    await dispatch(
      createCommentThunk({ postId, formData })
    ).unwrap();

    onCommentCreated?.();
  } catch (err) {
    toast.error(err?.message || "Không gửi được bình luận");
    throw err;
  }
};

  // Tạo reply
const handleCreateReply = (parentId) => async (formData) => {
  try {
    formData.append("parentId", parentId);
    await dispatch(
      createCommentThunk({ postId, formData })
    ).unwrap();

    setReplyTo(null);
  } catch (err) {
    toast.error(err?.message || "Không gửi được reply");
    throw err;
  }
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
  // ======== REPLY COMMENT ========
  const handleOpenReply = (commentId) => {
    setReplyTo(commentId);
  };

  // ======== DELETE COMMENT ========
  const handleDeleteComment = async (commentId) => {
      try {
        await dispatch(deleteComment({ postId, commentId,})).unwrap();
        toast.success("Đã xóa bình luận");
      } catch (err) {
        toast.error(err?.message || "Xóa bình luận thất bại");
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
      <CommentForm
        avatarUrl={avatarUrl}
        fullName={fullName}
        submitting={submittingComment}
        onSubmit={handleCreateComment}
      />

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
                className="group flex gap-3 pb-4 border-b border-border relative"
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
                    {/* LIKE */}
                    <button
                      onClick={() => handleToggleLikeComment(c.id)}
                      className={`flex items-center gap-1 text-xs transition-colors ${
                        c.likedByCurrentUser ? "text-red-500" : "text-muted-foreground hover:text-red-500"
                      }`}
                    >
                      <Heart className={`w-3 h-3 ${c.likedByCurrentUser ? "fill-red-500" : ""}`} />
                      <span className="ml-1">{c.likeCount ?? 0}</span>
                    </button>
                    {/* REPLY */}
                    <button
                      onClick={() => handleOpenReply(c.id)}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Reply
                    </button>
                  </div>
                  {/* ===== REPLY BOX (CHÈN NGAY ĐÂY) ===== */}
                  {replyTo === c.id && (
                    <div className="mt-3 ml-10">
                      <CommentForm
  isReply={true}
  avatarUrl={avatarUrl}
  fullName={fullName}
  placeholder={`Trả lời bình luận của ${c.fullName ?? "người dùng"}...`}
  submitting={submittingComment}
  onSubmit={handleCreateReply(c.id)}
  onCancelReply={() => setReplyTo(null)}
/>

                    </div>
                  )}

                </div>
                {/* MORE MENU BUTTON */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-2 h-auto"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent
                      align="end"
                      sideOffset={8}
                      className="w-44 bg-[#1e1e1e] border-[#2a2a2a] text-[15px] font-semibold p-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Ai cũng thấy */}
                      <DropdownMenuItem
                        className="cursor-pointer hover:bg-[#2a2a2a] focus:bg-[#2a2a2a] rounded-md px-3 py-2"
                        onClick={() => handleCopyCommentLink(c.id)}
                      >
                        Copy link
                      </DropdownMenuItem>

                      {/* Chỉ chính chủ */}
                      {c.userId === currentUserId && (
                        <DropdownMenuItem
                          className="cursor-pointer hover:bg-[#2a2a2a] focus:bg-[#2a2a2a] rounded-md px-3 py-2"
                          onClick={() => handleDeleteComment(c.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                          <span className="text-red-500">Delete comment</span>
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
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
