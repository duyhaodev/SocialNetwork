import { useState, useMemo, useEffect, useRef } from "react";
import { Heart, MessageCircle, Repeat2, Share, MoreHorizontal } from "lucide-react";
import { Button } from "../ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { ImageViewer } from "../ImageViewer/ImageViewer.jsx";
import likeApi from "@/api/likeApi";
import { useSelector, useDispatch } from "react-redux";
import { repostPost, unrepostPost, syncLikeByOriginalId, deletePost } from "@/store/postsSlice";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {formatTimeAgo} from "../../utils/dateUtils.js"


export function PostCard({ post, onProfileClick, onPostClick }) {

  const dispatch = useDispatch();
  const currentUserId = useSelector((s) => s.user?.profile?.id);
  // ====== THÔNG TIN CƠ BẢN (người repost) ======
  const baseUsername = post.username ?? post.user?.username ?? "unknown";
  const baseFullName = post.fullName ?? post.user?.fullName ?? "Unknown";
  const baseAvatarUrl = post.avatarUrl ?? post.user?.avatarUrl;
  const createdAt = post.createdAt ?? post.created_time ?? post.created_at ?? null;

  // ====== REPOST ======
  const isRepost = !!post.repostOfId;

  // thông tin chính chủ bài gốc
  // ID bài viết gốc 
  const originalPostId = post.repostOfId ?? post.id;
  const originalUsername = post.originalUsername;
  const originalFullName = post.originalFullName;
  const originalAvatarUrl = post.originalAvatarUrl;

  // Nếu là repost, hiển thị thông tin chủ bài gốc
  const displayName = isRepost && originalFullName ? originalFullName : baseFullName || "Unknown";
  const handle = isRepost && originalUsername ? originalUsername : baseUsername || "unknown";
  const avatarUrl = isRepost && originalAvatarUrl ? originalAvatarUrl : baseAvatarUrl;

  // Tên người repost
  const reposterName = baseFullName || baseUsername || "Unknown";

  // list media
  const mediaList = Array.isArray(post.mediaList) ? post.mediaList : [];
  const mediaCount = mediaList.length;

  // click mở fullscreen
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  // relative time inline 
  const relative = useMemo(() => {
    if (!createdAt) return "now";
    const diff = (Date.now() - new Date(createdAt)) / 60000; // phút
    if (diff < 1) return "now";
    if (diff < 60) return `${Math.floor(diff)}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return `${Math.floor(diff / 1440)}d ago`;
  }, [createdAt]);

  // local UI state 
  const [isLiked, setIsLiked] = useState(post.liked ?? post.likedByCurrentUser ?? post.isLikedByCurrentUser ?? false);
  const [likes, setLikes] = useState(post.likeCount ?? 0);
  const [liking, setLiking] = useState(false);
  const [isReposted, setIsReposted] = useState(post.repostedByCurrentUser ?? false);
  const [reposts, setReposts] = useState(post.repostCount ?? 0);
  const [repostMenuOpen, setRepostMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  useEffect(() => {
    setIsLiked( post.liked ?? post.likedByCurrentUser ?? post.isLikedByCurrentUser ?? false);
    setLikes(post.likeCount ?? 0);
  }, [post.liked, post.likedByCurrentUser, post.isLikedByCurrentUser, post.likeCount]);

  const handleLike = async () => {
  if (liking) return;
  const id = originalPostId;
  if (!id) return;

  const prevLiked = isLiked;
  const prevLikes = likes;
  const nextLiked = !isLiked;
  const nextLikes = nextLiked
    ? prevLikes + 1
    : Math.max(0, prevLikes - 1);

  // optimistic UI
  setIsLiked(nextLiked);
  setLikes(nextLikes);
  setLiking(true);

  try {
    const res = await likeApi.togglePost(id);

    if (typeof res?.liked === "boolean" && typeof res?.likeCount === "number") {
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

  useEffect(() => {
  setIsReposted(post.repostedByCurrentUser ?? false);
  }, [post.repostedByCurrentUser]);

  useEffect(() => {
    setReposts(post.repostCount ?? 0);
  }, [post.repostCount]);

  const handleRepostAction = async () => {
  const id = originalPostId;
  if (!id) return;

  try {
    if (isReposted) {
      await dispatch(unrepostPost(id)).unwrap();
      toast.success("Post unreposted");
    } else {
      await dispatch(repostPost(id)).unwrap();
      toast.success("Post reposted");
    }
    setRepostMenuOpen(false);
  } catch (err) {
    console.error(isReposted ? "Unrepost failed:" : "Repost failed:", err);

    toast.error(
      isReposted
        ? "Unrepost failed, please try again"
        : "Repost failed, please try again"
    );
  }
};

  const handleDeletePost = async () => {
    const id = post.id ?? post.postId;
    if (!id) return;

    try {
      await dispatch(deletePost(id)).unwrap();
      toast.success("Post deleted");
      setMoreMenuOpen(false);
    } catch (err) {
      console.error("Delete post failed:", err);
      toast.error("Failed to delete post, please try again");
    }
  };

  const formatNumber = (num) =>
    num >= 1_000_000
      ? (num / 1_000_000).toFixed(1) + "M"
      : num >= 1_000
      ? (num / 1_000).toFixed(1) + "K"
      : String(num);

  // Hàm mở trang chi tiết bài viết
  const handleOpenPost = () => {
    const id = post.id ?? post.postId;
    if (!id) return;
    onPostClick?.(id);
  };

  // kích thước item khi nhiều media:
  const multiSize = useMemo(() => {
    if (mediaCount <= 1) return null;
    if (mediaCount === 2) return { width: 250, height: 300 };
    return { width: 180, height: 250 }; // 3 media trở lên
  }, [mediaCount]);

  // ----- drag-to-scroll -----
  const mediaScrollRef = useRef(null);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const hasDraggedRef = useRef(false); // flag phân biệt drag vs click

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

  const handleMediaMouseDown = (e) => {
    if (!mediaScrollRef.current) return;
    if (e.button !== 0) return; // chỉ chuột trái

    const el = mediaScrollRef.current;
    isDraggingRef.current = true;
    hasDraggedRef.current = false;
    el.classList.add("cursor-grabbing");

    startXRef.current = e.pageX - el.offsetLeft;
    scrollLeftRef.current = el.scrollLeft;
  };

  const handleMediaMouseMove = (e) => {
    const el = mediaScrollRef.current;
    if (!isDraggingRef.current || !el) return;
    e.preventDefault();
    const x = e.pageX - el.offsetLeft;
    const walk = x - startXRef.current;
    if (Math.abs(walk) > 5) {
      hasDraggedRef.current = true; // lệch > 5px thì là kéo
    }
    el.scrollLeft = scrollLeftRef.current - walk;
  };

  // ----- AUTO PLAY / PAUSE VIDEO -----
  const cardRef = useRef(null);
  useEffect(() => {
    const root = cardRef.current;
    if (!root) return;

    const videos = root.querySelectorAll("video[data-autoplay]");
    if (!videos.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const el = entry.target;
          if (entry.isIntersecting && entry.intersectionRatio >= 0.7) {
            el.play().catch(() => {});
          } else {
            el.pause();
          }
        });
      },
      { threshold: [0, 0.7, 1] }
    );

    videos.forEach((el) => {
      el.muted = true;
      el.playsInline = true;
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, [mediaCount]);

  const canDelete = !isRepost && post.userId && currentUserId && post.userId === currentUserId;

  return (
    <div
      ref={cardRef}
      className="border-b border-border p-4 hover:bg-muted/50 transition-colors"
    >
      <style>
        {`
          .post-media-scroll {
            scrollbar-width: none;
            -ms-overflow-style: none;
          }
          .post-media-scroll::-webkit-scrollbar {
            display: none;
          }

          .post-media-video {
            width: 100%;
            height: 100%;
            object-fit: cover;
            background-color: #000;
          }
          .post-media-video:fullscreen,
          .post-media-video:-webkit-full-screen {
            object-fit: contain;
            background-color: #000;
          }
        `}
      </style>

      {/* X reposted */}
      {isRepost && (
        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1 pl-10">
          <Repeat2 className="w-5 h-4" />
          <button
            className="hover:underline"
            onClick={(e) => {
              e.stopPropagation();       
              onProfileClick?.(baseUsername); }}>
            {reposterName}
          </button> 
            reposted
        </div>
      )}

      <div className="flex items-start gap-3">
        {/* Avatar + click vào profile  */}
        <button
          className="p-0 h-auto rounded-full"
          onClick={() => onProfileClick?.(handle)}
          title={displayName}
        >
          <Avatar className="w-10 h-10">
            <AvatarImage src={avatarUrl} alt={displayName} />
            <AvatarFallback>{displayName?.charAt(0) || "U"}</AvatarFallback>
          </Avatar>
        </button>

        {/* Xem chi tiết bài viết */}
        <div
          className={`flex-1 min-w-0 ${onPostClick ? "cursor-pointer" : ""}`}
          onClick={onPostClick ? handleOpenPost : undefined}
        >
          {/* Header */}
          <div className="flex items-center gap-2 mb-1">
            <button
              className="p-0 h-auto hover:underline"
              onClick={(e) => {
                e.stopPropagation();
                onProfileClick?.(handle);
              }}
              title={displayName}
            >
              <span className="font-medium">{displayName}</span>
            </button>
            <span className="text-muted-foreground">@{handle}</span>
            <span className="text-muted-foreground">·</span>
            <span
              className="text-muted-foreground"
              title={createdAt ? new Date(createdAt).toLocaleString() : ""}
            >
              {formatTimeAgo(createdAt)}
            </span>
            {/* More menu */}
            <div className="ml-auto">
              <DropdownMenu open={moreMenuOpen} onOpenChange={setMoreMenuOpen}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-2 h-auto"
                    aria-label="More"
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
                  {canDelete && (
                    <DropdownMenuItem
                      className="cursor-pointer hover:bg-[#2a2a2a] focus:bg-[#2a2a2a] rounded-md px-3 py-2"
                      onClick={handleDeletePost}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-red-500">Delete post</span>
                      </div>
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuItem
                    className="cursor-pointer hover:bg-[#2a2a2a] focus:bg-[#2a2a2a] rounded-md px-3 py-2"
                    onClick={() => {
                      setMoreMenuOpen(false);
                    }}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-white">Copy link</span>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Content + media */}
          <div className="mb-3">
            <p className="whitespace-pre-wrap">
              {post.content}
            </p>

            {/* PHẦN MEDIA */}
            {mediaCount > 0 && (
              <div className="mt-3 flex justify-center">
                {mediaCount === 1 ? (
                  // ======= 1 MEDIA =======
                  (() => {
                    const m = mediaList[0];
                    const url = /^https?:\/\//i.test(m.mediaUrl)
                      ? m.mediaUrl
                      : `${import.meta.env.VITE_BACKEND_URL || ""}${m.mediaUrl}`;

                    if (m.mediaType === "video") {
                      return (
                        <video
                          src={url}
                          loop
                          data-autoplay
                          className="rounded-2xl border border-border/30 object-contain"
                          style={{
                            maxWidth: "min(680px, 90%)",
                            maxHeight: "420px",
                            width: "auto",
                            height: "auto",
                            backgroundColor: "#000",
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewerIndex(0);
                            setViewerOpen(true);
                          }}
                        />
                      );
                    }

                    return (
                      <img
                        src={url}
                        className="rounded-2xl border border-border/30 object-contain"
                        style={{
                          maxWidth: "min(680px, 90%)",
                          maxHeight: "420px",
                          width: "auto",
                          height: "auto",
                        }}
                        loading="lazy"
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewerIndex(0);
                          setViewerOpen(true);
                        }}
                      />
                    );
                  })()
                ) : (
                  // ======= NHIỀU MEDIA (2+) =======
                  <div className="w-full flex justify-center">
                    <div className="relative w-full max-w-[680px]">
                      <div
                        ref={mediaScrollRef}
                        onMouseDown={handleMediaMouseDown}
                        onMouseMove={handleMediaMouseMove}
                        onDragStart={(e) => e.preventDefault()}
                        className="post-media-scroll overflow-x-auto cursor-grab py-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex gap-3 w-max mx-auto px-2">
                          {mediaList.map((m, idx) => {
                            const url = /^https?:\/\//i.test(m.mediaUrl)
                              ? m.mediaUrl
                              : `${import.meta.env.VITE_BACKEND_URL || ""}${m.mediaUrl}`;
                            const isVideo = m.mediaType === "video";

                            return (
                              <div
                                key={m.id ?? idx}
                                className="relative flex-shrink-0 rounded-2xl overflow-hidden border border-border/30 bg-black"
                                style={{
                                  width: multiSize?.width ?? 240,
                                  height: multiSize?.height ?? 340,
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (hasDraggedRef.current) return;
                                  setViewerIndex(idx);
                                  setViewerOpen(true);
                                }}
                              >
                                {isVideo ? (
                                  <video
                                    src={url}
                                    loop
                                    data-autoplay
                                    className="post-media-video rounded-2xl"
                                  />
                                ) : (
                                  <img
                                    src={url}
                                    className="w-full h-full object-cover rounded-2xl"
                                    loading="lazy"
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            {/* -------- END MEDIA -------- */}
          </div>

          {/* Actions: like / comment / repost */}
          <div className="flex items-center justify-between max-w-md">
            {/* Like button */}
            <Button
              variant="ghost"
              size="sm"
              className="p-2 h-auto group"
              onClick={(e) => {
                e.stopPropagation();
                handleLike();
              }}
              aria-label="Like"
              disabled={liking}
            >
              <Heart
                className={`w-5 h-5 ${
                  isLiked ? "text-red-500 fill-red-500" : "group-hover:text-red-500"
                }`}
              />
              <span
                className={`ml-1 text-sm ${
                  isLiked ? "text-red-500" : "text-muted-foreground group-hover:text-red-500"
                }`}
              >
                {formatNumber(likes)}
              </span>
            </Button>

            {/* Comment: mở chi tiết bài viết */}
            <Button
              variant="ghost"
              size="sm"
              className="p-2 h-auto group"
              aria-label="Comments"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenPost();
              }}
            >
              <MessageCircle className="w-5 h-5 group-hover:text-blue-500 transition-colors" />
              <span className="ml-1 text-sm text-muted-foreground group-hover:text-blue-500">
                {formatNumber(post.commentCount ?? 0)}
              </span>
            </Button>

            {/* Repost: mở menu repost */}
            <DropdownMenu open={repostMenuOpen} onOpenChange={setRepostMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-2 h-auto group"
                  onClick={(e) => e.stopPropagation()}
                  aria-label="Repost"
                >
                  <Repeat2
                    className={`w-5 h-5 ${
                      isReposted ? "text-green-500" : "group-hover:text-green-500"
                    }`}
                  />
                  <span
                    className={`ml-1 text-sm ${
                      isReposted
                        ? "text-green-500"
                        : "text-muted-foreground group-hover:text-green-500"
                    }`}
                  >
                    {formatNumber(reposts)}
                  </span>
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
                  onClick={handleRepostAction}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className={isReposted ? "text-red-500" : "text-white"}>
                      {isReposted ? "Remove Repost" : "Repost"}
                    </span>
                    <Repeat2
                      className={`w-4 h-4 ${
                        isReposted ? "text-red-500" : "text-muted-foreground"
                      }`}
                    />
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* ===== FULLSCREEN VIEWER ===== */}
      <ImageViewer
        open={viewerOpen}
        onClose={() => setViewerOpen(false)}
        mediaList={mediaList}
        index={viewerIndex}
      />
    </div>
  );
}
