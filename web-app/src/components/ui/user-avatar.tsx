import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
import { useSelector } from "react-redux";
import { selectOnlineIds } from "../../store/onlineUsersSlice";

export function UserAvatar({ user, className, avatarClassName }) {
  const onlineIds = useSelector(selectOnlineIds);
  const isOnline = onlineIds.includes(user.id);

  return (
    <div className={`relative inline-block ${className}`}>
      <Avatar className={avatarClassName}>
        <AvatarImage src={user.avatarUrl || user.avatar} alt={user.fullName || user.userName} />
        <AvatarFallback>
          {(user.fullName || user.userName || "U").charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      
      {isOnline && (
        <span className="absolute bottom-0 right-0 block h-3 w-3 rounded-full bg-green-500 ring-2 ring-background" title="Online" />
      )}
    </div>
  );
}
