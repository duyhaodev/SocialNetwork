import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import {
  Heart,
  MessageCircle,
  Repeat2,
  UserPlus,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { toast } from "sonner";
import notificationApi from "../../api/notificationApi";
import { markAllNotificationsRead } from "../../store/notificationsSlice";
import { formatTimeAgo } from '../../utils/dateUtils';

export function ActivityPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");

  const onProfileClick = (username) => {
    if (username) navigate(`/profile/${username}`);
  };

  const onPostClick = (postId) => {
    if (postId) navigate(`/post/${postId}`);
  };

  // Map tab -> backend types
  const typeMap = {
    all: undefined, 
    comments: ["comment_post"],
    likes: ["like_post", "like_comment"],
    reposts: ["repost"],
    follows: ["follow"],
  };

  const fetchActivities = useCallback(async (tabType) => {
    setLoading(true);
    try {
      const typesToFetch = typeMap[tabType];
      
      const res = await notificationApi.getNotifications({
        type: typesToFetch,
        limit: 20,
      });
      setActivities(res?.activities || []);
    } catch (err) {
      console.error("Error fetching activities:", err);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivities(activeTab);
    // Mark notifications as read on backend when viewing activity page
    dispatch(markAllNotificationsRead());
  }, [activeTab, fetchActivities, dispatch]);

  const handleFollowBack = async (notificationId) => {
    // Optimistic update
    setActivities((prev) =>
      prev.map((a) =>
        a.id === notificationId 
          ? { ...a, followed: true }
          : a
      )
    );

    try {
      await notificationApi.followBack(notificationId);
      toast.success("Followed successfully!");
    } catch (err) {
      // Revert if failed
      setActivities((prev) =>
        prev.map((a) =>
          a.id === notificationId 
            ? { ...a, followed: false }
            : a
        )
      );
      toast.error(err.response?.data?.error || "Follow back failed!");
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="border-b border-border p-4 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <h2 className="text-xl font-semibold">Activity</h2>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start rounded-none border-b border-[#333] bg-transparent p-0 h-auto overflow-x-auto flex-nowrap scrollbar-hide">
          <TabsTrigger 
            value="all" 
            className="relative px-4 py-3 text-sm font-medium text-gray-400 hover:text-white transition-colors data-[state=active]:text-white data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-0 data-[state=active]:after:right-0 data-[state=active]:after:h-[2px] data-[state=active]:after:bg-white rounded-none border-none"
          >
            All
          </TabsTrigger>
          <TabsTrigger 
            value="comments" 
            className="relative px-4 py-3 text-sm font-medium text-gray-400 hover:text-white transition-colors data-[state=active]:text-white data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-0 data-[state=active]:after:right-0 data-[state=active]:after:h-[2px] data-[state=active]:after:bg-white rounded-none border-none"
          >
            Replies
          </TabsTrigger>
          <TabsTrigger 
            value="likes" 
            className="relative px-4 py-3 text-sm font-medium text-gray-400 hover:text-white transition-colors data-[state=active]:text-white data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-0 data-[state=active]:after:right-0 data-[state=active]:after:h-[2px] data-[state=active]:after:bg-white rounded-none border-none"
          >
            Likes
          </TabsTrigger>
          <TabsTrigger 
            value="reposts" 
            className="relative px-4 py-3 text-sm font-medium text-gray-400 hover:text-white transition-colors data-[state=active]:text-white data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-0 data-[state=active]:after:right-0 data-[state=active]:after:h-[2px] data-[state=active]:after:bg-white rounded-none border-none"
          >
            Reposts
          </TabsTrigger>
          <TabsTrigger 
            value="follows" 
            className="relative px-4 py-3 text-sm font-medium text-gray-400 hover:text-white transition-colors data-[state=active]:text-white data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-0 data-[state=active]:after:right-0 data-[state=active]:after:h-[2px] data-[state=active]:after:bg-white rounded-none border-none"
          >
            Follows
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="min-h-[200px]">
        {loading ? (
           <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : activities.length > 0 ? (
          activities.map((activity) => (
            <ActivityItem
              key={activity.id}
              activity={activity}
              onProfileClick={onProfileClick}
              onPostClick={onPostClick}
              onFollowBack={handleFollowBack}
            />
          ))
        ) : (
          <EmptyState message={`No ${activeTab === 'all' ? '' : activeTab} activities yet`} />
        )}
      </div>
    </div>
  );
}

function ActivityItem({ activity, onProfileClick, onPostClick, onFollowBack }) {
    const iconMap = {
      like_post: <Heart className="w-3.5 h-3.5 text-white fill-white" />,
      like_comment: <Heart className="w-3.5 h-3.5 text-white fill-white" />,
      comment_post: <MessageCircle className="w-3.5 h-3.5 text-white fill-white" />,
      repost: <Repeat2 className="w-3.5 h-3.5 text-white" />,
      follow: <UserPlus className="w-3.5 h-3.5 text-white fill-white" />,
    };

    const bgMap = {
        like_post: "bg-red-500",
        like_comment: "bg-red-500",
        comment_post: "bg-blue-400",
        repost: "bg-green-500",
        follow: "bg-purple-500",
    }
  
    const isFollowed = activity.followed === true;
    const dateText = formatTimeAgo(activity.timestamp);
    const icon = iconMap[activity.type];
    const bgClass = bgMap[activity.type] || "bg-gray-500";
  
    const hasPostLink = activity.postId && ["like_post", "like_comment", "comment_post", "repost"].includes(activity.type);
  
    return (
      <div className={`border-b border-border p-4 transition-colors ${!activity.read ? "bg-muted/30" : ""}`}>
        <div className="flex items-start gap-3">
            <div className="relative">
                <button onClick={() => onProfileClick?.(activity.user?.username)}>
                    <Avatar className="w-10 h-10 border border-background">
                        <AvatarImage src={activity.user?.avatar} />
                        <AvatarFallback>U</AvatarFallback>
                    </Avatar>
                </button>
                {icon && (
                    <div className={`absolute -bottom-1 -right-1 ${bgClass} rounded-full p-1 border-2 border-background flex items-center justify-center w-6 h-6`}>
                        {icon}
                    </div>
                )}
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 text-sm mb-1">
                     <span 
                        className="font-semibold hover:underline cursor-pointer"
                        onClick={() => onProfileClick?.(activity.user?.username)}
                     >
                        {activity.user?.displayName || activity.user?.username}
                     </span>
                     <span className="text-muted-foreground">{dateText}</span>
                </div>
                
                <div className="text-muted-foreground text-sm">
                    {hasPostLink ? (
                         <div 
                            onClick={() => onPostClick?.(activity.postId)}
                            className="cursor-pointer hover:text-foreground transition-colors"
                         >
                            {activity.type === 'repost' ? 'Reposted your thread' : 
                             activity.type === 'like_post' ? 'Liked your thread' :
                             activity.message}
                         </div>
                    ) : (
                        <span>{activity.message}</span>
                    )}
                </div>
            </div>

            {activity.type === "follow" && (
                <div className="flex-shrink-0 ml-2">
                    {isFollowed ? (
                        <Button variant="outline" size="sm" className="text-muted-foreground h-8 px-4" disabled>
                            Following
                        </Button>
                    ) : (
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 px-4"
                            onClick={() => onFollowBack(activity.id)}
                        >
                            Follow
                        </Button>
                    )}
                </div>
            )}
        </div>
      </div>
    );
  }
  
  function EmptyState({ message }) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        <p>{message}</p>
      </div>
    );
  }

export default ActivityPage;