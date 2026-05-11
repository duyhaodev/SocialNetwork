import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar.js";
import { Button } from "../ui/button.js";
import { X, ChevronRight } from "lucide-react";
import followApi from "../../api/followApi";
import { toast } from "sonner";

export function SuggestedUsers({ onDismiss }) {
  const navigate = useNavigate();
  const scrollRef = useRef(null);

  const [suggestions, setSuggestions] = useState([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [followedIds, setFollowedIds] = useState(new Set());
  const [dismissedIds, setDismissedIds] = useState(new Set());

  // Drag scroll refs
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);

  const SIZE = 10;

  const loadMore = useCallback(async (pageToLoad) => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await followApi.getSuggestions(pageToLoad, SIZE);
      const data = Array.isArray(res) ? res : [];
      setSuggestions((prev) => [...prev, ...data]);
      setHasMore(data.length === SIZE);
      setPage(pageToLoad + 1);
    } catch (err) {
      console.error("Failed to load suggestions:", err);
    } finally {
      setLoading(false);
    }
  }, [loading]);

  // Load lần đầu
  useEffect(() => {
    loadMore(0);
  }, []);

  // Cleanup drag on mouse up/leave
  useEffect(() => {
    const handleUp = () => {
      const el = scrollRef.current;
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

  const handleMouseDown = (e) => {
    if (!scrollRef.current || e.button !== 0) return;
    const el = scrollRef.current;
    isDraggingRef.current = true;
    el.classList.add("cursor-grabbing");
    startXRef.current = e.pageX - el.offsetLeft;
    scrollLeftRef.current = el.scrollLeft;
  };

  const handleMouseMove = (e) => {
    const el = scrollRef.current;
    if (!isDraggingRef.current || !el) return;
    e.preventDefault();
    const x = e.pageX - el.offsetLeft;
    el.scrollLeft = scrollLeftRef.current - (x - startXRef.current);
  };

  // IntersectionObserver theo dõi phần tử cuối list ngang
  const endRef = useRef(null);
  useEffect(() => {
    if (!hasMore || loading) return;
    const el = endRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore(page);
        }
      },
      { root: scrollRef.current, threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading, page]);

  const handleFollow = async (suggestion) => {
    const isFollowed = followedIds.has(suggestion.userId);
    try {
      const res = await followApi.toggleFollow(suggestion.userId);
      if (res?.success) {
        setFollowedIds((prev) => {
          const next = new Set(prev);
          if (isFollowed) {
            next.delete(suggestion.userId);
          } else {
            next.add(suggestion.userId);
          }
          return next;
        });
        if (!isFollowed) {
          toast.success(
            res.isFriend
              ? `You and ${suggestion.fullName} are now friends!`
              : "Following successfully"
          );
        } else {
          toast.success("Unfollowed successfully");
        }
      }
    } catch (err) {
      toast.error("Failed. Please try again.");
    }
  };

  // Ẩn nếu không có gợi ý
  if (!loading && suggestions.length === 0) return null;

  return (
    <div className="border-b border-border px-4 py-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="font-bold text-base">Suggested for you</span>
        <button
          onClick={onDismiss}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Horizontal scroll list */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto pb-1 cursor-grab"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onDragStart={(e) => e.preventDefault()}
      >
        {suggestions
          .filter((s) => !dismissedIds.has(s.userId))
          .map((s) => (
          <div
            key={s.userId}
            className="relative flex-shrink-0 w-52 flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-4"
          >
            {/* X button góc trên phải */}
            <button
              className="absolute top-2 right-2 text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setDismissedIds((prev) => new Set([...prev, s.userId]))}
            >
              <X className="w-3.5 h-3.5" />
            </button>
            {/* Avatar */}
            <button onClick={() => navigate(`/profile/@${s.username}`)}>
              <Avatar className="w-20 h-20">
                <AvatarImage src={s.avatarUrl} alt={s.fullName} />
                <AvatarFallback className="text-xl">{s.fullName?.charAt(0)}</AvatarFallback>
              </Avatar>
            </button>

            {/* Name */}
            <div className="text-center w-full">
              <p
                className="text-sm font-semibold truncate cursor-pointer hover:underline"
                onClick={() => navigate(`/profile/@${s.username}`)}
              >
                {s.fullName}
              </p>
              <p className="text-xs text-muted-foreground truncate">@{s.username}</p>
            </div>

            {/* Mutual friends avatars + count */}
            {s.mutualCount > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="flex -space-x-2">
                  {s.mutualFriendAvatars?.map((url, i) => (
                    <Avatar key={i} className="w-5 h-5 ring-1 ring-background">
                      <AvatarImage src={url} />
                      <AvatarFallback className="text-[9px]">?</AvatarFallback>
                    </Avatar>
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">
                  {s.mutualCount} mutual friend
                </span>
              </div>
            )}

            {/* Follow button */}
            <Button
              size="sm"
              variant={followedIds.has(s.userId) ? "outline" : "default"}
              className="w-full h-8 text-sm"
              onClick={() => handleFollow(s)}
            >
              {followedIds.has(s.userId) ? "Following" : "Follow"}
            </Button>
          </div>
        ))}

        {/* Sentinel để load thêm khi kéo đến cuối */}
        {hasMore && (
          <div ref={endRef} className="flex-shrink-0 w-4 self-stretch" />
        )}

        {loading && (
          <div className="flex-shrink-0 w-36 flex items-center justify-center text-muted-foreground text-xs">
            Loading...
          </div>
        )}
      </div>
    </div>
  );
}
