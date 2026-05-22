import { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { ArrowLeft } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "../../components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Spinner } from "../../components/ui/spinner";
import { UserHoverCard } from "../../components/UserHoverCard/UserHoverCard";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "../../components/ui/alert-dialog";
import followApi from "../../api/followApi";
import postApi from "../../api/postApi";
import { toast } from "sonner";

// ─── UserCard — dùng chung cho tất cả 4 tab ─────────────────────────────────
function UserCard({ user, currentUserId, onProfileClick, mutualCount }) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFriend, setIsFriend] = useState(false);
  const [loading, setLoading] = useState(false);
  const [unfriendOpen, setUnfriendOpen] = useState(false);
  const isOwnCard = user.userId === currentUserId;

  useEffect(() => {
    if (isOwnCard || !user.userId) return;
    followApi.getFollowStatus(user.userId)
      .then((res) => {
        setIsFollowing(!!res?.isFollowing);
        setIsFriend(!!res?.isFriend);
      })
      .catch(() => {});
  }, [user.userId, isOwnCard]);

  const handleFollow = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await followApi.toggleFollow(user.userId);
      if (res?.success) {
        setIsFollowing(res.isFollowing);
        setIsFriend(res.isFriend);
        toast.success(
          res.isFriend ? `You and ${user.fullName} are now friends!`
            : res.isFollowing ? "Following successfully" : "Unfollowed successfully"
        );
      }
    } catch {
      toast.error("Failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleUnfollow = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await followApi.toggleFollow(user.userId);
      if (res?.success) {
        setIsFollowing(res.isFollowing);
        setIsFriend(res.isFriend);
        toast.success("Unfollowed successfully");
      }
    } catch {
      toast.error("Failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between gap-3 py-3 px-4 border-b border-border hover:bg-muted/30 transition-colors">
        {/* Avatar */}
        <button onClick={() => onProfileClick(user.username)} className="shrink-0">
          <Avatar className="w-11 h-11">
            <AvatarImage src={user.avatarUrl} style={{ objectFit: "cover" }} />
            <AvatarFallback>{user.fullName?.[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
        </button>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <UserHoverCard username={user.username}>
            <p
              className="font-semibold text-sm cursor-pointer hover:underline truncate"
              onClick={() => onProfileClick(user.username)}
            >
              {user.fullName}
            </p>
          </UserHoverCard>
          <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
          {mutualCount > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {mutualCount} mutual friend{mutualCount > 1 ? "s" : ""}
            </p>
          )}
        </div>

        {/* Follow button */}
        {!isOwnCard && (
          <Button
            size="sm"
            variant={isFollowing ? "outline" : "default"}
            className="shrink-0 h-8 text-sm font-semibold"
            onClick={isFriend ? () => setUnfriendOpen(true) : isFollowing ? () => setUnfriendOpen(true) : handleFollow}
            disabled={loading}
          >
            {isFriend ? "Friends" : isFollowing ? "Following" : "Follow"}
          </Button>
        )}
      </div>

      {/* Confirm unfollow dialog */}
      <AlertDialog open={unfriendOpen} onOpenChange={setUnfriendOpen}>
        <AlertDialogContent
          className="w-fit min-w-[200px] rounded-2xl p-0 overflow-hidden gap-0"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col items-center gap-2 px-4 pt-4 pb-3">
            <Avatar style={{ width: 48, height: 48, minWidth: 48, minHeight: 48 }} className="shrink-0 ring-2 ring-border">
              <AvatarImage src={user.avatarUrl} style={{ objectFit: "cover" }} />
              <AvatarFallback>{user.fullName?.[0]}</AvatarFallback>
            </Avatar>
            <div className="text-center">
              <p className="font-semibold text-base">{user.fullName}</p>
              <p className="text-sm text-muted-foreground">@{user.username}</p>
            </div>
            <p className="text-sm text-muted-foreground text-center leading-relaxed">
              {isFriend
                ? "You will no longer be friends. They will still follow you."
                : "You will stop following this account."}
            </p>
          </div>
          <div className="h-px bg-border" />
          <div className="flex flex-col">
            <AlertDialogAction
              className="rounded-none h-11 text-base font-semibold text-red-500 bg-transparent hover:bg-red-500/10 border-0 shadow-none"
              onClick={handleUnfollow}
            >
              Unfollow
            </AlertDialogAction>
            <div className="h-px bg-border" />
            <AlertDialogCancel
              className="rounded-none h-11 text-base font-medium bg-transparent hover:bg-accent border-0 shadow-none mt-0"
              onClick={(e) => e.stopPropagation()}
            >
              Cancel
            </AlertDialogCancel>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─── ConnectionsPage ─────────────────────────────────────────────────────────
export function ConnectionsPage() {
  const { username: rawUsername } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const currentProfile = useSelector((s) => s.user.profile) ?? {};

  const username = rawUsername?.startsWith("@") ? rawUsername.slice(1) : rawUsername;
  const defaultTab = searchParams.get("tab") || "followers";

  const [targetUserId, setTargetUserId] = useState(null);
  const [targetName, setTargetName] = useState(username);

  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [friends, setFriends] = useState([]);
  const [suggested, setSuggested] = useState([]);
  const [loadingTab, setLoadingTab] = useState({});

  // Lấy userId từ username
  useEffect(() => {
    if (!username) return;
    postApi.getUserByUsername(username)
      .then((res) => {
        const data = res?.result;
        if (data) {
          setTargetUserId(data.userId);
          setTargetName(data.fullName ?? username);
        }
      })
      .catch(() => {});
  }, [username]);

  const loadTab = useCallback(async (tab) => {
    if (!targetUserId || loadingTab[tab]) return;
    setLoadingTab((prev) => ({ ...prev, [tab]: true }));
    try {
      if (tab === "followers" && followers.length === 0) {
        const res = await followApi.getFollowers(targetUserId);
        setFollowers(Array.isArray(res) ? res : []);
      } else if (tab === "following" && following.length === 0) {
        const res = await followApi.getFollowing(targetUserId);
        setFollowing(Array.isArray(res) ? res : []);
      } else if (tab === "friends" && friends.length === 0) {
        const res = await followApi.getFriends(targetUserId);
        setFriends(Array.isArray(res) ? res : []);
      } else if (tab === "suggested" && suggested.length === 0) {
        // Suggestions dùng currentUser (không phải targetUser)
        const res = await followApi.getSuggestions(0, 20);
        setSuggested(Array.isArray(res) ? res : []);
      }
    } catch (err) {
      const msg = err?.message || "Failed to load. Please try again.";
      toast.error(msg);
    } finally {
      setLoadingTab((prev) => ({ ...prev, [tab]: false }));
    }
  }, [targetUserId, followers.length, following.length, friends.length, suggested.length, loadingTab]);

  // Load tab mặc định khi có userId
  useEffect(() => {
    if (targetUserId) loadTab(defaultTab);
  }, [targetUserId]);

  const handleTabChange = (tab) => {
    setSearchParams({ tab });
    loadTab(tab);
  };

  const handleProfileClick = (uname) => navigate(`/profile/@${uname}`);

  const isOwnConnections = currentProfile.username === username;

  const tabs = [
    { value: "followers", label: "Followers" },
    { value: "following", label: "Following" },
    ...(isOwnConnections ? [
      { value: "friends",   label: "Friends" },
      { value: "suggested", label: "Suggested" },
    ] : []),
  ];

  // Render list dọc — dùng chung cho tất cả tab
  const renderList = (list, tab, isSuggested = false) => {
    if (loadingTab[tab]) {
      return <div className="flex justify-center py-8"><Spinner /></div>;
    }
    if (list.length === 0) {
      return <div className="py-8 text-center text-muted-foreground text-sm">No users found</div>;
    }
    return list.map((u) => (
      <UserCard
        key={u.userId}
        user={u}
        currentUserId={currentProfile.userId}
        onProfileClick={handleProfileClick}
        mutualCount={isSuggested ? (u.mutualCount ?? 0) : 0}
      />
    ));
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="border-b border-border p-4 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/profile/@${username}`)} className="p-2">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h2 className="text-xl font-semibold">{targetName}</h2>
            <p className="text-sm text-muted-foreground">@{username}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue={defaultTab} onValueChange={handleTabChange} className="w-full">
        <TabsList
          className={`grid w-full h-12 bg-transparent border-b border-border rounded-none`}
          style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}
        >
          {tabs.map(({ value, label }) => (
            <TabsTrigger
              key={value}
              value={value}
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none text-xs"
            >
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="followers"  className="mt-0">{renderList(followers,  "followers")}</TabsContent>
        <TabsContent value="following"  className="mt-0">{renderList(following,  "following")}</TabsContent>
        {isOwnConnections && (
          <>
            <TabsContent value="friends"   className="mt-0">{renderList(friends,   "friends")}</TabsContent>
            <TabsContent value="suggested" className="mt-0">{renderList(suggested, "suggested", true)}</TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}

