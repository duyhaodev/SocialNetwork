import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  Heart,
  MessageCircle,
  Repeat2,
  UserPlus,
  ChevronRight,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { motion } from "framer-motion";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "../../components/ui/hover-card";
import { UserHoverCard } from "../../components/UserHoverCard/UserHoverCard";
import { toast } from "sonner";
import notificationApi from "../../api/notificationApi";
import {
  markAllNotificationsRead,
  fetchNotifications,
  updateNotificationItem,
  markUserFollowed,
  selectNotifications,
} from "../../store/notificationsSlice";
import { formatTimeAgo } from '../../utils/dateUtils';

const typeMap = {
  all: undefined,
  comments: ["comment_post", "reply_comment"],
  likes: ["like_post", "like_comment"],
  reposts: ["repost"],
  follows: ["follow"],
};

// Số user tối đa hiển thị trong popover follow gộp ở tab All
const FOLLOW_POPOVER_LIMIT = 10;

export function ActivityPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const allActivities = useSelector(selectNotifications);
  const loading = useSelector((state) => state.notifications.loading);
  const [activeTab, setActiveTab] = useState("all");

  const onProfileClick = (username) => {
    if (username) navigate(`/profile/${username}`);
  };

  const onPostClick = (postId) => {
    if (postId) navigate(`/post/${postId}`);
  };

  const typeOf = (a) => a.groupType || a.type;

  // Build danh sách activity theo từng tab
  const activities = useMemo(() => {
    if (activeTab === "follows") {
      // Hiển thị MỖI follow notification là 1 item riêng (kể cả đã follow back)
      return allActivities.filter((a) => typeOf(a) === "follow");
    }

    if (activeTab === "all") {
      // Lọc các notification follow:
      //  - unfollowedBack: chưa follow back → gộp 1 item
      //  - followedBack: B chủ động follow back A (notification mới, A đã follow B trước)
      //  - resolved: A follow back B (notification cũ đã xử lý) → ẨN khỏi tab All
      const followItems = allActivities.filter((a) => typeOf(a) === "follow" && !a.resolved);
      const unfollowedBack = followItems.filter((a) => !a.followed);
      const followedBack = followItems.filter((a) => a.followed);
      const nonFollow = allActivities.filter((a) => typeOf(a) !== "follow");

      // Các follow ĐÃ follow back hiển thị từng cái riêng (item bình thường, nút Following)
      const result = [...nonFollow, ...followedBack];

      // Các follow CHƯA follow back gộp thành 1 item duy nhất
      if (unfollowedBack.length > 0) {
        const latest = unfollowedBack[0];
        const users = unfollowedBack
          .map((n) => (n.users && n.users[0]) || n.user)
          .filter(Boolean);

        result.push({
          id: "__follow_grouped__",
          type: "follow_grouped",
          groupType: "follow",
          users,
          count: unfollowedBack.length,
          createdAt: latest.createdAt || latest.timestamp,
          read: unfollowedBack.every((n) => n.read),
          sourceNotifications: unfollowedBack,
        });
      }

      // Sort theo thời gian giảm dần
      result.sort(
        (a, b) =>
          new Date(b.createdAt || b.timestamp || 0) -
          new Date(a.createdAt || a.timestamp || 0)
      );
      return result;
    }

    const types = typeMap[activeTab];
    if (!types) return allActivities;
    return allActivities.filter((a) => types.includes(typeOf(a)));
  }, [activeTab, allActivities]);

  useEffect(() => {
    dispatch(fetchNotifications());
    dispatch(markAllNotificationsRead());
  }, [dispatch]);

  const handleFollowBack = async (notification) => {
    const targetUserId = notification?.users?.[0]?.id;
    if (!targetUserId) return;

    // cập nhật mọi follow notification có cùng userId
    dispatch(markUserFollowed({ userId: targetUserId, followed: true }));

    try {
      await notificationApi.followBack(targetUserId);
      toast.success("Followed successfully!");
    } catch (err) {
      // Revert nếu thất bại
      dispatch(markUserFollowed({ userId: targetUserId, followed: false }));
      toast.error(err.response?.data?.error || "Follow back failed!");
    }
  };

  const handleViewAllFollows = () => setActiveTab("follows");

  return (
    <div className="max-w-2xl mx-auto relative min-h-screen">
      {/* Decorative Glow Blobs */}
      <div className="absolute top-[5%] right-[-15%] w-[350px] h-[350px] rounded-full bg-violet-500/5 blur-[100px] pointer-events-none -z-10" />
      <div className="absolute top-[35%] left-[-15%] w-[300px] h-[300px] rounded-full bg-pink-500/5 blur-[90px] pointer-events-none -z-10" />

      {/* Header cố định trên cùng */}
      <div className="border-b border-border/20 p-4 bg-background/40 backdrop-blur-md sticky top-0 z-20">
        <h2 className="text-xl font-bold tracking-tight text-foreground">Activity</h2>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex justify-center w-full border-b border-border/20 py-2.5 bg-background/30 backdrop-blur-sm sticky top-14 z-10 px-4">
          <TabsList className="bg-muted/40 border border-border/40 rounded-full p-1 h-10 w-full max-w-[500px] grid grid-cols-5 relative overflow-hidden">
            <TabsTrigger
              value="all"
              className="relative z-10 rounded-full text-[10px] sm:text-xs font-semibold h-full transition-colors duration-300 select-none bg-transparent border-none data-[state=active]:text-background dark:data-[state=active]:text-background text-muted-foreground data-[state=active]:bg-transparent dark:data-[state=active]:bg-transparent data-[state=active]:shadow-none cursor-pointer"
            >
              All
            </TabsTrigger>
            <TabsTrigger
              value="comments"
              className="relative z-10 rounded-full text-[10px] sm:text-xs font-semibold h-full transition-colors duration-300 select-none bg-transparent border-none data-[state=active]:text-background dark:data-[state=active]:text-background text-muted-foreground data-[state=active]:bg-transparent dark:data-[state=active]:bg-transparent data-[state=active]:shadow-none cursor-pointer"
            >
              Replies
            </TabsTrigger>
            <TabsTrigger
              value="likes"
              className="relative z-10 rounded-full text-[10px] sm:text-xs font-semibold h-full transition-colors duration-300 select-none bg-transparent border-none data-[state=active]:text-background dark:data-[state=active]:text-background text-muted-foreground data-[state=active]:bg-transparent dark:data-[state=active]:bg-transparent data-[state=active]:shadow-none cursor-pointer"
            >
              Likes
            </TabsTrigger>
            <TabsTrigger
              value="reposts"
              className="relative z-10 rounded-full text-[10px] sm:text-xs font-semibold h-full transition-colors duration-300 select-none bg-transparent border-none data-[state=active]:text-background dark:data-[state=active]:text-background text-muted-foreground data-[state=active]:bg-transparent dark:data-[state=active]:bg-transparent data-[state=active]:shadow-none cursor-pointer"
            >
              Reposts
            </TabsTrigger>
            <TabsTrigger
              value="follows"
              className="relative z-10 rounded-full text-[10px] sm:text-xs font-semibold h-full transition-colors duration-300 select-none bg-transparent border-none data-[state=active]:text-background dark:data-[state=active]:text-background text-muted-foreground data-[state=active]:bg-transparent dark:data-[state=active]:bg-transparent data-[state=active]:shadow-none cursor-pointer"
            >
              Follows
            </TabsTrigger>

            {/* Sliding Indicator background pill */}
            <div className="absolute inset-1 w-[calc(20%-4px)] h-[calc(100%-8px)] pointer-events-none z-0">
              <motion.div
                className="w-full h-full bg-foreground rounded-full shadow-sm"
                animate={{
                  x: activeTab === "all" ? 0 :
                    activeTab === "comments" ? "100%" :
                      activeTab === "likes" ? "200%" :
                        activeTab === "reposts" ? "300%" : "400%",
                }}
                transition={{ type: "spring", stiffness: 350, damping: 28 }}
              />
            </div>
          </TabsList>
        </div>
      </Tabs>

      <div className="min-h-[200px]">
        {loading && activities.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : activities.length > 0 ? (
          activities.map((activity) =>
            activity.type === "follow_grouped" ? (
              <FollowGroupedItem
                key="follow-grouped"
                activity={activity}
                onProfileClick={onProfileClick}
                onFollowBack={handleFollowBack}
                onViewAll={handleViewAllFollows}
              />
            ) : (
              <ActivityItem
                key={activity.id || `${activity.groupType || activity.type}-${activity.postId}-${activity.commentId}`}
                activity={activity}
                onProfileClick={onProfileClick}
                onPostClick={onPostClick}
                onFollowBack={handleFollowBack}
              />
            )
          )
        ) : (
          <EmptyState message={`No ${activeTab === 'all' ? '' : activeTab} activities yet`} />
        )}
      </div>
    </div>
  );
}

