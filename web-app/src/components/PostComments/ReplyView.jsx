import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Heart } from "lucide-react";
import { fetchReplies, selectRepliesByCommentId, selectRepliesLoadingByCommentId } from "@/store/commentsSlice";
import CommentForm from "./CommentForm";

// ─── Helpers ────────────────────────────────────────────────────────────────

// Build cây từ flat list
// Lọc các node có parentId khớp, rồi đệ quy build children của từng node
function buildTree(flatList, parentId) {
  return flatList
    .filter((r) => r.parentId === parentId)
    .map((r) => ({ ...r, children: buildTree(flatList, r.id) }));
}

// Giới hạn max depth — cấp vượt quá MAX_DEPTH được kéo ra ngang với cấp MAX_DEPTH
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

// ─── ReplyNode ───────────────────────────────────────────────────────────────

// Render 1 node trong cây reply, có đường kẻ dọc + cong
function ReplyNode({
  node, depth, isLast,
  onProfileClick, avatarUrl, fullName,
  submittingComment, handleCreateReply, handleToggleLikeComment,
  rootCommentId, dispatch, formatTimeAgo,
  buildMediaUrl, openViewerForComment, handleDragStart, handleDragMove, hasDraggedRef,
}) {
  const [replyTo, setReplyTo] = useState(null);

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

      {/* Nội dung reply */}
      <div className="flex-1 pb-3">
        <div className="flex gap-2">
          <Avatar
            className="w-7 h-7 cursor-pointer shrink-0 mt-0.5"
            onClick={() => onProfileClick?.(node.username)}
          >
            <AvatarImage src={node.avatarUrl} alt={node.fullName} />
            <AvatarFallback className="text-xs">{node.fullName?.[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>

          <div className="flex-1 space-y-0.5">
            {/* Tên + thời gian */}
            <div className="flex items-baseline gap-2">
              <span
                className="font-semibold text-xs cursor-pointer hover:underline"
                onClick={() => onProfileClick?.(node.username)}
              >
                {node.fullName}
              </span>
              <span className="text-xs text-muted-foreground">· {formatTimeAgo(node.createdAt)}</span>
            </div>

            {/* Nội dung text */}
            <p className="text-sm">{node.content}</p>

            {/* Media */}
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

            {/* Like + Reply */}
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={() => handleToggleLikeComment(node.id)}
                className={`flex items-center gap-1 text-xs transition-colors ${
                  node.likedByCurrentUser ? "text-red-500" : "text-muted-foreground hover:text-red-500"
                }`}
              >
                <Heart className={`w-3 h-3 ${node.likedByCurrentUser ? "fill-red-500" : ""}`} />
                <span>{node.likeCount ?? 0}</span>
              </button>
              <button
                onClick={() => setReplyTo(node.id)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Reply
              </button>
            </div>

            {/* Form reply */}
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
                    await handleCreateReply(node.id)(data);
                    setReplyTo(null);
                    dispatch(fetchReplies({ commentId: rootCommentId }));
                  }}
                  onCancelReply={() => setReplyTo(null)}
                />
              </div>
            )}

            {/* Children */}
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

// ─── RepliesList (export) ────────────────────────────────────────────────────

// Component chính — nhận commentId, fetch thread, build cây, render
export function ReplyView({
  commentId, onProfileClick, avatarUrl, fullName,
  submittingComment, handleCreateReply, handleToggleLikeComment,
  buildMediaUrl, openViewerForComment, handleDragStart, handleDragMove, hasDraggedRef,
  formatTimeAgo,
}) {
  const dispatch = useDispatch();
  const flatReplies = useSelector((state) => selectRepliesByCommentId(state, commentId));
  const loading = useSelector((state) => selectRepliesLoadingByCommentId(state, commentId));

  if (loading) {
    return <div className="mt-2 text-xs text-muted-foreground">Loading replies...</div>;
  }

  // Build cây từ flat list rồi giới hạn max 2 cấp thụt vào
  const rawTree = buildTree(flatReplies, commentId);
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
