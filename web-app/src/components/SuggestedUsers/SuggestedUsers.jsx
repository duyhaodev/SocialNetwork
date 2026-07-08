import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar.js";
import { Button } from "../ui/button.js";
import { X, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import followApi from "../../api/followApi";
import { toast } from "sonner";
import { UserHoverCard } from "../UserHoverCard/UserHoverCard";
import { VerifiedBadge } from "../ui/VerifiedBadge";


export function SuggestedUsers({ onDismiss, sidebar = false }) {
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

  // Sidebar mode: layout dọc, không có drag scroll, không có dismiss button
  if (sidebar) {
    return (
      <div className="bg-card/45 backdrop-blur-md rounded-2xl border border-border/30 p-4 shadow-sm relative overflow-hidden">
        {/* Glow decoration */}
        <div className="absolute -top-10 -right-10 w-24 h-24 bg-violet-500/10 blur-2xl rounded-full pointer-events-none" />
        
        <h3 className="font-bold text-sm text-foreground/90 mb-3 relative z-10">Suggested for you</h3>
        <div className="space-y-3 relative z-10">
          <AnimatePresence initial={false}>
            {suggestions
              .filter((s) => !dismissedIds.has(s.userId))
              .slice(0, 5)
              .map((s) => (
                <motion.div
                  key={s.userId}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, height: 0, marginBottom: 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className="flex items-center justify-between gap-2 overflow-hidden"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar
                      className="w-9 h-9 shrink-0 cursor-pointer ring-1 ring-border/20 hover:ring-violet-500/30 transition-all duration-300"
                      onClick={() => navigate(`/profile/@${s.username}`)}
                    >
                      <AvatarImage src={s.avatarUrl} style={{ objectFit: "cover" }} />
                      <AvatarFallback className="text-sm bg-muted text-foreground/70">
                        {s.fullName?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <UserHoverCard username={s.username}>
                        <div className="flex items-center gap-1">
                          <p
                            className="text-xs font-semibold truncate cursor-pointer hover:text-violet-400 transition-colors"
                            onClick={() => navigate(`/profile/@${s.username}`)}
                          >
                            {s.fullName}
                          </p>
                          {s.verified && <VerifiedBadge className="w-3.5 h-3.5 shrink-0" />}
                        </div>
                      </UserHoverCard>
                      <p className="text-[10px] text-muted-foreground truncate">@{s.username}</p>
                    </div>                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`h-7 px-3 text-xs font-bold rounded-2xl shadow-sm transition-colors duration-200 cursor-pointer shrink-0 ${
                      followedIds.has(s.userId)
                        ? "bg-muted/30 border border-border/40 text-foreground hover:bg-muted/50"
                        : "bg-foreground text-background hover:opacity-95"
                    }`}
                    onClick={() => handleFollow(s)}
                  >
                    {followedIds.has(s.userId) ? "Following" : "Follow"}
                  </motion.button>
                </motion.div>
              ))}
          </AnimatePresence>
          {loading && <p className="text-[10px] text-muted-foreground animate-pulse">Loading...</p>}
        </div>
      </div>
    );
  }


  return (
    <div className="border-b border-border/30 px-4 py-5 bg-gradient-to-r from-transparent via-card/5 to-transparent">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="font-bold text-sm tracking-wide text-foreground/90">Suggested for you</span>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onDismiss}
          className="p-1.5 rounded-full hover:bg-muted/40 transition-colors text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4 stroke-[1.5]" />
        </motion.button>
      </div>

      {/* Horizontal scroll list */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto pb-2 cursor-grab suggest-scroll"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onDragStart={(e) => e.preventDefault()}
      >
        <AnimatePresence>
          {suggestions
            .filter((s) => !dismissedIds.has(s.userId))
            .map((s) => (
              <motion.div
                key={s.userId}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ 
                  opacity: 0, 
                  scale: 0.85, 
                  width: 0, 
                  paddingLeft: 0, 
                  paddingRight: 0, 
                  marginLeft: 0, 
                  marginRight: -12 
                }}
                transition={{ type: "spring", stiffness: 350, damping: 26 }}
                className="relative flex-shrink-0 w-52 flex flex-col items-center gap-3 rounded-2xl border border-border/30 bg-card/45 backdrop-blur-sm p-4 hover:bg-card/75 hover:border-border/60 hover:shadow-md transition-all duration-300 group overflow-hidden"
              >
                {/* X button góc trên phải */}
                <button
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-background/60 backdrop-blur-md border border-border/40 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all duration-200 shadow-sm z-20 hover:scale-105 active:scale-95"
                  onClick={() => setDismissedIds((prev) => new Set([...prev, s.userId]))}
                >
                  <X className="w-3.5 h-3.5 stroke-[1.5]" />
                </button>
                {/* Avatar */}
                <motion.button 
                  whileHover={{ scale: 1.05 }} 
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate(`/profile/@${s.username}`)}
                  className="relative"
                >
                  <Avatar className="w-20 h-20 ring-2 ring-border/20 hover:ring-violet-500/30 transition-all duration-300">
                    <AvatarImage src={s.avatarUrl} alt={s.fullName} />
                    <AvatarFallback className="text-xl bg-muted text-foreground/70">
                      {s.fullName?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                </motion.button>

                {/* Name */}
                <div className="text-center w-full min-w-0">
                  <UserHoverCard username={s.username}>
                    <div className="flex items-center justify-center gap-1">
                      <span
                        className="text-sm font-semibold truncate block cursor-pointer hover:text-violet-400 transition-colors"
                        onClick={() => navigate(`/profile/@${s.username}`)}
                      >
                        {s.fullName}
                      </span>
                      {s.verified && <VerifiedBadge className="w-4 h-4 shrink-0" />}
                    </div>
                  </UserHoverCard>
                  <p className="text-xs text-muted-foreground truncate">@{s.username}</p>
                </div>

                {/* Mutual friends avatars + count */}
                {s.mutualCount > 0 && (
                  <div className="flex items-center gap-1.5 bg-muted/20 px-2 py-0.5 rounded-full border border-border/20">
                    <div className="flex -space-x-1.5">
                      {s.mutualFriendAvatars?.map((url, i) => (
                        <Avatar key={i} className="w-4 h-4 ring-1 ring-card/85">
                          <AvatarImage src={url} />
                          <AvatarFallback className="text-[8px] bg-muted">?</AvatarFallback>
                        </Avatar>
                      ))}
                    </div>
                    <span className="text-[10px] font-medium text-muted-foreground/90">
                      {s.mutualCount} mutual
                    </span>
                  </div>
                )}

                {/* Follow button */}
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  className={`w-full py-1.5 text-xs font-bold rounded-2xl shadow-sm transition-colors duration-200 cursor-pointer mt-auto ${
                    followedIds.has(s.userId)
                      ? "bg-muted/30 border border-border/40 text-foreground hover:bg-muted/50"
                      : "bg-foreground text-background hover:opacity-95"
                  }`}
                  onClick={() => handleFollow(s)}
                >
                  {followedIds.has(s.userId) ? "Following" : "Follow"}
                </motion.button>
              </motion.div>
            ))}
        </AnimatePresence>

        {/* Sentinel để load thêm khi kéo đến cuối */}
        {hasMore && (
          <div ref={endRef} className="flex-shrink-0 w-4 self-stretch" />
        )}

        {loading && (
          <div className="flex-shrink-0 w-52 flex flex-col items-center justify-center gap-3 rounded-2xl border border-border/20 bg-card/25 p-4 animate-pulse">
            <div className="w-20 h-20 rounded-full bg-muted/40" />
            <div className="h-4 w-24 bg-muted/40 rounded" />
            <div className="h-3 w-16 bg-muted/30 rounded" />
            <div className="h-8 w-full bg-muted/40 rounded-2xl mt-1" />
          </div>
        )}
      </div>
    </div>
  );
}

