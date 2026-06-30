import { useState, useMemo, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { toggleRepost, syncLikeByOriginalId, deletePost } from "@/store/postsSlice";
import { toast } from "sonner";

// Import subcomponents
import { PostHeader } from "./PostHeader";
import { PostMedia } from "./PostMedia";
import { PostActions } from "./PostActions";
import { PostTranslation } from "./PostTranslation";

import { ImageViewer } from "../ImageViewer/ImageViewer.jsx";
import ConfirmDeleteModal from "../Modals/ConfirmDeleteModal";
import likeApi from "@/api/likeApi";
import { franc } from "franc";

export function PostCard({ post, onProfileClick, onPostClick }) {
  const dispatch = useDispatch();
  const currentUserId = useSelector((s) => s.user?.profile?.userId);

  // ====== THÔNG TIN CƠ BẢN ======
  const baseUsername = post.username ?? post.user?.username ?? "unknown";
  const baseFullName = post.fullName ?? post.user?.fullName ?? "Unknown";
  const baseAvatarUrl = post.avatarUrl ?? post.user?.avatarUrl;
  const createdAt = post.createdAt ?? post.created_time ?? post.created_at ?? null;

  // ====== REPOST LOGIC ======
  const isRepost = !!post.repostOfId;
  const originalPostId = post.repostOfId ?? post.id;
  const originalUsername = post.originalUsername;
  const originalFullName = post.originalFullName;
  const originalAvatarUrl = post.originalAvatarUrl;

  const displayName = isRepost && originalFullName ? originalFullName : baseFullName || "Unknown";
  const handle = isRepost && originalUsername ? originalUsername : baseUsername || "unknown";
  const avatarUrl = isRepost && originalAvatarUrl ? originalAvatarUrl : baseAvatarUrl;
  const reposterName = baseFullName || baseUsername || "Unknown";

  // ====== MEDIA LOGIC ======
  const mediaList = useMemo(() => {
    return Array.isArray(post.mediaUrls)
      ? post.mediaUrls.map((url, idx) => ({
          id: idx,
          mediaUrl: url,
          mediaType: url?.includes(".mp4") ? "video" : "image",
        }))
      : [];
  }, [post.mediaUrls]);

  const mediaCount = mediaList.length;

  // ====== STATE & MODALS ======
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [openDelete, setOpenDelete] = useState(false);

  const [isLiked, setIsLiked] = useState(post.liked ?? post.likedByCurrentUser ?? post.isLikedByCurrentUser ?? false);
  const [likes, setLikes] = useState(post.likeCount ?? 0);
  const [liking, setLiking] = useState(false);
  
  const [isReposted, setIsReposted] = useState(post.repostedByCurrentUser ?? false);
  const [reposts, setReposts] = useState(post.repostCount ?? 0);
  const [reposting, setReposting] = useState(false);

  // Sync state with props
  useEffect(() => {
    setIsLiked(post.liked ?? post.likedByCurrentUser ?? post.isLikedByCurrentUser ?? false);
    setLikes(post.likeCount ?? 0);
  }, [post.liked, post.likedByCurrentUser, post.isLikedByCurrentUser, post.likeCount]);

  useEffect(() => {
    setIsReposted(post.repostedByCurrentUser ?? false);
    setReposts(post.repostCount ?? 0);
  }, [post.repostedByCurrentUser, post.repostCount]);

  // ====== ACTIONS ======
  const handleLike = async () => {
    if (liking) return;
    const id = originalPostId;
    if (!id) return;

    const prevLiked = isLiked;
    const prevLikes = likes;
    const nextLiked = !isLiked;
    const nextLikes = nextLiked ? prevLikes + 1 : Math.max(0, prevLikes - 1);

    // Optimistic UI update
    setIsLiked(nextLiked);
    setLikes(nextLikes);
    setLiking(true);

    try {
      const res = await likeApi.togglePost(id);
      if (res && typeof res.liked === "boolean" && typeof res.likeCount === "number") {
        setIsLiked(res.liked);
        setLikes(res.likeCount);
        dispatch(
          syncLikeByOriginalId({
            originalId: id,
            liked: res.liked,
            likeCount: res.likeCount,
          })
        );
      }
    } catch (err) {
      console.error("Toggle like failed:", err);
      setIsLiked(prevLiked);
      setLikes(prevLikes);
    } finally {
      setLiking(false);
    }
  };

  const handleRepostAction = async () => {
    if (reposting) return;
    const id = originalPostId;
    if (!id) return;

    const prevReposted = isReposted;
    const prevReposts = reposts;
    
    setIsReposted(!prevReposted);
    setReposts(!prevReposted ? prevReposts + 1 : Math.max(0, prevReposts - 1));
    setReposting(true);

    try {
      const result = await dispatch(toggleRepost(id)).unwrap();
      setIsReposted(result.reposted);
      setReposts(result.repostCount);
      toast.success(result.reposted ? "Đã chia sẻ lại bài đăng" : "Đã hủy chia sẻ");
    } catch (err) {
      console.error("Repost action failed:", err);
      toast.error(err || "Thao tác chia sẻ thất bại");
      setIsReposted(prevReposted);
      setReposts(prevReposts);
    } finally {
      setReposting(false);
    }
  };

  const handleDeletePost = async () => {
    const id = post.id ?? post.postId;
    if (!id) return;

    try {
      await dispatch(deletePost(id)).unwrap();
      toast.success("Đã xóa bài đăng thành công");
      setOpenDelete(false);
    } catch (err) {
      console.error("Delete post failed:", err);
      toast.error("Không thể xóa bài đăng, vui lòng thử lại");
    }
  };

  const handleOpenPost = () => {
    const id = post.id ?? post.postId;
    if (!id) return;
    onPostClick?.(id);
  };

  const handleMediaClick = (idx) => {
    setViewerIndex(idx);
    setViewerOpen(true);
  };

  const isNonVietnamese = useMemo(() => {
    const textContent = isRepost ? post.originalContent : post.content;
    if (!textContent || textContent.trim().length < 10) return false;
    const lang = franc(textContent);
    return lang !== "vie" && lang !== "und";
  }, [post.content, post.originalContent, isRepost]);

  const canDelete = !isRepost && post.userId && currentUserId && post.userId === currentUserId;

  return (
    <div className="border-b border-border/40 p-4 hover:bg-muted/30 transition-colors duration-200">
      <style>
        {`
          .post-media-scroll {
            scrollbar-width: none;
            -ms-overflow-style: none;
          }
          .post-media-scroll::-webkit-scrollbar {
            display: none;
          }
        `}
      </style>

      {/* Header component */}
      <PostHeader
        post={post}
        avatarUrl={avatarUrl}
        displayName={displayName}
        handle={handle}
        createdAt={createdAt}
        canDelete={canDelete}
        onProfileClick={onProfileClick}
        onDeleteClick={() => setOpenDelete(true)}
        isRepost={isRepost}
        baseUsername={baseUsername}
        reposterName={reposterName}
      />

      {/* Main post contents */}
      <div
        className={`pl-13 ${onPostClick ? "cursor-pointer" : ""}`}
        onClick={onPostClick ? handleOpenPost : undefined}
      >
        <p className="whitespace-pre-wrap text-[15px] leading-relaxed mt-1 text-foreground">
          {isRepost ? post.originalContent : post.content}
        </p>

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2" onClick={(e) => e.stopPropagation()}>
            {post.tags.map((tag, idx) => (
              <span
                key={idx}
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all cursor-pointer"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Translation component */}
        <PostTranslation isNonVietnamese={isNonVietnamese} content={isRepost ? post.originalContent : post.content} />

        {/* Media rendering component */}
        <PostMedia mediaList={mediaList} mediaCount={mediaCount} onMediaClick={handleMediaClick} />

        {/* Actions buttons */}
        {post.status !== 'PENDING' && (
          <PostActions
            postId={originalPostId}
            isLiked={isLiked}
            likes={likes}
            commentCount={post.commentCount ?? 0}
            isReposted={isReposted}
            reposts={reposts}
            liking={liking}
            reposting={reposting}
            onLike={handleLike}
            onCommentClick={handleOpenPost}
            onRepostAction={handleRepostAction}
          />
        )}
      </div>

      {/* Lightbox / Image Viewer */}
      <ImageViewer
        open={viewerOpen}
        onClose={() => setViewerOpen(false)}
        mediaList={mediaList}
        index={viewerIndex}
      />

      {/* Confirm deletion dialog */}
      <ConfirmDeleteModal
        open={openDelete}
        onClose={() => setOpenDelete(false)}
        onConfirm={handleDeletePost}
      />
    </div>
  );
}
