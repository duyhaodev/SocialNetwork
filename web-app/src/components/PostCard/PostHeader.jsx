import { MoreHorizontal, Trash2, Link, Repeat2, Globe } from "lucide-react";
import { Button } from "../ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { UserHoverCard } from "../UserHoverCard/UserHoverCard";
import { formatTimeAgo } from "../../utils/dateUtils.js";
import { useState } from "react";
import { toast } from "sonner";

export function PostHeader({
  post,
  avatarUrl,
  displayName,
  handle,
  createdAt,
  canDelete,
  onProfileClick,
  onDeleteClick,
  isRepost,
  baseUsername,
  reposterName,
}) {
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  const handleCopyLink = () => {
    const postId = post.id ?? post.postId;
    const url = `${window.location.origin}/post/${postId}`;
    navigator.clipboard.writeText(url)
      .then(() => toast.success("Đã sao chép liên kết bài viết!"))
      .catch(() => toast.error("Không thể sao chép liên kết"));
    setMoreMenuOpen(false);
  };

  return (
    <div className="w-full">
      {/* Repost label */}
      {isRepost && (
        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2 pl-10">
          <Repeat2 className="w-4 h-4 text-green-500" />
          <button
            className="hover:underline font-semibold"
            onClick={(e) => {
              e.stopPropagation();
              onProfileClick?.(baseUsername);
            }}
          >
            {reposterName}
          </button>
          <span>đã chia sẻ lại</span>
        </div>
      )}

      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <button
            className="p-0 h-auto rounded-full cursor-pointer transition-transform active:scale-95"
            onClick={(e) => {
              e.stopPropagation();
              onProfileClick?.(handle);
            }}
            title={displayName}
          >
            <Avatar className="w-10 h-10 border border-border/20">
              <AvatarImage src={avatarUrl} alt={displayName} />
              <AvatarFallback className="bg-muted text-muted-foreground">
                {displayName?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
          </button>

          {/* User names & time */}
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <button
                className="p-0 h-auto hover:underline text-left cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onProfileClick?.(handle);
                }}
              >
                <UserHoverCard username={handle}>
                  <span className="font-semibold text-foreground hover:text-primary transition-colors">
                    {displayName}
                  </span>
                </UserHoverCard>
              </button>
              <span className="text-xs text-muted-foreground font-normal">@{handle}</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
              <span title={createdAt ? new Date(createdAt).toLocaleString() : ""}>
                {formatTimeAgo(createdAt)}
              </span>
              <span>·</span>
              <Globe className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>

        {/* Dropdown Menu Actions */}
        <div onClick={(e) => e.stopPropagation()}>
          <DropdownMenu open={moreMenuOpen} onOpenChange={setMoreMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="p-2 h-auto rounded-full hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="More actions"
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="end"
              sideOffset={8}
              className="w-44 bg-card border border-border/50 text-[14px] p-1 rounded-xl shadow-lg backdrop-blur-md bg-card/95"
            >
              <DropdownMenuItem
                className="cursor-pointer hover:bg-muted focus:bg-muted data-[highlighted]:bg-muted rounded-lg px-3 py-2 transition-colors"
                onClick={handleCopyLink}
              >
                <div className="flex items-center gap-2 w-full text-foreground">
                  <Link className="w-4 h-4 text-foreground" />
                  <span className="font-medium">Copy link</span>
                </div>
              </DropdownMenuItem>

              {canDelete && (
                <DropdownMenuItem
                  className="cursor-pointer hover:bg-muted focus:bg-muted data-[highlighted]:bg-muted rounded-lg px-3 py-2 transition-colors"
                  onClick={() => {
                    onDeleteClick?.();
                    setMoreMenuOpen(false);
                  }}
                >
                  <div className="flex items-center gap-2 w-full text-red-500">
                    <Trash2 className="w-4 h-4 text-red-500" />
                    <span className="font-medium">Delete post</span>
                  </div>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
