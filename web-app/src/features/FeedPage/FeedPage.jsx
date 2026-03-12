import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button.js";
import { Textarea } from "../../components/ui/textarea.js";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar.js";
import { Image, Smile, AtSign, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover.js";
import EmojiPicker from "emoji-picker-react";
import { PostCard } from "../../components/PostCard/PostCard.jsx";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchFeed,
  createPost,
  selectPosts,
  selectPostsHasMore,
  selectPostsLoading,
  selectPostsCreating,
  selectPostsPage,
} from "../../store/postsSlice";
import { toast } from "sonner";

export function FeedPage() {
  // REDUX
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const profile = useSelector((s) => s.user.profile) ?? {};
  const displayName = profile.fullName ?? "User";
  const avatarUrl = profile.avatarUrl; // Let fallback handle missing URL

  const posts = useSelector(selectPosts);
  const hasMore = useSelector(selectPostsHasMore);
  const loading = useSelector(selectPostsLoading);
  const creating = useSelector(selectPostsCreating);
  const page = useSelector(selectPostsPage);

  // LOCAL STATE
  const [newPost, setNewPost] = useState("");

  // nhiều media: { file, kind: "image" | "video", preview }
  const [mediaFiles, setMediaFiles] = useState([]);
  const fileInputRef = useRef(null);

  // Emoji picker
  const [showEmoji, setShowEmoji] = useState(false);

  const loadMoreRef = useRef(null);
  const loadDelayRef = useRef(null); // delay trước khi load thêm

  // FEED: LẤY DANH SÁCH BÀI VIẾT
  useEffect(() => {
    dispatch(fetchFeed({ page: 0, size: 20 }))
      .unwrap()
      .catch(() => toast.error("Failed to load feed"));
  }, [dispatch]);

  // Auto load
  useEffect(() => {
    if (!hasMore) return;
    if (loading) return;

    const el = loadMoreRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry.isIntersecting) return;
        if (loading || !hasMore) return;

        if (loadDelayRef.current) return;

        loadDelayRef.current = setTimeout(() => {
          dispatch(fetchFeed({ page, size: 20 }))
            .unwrap()
            .catch(() => toast.error("Failed to load feed"));
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
  }, [hasMore, loading, page, dispatch]);

  const handleProfileClick = (username) => {
    navigate(`/profile/@${username}`);
  };

  // ----- MEDIA: CHỌN & PREVIEW NHIỀU FILE -----
  const openFilePicker = useCallback(() => fileInputRef.current?.click(), []);

  const onFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const newItems = [];

    for (const file of files) {
      const type = file.type || "";
      const isImage = type.startsWith("image/");
      const isVideo = type.startsWith("video/");
      if (!isImage && !isVideo) {
        toast.error(`File "${file.name}" is not an image or video, skipped.`);
        continue;
      }
      const previewUrl = URL.createObjectURL(file);
      newItems.push({
        file,
        kind: isImage ? "image" : "video",
        preview: previewUrl,
      });
    }

    if (!newItems.length) {
      // tất cả invalid => reset input
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setMediaFiles((prev) => [...prev, ...newItems]);
    // cho lần sau chọn lại cùng file
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveOne = (index) => {
    setMediaFiles((prev) => {
      const clone = [...prev];
      const removed = clone.splice(index, 1)[0];
      if (removed?.preview) URL.revokeObjectURL(removed.preview);
      return clone;
    });
  };

  const handleRemoveAll = () => {
    mediaFiles.forEach((m) => {
      if (m.preview) URL.revokeObjectURL(m.preview);
    });
    setMediaFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // cleanup preview khi component unmount
  useEffect(() => {
    return () => {
      mediaFiles.forEach((m) => {
        if (m.preview) URL.revokeObjectURL(m.preview);
      });
    };
  }, []);

  // ----- DRAG TO SCROLL PREVIEW (giống CreatePost) -----
  const mediaScrollRef = useRef(null);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);

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
    el.scrollLeft = scrollLeftRef.current - walk;
  };

  // ----- TẠO POST -----
  const handleCreatePost = async () => {
    const content = (newPost || "").trim();
    if (!content && mediaFiles.length === 0) return;

    const fd = new FormData();
    if (content) fd.append("content", content);
    mediaFiles.forEach((m) => {
      // key "files" giống CreatePost + BE
      fd.append("files", m.file);
    });

    const action = await dispatch(createPost(fd));
    if (createPost.fulfilled.match(action)) {
      toast.success("Posted successfully");
      setNewPost("");
      handleRemoveAll();
    } else {
      toast.error(action.payload?.message || "Post failed");
    }
  };

  // Emoji chèn vào cuối nội dung
  const handleEmojiClick = (emojiData) => {
    setNewPost((prev) => prev + emojiData.emoji);
    setShowEmoji(false);
  };

  const hasMedia = mediaFiles.length > 0;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Ẩn scrollbar cho preview media */}
      <style>
        {`
          .feed-media-scroll {
            scrollbar-width: none;
            -ms-overflow-style: none;
          }
          .feed-media-scroll::-webkit-scrollbar {
            display: none;
          }
        `}
      </style>

      {/* Header */}
      <div className="border-b border-border p-4 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <h2 className="text-xl font-semibold">Home</h2>
      </div>

      {/* Create Post */}
      <div className="border-b border-border p-4">
        <div className="flex gap-3">
          <Avatar className="w-10 h-10 flex-shrink-0">
            <AvatarImage src={avatarUrl} alt={displayName} />
            <AvatarFallback>{displayName?.charAt(0) || "U"}</AvatarFallback>
          </Avatar>

          <div className="flex-1 relative">
            <Textarea
              placeholder="What's new?"
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              className="min-h-[80px] resize-none text-base w-full"
              maxLength={500}
            />

            {/* Preview nhiều media nếu có */}
            {hasMedia && (
              <div className="mt-3 space-y-2">
                <div className="flex justify-between items-center px-1">
                  <span className="text-xs text-muted-foreground">
                    {mediaFiles.length} media selected
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
                    className="feed-media-scroll flex gap-3 overflow-x-auto px-3 py-3 cursor-grab"
                    onMouseDown={handleMediaMouseDown}
                    onMouseMove={handleMediaMouseMove}
                    onDragStart={(e) => e.preventDefault()}
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

            {/* Input file ẩn */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={onFileChange}
            />

            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-4">
                {/* Chọn media */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="p-2 h-auto text-muted-foreground hover:text-foreground"
                  onClick={openFilePicker}
                >
                  <Image className="w-5 h-5" />
                </Button>

                {/* Emoji */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="p-2 h-auto text-muted-foreground hover:text-foreground"
                    >
                      <Smile className="w-5 h-5" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-0 border-0">
                    <EmojiPicker
                      theme="dark"
                      emojiStyle="native"
                      skinTonesDisabled
                      searchDisabled
                      previewConfig={{ showPreview: false }}
                      onEmojiClick={handleEmojiClick}
                    />
                  </PopoverContent>
                </Popover>

                {/* Mention (chưa làm logic) */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="p-2 h-auto text-muted-foreground hover:text-foreground"
                >
                  <AtSign className="w-5 h-5" />
                </Button>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">
                  {newPost.length}/500
                </span>
                <Button
                  type="button"
                  onClick={handleCreatePost}
                  disabled={creating || (!newPost.trim() && mediaFiles.length === 0)}
                  size="sm"
                >
                  {creating ? "Posting..." : "Post"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Posts Feed */}
      <div>
        {posts.map((post) => {
          const username = post.username ?? post.user?.username ?? "unknown";
          const fullName = post.fullName ?? post.user?.fullName ?? "User";
          const avatarUrl = post.avatarUrl ?? post.user?.avatarUrl;
          const createdAt = post.createdAt ?? post.created_time ?? post.created_at;

          const mediaList = Array.isArray(post.mediaList)
            ? post.mediaList
            : post.media
            ? Array.isArray(post.media)
              ? post.media
              : [post.media]
            : [];

          return (
            <PostCard
              key={post.id}
              post={{
                ...post,
                username,
                fullName,
                avatarUrl,
                createdAt,
                mediaList,
              }}
              onProfileClick={handleProfileClick}
              onPostClick={(id) => navigate(`/post/${id}`)}
            />
          );
        })}
      </div>

      {/* Load More (infinite scroll) */}
      <div className="p-4 text-center">
        {loading && hasMore && (
          <span className="text-muted-foreground text-sm">Loading...</span>
        )}
        {hasMore && <div ref={loadMoreRef} className="h-1" />}
        {!hasMore && !loading && (
          <span className="text-muted-foreground text-sm">No more posts</span>
        )}
      </div>
    </div>
  );
}
