import { useEffect, useState, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Heart, MoreHorizontal, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ImageViewer } from "@/components/ImageViewer/ImageViewer.jsx";
import {
  fetchCommentsByPost, createComment as createCommentThunk,
  selectCommentsByPostId, selectCommentsLoadingByPostId,
  selectCommentsErrorByPostId, selectCommentSubmittingByPostId,
  selectCommentsPageByPostId, selectCommentsHasMoreByPostId,
  toggleCommentLike, deleteComment, fetchReplies,
} from "@/store/commentsSlice";
import { formatTimeAgo } from "../../utils/dateUtils.js";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";
import CommentForm from "./CommentForm";
import { ReplyView } from "./ReplyView";
import mediaApi from "../../api/mediaApi";
import aiApi from "../../api/aiApi";
import ModerationWarning from "../ModerationWarning/ModerationWarning";
import { UserHoverCard } from "../UserHoverCard/UserHoverCard";

const PAGE_SIZE = 10;

// ─── CommentItem — mỗi comment có state hover riêng ──────────────────────────
function CommentItem({
  c, onProfileClick,
  handleToggleLikeComment, handleOpenReply, handleToggleReplies,
  handleDeleteComment, handleCreateReply,
  expandedReplies, setExpandedReplies,
  replyTo, setReplyTo,
  avatarUrl, fullName,
  submittingComment, isPostingAnyway,
  currentUserId, profileUsername,
  buildMediaUrl, openViewerForComment,
  handleDragStart, handleDragMove, hasDraggedRef,
  dispatch,
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="flex gap-3 pb-4 border-b border-border relative"
      onMouseOver={(e) => { e.stopPropagation(); setIsHovered(true); }}
      onMouseOut={(e) => { e.stopPropagation(); setIsHovered(false); }}
    >
      <Avatar className="w-10 h-10 cursor-pointer shrink-0" onClick={() => onProfileClick?.(c.username)}>
        <AvatarImage src={c.avatarUrl} alt={c.fullName} />
        <AvatarFallback>{c.fullName?.[0]?.toUpperCase() || "U"}</AvatarFallback>
      </Avatar>

      <div className="flex-1 space-y-1">
        <div className="flex items-baseline gap-2">
          <span className="font-semibold text-sm cursor-pointer hover:underline" onClick={() => onProfileClick?.(c.username)}>
            <UserHoverCard username={c.username}><span>{c.fullName}</span></UserHoverCard>
          </span>
          <span className="text-xs text-muted-foreground">@{c.username}</span>
          <span className="text-xs text-muted-foreground">· {formatTimeAgo(c.createdAt)}</span>
        </div>

        <div className="text-sm whitespace-pre-wrap leading-relaxed">{c.content}</div>

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
                    onClick={() => { if (hasDraggedRef.current) return; openViewerForComment(c, idx); }}
                  >
                    {isVideo
                      ? <video src={url} className="w-full h-full object-cover" autoPlay muted loop playsInline />
                      : <img src={url} alt="comment media" className="w-full h-full object-cover" />
                    }
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex items-center gap-4 pt-2">
          <button
            onClick={() => handleToggleLikeComment(c.id)}
            className={`flex items-center gap-1 text-xs transition-colors ${c.likedByCurrentUser ? "text-red-500" : "text-muted-foreground hover:text-red-500"}`}
          >
            <Heart className={`w-3 h-3 ${c.likedByCurrentUser ? "fill-red-500" : ""}`} />
            <span className="ml-1">{c.likeCount ?? 0}</span>
          </button>
          <button onClick={() => handleOpenReply(c.id)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            Reply
          </button>
          {c.replyCount > 0 && (
            <button
              onClick={() => handleToggleReplies(c.id, c.replyCount)}
              className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors"
            >
              {expandedReplies.has(c.id) ? "Hide replies" : `View ${c.replyCount} ${c.replyCount === 1 ? "reply" : "replies"}`}
            </button>
          )}
        </div>

        {expandedReplies.has(c.id) && (
          <ReplyView
            commentId={c.id}
            onProfileClick={onProfileClick}
            avatarUrl={avatarUrl}
            fullName={fullName}
            submittingComment={submittingComment}
            isPostingAnyway={isPostingAnyway}
            handleCreateReply={handleCreateReply}
            handleToggleLikeComment={handleToggleLikeComment}
            handleDeleteComment={handleDeleteComment}
            currentUserId={currentUserId}
            profileUsername={profileUsername}
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
              submitting={submittingComment || isPostingAnyway}
              onSubmit={async (data) => {
                await handleCreateReply(c.id)(data);
                setExpandedReplies((prev) => new Set([...prev, c.id]));
                dispatch(fetchReplies({ commentId: c.id }));
              }}
              onCancelReply={() => setReplyTo(null)}
            />
          </div>
        )}
      </div>

      {/* Dropdown menu — chỉ hiện khi hover */}
      <div className={`absolute top-2 right-2 transition-opacity ${isHovered ? "opacity-100" : "opacity-0"}`}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="p-2 h-auto" onClick={(e) => e.stopPropagation()}>
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end" sideOffset={8}
            className="w-44 bg-card/95 border border-border/50 text-[14px] font-semibold p-1 rounded-xl shadow-lg backdrop-blur-md"
            onClick={(e) => e.stopPropagation()}
          >
            {(c.userId === currentUserId || c.username === profileUsername) && (
              <DropdownMenuItem
                className="cursor-pointer hover:bg-muted focus:bg-muted data-[highlighted]:bg-muted rounded-md px-3 py-2"
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
  );
}

// ─── PostComments ─────────────────────────────────────────────────────────────
export function PostComments({ postId, onProfileClick, onCommentCreated }) {
  const dispatch = useDispatch();

  const profile = useSelector((s) => s.user.profile) ?? {};
  const fullName = profile.fullName ?? "Bạn";
  const avatarUrl = profile.avatarUrl ?? null;
  const currentUserId = profile?.id || profile?._id;

  const comments = useSelector((state) => selectCommentsByPostId(state, postId));
  const loadingComments = useSelector((state) => selectCommentsLoadingByPostId(state, postId));
  const commentsError = useSelector((state) => selectCommentsErrorByPostId(state, postId));
  const submittingComment = useSelector((state) => selectCommentSubmittingByPostId(state, postId));
  const commentsPage = useSelector((state) => selectCommentsPageByPostId(state, postId));
  const hasMoreComments = useSelector((state) => selectCommentsHasMoreByPostId(state, postId));

  const [moderationResult, setModerationResult] = useState(null);
  const [showModWarning, setShowModWarning] = useState(false);
  const pendingActionRef = useRef(null);
  const [formResetKey, setFormResetKey] = useState(0);
  const [isPostingAnyway, setIsPostingAnyway] = useState(false);

  const [replyTo, setReplyTo] = useState(null);
  const [expandedReplies, setExpandedReplies] = useState(new Set());
  const loadMoreRef = useRef(null);
  const loadDelayRef = useRef(null);
  const initialLoadDoneRef = useRef(false);

  const buildMediaUrl = (raw) => {
    if (!raw) return "";
    return /^https?:\/\//i.test(raw) ? raw : `${import.meta.env.VITE_BACKEND_URL || ""}${raw}`;
  };

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

  const moderateAndRun = async (content, action) => {
    if (content?.trim()) {
      let modResult = null;
      try {
        modResult = await aiApi.moderate({ content: content.trim() });
      } catch { }
      if (modResult?.warning_level && modResult.warning_level !== "safe") {
        setModerationResult(modResult);
        pendingActionRef.current = action;
        setShowModWarning(true);
        throw new Error("__moderation__");
      }
    }
    await action();
  };

  const doCreateComment = async (data, skipImageModeration = false) => {
    try {
      let idsToSubmit = [];
      if (data.files && data.files.length > 0) {
        const imageFiles = data.files.filter((f) => f.type?.startsWith("image/"));
        if (imageFiles.length > 0 && !skipImageModeration) {
          try {
            const analysisResults = await Promise.all(imageFiles.map((f) => aiApi.analyzeImage(f)));
            for (let i = 0; i < analysisResults.length; i++) {
              const nsfw = analysisResults[i]?.nsfw;
              if (nsfw && !nsfw.is_safe) {
                const severity = nsfw.severity;
                const warningLevel = severity === "mild" ? "mild" : severity === "moderate" ? "moderate" : "severe";
                setModerationResult({
                  warning_level: warningLevel,
                  message: warningLevel === "mild" ? "One of your images contains mildly suggestive content." : "One of your images contains content that violates community guidelines.",
                  flagged_items: [{ word: `Image ${i + 1}`, category: "adult_content", category_label: `Sensitive content (${nsfw.label}) · ${Math.round(nsfw.confidence * 100)}% confidence` }],
                  suggestion: warningLevel === "mild" ? "You may still post, but the image may be flagged for review." : "Please remove the flagged image before posting.",
                });
                pendingActionRef.current = () => doCreateComment(data, true);
                setShowModWarning(true);
                throw new Error("__moderation__");
              }
            }
          } catch (e) {
            if (e.message === "__moderation__") throw e;
          }
        }
        const fd = new FormData();
        data.files.forEach((f) => fd.append("files", f));
        const uploadRes = await mediaApi.upload(fd);
        const uploaded = uploadRes?.result || uploadRes?.data?.result || (Array.isArray(uploadRes) ? uploadRes : []);
        idsToSubmit = uploaded.map((m) => m.id || m.fileId).filter(Boolean);
      }
      await dispatch(createCommentThunk({ postId, content: data.content, parentId: null, mediaIds: idsToSubmit })).unwrap();
      onCommentCreated?.();
    } catch (err) {
      if (err?.message === "__moderation__") throw err;
      console.error("Lỗi tạo comment:", err);
      toast.error(err?.message || "Unable to post comment");
    }
  };

  const handleCreateComment = (data) => moderateAndRun(data.content, () => doCreateComment(data));

  const doCreateReply = async (parentId, data, skipImageModeration = false) => {
    try {
      let idsToSubmit = [];
      if (data.files && data.files.length > 0) {
        const imageFiles = data.files.filter((f) => f.type?.startsWith("image/"));
        if (imageFiles.length > 0 && !skipImageModeration) {
          try {
            const analysisResults = await Promise.all(imageFiles.map((f) => aiApi.analyzeImage(f)));
            for (let i = 0; i < analysisResults.length; i++) {
              const nsfw = analysisResults[i]?.nsfw;
              if (nsfw && !nsfw.is_safe) {
                const severity = nsfw.severity;
                const warningLevel = severity === "mild" ? "mild" : severity === "moderate" ? "moderate" : "severe";
                setModerationResult({
                  warning_level: warningLevel,
                  message: warningLevel === "mild" ? "One of your images contains mildly suggestive content." : "One of your images contains content that violates community guidelines.",
                  flagged_items: [{ word: `Image ${i + 1}`, category: "adult_content", category_label: `Sensitive content (${nsfw.label}) · ${Math.round(nsfw.confidence * 100)}% confidence` }],
                  suggestion: warningLevel === "mild" ? "You may still post, but the image may be flagged for review." : "Please remove the flagged image before posting.",
                });
                pendingActionRef.current = () => doCreateReply(parentId, data, true);
                setShowModWarning(true);
                throw new Error("__moderation__");
              }
            }
          } catch (e) {
            if (e.message === "__moderation__") throw e;
          }
        }
        const fd = new FormData();
        data.files.forEach((f) => fd.append("files", f));
        const uploadRes = await mediaApi.upload(fd);
        const uploaded = uploadRes?.result || uploadRes?.data?.result || (Array.isArray(uploadRes) ? uploadRes : []);
        idsToSubmit = uploaded.map((m) => m.id || m.fileId).filter(Boolean);
      }
      await dispatch(createCommentThunk({ postId, content: data.content, parentId, mediaIds: idsToSubmit })).unwrap();
      setReplyTo(null);
      setExpandedReplies((prev) => new Set([...prev, parentId]));
      dispatch(fetchReplies({ commentId: parentId }));
    } catch (err) {
      if (err?.message === "__moderation__") throw err;
      console.error("Lỗi tạo reply:", err);
      toast.error(err?.message || "Unable to post reply");
    }
  };

  const handleCreateReply = (parentId) => (data) => moderateAndRun(data.content, () => doCreateReply(parentId, data));

  useEffect(() => {
    if (!postId) return;
    initialLoadDoneRef.current = false;
    dispatch(fetchCommentsByPost({ postId, page: 0, size: PAGE_SIZE }));
  }, [postId, dispatch]);

  useEffect(() => {
    if (!loadingComments && comments.length >= 0) {
      const t = setTimeout(() => { initialLoadDoneRef.current = true; }, 500);
      return () => clearTimeout(t);
    }
  }, [loadingComments]);

  useEffect(() => {
    if (!postId || !hasMoreComments || loadingComments || commentsError) return;
    const el = loadMoreRef.current;
    if (!el) return;
    let isMounted = true;
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (!entry.isIntersecting || !isMounted || !initialLoadDoneRef.current) return;
      if (loadingComments || !hasMoreComments || commentsError || loadDelayRef.current) return;
      loadDelayRef.current = setTimeout(() => {
        loadDelayRef.current = null;
        if (!isMounted) return;
        dispatch(fetchCommentsByPost({ postId, page: commentsPage + 1, size: PAGE_SIZE }));
      }, 300);
    }, { root: null, threshold: 0.1 });
    observer.observe(el);
    return () => {
      isMounted = false;
      observer.disconnect();
      if (loadDelayRef.current) { clearTimeout(loadDelayRef.current); loadDelayRef.current = null; }
    };
  }, [postId, hasMoreComments, loadingComments, commentsPage, dispatch, commentsError]);

  useEffect(() => { if (commentsError) toast.error(commentsError); }, [commentsError]);

  const handleToggleLikeComment = async (commentId) => {
    if (!postId || !commentId) return;
    try { await dispatch(toggleCommentLike({ postId, commentId })).unwrap(); }
    catch (err) { toast.error(err?.message || "Không thể thích bình luận"); }
  };

  const handleOpenReply = (commentId) => setReplyTo(commentId);

  const handleToggleReplies = (commentId, replyCount) => {
    if (replyCount === 0) return;
    setExpandedReplies((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) { next.delete(commentId); }
      else { next.add(commentId); dispatch(fetchReplies({ commentId })); }
      return next;
    });
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await dispatch(deleteComment({ postId, commentId })).unwrap();
      toast.success("Đã xóa bình luận");
    } catch (err) { toast.error(err?.message || "Xóa bình luận thất bại"); }
  };

  const dragState = useRef({ isDragging: false, el: null, startX: 0, scrollLeft: 0 });
  const hasDraggedRef = useRef(false);

  const handleDragStart = (e) => {
    if (e.button !== 0) return;
    const el = e.currentTarget;
    dragState.current = { isDragging: true, el, startX: e.pageX - el.offsetLeft, scrollLeft: el.scrollLeft };
    hasDraggedRef.current = false;
    el.classList.add("cursor-grabbing");
  };

  const handleDragMove = (e) => {
    const state = dragState.current;
    if (!state.isDragging || !state.el) return;
    e.preventDefault();
    const x = e.pageX - state.el.offsetLeft;
    const walk = x - state.startX;
    if (Math.abs(walk) > 5) hasDraggedRef.current = true;
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
    return () => { window.removeEventListener("mouseup", stopDrag); window.removeEventListener("mouseleave", stopDrag); };
  }, []);

  return (
    <>
      <style>{`.media-scroll { scrollbar-width: none; -ms-overflow-style: none; } .media-scroll::-webkit-scrollbar { display: none; }`}</style>

      <CommentForm
        key={`comment-form-${formResetKey}`}
        avatarUrl={avatarUrl}
        fullName={fullName}
        submitting={submittingComment || isPostingAnyway}
        onSubmit={handleCreateComment}
      />

      <div className="px-4 py-3">
        {!comments.length && loadingComments ? (
          <div className="flex justify-center py-4"><Spinner /></div>
        ) : !comments.length ? (
          <div className="text-sm text-muted-foreground">No comments yet. Be the first to comment!</div>
        ) : (
          <div className="space-y-4">
            {comments.map((c) => (
              <CommentItem
                key={c.id}
                c={c}
                onProfileClick={onProfileClick}
                handleToggleLikeComment={handleToggleLikeComment}
                handleOpenReply={handleOpenReply}
                handleToggleReplies={handleToggleReplies}
                handleDeleteComment={handleDeleteComment}
                handleCreateReply={handleCreateReply}
                expandedReplies={expandedReplies}
                setExpandedReplies={setExpandedReplies}
                replyTo={replyTo}
                setReplyTo={setReplyTo}
                avatarUrl={avatarUrl}
                fullName={fullName}
                submittingComment={submittingComment}
                isPostingAnyway={isPostingAnyway}
                currentUserId={currentUserId}
                profileUsername={profile.username}
                buildMediaUrl={buildMediaUrl}
                openViewerForComment={openViewerForComment}
                handleDragStart={handleDragStart}
                handleDragMove={handleDragMove}
                hasDraggedRef={hasDraggedRef}
                dispatch={dispatch}
              />
            ))}
            <div className="pt-3">
              {loadingComments && hasMoreComments && <div className="flex justify-center py-2"><Spinner /></div>}
              {hasMoreComments && !commentsError && <div ref={loadMoreRef} className="h-1" />}
            </div>
          </div>
        )}
      </div>

      <ImageViewer open={viewerOpen} onClose={() => setViewerOpen(false)} mediaList={viewerMediaList} index={viewerIndex} />

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
            setIsPostingAnyway(true);
            try { await action(); } finally { setIsPostingAnyway(false); }
            setFormResetKey((k) => k + 1);
          }
        }}
      />
    </>
  );
}

export default PostComments;
