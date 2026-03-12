import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

import { Button } from "../../components/ui/button.js";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar.js";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs.js";
import { MoreHorizontal, Share, Verified, ArrowLeft } from "lucide-react";
import { PostCard } from "../../components/PostCard/PostCard.jsx";
import { ImageViewer } from "../../components/ImageViewer/ImageViewer.jsx";

import {
  fetchMyPosts,
  selectMyPosts,
  selectMyPostsLoading,
  fetchUserPosts,
  selectUserPosts,
  selectUserPostsLoading,

  fetchMyReposts,
  fetchUserReposts,
  selectMyReposts,
  selectMyRepostsLoading,
  selectUserReposts,
  selectUserRepostsLoading,
} from "../../store/postsSlice";

import postApi from "../../api/postApi";
import followApi from "../../api/followApi";
import { EditProfileDialog } from "./EditProfileDialog.jsx";

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

  // State tạm cho nút Follow (UI demo, chưa nối BE)
  const [isFollowing, setIsFollowing] = useState(false);
  const otherPosts = useSelector(selectUserPosts);
  const loadingOther = useSelector(selectUserPostsLoading);

  // mở avatar bằng ImageViewer
  const [avatarViewerOpen, setAvatarViewerOpen] = useState(false);

  // mở dialog Edit profile
  const [editOpen, setEditOpen] = useState(false);
  const isOwnProfile = !cleanUsername || cleanUsername === profile.userName;
  const user = isOwnProfile
    ? {
        id: profile.id,
        displayName: profile.fullName ?? "Unknown",
        username: profile.userName ?? "unknown",
        bio: profile.bio ?? "",
        avatar: profile.avatarUrl ?? "/default-avatar.png",
        followers: profile.followersCount ?? 0,
        following: profile.followingCount ?? 0,
        verified: profile.verified ?? false,
      }
    : otherProfile
    ? {
        id: otherProfile.id,
        displayName: otherProfile.fullName ?? "Unknown",
        username: otherProfile.userName ?? "unknown",
        bio: otherProfile.bio ?? "",
        avatar: otherProfile.avatarUrl ?? "/default-avatar.png",
        followers: otherProfile.followersCount ?? 0,
        following: otherProfile.followingCount ?? 0,
        verified: otherProfile.verified ?? false,
      }
    : null;

  // LẤY BÀI VIẾT + PROFILE
  useEffect(() => {
  if (isOwnProfile) {
    dispatch(fetchMyPosts());
    dispatch(fetchMyReposts()); // ✅ thêm lại
    return;
  }

  if (!cleanUsername) return;

  (async () => {
    try {
      dispatch(fetchUserPosts({ username: cleanUsername }));
      dispatch(fetchUserReposts({ username: cleanUsername })); // ✅ nếu muốn xem repost user khác

      const userRes = await postApi.getUserByUsername(cleanUsername);
      const followingUser = userRes?.result;
      setOtherProfile(followingUser);

      if (followingUser?.id) {
        const followStatusRes = await followApi.checkFollowing(followingUser.id);
        setIsFollowing(!!followStatusRes?.isFollowingValue);
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

 // Format số follower/following cho đẹp (1.2K, 3.4M,...)
  const formatNumber = (num) => {
    if (!num) return 0;
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
    if (num >= 1_000) return (num / 1_000).toFixed(1) + "K";
    return num.toString();
  };

  // Toggle Follow/Following
  const handleFollow = useCallback(async () => {
    if (!user?.id) return;

    // Tối ưu UI: cập nhật trạng thái ngay lập tức
    const newFollowingStatus = !isFollowing;
    setIsFollowing(newFollowingStatus);

    // Tối ưu UI: cập nhật số lượng follower
    // Tăng/giảm số follower trong state tạm otherProfile
    setOtherProfile((prev) => {
        if (!prev) return null;
        const count = prev.followersCount ?? 0;
        return {
            ...prev,
            followersCount: newFollowingStatus ? count + 1 : count - 1
        };
    });

    try {
      // Gọi API toggle
      const res = await followApi.toggleFollow(user.id);
      
      // Nếu API thành công, trạng thái UI đã đúng.
      // Nếu API thất bại, đảo ngược lại trạng thái UI/số lượng
      if (!res.success) {
        throw new Error(res.message || "Failed to toggle follow");
      }
      
    } catch (error) {
      console.error("Error toggling follow:", error);
      // Đảo ngược lại trạng thái (rollback)
      setIsFollowing(!newFollowingStatus); 
      setOtherProfile((prev) => {
        if (!prev) return null;
        const count = prev.followersCount ?? 0;
        return {
            ...prev,
            followersCount: !newFollowingStatus ? count + 1 : count - 1
        };
      });
      // TODO: Thêm toast/thông báo lỗi cho người dùng
    }
  }, [isFollowing, user?.id]);

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
  const handleOpenPost = (id) => {
    if (!id) return;
    navigate(`/post/${id}`);
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
            <p className="mb-4">{user?.bio}</p>
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
        <div className="flex items-center gap-6 mb-6">
          <button className="hover:underline">
            <span className="font-semibold">
              {formatNumber(user?.followers)}
            </span>
            <span className="text-muted-foreground ml-1">followers</span>
          </button>
          <button className="hover:underline">
            <span className="font-semibold">
              {formatNumber(user?.following)}
            </span>
            <span className="text-muted-foreground ml-1">following</span>
          </button>
        </div>

        {/* Nút action: nếu là mình -> Edit/Share, nếu là người khác -> Follow/Mention/... */}
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
              <Button
                onClick={handleFollow}
                className="flex-1"
                variant={isFollowing ? "outline" : "default"}
              >
                {isFollowing ? "Following" : "Follow"}
              </Button>
              <Button variant="outline" className="flex-1">
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
    </div>
  );
}
