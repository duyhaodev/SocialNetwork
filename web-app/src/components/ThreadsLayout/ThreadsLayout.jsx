import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "../Sidebar/Sidebar";
import { MobileNav } from "../MobileNav/MobileNav";
import { MessagePopup } from "../MessagePopup/MessagePopup";
import { SuggestedUsers } from "../SuggestedUsers/SuggestedUsers";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchConversations } from "../../store/chatSlice";

export function ThreadsLayout() {
  const location = useLocation();
  const currentPage = location.pathname.split('/')[1] || 'feed';
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.user); // Assuming user info is here to check if logged in

  // Initial fetch of conversations
  useEffect(() => {
    dispatch(fetchConversations());
  }, [dispatch]);

  return (
    <div className="flex min-h-screen bg-background flex-col md:flex-row">
      <Sidebar currentPage={currentPage} />
      <MobileNav />
      <main className="flex-1 border-r border-border overflow-y-auto pt-14 pb-16 md:pt-0 md:pb-0">
        <Outlet />
      </main>
      <div className="w-80 p-6 hidden lg:block">
        <div className="space-y-6">
          {/* Suggested for you — dùng component thật */}
          <SuggestedUsers sidebar />

          <div className="bg-muted rounded-lg p-4">
            <h3 className="font-semibold mb-3">What's happening</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Very popular</p>
                <p className="font-medium">#MeoCam</p>
                <p className="text-xs text-muted-foreground">45.2K posts</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Trending</p>
                <p className="font-medium">#WebDevelopment</p>
                <p className="text-xs text-muted-foreground">28.1K posts</p>
              </div>
            </div>
          </div>
        </div>
      </div>
        {/* Message Popup */}
        <MessagePopup />
    </div>
  );
}