const tabClass = "relative px-4 py-3 text-sm font-medium text-gray-400 hover:text-white transition-colors data-[state=active]:text-white data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-0 data-[state=active]:after:right-0 data-[state=active]:after:h-[2px] data-[state=active]:after:bg-white rounded-none border-none";

// Item gộp follow chưa follow back trong tab "All"
function FollowGroupedItem({ activity, onProfileClick, onFollowBack, onViewAll }) {
  const { users, count, sourceNotifications, createdAt } = activity;
  const firstUser = users[0];
  const firstName = firstUser?.displayName || firstUser?.username || "Someone";
  const othersCount = Math.max(0, count - 1);
  const dateText = formatTimeAgo(createdAt);
  // Tổng số người "others" (không tính user đầu) > limit → cần View more
  const exceedLimit = othersCount > FOLLOW_POPOVER_LIMIT;

  const isMultiple = count > 1;
  // Click toàn dòng (chỉ khi nhiều người) → chuyển sang tab Follows
  const handleRowClick = () => {
    if (isMultiple) onViewAll?.();
  };
  // Ngăn click các phần tử con trigger handleRowClick
  const stop = (e) => e.stopPropagation();

  // Popup chỉ liệt kê user từ vị trí thứ 2 trở đi (user đầu tiên đã có UserHoverCard)
  const othersUsers = users.slice(1, 1 + FOLLOW_POPOVER_LIMIT);
  const othersSources = sourceNotifications.slice(1, 1 + FOLLOW_POPOVER_LIMIT);

  return (
    <div
      className={`border-b border-border/10 p-4 bg-transparent transition-all duration-300 relative group ${!activity.read ? "bg-muted/10" : ""} ${isMultiple ? "cursor-pointer hover:bg-muted/5" : ""}`}
      onClick={handleRowClick}
    >
      <div className="flex items-start gap-3">
        <div className="relative" onClick={stop}>
          <button onClick={() => onProfileClick?.(firstUser?.username)} className="cursor-pointer">
            <Avatar className="w-10 h-10 border border-border/30 group-hover:scale-[1.02] transition-transform duration-300">
              <AvatarImage src={firstUser?.avatar} style={{ objectFit: "cover" }} />
              <AvatarFallback>{(firstName?.[0] || "U").toUpperCase()}</AvatarFallback>
            </Avatar>
          </button>
          <div className="absolute -bottom-1 -right-1 bg-purple-500 rounded-full p-1 border border-background flex items-center justify-center w-5 h-5 shadow-sm">
            <UserPlus className="w-3 h-3 text-white fill-white" />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-sm mb-1 flex flex-wrap items-center gap-1">
            <UserHoverCard username={firstUser?.username}>
              <span
                className="font-semibold hover:underline cursor-pointer text-foreground"
                onClick={(e) => { stop(e); onProfileClick?.(firstUser?.username); }}
              >
                {firstName}
              </span>
            </UserHoverCard>

            {count === 2 && users[1] && (
              <>
                <span className="text-muted-foreground">and</span>
                <UserHoverCard username={users[1]?.username}>
                  <span
                    className="font-semibold hover:underline cursor-pointer text-foreground"
                    onClick={(e) => { stop(e); onProfileClick?.(users[1]?.username); }}
                  >
                    {users[1].displayName || users[1].username}
                  </span>
                </UserHoverCard>
              </>
            )}

            {count >= 3 && (
              <>
                <span className="text-muted-foreground">and</span>
                <HoverCard openDelay={150} closeDelay={150}>
                  <HoverCardTrigger asChild>
                    <button
                      className="font-semibold hover:underline cursor-pointer text-foreground"
                      onClick={stop}
                    >
                      {othersCount} others
                    </button>
                  </HoverCardTrigger>
                  <HoverCardContent
                    align="start"
                    side="bottom"
                    sideOffset={8}
                    collisionPadding={16}
                    className="w-80 max-h-96 overflow-y-auto p-2 bg-zinc-950/85 backdrop-blur-xl border border-white/10 shadow-2xl rounded-2xl z-[100] likers-scroll"
                    onClick={stop}
                  >
                    <div className="text-[11px] font-semibold text-muted-foreground px-2.5 py-1.5 uppercase tracking-wider">
                      People who haven't been followed back
                    </div>
                    <div className="flex flex-col gap-1 mt-1">
                      {othersUsers.map((u, idx) => {
                        const source = othersSources[idx];
                        return (
                          <div
                            key={u.id || u.username}
                            className="flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-white/5 transition-all"
                          >
                            <button
                              onClick={(e) => { stop(e); onProfileClick?.(u.username); }}
                              className="flex items-center gap-2 flex-1 min-w-0 text-left cursor-pointer"
                            >
                              <Avatar className="w-8 h-8 border border-border/30">
                                <AvatarImage src={u.avatar} style={{ objectFit: "cover" }} />
                                <AvatarFallback>{(u.displayName?.[0] || u.username?.[0] || "U").toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <div className="text-sm font-semibold truncate text-foreground">{u.displayName || u.username}</div>
                                {u.username && (
                                  <div className="text-xs text-muted-foreground truncate">@{u.username}</div>
                                )}
                              </div>
                            </button>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              className="h-7 px-3 text-xs font-bold rounded-2xl bg-foreground text-background hover:opacity-90 transition-all flex-shrink-0 cursor-pointer"
                              onClick={(e) => { stop(e); onFollowBack(source); }}
                            >
                              Follow
                            </motion.button>
                          </div>
                        );
                      })}

                      {exceedLimit && (
                        <button
                          onClick={(e) => { stop(e); onViewAll?.(); }}
                          className="text-xs font-bold text-blue-500 hover:underline px-2.5 py-2 text-left cursor-pointer"
                        >
                          View more ({othersCount - FOLLOW_POPOVER_LIMIT} more)
                        </button>
                      )}
                    </div>
                  </HoverCardContent>
                </HoverCard>
              </>
            )}

            <span className="text-muted-foreground text-xs ml-1 font-medium">{dateText}</span>
          </div>

          <div className="text-muted-foreground text-sm">followed you</div>
        </div>

        <div className="flex-shrink-0 ml-2 flex items-center" onClick={stop}>
          {isMultiple ? (
            <motion.button
              whileHover={{ x: 3 }}
              whileTap={{ scale: 0.95 }}
              onClick={onViewAll}
              title="Xem chi tiết trong tab Follows"
              className="p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer"
            >
              <ChevronRight className="w-5 h-5 stroke-[1.8]" />
            </motion.button>
          ) : (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="h-8 px-4 text-xs font-bold rounded-2xl bg-foreground text-background hover:opacity-90 transition-all cursor-pointer"
              onClick={() => onFollowBack(sourceNotifications[0])}
            >
              Follow
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
}

function ActivityItem({ activity, onProfileClick, onPostClick, onFollowBack }) {
  const type = activity.groupType || activity.type;
  const iconMap = {
    like_post: <Heart className="w-3 h-3 text-white fill-white" />,
    like_comment: <Heart className="w-3 h-3 text-white fill-white" />,
    comment_post: <MessageCircle className="w-3 h-3 text-white fill-white" />,
    reply_comment: <MessageCircle className="w-3 h-3 text-white fill-white" />,
    repost: <Repeat2 className="w-3 h-3 text-white" />,
    follow: <UserPlus className="w-3 h-3 text-white fill-white" />,
  };

  const bgMap = {
    like_post: "bg-red-500",
    like_comment: "bg-red-500",
    comment_post: "bg-blue-400",
    reply_comment: "bg-blue-400",
    repost: "bg-green-500",
    follow: "bg-purple-500",
  };

  const messageMap = {
    like_post: "liked your thread",
    like_comment: "liked your comment",
    comment_post: "commented on your thread",
    reply_comment: "replied to your comment",
    repost: "reposted your thread",
    follow: "followed you",
  };

  const users = Array.isArray(activity.users) && activity.users.length > 0
    ? activity.users
    : (activity.user ? [activity.user] : []);
  const count = activity.length || users.length || 1;
  const firstUser = users[0];
  const othersCount = Math.max(0, count - 1);

  const isFollowed = activity.followed === true;
  const dateText = formatTimeAgo(activity.createdAt || activity.timestamp);
  const icon = iconMap[type];
  const bgClass = bgMap[type] || "bg-gray-500";
  const actionText = messageMap[type] || activity.message || "did something";

  const hasPostLink = activity.postId && ["like_post", "like_comment", "comment_post", "reply_comment", "repost"].includes(type);

  const firstName = firstUser?.displayName || firstUser?.username || "Someone";

  return (
    <div className={`border-b border-border/10 p-4 bg-transparent hover:bg-muted/5 transition-all duration-300 relative group ${!activity.read ? "bg-muted/10" : ""}`}>
      <div className="flex items-start gap-3">
        <div className="relative">
          <button onClick={() => onProfileClick?.(firstUser?.username)} className="cursor-pointer">
            <Avatar className="w-10 h-10 border border-border/30 group-hover:scale-[1.02] transition-transform duration-300">
              <AvatarImage src={firstUser?.avatar} style={{ objectFit: "cover" }} />
              <AvatarFallback>{(firstName?.[0] || "U").toUpperCase()}</AvatarFallback>
            </Avatar>
          </button>
          {icon && (
            <div className={`absolute -bottom-1 -right-1 ${bgClass} rounded-full p-1 border border-background flex items-center justify-center w-5 h-5 shadow-sm`}>
              {icon}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-sm mb-1 flex flex-wrap items-center gap-1">
            <UserHoverCard username={firstUser?.username}>
              <span
                className="font-semibold hover:underline cursor-pointer text-foreground"
                onClick={() => onProfileClick?.(firstUser?.username)}
              >
                {firstName}
              </span>
            </UserHoverCard>

            {count === 2 && users[1] && (
              <>
                <span className="text-muted-foreground">and</span>
                <UserHoverCard username={users[1]?.username}>
                  <span
                    className="font-semibold hover:underline cursor-pointer text-foreground"
                    onClick={() => onProfileClick?.(users[1]?.username)}
                  >
                    {users[1].displayName || users[1].username}
                  </span>
                </UserHoverCard>
              </>
            )}

            {count > 2 && (
              <>
                <span className="text-muted-foreground">and</span>
                <HoverCard openDelay={150} closeDelay={150}>
                  <HoverCardTrigger asChild>
                    <button className="font-semibold hover:underline cursor-pointer text-foreground">
                      {othersCount} others
                    </button>
                  </HoverCardTrigger>
                  <HoverCardContent
                    align="start"
                    side="bottom"
                    sideOffset={8}
                    collisionPadding={16}
                    className="w-72 max-h-72 overflow-y-auto p-2 bg-zinc-950/85 backdrop-blur-xl border border-white/10 shadow-2xl rounded-2xl z-[100] likers-scroll"
                  >
                    <div className="text-[11px] font-semibold text-muted-foreground px-2.5 py-1.5 uppercase tracking-wider">People who {actionText}</div>
                    <div className="flex flex-col gap-1 mt-1">
                      {users.slice(1).map((u) => (
                        <button
                          key={u.id || u.username}
                          onClick={() => onProfileClick?.(u.username)}
                          className="flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-white/5 text-left cursor-pointer transition-colors"
                        >
                          <Avatar className="w-7 h-7 border border-border/30">
                            <AvatarImage src={u.avatar} style={{ objectFit: "cover" }} />
                            <AvatarFallback>{(u.displayName?.[0] || u.username?.[0] || "U").toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold truncate text-foreground">{u.displayName || u.username}</div>
                            {u.username && (
                              <div className="text-xs text-muted-foreground truncate">@{u.username}</div>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </HoverCardContent>
                </HoverCard>
              </>
            )}

            <span className="text-muted-foreground text-xs ml-1 font-medium">{dateText}</span>
          </div>

          <div className="text-muted-foreground text-sm">
            {hasPostLink ? (
              <div
                onClick={() => onPostClick?.(activity.postId)}
                className="cursor-pointer hover:text-foreground transition-colors font-medium text-xs sm:text-sm mt-0.5 inline-block"
              >
                {actionText}
              </div>
            ) : (
              <span className="font-medium text-xs sm:text-sm mt-0.5 inline-block">{actionText}</span>
            )}
          </div>
        </div>

        {type === "follow" && (
          <div className="flex-shrink-0 ml-2">
            {isFollowed ? (
              <button
                disabled
                className="h-8 px-4 text-xs font-semibold rounded-2xl bg-muted/20 border border-border/30 text-muted-foreground opacity-60 flex items-center justify-center"
              >
                Following
              </button>
            ) : (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="h-8 px-4 text-xs font-bold rounded-2xl bg-foreground text-background hover:opacity-90 transition-all cursor-pointer"
                onClick={() => onFollowBack(activity)}
              >
                Follow
              </motion.button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="p-16 text-center max-w-sm mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <p className="text-sm text-muted-foreground font-medium">{message}</p>
    </div>
  );
}

export default ActivityPage;
