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
import { toggleCommentLike, deleteComment, fetchReplies } from "@/store/commentsSlice";
import {formatTimeAgo} from "../../utils/dateUtils.js"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,} from "../ui/dropdown-menu";
import { Trash2 } from "lucide-react";
import CommentForm from "./CommentForm";
import { ReplyView } from "./ReplyView";
import mediaApi from "../../api/mediaApi";
import aiApi from "../../api/aiApi";
import ModerationWarning from "../ModerationWarning/ModerationWarning";
import { UserHoverCard } from "../UserHoverCard/UserHoverCard";

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

  // MODERATION
  const [moderationResult, setModerationResult] = useState(null);
  const [showModWarning, setShowModWarning] = useState(false);
  const pendingActionRef = useRef(null);
  const [formResetKey, setFormResetKey] = useState(0);

  // LOCAL UI STATE
  const [replyTo, setReplyTo] = useState(null);
  const [expandedReplies, setExpandedReplies] = useState(new Set()); // commentId nào đang mở replies
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

  // Kiểm duyệt nội dung trước khi gửi
  const moderateAndRun = async (content, action) => {
    if (content?.trim()) {
      let modResult = null;
      try {
        modResult = await aiApi.moderate({ content: content.trim() });
      } catch {
        // Moderation service lỗi → cho gửi bình thường
      }
      if (modResult?.warning_level && modResult.warning_level !== "safe") {
        setModerationResult(modResult);
        pendingActionRef.current = action;
        setShowModWarning(true);
        throw new Error("__moderation__");
      }
    }
    await action();
  };

  // Thực hiện gửi comment (bỏ qua moderation)
  const doCreateComment = async (data) => {
    try {
      let idsToSubmit = [];

      if (data.files && data.files.length > 0) {
        const fd = new FormData();
        data.files.forEach((f) => fd.append("files", f));

        const uploadRes = await mediaApi.upload(fd);
        const uploaded = uploadRes?.result || uploadRes?.data?.result || (Array.isArray(uploadRes) ? uploadRes : []);

        idsToSubmit = uploaded.map((m) => m.id || m.fileId).filter(Boolean);
      }

      const payload = {
        postId: postId,
        content: data.content,
        parentId: null,
        mediaIds: idsToSubmit
      };

      await dispatch(createCommentThunk(payload)).unwrap();
      dispatch(fetchCommentsByPost({ postId, page: 0, size: PAGE_SIZE }));
      onCommentCreated?.();
    } catch (err) {
      console.error("Lỗi tạo comment:", err);
      toast.error(err?.message || "Unable to post comment");
    }
  };

  // 1. Tạo comment chính (có kiểm duyệt)
  const handleCreateComment = (data) =>
    moderateAndRun(data.content, () => doCreateComment(data));

  // Thực hiện gửi reply (bỏ qua moderation)
  const doCreateReply = async (parentId, data) => {
    try {
      let idsToSubmit = [];

      if (data.files && data.files.length > 0) {
        const fd = new FormData();
        data.files.forEach((f) => fd.append("files", f));

        const uploadRes = await mediaApi.upload(fd);
        const uploaded = uploadRes?.result || uploadRes?.data?.result || (Array.isArray(uploadRes) ? uploadRes : []);

        idsToSubmit = uploaded.map((m) => m.id || m.fileId).filter(Boolean);
      }

      const payload = {
        postId: postId,
        content: data.content,
        parentId: parentId,
        mediaIds: idsToSubmit
      };

      await dispatch(createCommentThunk(payload)).unwrap();
      dispatch(fetchCommentsByPost({ postId, page: 0, size: PAGE_SIZE }));
      setReplyTo(null);
    } catch (err) {
      console.error("Lỗi tạo reply:", err);
      toast.error(err?.message || "Unable to post reply");
    }
  };

  // 2. Tạo reply (có kiểm duyệt)
  const handleCreateReply = (parentId) => (data) =>
    moderateAndRun(data.content, () => doCreateReply(parentId, data));


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

  // ======== TOGGLE EXPAND REPLIES ========
  const handleToggleReplies = (commentId, replyCount) => {
    if (replyCount === 0) return;
    setExpandedReplies((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) {
        next.delete(commentId); // đóng lại
      } else {
        next.add(commentId);    // mở ra → dispatch fetch
        dispatch(fetchReplies({ commentId }));
      }
      return next;
    });
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
        key={`comment-form-${formResetKey}`}
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
            No comments yet. Be the first to comment!
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
                      <UserHoverCard username={c.username}>
                        <span>{c.fullName}</span>
                      </UserHoverCard>
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
                    {/* Nút View replies */}
                    {c.replyCount > 0 && (
                      <button
                        onClick={() => handleToggleReplies(c.id, c.replyCount)}
                        className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
                      >
                        {expandedReplies.has(c.id)
                          ? "Hide replies"
                          : `View ${c.replyCount} ${c.replyCount === 1 ? "reply" : "replies"}`}
                      </button>
                    )}
                  </div>

                  {/* Replies nested */}
                  {expandedReplies.has(c.id) && (
                    <ReplyView
                      commentId={c.id}
                      onProfileClick={onProfileClick}
                      avatarUrl={avatarUrl}
                      fullName={fullName}
                      submittingComment={submittingComment}
                      handleCreateReply={handleCreateReply}
                      handleToggleLikeComment={handleToggleLikeComment}
                      buildMediaUrl={buildMediaUrl}
                      openViewerForComment={openViewerForComment}
                      handleDragStart={handleDragStart}
                      handleDragMove={handleDragMove}
                      hasDraggedRef={hasDraggedRef}
                      formatTimeAgo={formatTimeAgo}
                    />
                  )}
                  
                  {replyTo === c.id && (
                    <div className="mt-3 ml-10 rounded-xl overflow-hidden">
                      <CommentForm
                        isReply={true}
                        noBorder={true}
                        avatarUrl={avatarUrl}
                        fullName={fullName}
                        placeholder={`Reply to ${c.fullName ?? "user"}'s comment...`}
                        submitting={submittingComment}
                        onSubmit={async (data) => {
                          await handleCreateReply(c.id)(data);
                          // Auto-expand và fetch replies sau khi reply thành công
                          setExpandedReplies((prev) => new Set([...prev, c.id]));
                          dispatch(fetchReplies({ commentId: c.id }));
                        }}
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

      <ModerationWarning
        open={showModWarning}
        result={moderationResult}
        onClose={() => setShowModWarning(false)}
        onPostAnyway={async () => {
          setShowModWarning(false);
          setModerationResult(null);
          const action = pendingActionRef.current;
          pendingActionRef.current = null;
          if (action) {
            await action();
            setFormResetKey((k) => k + 1);
          }
        }}
      />
  </>
  );
}

export default PostComments;