import { useEffect, useRef, useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PostCard } from "../../components/PostCard/PostCard.jsx";
import postApi from "../../api/postApi";
import { toast } from "sonner";
import { MapPin } from "lucide-react";

export function LocalFeedTab({ city }) {
  const navigate = useNavigate();

  // State riêng, không dùng chung Redux với global feed
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [isFallback, setIsFallback] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const SIZE = 20;
  const loadMoreRef = useRef(null);
  const loadDelayRef = useRef(null);

  // Fetch bài theo city
  const fetchLocalFeed = useCallback(
    async (pageNum) => {
      if (!city || city === "Unknown" || loading) return;
      setLoading(true);
      try {
        const res = await postApi.getLocalFeed({ city, page: pageNum, size: SIZE });
        const data = res?.result;
        if (!data) return;

        const newPosts = data.posts ?? [];
        setPosts((prev) => (pageNum === 0 ? newPosts : [...prev, ...newPosts]));
        setPage(pageNum + 1);
        setHasMore(newPosts.length === SIZE);
        setIsFallback(data.fallback ?? false);
      } catch (err) {
        toast.error("Không thể tải bài viết khu vực này");
      } finally {
        setLoading(false);
      }
    },
    [city]
  );

  // Load lần đầu khi tab được mở
  useEffect(() => {
    if (!initialized && city) {
      setInitialized(true);
      fetchLocalFeed(0);
    }
  }, [city, initialized, fetchLocalFeed]);

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
          fetchLocalFeed(page);
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
  }, [hasMore, loading, page, fetchLocalFeed]);

  // City chưa xác định
  if (!city || city === "Unknown") {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
        <MapPin className="w-8 h-8" />
        <p className="text-sm">Không xác định được vị trí của bạn</p>
      </div>
    );
  }

  return (
    <div>
      {/* Banner fallback khi tỉnh chưa có bài */}
      {isFallback && (
        <div className="px-4 py-2 text-sm text-muted-foreground bg-muted/40 border-b border-border flex items-center gap-2">
          <MapPin className="w-4 h-4 flex-shrink-0" />
          <span>Chưa có bài viết từ <strong>{city}</strong>, hiển thị bài mới nhất toàn quốc</span>
        </div>
      )}

      {/* Danh sách bài */}
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

      {/* Trạng thái loading / hết bài */}
      <div className="p-4 text-center">
        {loading && <span className="text-muted-foreground text-sm">Đang tải...</span>}
        {hasMore && !loading && <div ref={loadMoreRef} className="h-1" />}
        {!hasMore && !loading && posts.length > 0 && (
          <span className="text-muted-foreground text-sm">Đã hết bài viết</span>
        )}
        {!loading && posts.length === 0 && (
          <span className="text-muted-foreground text-sm">Chưa có bài viết nào</span>
        )}
      </div>
    </div>
  );
}
