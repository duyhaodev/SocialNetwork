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
import { toggleCommentLike, deleteComment, fetchReplies, selectRepliesByCommentId, selectRepliesLoadingByCommentId } from "@/store/commentsSlice";
import {formatTimeAgo} from "../../utils/dateUtils.js"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,} from "../ui/dropdown-menu";
import { Trash2 } from "lucide-react";
import CommentForm from "./CommentForm";
import mediaApi from "../../api/mediaApi";

const PAGE_SIZE = 10;

// Build cây từ flat list
function buildTree(flatList, parentId) {
  return flatList
    .filter((r) => r.parentId === parentId)
    .map((r) => ({ ...r, children: buildTree(flatList, r.id) }));
}

// Flatten cây: depth < MAX_DEPTH thì giữ cây, depth >= MAX_DEPTH thì đưa children ra ngang
function flattenToMaxDepth(nodes, currentDepth, MAX_DEPTH) {
  const result = [];
  for (const node of nodes) {
    if (currentDepth < MAX_DEPTH) {
      // Chưa đến max → giữ cây, đệ quy children
      result.push({
        ...node,
        children: flattenToMaxDepth(node.children || [], currentDepth + 1, MAX_DEPTH),
      });
    } else {
      // Đã đến max → đưa node ra ngang, flatten children ra cùng level
      result.push({ ...node, children: [] });
      if (node.children?.length > 0) {
        result.push(...flattenToMaxDepth(node.children, currentDepth, MAX_DEPTH));
      }
    }
  }
  return result;
}

