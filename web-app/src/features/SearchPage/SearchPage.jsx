import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Check } from "lucide-react";
import { motion } from "framer-motion";
import { VerifiedBadge } from "../../components/ui/VerifiedBadge.jsx";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { PostCard } from "../../components/PostCard/PostCard.jsx";
import { searchApi } from "../../api/searchApi";
import followApi from "../../api/followApi";
import { toast } from "sonner";
import { useSelector } from "react-redux";

export function SearchPage() {
  const navigate = useNavigate();

  // Refactor User: Get from Redux Store
  const currentUser = useSelector((state) => state.user.profile);
  const authLoading = useSelector((state) => state.user.loading);

  // Refactor State: Local state for both users and posts
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]); // Local posts state
  const [loading, setLoading] = useState(false);
  const [currentTab, setCurrentTab] = useState("all");

  useEffect(() => {
    // Debounce/Cleanup logic could be improved further, but keeping structure similar for now with local state
    const fetchData = async () => {
      if (!searchQuery.trim()) {
        setUsers([]);
        setPosts([]);
        return;
      }

      setLoading(true);
      try {
        const res = await searchApi.search(searchQuery);

        const data = res.data || res;
        if (data.result) {
          const rawPosts = data.result.posts || [];
          const normalizedPosts = rawPosts.map(p => ({
            ...p,
            mediaList: p.mediaUrls || p.mediaList || []
          }));

          setPosts(normalizedPosts);
          setUsers(data.result.users || []);
        } else {
          setUsers([]);
          setPosts([]);
        }
      } catch (err) {
        console.error("Search error:", err);
        setUsers([]);
        setPosts([]);
      } finally {
        setLoading(false);
      }
    };

    const delay = setTimeout(fetchData, 400);
    return () => clearTimeout(delay);
  }, [searchQuery]);

  const onProfileClick = (username) => {
    navigate(`/profile/${username}`);
  };

  const totalResults = users.length + posts.length;

  return (
    <div className="max-w-2xl mx-auto relative min-h-screen">
      {/* Decorative Glow Blobs */}
      <div className="absolute top-[10%] right-[-15%] w-[350px] h-[350px] rounded-full bg-indigo-500/5 blur-[100px] pointer-events-none -z-10" />
      <div className="absolute bottom-[20%] left-[-15%] w-[300px] h-[300px] rounded-full bg-violet-500/5 blur-[90px] pointer-events-none -z-10" />

      {/* Header cố định trên cùng */}
      <div className="border-b border-border/20 p-4 bg-background/40 backdrop-blur-md sticky top-0 z-20">
        <h2 className="text-xl font-bold tracking-tight text-foreground">Search</h2>
      </div>

      <div className="p-4">
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 stroke-[1.5]" />
          <input
            type="text"
            placeholder="Search for users or posts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 hover:bg-white/8 focus:bg-white/8 transition-all duration-300 rounded-2xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/10 text-white placeholder-muted-foreground/60 shadow-inner"
          />
        </div>

        {!searchQuery.trim() ? (
          <EmptyState
            icon={Search}
            title="Search Threads"
            subtitle="Find users and posts on Threads"
          />
        ) : loading ? (
          <div className="p-12 text-center text-muted-foreground animate-pulse font-medium">
            Searching...
          </div>
        ) : totalResults === 0 ? (
          <EmptyState
            icon={Search}
            title="No results found"
            subtitle="Try searching for something else"
          />
        ) : (
          <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
            <div className="flex justify-center w-full border-b border-border/20 py-2.5 bg-background/30 backdrop-blur-sm sticky top-14 z-10">
              <TabsList className="bg-muted/40 border border-border/40 rounded-full p-1 h-10 w-full max-w-[420px] grid grid-cols-3 relative overflow-hidden">
                <TabsTrigger
                  value="all"
                  className="relative z-10 rounded-full text-xs font-semibold h-full transition-colors duration-300 select-none bg-transparent border-none data-[state=active]:text-background dark:data-[state=active]:text-background text-muted-foreground data-[state=active]:bg-transparent dark:data-[state=active]:bg-transparent data-[state=active]:shadow-none cursor-pointer"
                >
                  All ({totalResults})
                </TabsTrigger>
                <TabsTrigger
                  value="users"
                  className="relative z-10 rounded-full text-xs font-semibold h-full transition-colors duration-300 select-none bg-transparent border-none data-[state=active]:text-background dark:data-[state=active]:text-background text-muted-foreground data-[state=active]:bg-transparent dark:data-[state=active]:bg-transparent data-[state=active]:shadow-none cursor-pointer"
                >
                  Users ({users.length})
                </TabsTrigger>
                <TabsTrigger
                  value="posts"
                  className="relative z-10 rounded-full text-xs font-semibold h-full transition-colors duration-300 select-none bg-transparent border-none data-[state=active]:text-background dark:data-[state=active]:text-background text-muted-foreground data-[state=active]:bg-transparent dark:data-[state=active]:bg-transparent data-[state=active]:shadow-none cursor-pointer"
                >
                  Posts ({posts.length})
                </TabsTrigger>

                {/* Sliding Indicator background pill */}
                <div className="absolute inset-1 w-[calc(33.333%-4px)] h-[calc(100%-8px)] pointer-events-none z-0">
                  <motion.div
                    className="w-full h-full bg-foreground rounded-full shadow-sm"
                    animate={{
                      x: currentTab === "all" ? 0 : currentTab === "users" ? "100%" : "200%",
                    }}
                    transition={{ type: "spring", stiffness: 350, damping: 28 }}
                  />
                </div>
              </TabsList>
            </div>

            <TabsContent value="all" className="mt-2 pt-0">
              {users.length > 0 && (
                <Section
                  title="Users"
                  items={users}
                  renderItem={(user) => (
                    <UserCard
                      key={user.userId}
                      user={user}
                      onProfileClick={onProfileClick}
                      currentUserId={currentUser?.userId}
                      authLoading={authLoading}
                    />
                  )}
                  total={users.length}
                  switchTab="users"
                  onViewAll={() => setCurrentTab("users")}
                />
              )}
              {posts.length > 0 && (
                <Section
                  title="Posts"
                  items={posts}
                  renderItem={(post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      onProfileClick={onProfileClick}
                      onPostClick={(id) => navigate(`/post/${id}`)}
                    />
                  )}
                  total={posts.length}
                  switchTab="posts"
                  onViewAll={() => setCurrentTab("posts")}
                />
              )}
            </TabsContent>

            <TabsContent value="users" className="mt-2">
              {users.length > 0 ? (
                <div className="divide-y divide-border/10">
                  {users.map((user) => (
                    <UserCard
                      key={user.userId}
                      user={user}
                      onProfileClick={onProfileClick}
                      currentUserId={currentUser?.userId}
                      authLoading={authLoading}
                    />
                  ))}
                </div>
              ) : (
                <NoData text="No users found" />
              )}
            </TabsContent>

            <TabsContent value="posts" className="mt-2">
              {posts.length > 0 ? (
                <div>
                  {posts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      onProfileClick={onProfileClick}
                      onPostClick={(id) => navigate(`/post/${id}`)}
                    />
                  ))}
                </div>
              ) : (
                <NoData text="No posts found" />
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, subtitle }) {
  return (
    <div className="p-12 text-center max-w-sm mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="w-16 h-16 rounded-2xl bg-muted/20 border border-border/20 flex items-center justify-center mx-auto mb-4 text-muted-foreground">
        <Icon className="w-8 h-8 stroke-[1.5]" />
      </div>
      <h3 className="text-base font-bold tracking-tight text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{subtitle}</p>
    </div>
  );
}

function NoData({ text }) {
  return (
    <div className="p-12 text-center animate-in fade-in duration-300">
      <p className="text-sm text-muted-foreground font-medium">{text}</p>
    </div>
  );
}

function Section({ title, items, renderItem, total, onViewAll }) {
  return (
    <div className="mt-4">
      <div className="px-4 py-2 border-b border-border/10 flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</h3>
      </div>
      <div className="divide-y divide-border/10">
        {items.slice(0, 3).map(renderItem)}
      </div>
      {items.length > 3 && (
        <div className="p-3 border-b border-border/10 text-center">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
            onClick={onViewAll}
          >
            View all {total} {title.toLowerCase()}
          </motion.button>
        </div>
      )}
    </div>
  );
}

function UserCard({ user, onProfileClick, currentUserId, authLoading }) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [buttonLoading, setButtonLoading] = useState(false);

  const isCurrentUser = user.userId === currentUserId;

  useEffect(() => {
    if (isCurrentUser || authLoading || !user.userId) return;

    const checkStatus = async () => {
      try {
        const res = await followApi.checkFollowing(user.userId);
        const followingStatus = res?.data?.isFollowingValue ?? res?.isFollowingValue ?? false;
        setIsFollowing(!!followingStatus);
      } catch (err) {
        console.error("Error checking follow status:", err);
      }
    };

    checkStatus();
  }, [user.userId, isCurrentUser, authLoading]);

  const handleToggleFollow = async () => {
    if (buttonLoading || isCurrentUser) return;
    setButtonLoading(true);

    try {
      const res = await followApi.toggleFollow(user.userId);
      const newStatus = res?.data?.isFollowing ?? res?.isFollowing ?? !isFollowing;
      setIsFollowing(!!newStatus);
      toast.success(res?.data?.message ?? res?.message ?? (newStatus ? "Đã follow!" : "Đã unfollow!"));
    } catch (err) {
      console.error("Toggle follow error:", err);
      toast.error(err.response?.data?.message || "Toggle follow failed!");
    } finally {
      setButtonLoading(false);
    }
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num?.toString() || "0";
  };

  return (
    <div className="border-b border-border/10 p-4 bg-transparent hover:bg-muted/5 transition-colors duration-300 relative group">
      <div className="flex items-start gap-3">
        <button
          className="p-0 h-auto rounded-full cursor-pointer hover:opacity-95 transition"
          onClick={() => onProfileClick?.(user.username || user.userName)}
          title={user.fullName}
        >
          <Avatar className="w-10 h-10 border border-border/30 group-hover:scale-[1.02] transition-transform duration-300">
            <AvatarImage src={user.avatarUrl} alt={user.fullName} style={{ objectFit: "cover" }} />
            <AvatarFallback>{user.fullName?.charAt(0) || "U"}</AvatarFallback>
          </Avatar>
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <button
              className="p-0 h-auto hover:underline text-foreground font-semibold text-sm cursor-pointer text-left leading-none"
              onClick={() => onProfileClick?.(user.username || user.userName)}
            >
              {user.fullName}
            </button>
            {user.verified && (
              <VerifiedBadge className="w-4 h-4" />
            )}
          </div>
          <p className="text-xs text-muted-foreground mb-1.5">
            @{user.username || user.userName}
          </p>
          {user.bio && <p className="text-sm mb-2 line-clamp-2 text-foreground/95 leading-relaxed">{user.bio}</p>}
          {user.followers !== undefined && (
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
              {formatNumber(user.followers)} followers
            </p>
          )}
        </div>

        {!isCurrentUser && !authLoading && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleToggleFollow}
            disabled={buttonLoading}
            className={`px-4 py-1.5 text-xs font-bold rounded-2xl shadow-sm transition-colors duration-200 cursor-pointer ${isFollowing
                ? "bg-muted/30 border border-border/40 text-foreground hover:bg-muted/50"
                : "bg-foreground text-background hover:opacity-95"
              }`}
          >
            {buttonLoading ? "..." : isFollowing ? (
              <span className="flex items-center justify-center">
                <Check className="w-3.5 h-3.5 mr-1 stroke-[2.5]" /> Following
              </span>
            ) : "Follow"}
          </motion.button>
        )}
      </div>
    </div>
  );
}

export default SearchPage;
