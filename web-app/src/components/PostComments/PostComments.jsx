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
import mediaApi from "../../api/mediaApi";

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
    const list = (comment.mediaUrls || []).map((url) => ({
      mediaUrl: buildMediaUrl(url),
      mediaType: url.toLowerCase().endsWith(".mp4") ? "video" : "image"
    }));
    setViewerMediaList(list);
    setViewerIndex(index);
    setViewerOpen(true);
  };

  // 1. Tạo comment chính
  const handleCreateComment = async (data) => {
    try {
      let idsToSubmit = []; 

      // Chỉ thực hiện upload nếu có files
      if (data.files && data.files.length > 0) {
        const fd = new FormData();
        data.files.forEach((f) => fd.append("files", f));

        const uploadRes = await mediaApi.upload(fd);
        
        // Bóc tách mảng: ưu tiên .result, sau đó đến .data.result, cuối cùng là chính nó
        const uploaded = uploadRes?.result || uploadRes?.data?.result || (Array.isArray(uploadRes) ? uploadRes : []);
        
        // Lấy ID (chấp nhận cả trường id hoặc fileId)
        idsToSubmit = uploaded.map((m) => m.id || m.fileId).filter(Boolean);
        console.log("✅ IDs bóc được cho Comment:", idsToSubmit);
      }

      const payload = {
        postId: postId, // Đảm bảo postId này tồn tại
        content: data.content,
        parentId: null,
        mediaIds: idsToSubmit 
      };

      console.log("🚀 Gửi Comment Payload:", payload);
      await dispatch(createCommentThunk(payload)).unwrap();

      // Refresh lại danh sách
      dispatch(fetchCommentsByPost({ postId, page: 0, size: PAGE_SIZE }));
      onCommentCreated?.();
    } catch (err) {
      console.error("Lỗi tạo comment:", err);
      toast.error(err?.message || "Không gửi được bình luận");
    }
  };

  // 2. Tạo reply
  const handleCreateReply = (parentId) => async (data) => {
    try {
      let idsToSubmit = []; 

      if (data.files && data.files.length > 0) {
        const fd = new FormData();
        data.files.forEach((f) => fd.append("files", f));
        
        const uploadRes = await mediaApi.upload(fd);
        const uploaded = uploadRes?.result || uploadRes?.data?.result || (Array.isArray(uploadRes) ? uploadRes : []);
        
        idsToSubmit = uploaded.map((m) => m.id || m.fileId).filter(Boolean);
        console.log("✅ IDs bóc được cho Reply:", idsToSubmit);
      }

      const payload = {
        postId: postId,
        content: data.content,
        parentId: parentId,
        mediaIds: idsToSubmit // ĐỒNG BỘ: Dùng mediaIds thay vì mediaUrls
      };

      console.log("🚀 Gửi Reply Payload:", payload);
      await dispatch(createCommentThunk(payload)).unwrap();

      dispatch(fetchCommentsByPost({ postId, page: 0, size: PAGE_SIZE }));
      setReplyTo(null);
    } catch (err) {
      console.error("Lỗi tạo reply:", err);
      toast.error(err?.message || "Không gửi được phản hồi");
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
  const hasDraggedRef = useRef(false);

  const handleDragStart = (e) => {
    if (e.button !== 0) return;
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

      <CommentForm
        avatarUrl={avatarUrl}
        fullName={fullName}
        submitting={submittingComment}
        onSubmit={handleCreateComment}
      />

      <div className="px-4 py-3">
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
                  onClick={() => onProfileClick?.(c.username)}
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
                      onClick={() => onProfileClick?.(c.username)}
                    >
                      {c.fullName}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      @{c.username}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      · {formatTimeAgo(c.createdAt)}
                    </span>
                  </div>

                  <div className="text-sm whitespace-pre-wrap leading-relaxed">
                    {c.content}
                  </div>

                  {c.mediaUrls?.length > 0 && (
                    <div className="mt-2 w-full max-w-full overflow-hidden rounded-2xl">
                      <div
                        className="media-scroll flex gap-3 overflow-x-auto px-3 py-3 cursor-grab flex-nowrap"
                        onMouseDown={handleDragStart}
                        onMouseMove={handleDragMove}
                        onDragStart={(e) => e.preventDefault()}
                      >
                        {c.mediaUrls.map((mUrl, idx) => {
                          const url = buildMediaUrl(mUrl);
                          const isVideo = mUrl.toLowerCase().endsWith(".mp4");

                          return (
                            <div
                              key={idx}
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
                    <button
                      onClick={() => handleOpenReply(c.id)}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Reply
                    </button>
                  </div>
                  
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
                      <DropdownMenuItem
                        className="cursor-pointer hover:bg-[#2a2a2a] focus:bg-[#2a2a2a] rounded-md px-3 py-2"
                        onClick={() => {
                          const link = `${window.location.origin}/post/${postId}/comment/${c.id}`;
                          navigator.clipboard.writeText(link);
                          toast.success("Đã sao chép liên kết bình luận");
                        }}
                      >
                        Copy link
                      </DropdownMenuItem>

                      {(c.userId === currentUserId || c.username === profile.username) && (
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