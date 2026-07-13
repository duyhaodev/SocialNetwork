import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button.js";
import { Textarea } from "../../components/ui/textarea.js";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar.js";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs.js";
import { Image, Smile, AtSign, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover.js";
import EmojiPicker from "emoji-picker-react";
import { PostCard } from "../../components/PostCard/PostCard.jsx";
import { SuggestedUsers } from "../../components/SuggestedUsers/SuggestedUsers.jsx";
import StoryBar from "../../components/Story/StoryBar.jsx";
import { LocalFeedTab } from "./LocalFeedTab.jsx";
import { FollowingFeedTab } from "./FollowingFeedTab.jsx";
import { FriendsFeedTab } from "./FriendsFeedTab.jsx";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchRecommendedFeed,
  createPost,
  selectPosts,
  selectPostsHasMore,
  selectPostsLoading,
  selectPostsCreating,
  selectPostsPage,
  selectCaughtUp,
  loadMoreAfterCaughtUp,
} from "../../store/postsSlice";
import { selectCity } from "../../store/userSlice";
import { toast } from "sonner";
import mediaApi from "../../api/mediaApi";
import aiApi from "../../api/aiApi";
import AISuggestPanel from "../../components/CreatePost/AISuggestPanel";
import ModerationWarning from "../../components/ModerationWarning/ModerationWarning";
import { motion } from "framer-motion";

