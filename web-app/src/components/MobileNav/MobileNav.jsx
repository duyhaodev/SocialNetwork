import { Home, Search, Heart, User, PlusSquare } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { openComposer } from "../../store/composerSlice";
import { selectUnreadCount } from "../../store/notificationsSlice";

export function MobileNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  
  const currentPage = location.pathname.split('/')[1] || 'feed';
  const unreadNotifications = useSelector(selectUnreadCount);

  const navItems = [
    { id: "feed", icon: Home, path: "/feed" },
    { id: "search", icon: Search, path: "/search" },
    { id: "new", icon: PlusSquare, action: () => dispatch(openComposer({ text: "", files: [] })) },
    { id: "activity", icon: Heart, path: "/activity" },
    { id: "profile", icon: User, path: "/profile" },
  ];

  return (
    <>
      {/* Top Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 border-b border-border bg-background/80 backdrop-blur-md z-40 flex items-center justify-center px-4">
        <h1 
          className="text-xl font-bold cursor-pointer" 
          onClick={() => navigate("/feed")}
        >
          Threads
        </h1>
      </div>

      {/* Bottom Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 border-t border-border bg-background z-40 flex items-center justify-around px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id || (item.id === "profile" && location.pathname.startsWith("/profile"));
          
          return (
            <button
              key={item.id}
              className={`p-2 transition-colors relative ${isActive ? "text-foreground" : "text-muted-foreground"}`}
              onClick={() => item.action ? item.action() : navigate(item.path)}
            >
              <Icon className={`w-7 h-7 ${isActive && item.id !== "new" ? "fill-current" : ""}`} />
              {item.id === "activity" && unreadNotifications > 0 && (
                <span className="absolute top-2 right-2 block h-2.5 w-2.5 rounded-full ring-2 ring-background bg-blue-500" />
              )}
            </button>
          );
        })}
      </div>
    </>
  );
}