// Render 1 node trong cây, depth = 0 hoặc 1 (max 2 cấp thụt vào)
function ReplyNode({ node, depth, onProfileClick, avatarUrl, fullName, submittingComment, handleCreateReply, handleToggleLikeComment, rootCommentId, dispatch, formatTimeAgo, isLast, buildMediaUrl, openViewerForComment, handleDragStart, handleDragMove, hasDraggedRef }) {
  const [replyTo, setReplyTo] = useState(null);
  const MAX_DEPTH = 1; // 0-indexed: cấp 0 = thụt 1 lần, cấp 1 = thụt 2 lần

  // Nếu vượt max depth, render ngang với cấp max (depth = MAX_DEPTH)
  const renderDepth = Math.min(depth, MAX_DEPTH);

  return (
    <div className="flex gap-0">
      {/* Đường kẻ dọc + cong */}
      <div className="flex flex-col" style={{ width: 36, minWidth: 36 }}>
        <div
          className="border-l-2 border-b-2 border-border rounded-bl-lg shrink-0"
          style={{ width: 18, height: 20, marginLeft: 8 }}
        />
        {!isLast && (
          <div className="border-l-2 border-border grow" style={{ marginLeft: 8 }} />
        )}
      </div>

      {/* Nội dung */}
      <div className="flex-1 pb-3">
        <div className="flex gap-2">
          <Avatar className="w-7 h-7 cursor-pointer shrink-0 mt-0.5" onClick={() => onProfileClick?.(node.username)}>
            <AvatarImage src={node.avatarUrl} alt={node.fullName} />
            <AvatarFallback className="text-xs">{node.fullName?.[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-0.5">
            <div className="flex items-baseline gap-2">
              <span className="font-semibold text-xs cursor-pointer hover:underline" onClick={() => onProfileClick?.(node.username)}>
                {node.fullName}
              </span>
              <span className="text-xs text-muted-foreground">· {formatTimeAgo(node.createdAt)}</span>
            </div>
            <p className="text-sm">{node.content}</p>

            {/* Media của reply */}
            {node.mediaUrls?.length > 0 && (
              <div className="mt-3 w-full max-w-full overflow-hidden rounded-xl">
                <div
                  className="media-scroll flex gap-2 overflow-x-auto flex-nowrap"
                  onMouseDown={handleDragStart}
                  onMouseMove={handleDragMove}
                  onDragStart={(e) => e.preventDefault()}
                >
                  {node.mediaUrls.map((mUrl, idx) => {
                    const url = buildMediaUrl(mUrl);
                    const isVideo = mUrl.toLowerCase().endsWith(".mp4");
                    return (
                      <div
                        key={idx}
                        className="relative flex-shrink-0 max-w-[130px] aspect-[3/4] rounded-xl overflow-hidden bg-black/40 cursor-pointer"
                        onClick={() => {
                          if (hasDraggedRef.current) return;
                          openViewerForComment(node, idx);
                        }}
                      >
                        {isVideo ? (
                          <video src={url} className="w-full h-full object-cover" autoPlay muted loop playsInline />
                        ) : (
                          <img src={url} alt="reply media" className="w-full h-full object-cover" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={() => handleToggleLikeComment(node.id)}
                className={`flex items-center gap-1 text-xs transition-colors ${node.likedByCurrentUser ? "text-red-500" : "text-muted-foreground hover:text-red-500"}`}
              >
                <Heart className={`w-3 h-3 ${node.likedByCurrentUser ? "fill-red-500" : ""}`} />
                <span>{node.likeCount ?? 0}</span>
              </button>
              <button onClick={() => setReplyTo(node.id)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Reply
              </button>
            </div>

            {replyTo === node.id && (
              <div className="mt-2 rounded-xl overflow-hidden">
                <CommentForm
                  isReply={true}
                  noBorder={true}
                  avatarUrl={avatarUrl}
                  fullName={fullName}
                  placeholder={`Reply to ${node.fullName}...`}
                  submitting={submittingComment}
                  onSubmit={async (data) => {
                    // Nếu đã ở max depth, reply vào node hiện tại (parentId = node.id)
                    // Nếu chưa max, cũng reply vào node.id để build cây đúng
                    await handleCreateReply(node.id)(data);
                    setReplyTo(null);
                    dispatch(fetchReplies({ commentId: rootCommentId }));
                  }}
                  onCancelReply={() => setReplyTo(null)}
                />
              </div>
            )}

            {/* Render children */}
            {node.children?.length > 0 && (
              <div className="mt-1">
                {node.children.map((child, idx) => (
                  <ReplyNode
                    key={child.id}
                    node={child}
                    depth={depth + 1}
                    isLast={idx === node.children.length - 1}
                    onProfileClick={onProfileClick}
                    avatarUrl={avatarUrl}
                    fullName={fullName}
                    submittingComment={submittingComment}
                    handleCreateReply={handleCreateReply}
                    handleToggleLikeComment={handleToggleLikeComment}
                    rootCommentId={rootCommentId}
                    dispatch={dispatch}
                    formatTimeAgo={formatTimeAgo}
                    buildMediaUrl={buildMediaUrl}
                    openViewerForComment={openViewerForComment}
                    handleDragStart={handleDragStart}
                    handleDragMove={handleDragMove}
                    hasDraggedRef={hasDraggedRef}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Component hiển thị replies nested dưới comment cha
function RepliesList({ commentId, onProfileClick, currentUserId, profile, avatarUrl, fullName, postId, submittingComment, handleCreateReply, handleToggleLikeComment, handleDeleteComment, buildMediaUrl, openViewerForComment, handleDragStart, handleDragMove, hasDraggedRef, formatTimeAgo }) {
  const dispatch = useDispatch();
  const flatReplies = useSelector((state) => selectRepliesByCommentId(state, commentId));
  const loading = useSelector((state) => selectRepliesLoadingByCommentId(state, commentId));

  if (loading) {
    return <div className="ml-10 mt-2 text-xs text-muted-foreground">Loading replies...</div>;
  }

  // Build cây từ flat list — children trực tiếp của commentId (gốc)
  const rawTree = buildTree(flatReplies, commentId);
  // Flatten: max 2 cấp thụt vào (depth 0 và 1), cấp 2+ nằm ngang với depth 1
  const tree = flattenToMaxDepth(rawTree, 0, 1);

  return (
    <div className="mt-2">
      {tree.map((node, idx) => (
        <ReplyNode
          key={node.id}
          node={node}
          depth={0}
          isLast={idx === tree.length - 1}
          onProfileClick={onProfileClick}
          avatarUrl={avatarUrl}
          fullName={fullName}
          submittingComment={submittingComment}
          handleCreateReply={handleCreateReply}
          handleToggleLikeComment={handleToggleLikeComment}
          rootCommentId={commentId}
          dispatch={dispatch}
          formatTimeAgo={formatTimeAgo}
          buildMediaUrl={buildMediaUrl}
          openViewerForComment={openViewerForComment}
          handleDragStart={handleDragStart}
          handleDragMove={handleDragMove}
          hasDraggedRef={hasDraggedRef}
        />
      ))}
    </div>
  );
}

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
                    <RepliesList
                      commentId={c.id}
                      onProfileClick={onProfileClick}
                      currentUserId={currentUserId}
                      profile={profile}
                      avatarUrl={avatarUrl}
                      fullName={fullName}
                      postId={postId}
                      submittingComment={submittingComment}
                      handleCreateReply={handleCreateReply}
                      handleToggleLikeComment={handleToggleLikeComment}
                      handleDeleteComment={handleDeleteComment}
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
                        placeholder={`Trả lời bình luận của ${c.fullName ?? "người dùng"}...`}
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
  </>
  );
}

export default PostComments;