import { useEffect, useRef, useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { PostCard } from "../../components/PostCard/PostCard.jsx";
import postApi from "../../api/postApi";
import { toast } from "sonner";
import { UserRound } from "lucide-react";
import { selectLastMutatedAt } from "../../store/postsSlice";

export function FriendsFeedTab() {
  const navigate = useNavigate();
  const lastMutatedAt = useSelector(selectLastMutatedAt);

  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const SIZE = 20;
  const loadMoreRef = useRef(null);
  const loadDelayRef = useRef(null);

  const fetchFriendsFeed = useCallback(
    async (pageNum, { force = false } = {}) => {
      if (!force && loading) return;
      setLoading(true);
      try {
        const res = await postApi.getFriendsFeed({ page: pageNum, size: SIZE });
        const newPosts = res?.result || [];
        setPosts((prev) => (pageNum === 0 ? newPosts : [...prev, ...newPosts]));
        setPage(pageNum + 1);
        setHasMore(newPosts.length === SIZE);
      } catch (err) {
        toast.error("Không thể tải bài viết");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Load lần đầu
  useEffect(() => {
    if (!initialized) {
      setInitialized(true);
      fetchFriendsFeed(0);
    }
  }, [initialized, fetchFriendsFeed]);

  // Refresh khi có bài mới đăng hoặc xóa
  useEffect(() => {
    if (!initialized || !lastMutatedAt) return;
    setPosts([]);
    setPage(0);
    setHasMore(true);
    fetchFriendsFeed(0, { force: true });
  }, [lastMutatedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  // Infinite scroll
  useEffect(() => {
    if (!hasMore || loading) return;
    const el = loadMoreRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting || loading || !hasMore) return;
        if (loadDelayRef.current) return;
        loadDelayRef.current = setTimeout(() => {
          fetchFriendsFeed(page);
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
  }, [hasMore, loading, page, fetchFriendsFeed]);

  return (
    <div>
      {posts.map((post) => {
        const username = post.username ?? post.user?.username ?? "unknown";
        const fullName = post.fullName ?? post.user?.fullName ?? "User";
        const avatarUrl = post.avatarUrl ?? post.user?.avatarUrl;
        const createdAt = post.createdAt ?? post.created_at;
        const mediaList = Array.isArray(post.mediaUrls) ? post.mediaUrls : [];

        return (
          <PostCard
            key={post.id}
            post={{ ...post, username, fullName, avatarUrl, createdAt, mediaList }}
            onProfileClick={(uname) => navigate(`/profile/@${uname}`)}
            onPostClick={(id) => navigate(`/post/${id}`)}
          />
        );
      })}

      <div className="p-4 text-center">
        {loading && <span className="text-muted-foreground text-sm">Loading...</span>}
        {hasMore && !loading && <div ref={loadMoreRef} className="h-1" />}
        {!hasMore && !loading && posts.length > 0 && (
          <span className="text-muted-foreground text-sm">No more posts</span>
        )}
        {!loading && posts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
            <UserRound className="w-8 h-8" />
            <p className="text-sm">No posts from friends yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
