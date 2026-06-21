import { Home, Search, Heart, User, PlusSquare, Archive, LogOut, Menu, Edit, X } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { openComposer } from "../../store/composerSlice";
import { selectUnreadCount } from "../../store/notificationsSlice";
import { logoutUser } from "../../store/userSlice";
import { useState, useEffect } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "../ui/avatar";
import { motion, AnimatePresence } from "framer-motion";

export function MobileNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const currentPage = location.pathname.split('/')[1] || 'feed';
  const unreadNotifications = useSelector(selectUnreadCount);
  const profile = useSelector((state) => state.user.profile);

  // Đóng drawer khi đổi route
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  // Khóa scroll body khi drawer mở
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  const handleLogout = async () => {
    setDrawerOpen(false);
    try {
      await dispatch(logoutUser()).unwrap();
      navigate("/login");
    } catch {
      navigate("/login");
    }
  };

  const navItems = [
    { id: "feed", icon: Home, path: "/feed" },
    { id: "search", icon: Search, path: "/search" },
    { id: "new", icon: PlusSquare, action: () => dispatch(openComposer({ text: "", files: [] })) },
    { id: "activity", icon: Heart, path: "/activity" },
    { id: "story", icon: Archive, path: "/story/archive" },
    { id: "profile", icon: User, path: "/profile" },
  ];

  const drawerItems = [
    { id: "feed", label: "Home", icon: Home, path: "/feed" },
    { id: "search", label: "Search", icon: Search, path: "/search" },
    { id: "activity", label: "Activity", icon: Heart, path: "/activity" },
    { id: "profile", label: "Profile", icon: User, path: "/profile" },
    { id: "story", label: "Archive", icon: Archive, path: "/story/archive" },
  ];

  return (
    <>
      {/* Top Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 border-b border-border bg-background/80 backdrop-blur-md z-40 flex items-center justify-between px-4">
        <h1
          className="text-xl font-bold cursor-pointer"
          onClick={() => navigate("/feed")}
        >
          Threads
        </h1>
        <button
          onClick={() => setDrawerOpen(true)}
          className="p-2 rounded-xl hover:bg-muted/30 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Bottom Bar — ẩn khi drawer mở */}
      <AnimatePresence>
        {!drawerOpen && (
          <motion.div
            initial={{ y: 0 }}
            exit={{ y: 80 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden fixed bottom-0 left-0 right-0 h-16 border-t border-border bg-background z-40 flex items-center justify-around px-2"
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id ||
                (item.id === "profile" && location.pathname.startsWith("/profile")) ||
                (item.id === "story" && location.pathname.startsWith("/story"));

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
          </motion.div>
        )}
      </AnimatePresence>

      {/* Drawer Overlay */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden fixed inset-0 bg-black/50 z-[60]"
              onClick={() => setDrawerOpen(false)}
            />

            {/* Drawer Panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="md:hidden fixed top-0 right-0 h-full w-72 bg-background border-l border-border z-[61] flex flex-col"
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border/40">
                <h2 className="text-lg font-bold">Menu</h2>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="p-2 rounded-xl hover:bg-muted/30 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Nav Items */}
              <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
                {drawerItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path ||
                    location.pathname.startsWith(item.path + "/") ||
                    (item.id !== "story" && currentPage === item.id);

                  return (
                    <button
                      key={item.id}
                      onClick={() => { navigate(item.path); setDrawerOpen(false); }}
                      className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
                        isActive
                          ? "bg-muted text-foreground"
                          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                      }`}
                    >
                      <div className="relative">
                        <Icon className={`w-5 h-5 ${isActive ? "fill-current" : ""}`} />
                        {item.id === "activity" && unreadNotifications > 0 && (
                          <span className="absolute -top-1 -right-1 block h-2 w-2 rounded-full bg-blue-500" />
                        )}
                      </div>
                      {item.label}
                    </button>
                  );
                })}

                {/* New Thread */}
                <button
                  onClick={() => { dispatch(openComposer({ text: "", files: [] })); setDrawerOpen(false); }}
                  className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-semibold text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
                >
                  <Edit className="w-5 h-5" />
                  New thread
                </button>
              </nav>

              {/* Profile + Logout */}
              <div className="px-4 py-4 border-t border-border/40 space-y-2">
                <button
                  onClick={() => { navigate("/profile"); setDrawerOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-muted/50 transition-colors"
                >
                  <Avatar className="w-9 h-9">
                    <AvatarImage src={profile?.avatarUrl} />
                    <AvatarFallback>{profile?.fullName?.[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-foreground">{profile?.fullName}</p>
                    <p className="text-xs text-muted-foreground">@{profile?.username}</p>
                  </div>
                </button>

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-500/10 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  Log out
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
