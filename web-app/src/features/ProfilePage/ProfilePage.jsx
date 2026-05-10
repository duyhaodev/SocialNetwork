import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

import { Button } from "../../components/ui/button.js";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar.js";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs.js";
import { MoreHorizontal, Share, Verified, ArrowLeft, ChevronDown, UserMinus, Users, UserCheck } from "lucide-react";
import { PostCard } from "../../components/PostCard/PostCard.jsx";
import { ImageViewer } from "../../components/ImageViewer/ImageViewer.jsx";
import {AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,} from "../../components/ui/alert-dialog.js";
import {fetchMyPosts, selectMyPosts, selectMyPostsLoading, fetchUserPosts, selectUserPosts, selectUserPostsLoading, fetchMyReposts, fetchUserReposts, selectMyReposts, selectMyRepostsLoading, selectUserReposts, selectUserRepostsLoading,} from "../../store/postsSlice";
import postApi from "../../api/postApi";
import followApi from "../../api/followApi";
import { EditProfileDialog } from "./EditProfileDialog.jsx";
import SpotifyView from "../../components/SpotifySection/SpotifyView";
import { toast } from "sonner";

export function ProfilePage() {
  const { username: rawUsername } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const cleanUsername =
    rawUsername && rawUsername.startsWith("@")
      ? rawUsername.substring(1)
      : rawUsername;

  // Lấy thông tin user đã đăng nhập
  const profile = useSelector((s) => s.user.profile) ?? {};
  // TAB THREADS
  const myPosts = useSelector(selectMyPosts);
  const loadingMyPosts = useSelector(selectMyPostsLoading);

  //TAB REPOSTS
  const myReposts = useSelector(selectMyReposts);
  const loadingMyReposts = useSelector(selectMyRepostsLoading);
  const userReposts = useSelector(selectUserReposts);
  const loadingUserReposts = useSelector(selectUserRepostsLoading);

  // State lưu thông tin profile của NGƯỜI KHÁC
  const [otherProfile, setOtherProfile] = useState(null);

  // Follow / friendship state
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFriend, setIsFriend] = useState(false);
  const [unfollowDialogOpen, setUnfollowDialogOpen] = useState(false);
  const [friendsMenuOpen, setFriendsMenuOpen] = useState(false);
  const friendsMenuRef = useRef(null);

  const otherPosts = useSelector(selectUserPosts);
  const loadingOther = useSelector(selectUserPostsLoading);

  // mở avatar bằng ImageViewer
  const [avatarViewerOpen, setAvatarViewerOpen] = useState(false);

  // mở dialog Edit profile
  const [editOpen, setEditOpen] = useState(false);
  const isOwnProfile = !cleanUsername || cleanUsername === profile.username;
  const user = isOwnProfile
    ? {
        userId: profile.userId,
        displayName: profile.fullName ?? "Unknown",
        username: profile.username ?? "unknown",
        bio: profile.bio ?? "",
        avatar: profile.avatarUrl ?? "/default-avatar.png",
        followers: profile.followerCount ?? 0,
        following: profile.followingCount ?? 0,
        verified: profile.verified ?? false,
      }
    : otherProfile
    ? {
        userId: otherProfile.userId,
        displayName: otherProfile.fullName ?? "Unknown",
        username: otherProfile.username ?? "unknown",
        bio: otherProfile.bio ?? "",
        avatar: otherProfile.avatarUrl ?? "/default-avatar.png",
        followers: otherProfile.followerCount ?? 0,
        following: otherProfile.followingCount ?? 0,
        verified: otherProfile.verified ?? false,
      }
    : null;

  // LẤY BÀI VIẾT + PROFILE
  useEffect(() => {
  if (isOwnProfile) {
    dispatch(fetchMyPosts());
    dispatch(fetchMyReposts()); 
    return;
  }

  if (!cleanUsername) return;

  (async () => {
    try {
      dispatch(fetchUserPosts({ username: cleanUsername }));
      dispatch(fetchUserReposts({ username: cleanUsername })); 

      const userRes = await postApi.getUserByUsername(cleanUsername);
      const followingUser = userRes?.result;
      setOtherProfile(followingUser);
    // lấy trạng thái follow + friend
      if (followingUser?.userId) {
        const statusRes = await followApi.getFollowStatus(followingUser.userId);
        setIsFollowing(!!statusRes?.isFollowing);
        setIsFriend(!!statusRes?.isFriend);
      }
    } catch (err) {
      console.error("Error loading profile:", err);
    }
  })();
}, [dispatch, isOwnProfile, cleanUsername]);
  
  

  // Hàm khi click vào avatar/username trong PostCard
  const handleProfileClick = (username) => {
    navigate(`/profile/@${username}`);
  };

  // Back lại feed
  const handleBack = () => {
    navigate("/feed");
  };

  // Close friends menu when clicking outside
  useEffect(() => {
    if (!friendsMenuOpen) return;
    const handleClickOutside = (e) => {
      if (friendsMenuRef.current && !friendsMenuRef.current.contains(e.target)) {
        setFriendsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [friendsMenuOpen]);

 // Format số follower/following cho đẹp (1.2K, 3.4M,...)
  const formatNumber = (num) => {
    if (!num) return 0;
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
    if (num >= 1_000) return (num / 1_000).toFixed(1) + "K";
    return num.toString();
  };

  // Toggle Follow (only used when NOT friends — i.e. simple follow)
  const handleFollow = useCallback(async () => {
    if (!user?.userId) return;

    // Optimistic update
    setIsFollowing(true);
    setOtherProfile((prev) => {
      if (!prev) return null;
      return { ...prev, followerCount: (prev.followerCount ?? 0) + 1 };
    });

    try {
      const res = await followApi.toggleFollow(user.userId);
      if (!res?.success) throw new Error(res?.message || "Failed to follow");
      //cập nhật trạng thái thật từ be
      setIsFollowing(res.isFollowing);
      setIsFriend(res.isFriend);
      toast.success(res.isFriend ? `You and ${user.displayName} are now friends!` : "Following successfully");
    } catch (error) {
      console.error("Error following:", error);
      // Rollback
      setIsFollowing(false);
      setOtherProfile((prev) => {
        if (!prev) return null;
        return { ...prev, followerCount: Math.max(0, (prev.followerCount ?? 1) - 1) };
      });
      toast.error("Failed to follow. Please try again.");
    }
  }, [user?.userId, user?.displayName]);

  // Unfollow — called after confirmation dialog
  const handleUnfollow = useCallback(async () => {
    if (!user?.userId) return;

    // Optimistic update
    setIsFollowing(false);
    setIsFriend(false);
    setOtherProfile((prev) => {
      if (!prev) return null;
      return { ...prev, followerCount: Math.max(0, (prev.followerCount ?? 1) - 1) };
    });

    try {
      const res = await followApi.toggleFollow(user.userId);
      if (!res?.success) throw new Error(res?.message || "Failed to unfollow");
      setIsFollowing(res.isFollowing);
      setIsFriend(res.isFriend);
      toast.success("Unfollowed successfully");
    } catch (error) {
      console.error("Error unfollowing:", error);
      // Rollback
      setIsFollowing(true);
      setIsFriend(true);
      setOtherProfile((prev) => {
        if (!prev) return null;
        return { ...prev, followerCount: (prev.followerCount ?? 0) + 1 };
      });
      toast.error("Failed to unfollow. Please try again.");
    }
  }, [user?.userId, user?.displayName]);

  // Threads để render
  const postsToRender = isOwnProfile ? myPosts : otherPosts;
  // Reposts để render
  const repostsToRender = isOwnProfile ? myReposts : userReposts;
  //Loading profile
  if (!user && (isOwnProfile ? loadingMyPosts : loadingOther)) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Đang tải profile...
      </div>
    );
  }

  // Mở bài viết trong PostDetailPage
  const handleOpenPost = (postId) => {
    if (!postId) return;
    navigate(`/post/${postId}`);
  };
  return (
    <div className="max-w-2xl mx-auto">
      {/* Header cố định trên cùng */}
      <div className="border-b border-border p-4 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={handleBack} className="p-2">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h2 className="text-xl font-semibold">{user?.displayName}</h2>
            <p className="text-sm text-muted-foreground">
              {postsToRender?.length || 0} threads
            </p>
          </div>
          <Button variant="ghost" size="sm" className="p-2">
            <MoreHorizontal className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Phần info profile (avatar, name, bio, stats, nút ...) */}
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-2xl font-bold">{user?.displayName}</h1>
              {user?.verified && (
                <Verified className="w-6 h-6 text-blue-500 fill-blue-500" />
              )}
            </div>
            <p className="text-muted-foreground mb-1">@{user?.username}</p>
            {user?.bio && (
              <p className="mb-4">{user.bio}</p>
            )}
          </div>
          <button
            className="p-0 rounded-full cursor-pointer hover:opacity-80 transition"
            onClick={() => {
              if (user?.avatar) setAvatarViewerOpen(true);
            }}
            title="Xem ảnh đại diện"
          >
            <Avatar className="w-20 h-20 ml-4">
              <AvatarImage
                src={user?.avatar || "/default-avatar.png"}
                alt={user?.displayName}
                onError={(e) => {
                  e.currentTarget.src = "/default-avatar.png";
                }}
              />
              <AvatarFallback className="text-2xl">
                {user?.displayName?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
          </button>
        </div>

        {/* Stats followers / following */}
        <div className="flex items-center gap-2 mb-3">
          <button className="flex-1 flex items-center justify-center gap-3 rounded-xl border border-border bg-card px-4 py-3 hover:bg-accent transition-colors">
            <Users className="w-6 h-6 text-muted-foreground shrink-0" />
            <div className="flex flex-col items-center">
              <span className="text-xl font-bold tracking-tight leading-none">{formatNumber(user?.followers)}</span>
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide mt-0.5">Followers</span>
            </div>
          </button>

          <button className="flex-1 flex items-center justify-center gap-3 rounded-xl border border-border bg-card px-4 py-3 hover:bg-accent transition-colors">
            <UserCheck className="w-6 h-6 text-muted-foreground shrink-0" />
            <div className="flex flex-col items-center">
              <span className="text-xl font-bold tracking-tight leading-none">{formatNumber(user?.following)}</span>
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide mt-0.5">Following</span>
            </div>
          </button>
        </div>
        <SpotifyView url={isOwnProfile ? profile.spotifyLink : otherProfile?.spotifyLink} />

        {/* Nút action: nếu là mình -> Edit/Share, nếu là người khác -> Follow/Friends/... */}
        <div className="flex gap-3">
          {isOwnProfile ? (
            <>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setEditOpen(true)}
              >
                Edit profile
              </Button>
              <Button variant="outline" className="flex-1">
                Share profile
              </Button>
            </>
          ) : (
            <>
              {/* ── Not following ── */}
              {!isFollowing && (
                <Button onClick={handleFollow} className="flex-1 font-semibold">
                  Follow
                </Button>
              )}

              {/* ── Following, not mutual ── */}
              {isFollowing && !isFriend && (
                <Button
                  variant="outline"
                  className="flex-1 font-semibold border-2"
                  onClick={() => setUnfollowDialogOpen(true)}
                >
                  Following
                </Button>
              )}

              {/* ── Mutual → Friends split-button ── */}
              {isFriend && (
                <div ref={friendsMenuRef} className="relative flex-1">
                  {/* Split button row */}
                  <div className="flex rounded-xl overflow-hidden border-2 border-border">
                    {/* Left: Friends label — non-clickable */}
                    <div className="flex flex-1 items-center justify-center gap-1.5 px-4 py-2 bg-background select-none">
                      <Users className="w-4 h-4 text-primary" />
                      <span className="font-semibold text-sm">Friends</span>
                    </div>
                    {/* Divider */}
                    <div className="w-px bg-border" />
                    {/* Right: chevron trigger */}
                    <button
                      onClick={() => setFriendsMenuOpen((o) => !o)}
                      className="flex items-center justify-center px-3 py-2 bg-background hover:bg-accent transition-colors"
                      aria-label="Friends options"
                    >
                      <ChevronDown
                        className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${
                          friendsMenuOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                  </div>

                  {/* Dropdown panel */}
                  {friendsMenuOpen && (
                    <div className="absolute left-0 right-0 mt-1.5 z-20 rounded-xl border border-border bg-card shadow-xl overflow-hidden">
                      <button
                        className="flex w-full items-center gap-3 px-4 py-3 text-sm font-semibold text-red-500 hover:bg-red-500/10 active:bg-red-500/20 transition-colors"
                        onClick={() => {
                          setFriendsMenuOpen(false);
                          setUnfollowDialogOpen(true);
                        }}
                      >
                        <UserMinus className="w-4 h-4 shrink-0" />
                        Unfollow
                      </button>
                    </div>
                  )}
                </div>
              )}

              <Button variant="outline" className="flex-1 font-semibold">
                Mention
              </Button>
              <Button variant="outline" size="sm" className="px-3">
                <Share className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Tabs Threads / Replies / Reposts */}
      <Tabs defaultValue="threads" className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-12 bg-transparent border-b border-border rounded-none">
          <TabsTrigger
            value="threads"
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
          >
            Threads
          </TabsTrigger>
          <TabsTrigger
            value="reposts"
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
          >
            Reposts
          </TabsTrigger>
        </TabsList>

        {/* Tab Threads */}
        <TabsContent value="threads" className="mt-0">
          {(isOwnProfile && loadingMyPosts) || (!isOwnProfile && loadingOther) ? (
            <div className="p-8 text-center text-muted-foreground">
              Đang tải threads...
            </div>
          ) : postsToRender?.length > 0 ? (
            <div>
              {postsToRender.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onProfileClick={handleProfileClick}
                  onPostClick={handleOpenPost}
                />
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              No threads yet
            </div>
          )}
        </TabsContent>

        {/* Tab Replies */}
        <TabsContent value="replies" className="mt-0">
          <div className="p-8 text-center text-muted-foreground">
            No replies yet
          </div>
        </TabsContent>

        {/* Tab Reposts */}
        <TabsContent value="reposts" className="mt-0">
          {(isOwnProfile && loadingMyReposts) || (!isOwnProfile && loadingUserReposts) ? (
            <div className="p-8 text-center text-muted-foreground">
              Đang tải reposts...
            </div>
          ) : repostsToRender?.length > 0 ? (
            <div>
              {repostsToRender.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onProfileClick={handleProfileClick}
                  onPostClick={handleOpenPost}
                />
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              No reposts yet
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ImageViewer để xem ảnh đại diện */}
      <ImageViewer
        open={avatarViewerOpen}
        onClose={() => setAvatarViewerOpen(false)}
        mediaList={[{ mediaUrl: user?.avatar, mediaType: "image" }]}
        index={0}
      />

      {/* Dialog Edit Profile riêng */}
      <EditProfileDialog open={editOpen} onOpenChange={setEditOpen} />

      {/* Unfollow confirmation dialog */}
      <AlertDialog open={unfollowDialogOpen} onOpenChange={setUnfollowDialogOpen}>
        <AlertDialogContent className="w-fit min-w-[200px] rounded-2xl p-0 overflow-hidden gap-0">
          {/* Header — avatar + name */}
          <div className="flex flex-col items-center gap-2 px-4 pt-4 pb-3">
            <Avatar style={{ width: 48, height: 48, minWidth: 48, minHeight: 48 }} className="shrink-0 ring-2 ring-border">
              <AvatarImage src={user?.avatar} alt={user?.displayName} style={{ objectFit: "cover" }} />
              <AvatarFallback className="text-base">{user?.displayName?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="text-center">
              <p className="font-semibold text-base">{user?.displayName}</p>
              <p className="text-sm text-muted-foreground">@{user?.username}</p>
            </div>
            <p className="text-sm text-muted-foreground text-center leading-relaxed">
              {isFriend
                ? "You will no longer be friends. They will still follow you."
                : "You will stop following this account."}
            </p>
          </div>

          {/* Divider */}
          <div className="h-px bg-border" />

          {/* Actions */}
          <div className="flex flex-col">
            <AlertDialogAction
              className="rounded-none h-11 text-base font-semibold text-red-500 bg-transparent hover:bg-red-500/10 active:bg-red-500/15 transition-colors border-0 shadow-none"
              onClick={handleUnfollow}
            >
              Unfollow
            </AlertDialogAction>
            <div className="h-px bg-border" />
            <AlertDialogCancel className="rounded-none h-11 text-base font-medium bg-transparent hover:bg-accent border-0 shadow-none mt-0">
              Cancel
            </AlertDialogCancel>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
