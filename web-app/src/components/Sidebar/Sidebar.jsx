import { useEffect } from "react";
import { Home, Search, Heart, User, Edit, Menu } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "../ui/button.js";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar.js";
import { useSelector, useDispatch } from "react-redux";
import { openComposer, closeComposer, selectComposerOpen, selectComposerPrefill } from "../../store/composerSlice";
import { createPortal } from "react-dom";
import { CreatePost } from "../CreatePost/CreatePost.jsx";
import { Skeleton } from "../ui/skeleton.js";
import { logoutUser } from "../../store/userSlice";
import { fetchNotifications, selectUnreadCount } from "../../store/notificationsSlice";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

export function Sidebar({ currentPage }) {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { profile, loading } = useSelector((state) => state.user);
  const open = useSelector(selectComposerOpen);       
  const prefill = useSelector(selectComposerPrefill);
  const unreadNotifications = useSelector(selectUnreadCount);

  useEffect(() => {
    // Fetch initial notifications to get unread count
    if (profile) {
      dispatch(fetchNotifications());
    }
  }, [dispatch, profile]);

  const menuItems = [
    { id: "feed", label: "Home", icon: Home, path: "/feed" },
    { id: "search", label: "Search", icon: Search, path: "/search" },
    { id: "activity", label: "Activity", icon: Heart, path: "/activity" },
    { id: "profile", label: "Profile", icon: User, path: "/profile" },
  ];

  const handleLogout = async () => {
    try {
      await dispatch(logoutUser()).unwrap();
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
      navigate("/login");
    }
  };

  const renderProfileSection = () => {
    if (loading || !profile) {
      return (
        <div className="flex items-center space-x-3 p-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      );
    }
    
    const currentUser = {
      displayName: profile.fullName,
      username: profile.userName,
      avatar: profile.avatarUrl || null
    }

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-start h-auto p-0"
          >
            <div className="flex items-center w-full p-3">
              <Avatar className="w-10 h-10 mr-3">
                {currentUser.avatar ? (
                  <AvatarImage 
                    src={currentUser.avatar} 
                    alt={currentUser.displayName}
                    onError={(e) => { e.currentTarget.src = "/default-avatar.png"; }}
                  />
                ) : (
                  <AvatarFallback>
                    {(currentUser.username && currentUser.username.charAt(0).toUpperCase()) || "U"}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="flex-1 text-left">
                <div className="font-medium">{currentUser.displayName}</div>
                <div className="text-sm text-muted-foreground">@{currentUser.username}</div>
              </div>
              <Menu className="w-5 h-5" />
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align="end" 
          className="w-56 bg-[#1e1e1e] border-[#2a2a2a] text-[15px] p-1"
          sideOffset={8}
        >
          <DropdownMenuItem 
            onClick={() => navigate("/profile")} 
            className="cursor-pointer text-white hover:bg-[#2a2a2a] focus:bg-[#2a2a2a] rounded-md px-3 py-2"
          >
            Xem trang cá nhân
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={handleLogout}
            className="cursor-pointer text-red-500 hover:bg-[#2a2a2a] hover:text-red-500 focus:bg-[#2a2a2a] focus:text-red-500 rounded-md px-3 py-2"
          >
            Đăng xuất
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div className="hidden md:flex w-64 h-screen border-r border-border bg-background flex flex-col sticky top-0">
      {/* Logo */}
      <div className="p-6">
        <h1 className="text-2xl font-bold">Threads</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4">
        <div className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            
            return (
              <Button
                key={item.id}
                variant={isActive ? "secondary" : "ghost"}
                className="w-full justify-start h-12 px-4 relative"
                onClick={() => navigate(item.path)}
              >
                <div className="relative">
                  <Icon className={`w-6 h-6 mr-4 ${item.id === "activity" && isActive ? "fill-current" : ""}`} />
                  {item.id === "activity" && unreadNotifications > 0 && (
                    <span className="absolute top-0 right-3 block h-2.5 w-2.5 rounded-full ring-2 ring-background bg-blue-500 transform translate-x-1/2 -translate-y-1/2" />
                  )}
                </div>
                <span className={`text-base ${isActive ? "font-semibold" : ""}`}>{item.label}</span>
              </Button>
            );
          })}
        </div>

        {/* Create Post Button */}
        <Button
          className="w-full mt-6 h-12"
          size="lg"
          onClick={() => dispatch(openComposer({ text: "", files: [] }))} 
        >
          <Edit className="w-5 h-5 mr-2" />
          New thread
        </Button>
      </nav>

      {/* User Profile Section */}
      <div className="p-4 border-t border-border">
        {renderProfileSection()}
      </div>

      {createPortal(
        <CreatePost
          open={open}
          onOpenChange={(v) => v ? dispatch(openComposer(prefill)) : dispatch(closeComposer())}
          onCreatePost={() => { }}
        />,
        document.body
      )}
    </div>
  );
}