export function FeedPage() {
  // REDUX
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const profile = useSelector((s) => s.user.profile) ?? {};
  const displayName = profile.fullName ?? "User";
  const avatarUrl = profile.avatarUrl;
  const city = useSelector(selectCity);

  const posts = useSelector(selectPosts);
  const hasMore = useSelector(selectPostsHasMore);
  const loading = useSelector(selectPostsLoading);
  const creating = useSelector(selectPostsCreating);
  const page = useSelector(selectPostsPage);
  const caughtUp = useSelector(selectCaughtUp);

  // Tab: "forYou" | "local"
  const [activeTab, setActiveTab] = useState("forYou");

  // Vị trí chèn suggestion card — random 3-7, cố định trong session
  const [insertAfter] = useState(() => Math.floor(Math.random() * 5) + 10);
  const [suggestionDismissed, setSuggestionDismissed] = useState(false);

  // LOCAL STATE
  const [newPost, setNewPost] = useState("");
  const [mediaFiles, setMediaFiles] = useState([]);
  const fileInputRef = useRef(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [moderationResult, setModerationResult] = useState(null);
  const [showModWarning, setShowModWarning] = useState(false);
  const pendingAiGeneratedRef = useRef(false);

  // FIX: trạng thái posting ngay lập tức
  const [isPosting, setIsPosting] = useState(false);

  // Trigger refresh cho LocalFeedTab khi đăng/xóa bài
  const [localRefreshKey, setLocalRefreshKey] = useState(0);

  const loadMoreRef = useRef(null);
  const loadDelayRef = useRef(null);

  useEffect(() => {
    dispatch(fetchRecommendedFeed({ page: 0, size: 20 }))
      .unwrap()
      .catch(() => toast.error("Failed to load feed"));
  }, [dispatch]);


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
          dispatch(fetchRecommendedFeed({ page, size: 20 }))
            .unwrap()
            .catch(() => toast.error("Failed to load feed"));
          loadDelayRef.current = null;
        }, 300);
      },
      { root: null, threshold: 0.1 }
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

  const openFilePicker = useCallback(() => fileInputRef.current?.click(), []);

  const onFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB mỗi file
    const MAX_TOTAL_SIZE = 20 * 1024 * 1024; // 20MB tổng request

    const newItems = [];
    let totalSize = mediaFiles.reduce((sum, m) => sum + m.file.size, 0);

    for (const file of files) {
      const type = file.type || "";
      const isImage = type.startsWith("image/");
      const isVideo = type.startsWith("video/");

      if (!isImage && !isVideo) {
        toast.error(`File "${file.name}" không phải ảnh hoặc video, bỏ qua.`);
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        toast.error(`File "${file.name}" vượt quá 20MB, bỏ qua.`);
        continue;
      }

      if (totalSize + file.size > MAX_TOTAL_SIZE) {
        toast.error(`Tổng dung lượng vượt quá 20MB. Vui lòng chọn ít file hơn.`);
        break;
      }

      totalSize += file.size;
      const previewUrl = URL.createObjectURL(file);
      newItems.push({
        file,
        kind: isImage ? "image" : "video",
        preview: previewUrl,
      });
    }

    if (!newItems.length) {
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setMediaFiles((prev) => [...prev, ...newItems]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveOne = (index) => {
    setAiPanelOpen(false);
    setMediaFiles((prev) => {
      const clone = [...prev];
      const removed = clone.splice(index, 1)[0];
      if (removed?.preview) URL.revokeObjectURL(removed.preview);
      return clone;
    });
  };

  const handleRemoveAll = () => {
    setAiPanelOpen(false);
    mediaFiles.forEach((m) => {
      if (m.preview) URL.revokeObjectURL(m.preview);
    });
    setMediaFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  useEffect(() => {
    return () => {
      mediaFiles.forEach((m) => {
        if (m.preview) URL.revokeObjectURL(m.preview);
      });
    };
  }, []);

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
    if (e.button !== 0) return;

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

  // Thực hiện đăng bài (bỏ qua moderation)
  // isSensitive = true khi user nhấn "Post anyway" sau cảnh báo mild
  const doPost = async (skipImageModeration = false, isSensitive = false) => {
    const content = (newPost || "").trim();
    if (!content && mediaFiles.length === 0) return;

    setIsPosting(true);

    try {
      // --- Kiểm duyệt ảnh TRƯỚC khi upload ---
      const imageFiles = mediaFiles.filter((m) => m.kind === "image");
      let hasAiGenerated = skipImageModeration ? pendingAiGeneratedRef.current : false;

      if (imageFiles.length > 0 && !skipImageModeration) {
        try {
          // Gửi tất cả ảnh song song
          const analysisResults = await Promise.all(
            imageFiles.map((m) => aiApi.analyzeImage(m.file))
          );

          for (let i = 0; i < analysisResults.length; i++) {
            const result = analysisResults[i];
            const nsfw = result?.nsfw;
            const aiGen = result?.ai_generated;

            // Phát hiện ảnh AI generated — lưu trước
            if (aiGen?.is_ai) {
              pendingAiGeneratedRef.current = true;
            }

            // Phát hiện ảnh nhạy cảm
            if (nsfw && !nsfw.is_safe) {
              const severity = nsfw.severity; // "mild" | "moderate" | "severe"
              const warningLevel = severity === "mild" ? "mild" : severity === "moderate" ? "moderate" : "severe";

              const imageViolationResult = {
                warning_level: warningLevel,
                message: warningLevel === "mild"
                  ? "One of your images contains mildly suggestive content. Consider replacing it."
                  : "One of your images contains content that violates community guidelines.",
                flagged_items: [{
                  word: `Image ${i + 1}`,
                  category: "adult_content",
                  category_label: `Sensitive content (${nsfw.label}) · ${Math.round(nsfw.confidence * 100)}% confidence`,
                }],
                suggestion: warningLevel === "mild"
                  ? "You may still post, but the image may be flagged for review."
                  : "Please remove the flagged image before posting.",
              };

              setModerationResult(imageViolationResult);
              setShowModWarning(true);
              setIsPosting(false);
              return;
            }

            // Ghi nhận AI generated
            if (aiGen?.is_ai) {
              hasAiGenerated = true;
            }
          }
        } catch {
          // AI service lỗi → bỏ qua, cho đăng bình thường
        }
      }
      // --- Kết thúc kiểm duyệt ảnh ---

      let mediaIds = [];

      if (mediaFiles.length > 0) {
        const fd = new FormData();
        mediaFiles.forEach((m) => {
          fd.append("files", m.file);
        });

        const uploadRes = await mediaApi.upload(fd);
        const uploaded = uploadRes?.result || uploadRes || [];
        mediaIds = uploaded.map((m) => m.id);
      }

      const payload = {
        content,
        mediaIds,
        isAiGenerated: hasAiGenerated,
        isSensitiveContent: isSensitive, // true nếu user nhấn "Post anyway"
      };

      const action = await dispatch(createPost(payload));

      if (createPost.fulfilled.match(action)) {
        toast.success("Posted successfully");
        setNewPost("");
        setModerationResult(null);
        pendingAiGeneratedRef.current = false;
        handleRemoveAll();
        setLocalRefreshKey((k) => k + 1);
      } else {
        toast.error(action.payload?.message || "Post failed");
      }
    } catch (err) {
      toast.error(err?.message || "Post failed");
    } finally {
      setIsPosting(false);
    }
  };

  // Kiểm duyệt trước khi đăng
  const handleCreatePost = async () => {
    const content = (newPost || "").trim();
    if (!content && mediaFiles.length === 0) return;

    if (content) {
      try {
        const res = await aiApi.moderate({ content });
        if (res.warning_level && res.warning_level !== "safe") {
          setModerationResult(res);
          setShowModWarning(true);
          return;
        }
      } catch {
        // Moderation service lỗi → cho đăng bình thường
      }
    }

    await doPost();
  };

  const handleEmojiClick = (emojiData) => {
    setNewPost((prev) => prev + emojiData.emoji);
    setShowEmoji(false);
  };

  const hasMedia = mediaFiles.length > 0;

  return (
    <div className="max-w-2xl mx-auto">
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

      {/* Header sticky */}
      <div className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="px-4 py-4">
          <h2 className="text-xl font-semibold">Home</h2>
        </div>
      </div>

      {/* Compose box — luôn hiển thị */}
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
              className="min-h-[80px] max-h-[200px] overflow-y-auto resize-none text-base w-full [field-sizing:normal] break-words"
              style={{ wordBreak: "break-word", overflowWrap: "break-word" }}
              maxLength={500}
            />

            <AISuggestPanel
              open={aiPanelOpen}
              onOpenChange={setAiPanelOpen}
              onUseSuggestion={(text) => {
                const t = (text || "").trim();
                if (!t) return;
                setNewPost(t.slice(0, 500));
              }}
            />

            {hasMedia && (
              <div className="mt-3 space-y-2">
                <div className="flex justify-between items-center px-1">
                  <span className="text-xs text-muted-foreground">
                    {mediaFiles.length} media selected
                  </span>
                  <button type="button" onClick={handleRemoveAll} className="text-xs text-red-400 hover:underline">
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
                      <div key={idx} className="relative group flex-shrink-0 max-w-[150px] aspect-[3/4] rounded-xl overflow-hidden">
                        <button type="button" onClick={() => handleRemoveOne(idx)} className="absolute top-2 right-2 z-20 bg-black/60 hover:bg-black/80 rounded-full p-1">
                          <X className="w-4 h-4 text-white" />
                        </button>
                        {m.kind === "video" ? (
                          <video src={m.preview} preload="metadata" draggable={false} className="block w-full h-full object-cover" />
                        ) : (
                          <img src={m.preview} alt="preview" draggable={false} className="block w-full h-full object-cover" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={onFileChange} />

            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-4">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="p-2 h-auto text-muted-foreground hover:text-foreground"
                  onClick={() => { setAiPanelOpen(false); openFilePicker(); }}
                >
                  <Image className="w-5 h-5" />
                </Button>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="p-2 h-auto text-muted-foreground hover:text-foreground"
                      onClick={() => setAiPanelOpen(false)}
                    >
                      <Smile className="w-5 h-5" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-0 border-0">
                    <EmojiPicker theme="dark" emojiStyle="native" skinTonesDisabled searchDisabled previewConfig={{ showPreview: false }} onEmojiClick={handleEmojiClick} />
                  </PopoverContent>
                </Popover>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="p-2 h-auto text-muted-foreground hover:text-foreground"
                  onClick={() => setAiPanelOpen(false)}
                >
                  <AtSign className="w-5 h-5" />
                </Button>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">{newPost.length}/500</span>
                <Button type="button" onClick={handleCreatePost} disabled={creating || isPosting || (!newPost.trim() && mediaFiles.length === 0)} size="sm">
                  {(creating || isPosting) ? "Posting..." : "Post"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Story Bar — luôn hiển thị */}
      <div className="border-b border-border px-4 py-3">
        <StoryBar />
      </div>

      {/* Tabs — nằm dưới Story, giống ProfilePage */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex justify-center w-full border-b border-border/40 py-3 bg-background/50 backdrop-blur-sm sticky top-14 md:top-0 z-10 overflow-x-auto">
          <TabsList className="bg-muted/40 border border-border/40 rounded-full p-1 h-10 w-auto grid grid-cols-4 relative overflow-hidden min-w-max">
            <TabsTrigger
              value="forYou"
              className="relative z-10 rounded-full text-xs font-semibold h-full transition-colors duration-300 select-none bg-transparent border-none data-[state=active]:text-background dark:data-[state=active]:text-background text-muted-foreground data-[state=active]:bg-transparent dark:data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4"
            >
              For You
            </TabsTrigger>
            <TabsTrigger
              value="following"
              className="relative z-10 rounded-full text-xs font-semibold h-full transition-colors duration-300 select-none bg-transparent border-none data-[state=active]:text-background dark:data-[state=active]:text-background text-muted-foreground data-[state=active]:bg-transparent dark:data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4"
            >
              Following
            </TabsTrigger>
            <TabsTrigger
              value="friends"
              className="relative z-10 rounded-full text-xs font-semibold h-full transition-colors duration-300 select-none bg-transparent border-none data-[state=active]:text-background dark:data-[state=active]:text-background text-muted-foreground data-[state=active]:bg-transparent dark:data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4"
            >
              Friends
            </TabsTrigger>
            <TabsTrigger
              value="local"
              className="relative z-10 rounded-full text-xs font-semibold h-full transition-colors duration-300 select-none bg-transparent border-none data-[state=active]:text-background dark:data-[state=active]:text-background text-muted-foreground data-[state=active]:bg-transparent dark:data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4"
            >
              {city && city !== "Unknown" ? `Local · ${city}` : "Local"}
            </TabsTrigger>

            {/* Sliding indicator background pill */}
            <div className="absolute inset-1 w-[calc(25%-4px)] h-[calc(100%-8px)] pointer-events-none z-0">
              <motion.div
                className="w-full h-full bg-foreground rounded-full shadow-sm"
                animate={{
                  x: activeTab === "forYou" ? 0
                    : activeTab === "following" ? "100%"
                    : activeTab === "friends" ? "200%"
                    : "300%",
                }}
                transition={{ type: "spring", stiffness: 350, damping: 28 }}
              />
            </div>
          </TabsList>
        </div>

        {/* Tab For You */}
        <div className={activeTab === "forYou" ? "" : "hidden"}>
          <div>
            {posts.map((post, index) => {
              const username = post.username ?? post.user?.username ?? "unknown";
              const fullName = post.fullName ?? post.user?.fullName ?? "User";
              const avatarUrl = post.avatarUrl ?? post.user?.avatarUrl;
              const createdAt = post.createdAt ?? post.created_time ?? post.created_at;
              const mediaList = Array.isArray(post.mediaUrls) ? post.mediaUrls : [];

              return (
                <div key={post.id}>
                  {index === insertAfter && !suggestionDismissed && (
                    <SuggestedUsers onDismiss={() => setSuggestionDismissed(true)} />
                  )}
                  <PostCard
                    post={{ ...post, username, fullName, avatarUrl, createdAt, mediaList }}
                    onProfileClick={handleProfileClick}
                    onPostClick={(id) => navigate(`/post/${id}`)}
                  />
                </div>
              );
            })}
          </div>
          <div className="p-4 text-center">
            {loading && hasMore && <span className="text-muted-foreground text-sm">Loading...</span>}
            {hasMore && <div ref={loadMoreRef} className="h-1" />}
            {caughtUp && !loading && (
              <div className="flex flex-col items-center gap-3 py-6">
                <p className="text-muted-foreground text-sm">You're all caught up</p>
                <button
                  onClick={() => dispatch(loadMoreAfterCaughtUp())}
                  className="text-sm font-medium px-4 py-2 rounded-full border border-border hover:bg-muted transition-colors"
                >
                  See more posts
                </button>
              </div>
            )}
            {!hasMore && !loading && !caughtUp && <span className="text-muted-foreground text-sm">No more posts</span>}
          </div>
        </div>

        {/* Tab Following */}
        <div className={activeTab === "following" ? "" : "hidden"}>
          <FollowingFeedTab />
        </div>

        {/* Tab Friends */}
        <div className={activeTab === "friends" ? "" : "hidden"}>
          <FriendsFeedTab />
        </div>

        {/* Tab Local Feed */}
        <div className={activeTab === "local" ? "" : "hidden"}>
          <LocalFeedTab city={city} />
        </div>

        <ModerationWarning
          open={showModWarning}
          result={moderationResult}
          onClose={() => setShowModWarning(false)}
          onPostAnyway={() => {
            setShowModWarning(false);
            setModerationResult(null);
            doPost(true, true); // skipImageModeration=true, isSensitive=true
          }}
        />
      </Tabs>
    </div >
  );
}