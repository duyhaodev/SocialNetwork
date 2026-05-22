import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { X } from "lucide-react";
import { createPortal } from "react-dom";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import likeApi from "@/api/likeApi";
import followApi from "@/api/followApi";
import { toast } from "sonner";

function LikerRow({ u, currentUserId, onClose }) {
  const navigate = useNavigate();
  const isOwn = currentUserId && u.userId === currentUserId;
  const [following, setFollowing] = useState(u.isFollowing ?? false);
  const [loading, setLoading] = useState(false);

  const handleFollow = async (e) => {
    e.stopPropagation();
    if (!u.userId || loading) return;
    setLoading(true);
    try {
      const res = await followApi.toggleFollow(u.userId);
      if (res?.success) {
        setFollowing(res.isFollowing);
        toast.success(res.isFollowing ? "Followed Successfully" : "Unfollowed Successfully");
      }
    } catch {
      toast.error("Failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="flex items-center gap-3 px-4 py-2.5 hover:bg-accent/50 transition-colors cursor-pointer"
      onClick={() => { onClose(); navigate(`/profile/@${u.username}`); }}
    >
      <Avatar className="w-10 h-10 shrink-0">
        <AvatarImage
          src={u.avatarUrl}
          alt={u.fullName || u.username}
          style={{ objectFit: "cover" }}
          onError={(e) => { e.currentTarget.src = "/default-avatar.png"; }}
        />
        <AvatarFallback>
          {(u.fullName || u.username || "U").charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{u.fullName || u.username}</p>
        <p className="text-xs text-muted-foreground truncate">@{u.username}</p>
      </div>

      {!isOwn && (
        <Button
          size="sm"
          variant={following ? "outline" : "default"}
          className="shrink-0 h-8 px-4 text-xs font-semibold"
          disabled={loading}
          onClick={handleFollow}
        >
          {following ? "Following" : "Follow"}
        </Button>
      )}
    </div>
  );
}

export function LikersDialog({ open, onClose, postId }) {
  const currentUserId = useSelector((s) => s.user?.profile?.userId);
  const [likers, setLikers] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!postId) return;
    setLoading(true);
    try {
      const res = await likeApi.getPostLikers(postId, 50);
      setLikers(res?.likers ?? []);
    } catch {
      setLikers([]);
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    if (open) fetchAll();
    else setLikers([]);
  }, [open, fetchAll]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={(e) => { e.stopPropagation(); onClose(); }}
    >
      <div
        className="relative w-full max-w-sm mx-4 rounded-2xl bg-card border border-border shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-center relative px-4 py-3 border-b border-border">
          <h2 className="text-base font-semibold">Lượt thích</h2>
          <button
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-accent transition-colors"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* List */}
        <div className="overflow-y-auto max-h-[60vh] py-2 likers-scroll">
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Đang tải...</p>
          ) : likers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Chưa có ai</p>
          ) : (
            likers.map((u, i) => (
              <LikerRow
                key={i}
                u={u}
                currentUserId={currentUserId}
                onClose={onClose}
              />
            ))
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
