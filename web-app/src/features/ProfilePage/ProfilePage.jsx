import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

import { Button } from "../../components/ui/button.js";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar.js";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs.js";
import { MoreHorizontal, Share, Verified, ArrowLeft, ChevronDown, UserMinus, Users, UserCheck, BookOpen, UserCircle } from "lucide-react";
import { PostCard } from "../../components/PostCard/PostCard.jsx";
import { ImageViewer } from "../../components/ImageViewer/ImageViewer.jsx";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, } from "../../components/ui/alert-dialog.js";
import { fetchMyPosts, selectMyPosts, selectMyPostsLoading, fetchUserPosts, selectUserPosts, selectUserPostsLoading, fetchMyReposts, fetchUserReposts, selectMyReposts, selectMyRepostsLoading, selectUserReposts, selectUserRepostsLoading, } from "../../store/postsSlice";
import { fetchMyInfo, selectUser } from "../../store/userSlice";
import { fetchMyStories, selectMyStories } from "../../store/storySlice";
import postApi from "../../api/postApi";
import followApi from "../../api/followApi";
import storyApi from "../../api/storyApi";
import userApi from "../../api/userApi";
import { EditProfileDialog } from "./EditProfileDialog.jsx";
import SpotifyView from "../../components/SpotifySection/SpotifyView";
import StoryViewer from "../../components/Story/StoryViewer";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export function ProfilePage() {
  const { username: rawUsername } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
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

  // story của user đang xem profile
  const [userStories, setUserStories] = useState([]);
  const [storyViewerOpen, setStoryViewerOpen] = useState(false);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const avatarMenuRef = useRef(null);

  // story của chính mình
  const myStories = useSelector(selectMyStories);

  // mở dialog Edit profile
  const [editOpen, setEditOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("threads");

  const [blockedUsers, setBlockedUsers] = useState([]);
  const [isBlocked, setIsBlocked] = useState(false); // am I blocking this user
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  
  // MoreMenu
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef(null);

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
    setActiveTab("threads");
    if (isOwnProfile) {
      dispatch(fetchMyPosts());
      dispatch(fetchMyReposts());
      dispatch(fetchMyStories());
      dispatch(fetchMyInfo()); // refresh follower/following count
      userApi.getBlockedUsers().then(res => setBlockedUsers(res.result || [])).catch(() => {});
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

          // Check if blocked
          userApi.getBlockedUsers().then(res => {
            const blocked = res.result || [];
            setIsBlocked(blocked.includes(followingUser.userId));
          }).catch(() => {});
        }
      } catch (err) {
        console.error("Error loading profile:", err);
      }
    })();
  }, [dispatch, isOwnProfile, cleanUsername, location.key]);



  // Fetch story công khai của user khi xem profile người khác
  useEffect(() => {
    if (isOwnProfile || !otherProfile?.userId) {
      setUserStories([]);
      return;
    }
    storyApi.getUserStories(otherProfile.userId)
      .then((res) => {
        const stories = res?.result || [];
        console.log("[ProfilePage] userStories fetched:", stories.length, stories);
        setUserStories(stories);
      })
      .catch((err) => {
        console.error("[ProfilePage] getUserStories error:", err);
        setUserStories([]);
      });
  }, [isOwnProfile, otherProfile?.userId]);

  useEffect(() => {
    if (!avatarMenuOpen) return;
    const handleClickOutside = (e) => {
      if (avatarMenuRef.current && !avatarMenuRef.current.contains(e.target)) {
        setAvatarMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [avatarMenuOpen]);

  // Hàm khi click vào avatar/username trong PostCard
  const handleProfileClick = (username) => {
    navigate(`/profile/@${username}`);
  };

  // Back lại feed
  const handleBack = () => {
    // Có history trong cùng SPA → lùi 1 bước
    if (location.key !== "default") {
      navigate(-1);
    } else {
      // Mở tab mới / vào thẳng URL profile → fallback về feed
      navigate("/feed");
    }
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

  // Close more menu when clicking outside
  useEffect(() => {
    if (!moreMenuOpen) return;
    const handleClickOutside = (e) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target)) {
        setMoreMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [moreMenuOpen]);

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

  const handleBlockUser = async () => {
    if (!user?.userId) return;
    try {
      await userApi.blockUser(user.userId);
      setIsBlocked(true);
      setIsFollowing(false);
      setIsFriend(false);
      setBlockDialogOpen(false);
      toast.success("Đã chặn người dùng này");
    } catch (err) {
      toast.error("Lỗi khi chặn");
    }
  };

  const handleUnblockUser = async () => {
    if (!user?.userId) return;
    try {
      await userApi.unblockUser(user.userId);
      setIsBlocked(false);
      toast.success("Đã bỏ chặn người dùng này");
    } catch (err) {
      toast.error("Lỗi khi bỏ chặn");
    }
  };

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
    <div className="max-w-2xl mx-auto relative min-h-screen">
      {/* Decorative Glow Blobs */}
      <div className="absolute top-[-5%] left-[-15%] w-[350px] h-[350px] rounded-full bg-violet-500/8 blur-[100px] pointer-events-none -z-10" />
      <div className="absolute top-[25%] right-[-15%] w-[300px] h-[300px] rounded-full bg-cyan-500/8 blur-[90px] pointer-events-none -z-10" />

      {/* Header cố định trên cùng */}
      <div className="border-b border-border/20 p-4 bg-background/40 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleBack}
            className="p-2 rounded-xl hover:bg-muted/30 transition-colors cursor-pointer text-foreground flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 stroke-[1.8]" />
          </motion.button>
          <div className="flex-1">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">{user?.displayName}</h2>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">
              {postsToRender?.length || 0} threads
            </p>
          </div>
          <div className="relative" ref={moreMenuRef}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setMoreMenuOpen(!moreMenuOpen)}
              className="p-2 rounded-xl hover:bg-muted/30 transition-colors cursor-pointer text-foreground flex items-center justify-center"
            >
              <MoreHorizontal className="w-5 h-5 stroke-[1.8]" />
            </motion.button>
            <AnimatePresence>
              {moreMenuOpen && !isOwnProfile && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.97 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className="absolute right-0 mt-1.5 w-40 z-30 rounded-2xl border border-border/40 bg-card/95 shadow-xl backdrop-blur-md p-1"
                >
                  {isBlocked ? (
                    <button
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-sm font-semibold text-foreground hover:bg-muted/30 active:bg-muted/40 rounded-xl transition-colors cursor-pointer text-left"
                      onClick={() => {
                        setMoreMenuOpen(false);
                        handleUnblockUser();
                      }}
                    >
                      <UserCheck className="w-4.5 h-4.5 stroke-[1.5] shrink-0" />
                      <span>Unblock</span>
                    </button>
                  ) : (
                    <button
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-sm font-semibold text-red-500 hover:bg-red-500/10 active:bg-red-500/20 rounded-xl transition-colors cursor-pointer text-left"
                      onClick={() => {
                        setMoreMenuOpen(false);
                        setBlockDialogOpen(true);
                      }}
                    >
                      <UserMinus className="w-4.5 h-4.5 stroke-[1.5] shrink-0" />
                      <span>Block</span>
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Phần info profile (avatar, name, bio, stats, nút ...) */}
      <div className="">
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
          {/* Avatar — có vòng gradient nếu có story */}
          <div ref={avatarMenuRef} className="relative ml-4">
            {(() => {
              const hasStory = isOwnProfile
                ? myStories.length > 0
                : userStories.length > 0;

              const handleAvatarClick = () => {
                if (hasStory) {
                  setAvatarMenuOpen((o) => !o);
                } else if (user?.avatar) {
                  setAvatarViewerOpen(true);
                }
              };

              return (
                <button
                  className="p-0 rounded-full cursor-pointer hover:opacity-80 transition"
                  onClick={handleAvatarClick}
                  title={hasStory ? "Xem tin" : "Xem ảnh đại diện"}
                >
                  {hasStory ? (
                    <div
                      className="rounded-full p-[3px]"
                      style={{ background: "linear-gradient(to top right, #f9ce34, #ee2a7b, #6228d7)" }}
                    >
                      <div className="rounded-full p-[2px] bg-background">
                        <Avatar className="w-20 h-20">
                          <AvatarImage
                            src={user?.avatar || "/default-avatar.png"}
                            alt={user?.displayName}
                            style={{ objectFit: "cover" }}
                            onError={(e) => { e.currentTarget.src = "/default-avatar.png"; }}
                          />
                          <AvatarFallback className="text-2xl">
                            {user?.displayName?.charAt(0) || "U"}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    </div>
                  ) : (
                    <Avatar className="w-20 h-20">
                      <AvatarImage
                        src={user?.avatar || "/default-avatar.png"}
                        alt={user?.displayName}
                        style={{ objectFit: "cover" }}
                        onError={(e) => { e.currentTarget.src = "/default-avatar.png"; }}
                      />
                      <AvatarFallback className="text-2xl">
                        {user?.displayName?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </button>
              );
            })()}

            {/* Dropdown: Xem tin / Xem ảnh đại diện */}
            <AnimatePresence>
              {avatarMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.97 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className="absolute right-0 top-full mt-2 z-30 w-52 rounded-2xl border border-border/40 bg-card/90 backdrop-blur-md shadow-xl overflow-hidden p-1"
                >
                  <button
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-sm font-semibold text-foreground hover:bg-muted/50 rounded-xl transition-all duration-200 cursor-pointer text-left"
                    onClick={() => { setAvatarMenuOpen(false); setStoryViewerOpen(true); }}
                  >
                    <BookOpen className="w-5 h-5 stroke-[1.5] text-muted-foreground shrink-0" />
                    <span>Xem tin</span>
                  </button>
                  <button
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-sm font-semibold text-foreground hover:bg-muted/50 rounded-xl transition-all duration-200 cursor-pointer text-left"
                    onClick={() => { setAvatarMenuOpen(false); if (user?.avatar) setAvatarViewerOpen(true); }}
                  >
                    <UserCircle className="w-5 h-5 stroke-[1.5] text-muted-foreground shrink-0" />
                    <span>Xem ảnh đại diện</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Stats followers / following */}
        {(() => {
          const privacy = isOwnProfile
            ? "EVERYONE"
            : (otherProfile?.connectionsPrivacy ?? "EVERYONE");
          const canView = isOwnProfile
            || privacy === "EVERYONE"
            || (privacy === "FRIENDS_ONLY" && isFriend);

          const handleFollowersClick = () => {
            if (!canView) {
              toast.error("This list is hidden due to this user's privacy settings.");
              return;
            }
            navigate(`/connections/@${user?.username}?tab=followers`);
          };
          const handleFollowingClick = () => {
            if (!canView) {
              toast.error("This list is hidden due to this user's privacy settings.");
              return;
            }
            navigate(`/connections/@${user?.username}?tab=following`);
          };

          return (
            <div className="flex items-center gap-3 mb-4">
              <motion.button
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
                className="flex-1 flex items-center justify-between gap-3 rounded-2xl border border-border/40 bg-muted/10 px-5 py-3.5 hover:bg-muted/20 hover:border-border/60 transition-all duration-300 cursor-pointer shadow-sm backdrop-blur-sm text-left group"
                onClick={handleFollowersClick}
              >
                <div className="flex flex-col">
                  <span className="text-xl font-bold tracking-tight text-foreground leading-none">{formatNumber(user?.followers)}</span>
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mt-1.5">Followers</span>
                </div>
                <div className="bg-muted/30 p-2 rounded-xl border border-border/20 text-muted-foreground group-hover:text-foreground transition-colors shrink-0">
                  <Users className="w-5 h-5 stroke-[1.5]" />
                </div>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
                className="flex-1 flex items-center justify-between gap-3 rounded-2xl border border-border/40 bg-muted/10 px-5 py-3.5 hover:bg-muted/20 hover:border-border/60 transition-all duration-300 cursor-pointer shadow-sm backdrop-blur-sm text-left group"
                onClick={handleFollowingClick}
              >
                <div className="flex flex-col">
                  <span className="text-xl font-bold tracking-tight text-foreground leading-none">{formatNumber(user?.following)}</span>
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mt-1.5">Following</span>
                </div>
                <div className="bg-muted/30 p-2 rounded-xl border border-border/20 text-muted-foreground group-hover:text-foreground transition-colors shrink-0">
                  <UserCheck className="w-5 h-5 stroke-[1.5]" />
                </div>
              </motion.button>
            </div>
          );
        })()}
        {/* Nút action: nếu là mình -> Edit/Share, nếu là người khác -> Follow/Friends/... */}
        <div className="flex gap-3 mb-4">
          {isOwnProfile ? (
            <motion.button
              whileHover={{ scale: 1.01, y: -0.5 }}
              whileTap={{ scale: 0.99 }}
              className="w-full flex items-center justify-center font-semibold text-sm rounded-2xl border border-border/40 bg-muted/10 hover:bg-muted/20 hover:border-border/60 transition-all duration-300 cursor-pointer h-10.5 shadow-sm text-foreground backdrop-blur-sm"
              onClick={() => setEditOpen(true)}
            >
              Edit profile
            </motion.button>
          ) : (
            <>
              {/* ── Not following ── */}
              {!isFollowing && (
                <motion.button
                  whileHover={{ scale: 1.02, y: -0.5 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleFollow}
                  className="flex-1 flex items-center justify-center font-semibold text-sm rounded-2xl bg-foreground text-background hover:opacity-90 transition-all duration-300 cursor-pointer h-10.5 shadow-sm"
                >
                  Follow
                </motion.button>
              )}

              {/* ── Following, not mutual ── */}
              {isFollowing && !isFriend && (
                <motion.button
                  whileHover={{ scale: 1.02, y: -0.5 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setUnfollowDialogOpen(true)}
                  className="flex-1 flex items-center justify-center font-semibold text-sm rounded-2xl border border-border/40 bg-muted/10 hover:bg-muted/20 hover:border-border/60 transition-all duration-300 cursor-pointer h-10.5 shadow-sm text-foreground backdrop-blur-sm"
                >
                  Following
                </motion.button>
              )}

              {/* ── Mutual → Friends split-button ── */}
              {isFriend && (
                <div ref={friendsMenuRef} className="relative flex-1">
                  {/* Split button row */}
                  <div className="flex rounded-2xl overflow-hidden border border-border/40 bg-muted/10 backdrop-blur-sm h-10.5 shadow-sm hover:border-border/60 transition-all duration-300">
                    {/* Left: Friends label — non-clickable */}
                    <div className="flex flex-1 items-center justify-center gap-1.5 px-4 select-none">
                      <Users className="w-4 h-4 text-foreground stroke-[1.5]" />
                      <span className="font-semibold text-sm text-foreground">Friends</span>
                    </div>
                    {/* Divider */}
                    <div className="w-px bg-border/40" />
                    {/* Right: chevron trigger */}
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setFriendsMenuOpen((o) => !o)}
                      className="flex items-center justify-center px-3 hover:bg-muted/20 transition-colors cursor-pointer"
                      aria-label="Friends options"
                    >
                      <ChevronDown
                        className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${friendsMenuOpen ? "rotate-180" : ""
                          }`}
                      />
                    </motion.button>
                  </div>

                  {/* Dropdown panel */}
                  <AnimatePresence>
                    {friendsMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.97 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        className="absolute left-0 right-0 mt-1.5 z-20 rounded-2xl border border-border/40 bg-card/95 shadow-xl backdrop-blur-md p-1"
                      >
                        <button
                          className="flex w-full items-center gap-3 px-3 py-2.5 text-sm font-semibold text-red-500 hover:bg-red-500/10 active:bg-red-500/20 rounded-xl transition-colors cursor-pointer text-left"
                          onClick={() => {
                            setFriendsMenuOpen(false);
                            setUnfollowDialogOpen(true);
                          }}
                        >
                          <UserMinus className="w-4.5 h-4.5 stroke-[1.5] shrink-0" />
                          <span>Unfollow</span>
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}


              <motion.button
                whileHover={{ scale: 1.02, y: -0.5 }}
                whileTap={{ scale: 0.98 }}
                className="flex-1 flex items-center justify-center font-semibold text-sm rounded-2xl border border-border/40 bg-muted/10 hover:bg-muted/20 hover:border-border/60 transition-all duration-300 cursor-pointer h-10.5 shadow-sm text-foreground backdrop-blur-sm"
              >
                Mention
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02, y: -0.5 }}
                whileTap={{ scale: 0.98 }}
                className="px-3.5 rounded-2xl border border-border/40 bg-muted/10 hover:bg-muted/20 hover:border-border/60 transition-all duration-300 cursor-pointer h-10.5 shadow-sm text-foreground backdrop-blur-sm flex items-center justify-center shrink-0"
              >
                <Share className="w-4 h-4 stroke-[1.5]" />
              </motion.button>
            </>
          )}
        </div>

        <SpotifyView url={isOwnProfile ? profile.spotifyLink : otherProfile?.spotifyLink} />
      </div>

      {/* Tabs Threads / Replies / Reposts */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex justify-center w-full border-b border-border/40 py-3 bg-background/50 backdrop-blur-sm sticky top-14 md:top-0 z-10">
          <TabsList className={`bg-muted/40 border border-border/40 rounded-full p-1 h-10 w-full max-w-[320px] grid ${isOwnProfile ? 'grid-cols-3' : 'grid-cols-2'} relative overflow-hidden`}>
            <TabsTrigger
              value="threads"
              className="relative z-10 rounded-full text-xs font-semibold h-full transition-colors duration-300 select-none bg-transparent border-none data-[state=active]:text-background dark:data-[state=active]:text-background text-muted-foreground data-[state=active]:bg-transparent dark:data-[state=active]:bg-transparent data-[state=active]:shadow-none cursor-pointer"
            >
              Threads
              {activeTab === "threads" && (
                <motion.div
                  layoutId="profileActiveTabIndicator"
                  className="absolute inset-1 bg-foreground rounded-full shadow-sm -z-10"
                  transition={{ type: "spring", stiffness: 350, damping: 28 }}
                />
              )}
            </TabsTrigger>
            <TabsTrigger
              value="reposts"
              className="relative z-10 rounded-full text-xs font-semibold h-full transition-colors duration-300 select-none bg-transparent border-none data-[state=active]:text-background dark:data-[state=active]:text-background text-muted-foreground data-[state=active]:bg-transparent dark:data-[state=active]:bg-transparent data-[state=active]:shadow-none cursor-pointer"
            >
              Reposts
              {activeTab === "reposts" && (
                <motion.div
                  layoutId="profileActiveTabIndicator"
                  className="absolute inset-1 bg-foreground rounded-full shadow-sm -z-10"
                  transition={{ type: "spring", stiffness: 350, damping: 28 }}
                />
              )}
            </TabsTrigger>
            {isOwnProfile && (
              <TabsTrigger
                value="blocked"
                className="relative z-10 rounded-full text-xs font-semibold h-full transition-colors duration-300 select-none bg-transparent border-none data-[state=active]:text-background dark:data-[state=active]:text-background text-muted-foreground data-[state=active]:bg-transparent dark:data-[state=active]:bg-transparent data-[state=active]:shadow-none cursor-pointer"
              >
                Blocked
                {activeTab === "blocked" && (
                  <motion.div
                    layoutId="profileActiveTabIndicator"
                    className="absolute inset-1 bg-foreground rounded-full shadow-sm -z-10"
                    transition={{ type: "spring", stiffness: 350, damping: 28 }}
                  />
                )}
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        {isBlocked ? (
          <div className="p-8 text-center text-muted-foreground">
            Bạn đã chặn người dùng này
          </div>
        ) : (
          <>
            {/* Tab Threads */}
            <TabsContent value="threads" className="mt-0">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
              >
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
              </motion.div>
            </TabsContent>

            {/* Tab Replies */}
            <TabsContent value="replies" className="mt-0">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
              >
                <div className="p-8 text-center text-muted-foreground">
                  No replies yet
                </div>
              </motion.div>
            </TabsContent>

            {/* Tab Reposts */}
            <TabsContent value="reposts" className="mt-0">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
              >
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
              </motion.div>
            </TabsContent>

        {/* Tab Blocked */}
        {isOwnProfile && (
          <TabsContent value="blocked" className="mt-0">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              <div className="p-4">
                 {blockedUsers.length > 0 ? (
                   <div className="space-y-4">
                     {blockedUsers.map(blockedUser => (
                       <div key={blockedUser.userId} className="p-4 rounded-xl border border-border/40 bg-card/50 flex justify-between items-center gap-4">
                         <div className="flex items-center gap-3" onClick={() => handleProfileClick(blockedUser.username)} style={{cursor: 'pointer'}}>
                            <Avatar className="w-10 h-10 ring-1 ring-border/20">
                              <AvatarImage src={blockedUser.avatarUrl} style={{ objectFit: 'cover' }} />
                              <AvatarFallback>{blockedUser.fullName?.charAt(0) || blockedUser.username?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="font-semibold text-sm hover:underline">{blockedUser.fullName || blockedUser.username}</span>
                              <span className="text-xs text-muted-foreground">@{blockedUser.username}</span>
                            </div>
                         </div>
                         <Button variant="outline" size="sm" onClick={async () => {
                           try {
                             await userApi.unblockUser(blockedUser.userId);
                             setBlockedUsers(prev => prev.filter(u => u.userId !== blockedUser.userId));
                             toast.success("Đã bỏ chặn người dùng");
                           } catch(err) {
                             toast.error("Lỗi bỏ chặn");
                           }
                         }}>Unblock</Button>
                       </div>
                     ))}
                   </div>
                 ) : (
                   <div className="text-center text-muted-foreground">Chưa chặn ai</div>
                 )}
              </div>
            </motion.div>
          </TabsContent>
        )}
          </>
        )}
      </Tabs>

      {/* ImageViewer để xem ảnh đại diện */}
      <ImageViewer
        open={avatarViewerOpen}
        onClose={() => setAvatarViewerOpen(false)}
        mediaList={[{ mediaUrl: user?.avatar, mediaType: "image" }]}
        index={0}
      />

      {/* StoryViewer — xem story của user */}
      {storyViewerOpen && (isOwnProfile ? myStories.length > 0 : userStories.length > 0) && (
        <StoryViewer
          groups={[{
            userId: user?.userId,
            fullName: user?.displayName,
            avatarUrl: user?.avatar,
            stories: isOwnProfile ? myStories : userStories,
          }]}
          startIndex={0}
          onClose={() => setStoryViewerOpen(false)}
        />
      )}

      {/* Dialog Edit Profile riêng */}
      <EditProfileDialog open={editOpen} onOpenChange={setEditOpen} />

      <AlertDialog open={unfollowDialogOpen} onOpenChange={setUnfollowDialogOpen}>
        <AlertDialogContent className="w-fit min-w-[280px] rounded-3xl p-0 overflow-hidden gap-0 bg-card/75 backdrop-blur-xl border border-border/40 shadow-2xl text-foreground">
          <AlertDialogTitle className="sr-only">Unfollow</AlertDialogTitle>
          <AlertDialogDescription className="sr-only">Confirm unfollow action</AlertDialogDescription>
          {/* Header — avatar + name */}
          <div className="flex flex-col items-center gap-3 px-6 pt-6 pb-4">
            <Avatar style={{ width: 56, height: 56, minWidth: 56, minHeight: 56 }} className="shrink-0 ring-2 ring-border/20">
              <AvatarImage src={user?.avatar} alt={user?.displayName} style={{ objectFit: "cover" }} />
              <AvatarFallback className="text-base">{user?.displayName?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="text-center">
              <p className="font-bold text-base leading-snug">{user?.displayName}</p>
              <p className="text-xs text-muted-foreground mt-0.5">@{user?.username}</p>
            </div>
            <p className="text-xs text-muted-foreground text-center leading-relaxed max-w-[220px] mt-1">
              {isFriend
                ? "You will no longer be friends. They will still follow you."
                : "You will stop following this account."}
            </p>
          </div>

          {/* Divider */}
          <div className="h-px bg-border/20" />

          {/* Actions */}
          <div className="flex flex-col">
            <AlertDialogAction
              className="rounded-none h-12 text-sm font-bold text-red-500 bg-transparent hover:bg-red-500/10 active:bg-red-500/15 transition-colors border-0 shadow-none cursor-pointer"
              onClick={handleUnfollow}
            >
              Unfollow
            </AlertDialogAction>
            <div className="h-px bg-border/20" />
            <AlertDialogCancel className="rounded-none h-12 text-sm font-semibold text-foreground bg-transparent hover:bg-muted/30 border-0 shadow-none mt-0 cursor-pointer">
              Cancel
            </AlertDialogCancel>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
        <AlertDialogContent className="w-fit min-w-[280px] rounded-3xl p-0 overflow-hidden gap-0 bg-card/75 backdrop-blur-xl border border-border/40 shadow-2xl text-foreground">
          <AlertDialogTitle className="sr-only">Block User</AlertDialogTitle>
          <AlertDialogDescription className="sr-only">Confirm block action</AlertDialogDescription>
          {/* Header — avatar + name */}
          <div className="flex flex-col items-center gap-3 px-6 pt-6 pb-4">
            <Avatar style={{ width: 56, height: 56, minWidth: 56, minHeight: 56 }} className="shrink-0 ring-2 ring-border/20">
              <AvatarImage src={user?.avatar} alt={user?.displayName} style={{ objectFit: "cover" }} />
              <AvatarFallback className="text-base">{user?.displayName?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="text-center">
              <p className="font-bold text-base leading-snug">{user?.displayName}</p>
              <p className="text-xs text-muted-foreground mt-0.5">@{user?.username}</p>
            </div>
            <p className="text-xs text-muted-foreground text-center leading-relaxed max-w-[220px] mt-1">
              Họ sẽ không thể tìm thấy trang cá nhân, bài viết hay xem người theo dõi của bạn. Bạn cũng sẽ không thể thấy nội dung của họ.
            </p>
          </div>

          {/* Divider */}
          <div className="h-px bg-border/20" />

          {/* Actions */}
          <div className="flex flex-col">
            <AlertDialogAction
              className="rounded-none h-12 text-sm font-bold text-red-500 bg-transparent hover:bg-red-500/10 active:bg-red-500/15 transition-colors border-0 shadow-none cursor-pointer"
              onClick={handleBlockUser}
            >
              Chặn
            </AlertDialogAction>
            <div className="h-px bg-border/20" />
            <AlertDialogCancel className="rounded-none h-12 text-sm font-semibold text-foreground bg-transparent hover:bg-muted/30 border-0 shadow-none mt-0 cursor-pointer">
              Hủy
            </AlertDialogCancel>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
