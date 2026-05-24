import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { markUserFollowed } from "../../store/notificationsSlice";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "../ui/hover-card";
import { Avatar, AvatarImage, AvatarFallback } from "../ui/avatar";
import { Button } from "../ui/button";
import { Skeleton } from "../ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "../ui/alert-dialog";
import followApi from "../../api/followApi";
import postApi from "../../api/postApi";
import { toast } from "sonner";

export function UserHoverCard({ username, children }) {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const currentProfile = useSelector((s) => s.user.profile) ?? {};

  const [profile, setProfile] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFriend, setIsFriend] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [unfriendDialogOpen, setUnfriendDialogOpen] = useState(false);

  // Cache — tránh fetch lại khi hover nhiều lần
  const fetchedRef = useRef(false);

  const isOwnProfile = currentProfile.username === username;

  const handleOpenChange = (val) => {
    setOpen(val);
    if (val && !fetchedRef.current) {
      setFetching(true);
    }
  };

  useEffect(() => {
    if (!open || !username) return;
    // Đã fetch rồi thì không fetch lại
    if (fetchedRef.current) return;

    let cancelled = false;

    (async () => {
      try {
        const res = await postApi.getUserByUsername(username);
        const data = res?.result;
        console.log("[HoverCard] getUserByUsername response:", res);
        if (cancelled || !data) return;
        setProfile(data);

        if (data.userId && !isOwnProfile) {
          const statusRes = await followApi.getFollowStatus(data.userId);
          if (!cancelled) {
            setIsFollowing(!!statusRes?.isFollowing);
            setIsFriend(!!statusRes?.isFriend);
          }
        }
        fetchedRef.current = true;
      } catch {
        // silent
      } finally {
        if (!cancelled) setFetching(false);
      }
    })();

    return () => { cancelled = true; };
  }, [open, username, isOwnProfile]);

  const handleFollow = async () => {
    if (!profile?.userId || followLoading) return;
    setFollowLoading(true);
    try {
      const res = await followApi.toggleFollow(profile.userId);
      if (res?.success) {
        setIsFollowing(res.isFollowing);
        setIsFriend(res.isFriend);
        // Đồng bộ trạng thái follow vào notifications store
        dispatch(markUserFollowed({ userId: profile.userId, followed: !!res.isFollowing }));
        toast.success(res.isFriend ? `You and ${profile.fullName} are now friends!` : "Following successfully");
      }
    } catch {
      toast.error("Failed. Please try again.");
    } finally {
      setFollowLoading(false);
    }
  };

  const handleUnfollow = async () => {
    if (!profile?.userId || followLoading) return;
    setFollowLoading(true);
    try {
      const res = await followApi.toggleFollow(profile.userId);
      if (res?.success) {
        setIsFollowing(res.isFollowing);
        setIsFriend(res.isFriend);
        dispatch(markUserFollowed({ userId: profile.userId, followed: !!res.isFollowing }));
        toast.success("Unfollowed successfully");
      }
    } catch {
      toast.error("Failed. Please try again.");
    } finally {
      setFollowLoading(false);
    }
  };

  const goToProfile = () => navigate(`/profile/@${username}`);

  return (
    <>
    <HoverCard open={open} onOpenChange={handleOpenChange} openDelay={400} closeDelay={200}>
      <HoverCardTrigger asChild>
        {children}
      </HoverCardTrigger>

      <HoverCardContent
        className="w-72 p-4 bg-card border border-border rounded-2xl shadow-xl"
        side="top"
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        {fetching ? (
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="w-14 h-14 rounded-full shrink-0" />
            </div>
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-9 w-full rounded-xl" />
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex-1 min-w-0">
                <p
                  className="font-bold text-base leading-tight cursor-pointer hover:underline truncate"
                  onClick={goToProfile}
                >
                  {profile?.fullName ?? username}
                </p>
                <p className="text-sm text-muted-foreground truncate">@{username}</p>
              </div>
              <Avatar className="w-14 h-14 shrink-0 cursor-pointer" onClick={goToProfile}>
                <AvatarImage
                  src={profile?.avatarUrl}
                  style={{ objectFit: "cover" }}
                  onError={(e) => { e.currentTarget.src = "/default-avatar.png"; }}
                />
                <AvatarFallback className="text-lg">
                  {(profile?.fullName ?? username)?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>

            {profile?.bio && (
              <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{profile.bio}</p>
            )}

            <p className="text-sm text-muted-foreground mb-4">
              {(profile?.followerCount ?? 0).toLocaleString()} followers
            </p>

            {!isOwnProfile && (
              <Button
                className="w-full font-semibold"
                variant={isFollowing ? "outline" : "default"}
                onClick={isFriend ? () => setUnfriendDialogOpen(true) : isFollowing ? () => setUnfriendDialogOpen(true) : handleFollow}
                disabled={followLoading || !profile}
              >
                {isFriend ? "Friends" : isFollowing ? "Following" : "Follow"}
              </Button>
            )}
          </>
        )}
      </HoverCardContent>
    </HoverCard>

    {/* Confirm unfollow dialog */}
    <AlertDialog open={unfriendDialogOpen} onOpenChange={setUnfriendDialogOpen}>
      <AlertDialogContent
        className="w-fit min-w-[200px] rounded-2xl p-0 overflow-hidden gap-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center gap-2 px-4 pt-4 pb-3">
          <Avatar style={{ width: 48, height: 48, minWidth: 48, minHeight: 48 }} className="shrink-0 ring-2 ring-border">
            <AvatarImage src={profile?.avatarUrl} style={{ objectFit: "cover" }} />
            <AvatarFallback>{profile?.fullName?.[0]}</AvatarFallback>
          </Avatar>
          <div className="text-center">
            <p className="font-semibold text-base">{profile?.fullName}</p>
            <p className="text-sm text-muted-foreground">@{username}</p>
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
