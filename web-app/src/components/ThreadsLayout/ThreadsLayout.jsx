import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "../Sidebar/Sidebar";
import { MobileNav } from "../MobileNav/MobileNav";
import { MessagePopup } from "../MessagePopup/MessagePopup";
import { SuggestedUsers } from "../SuggestedUsers/SuggestedUsers";
import { TrendingTags } from "../TrendingTags/TrendingTags";
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
      <main className="flex-1 border-r border-border overflow-y-scroll [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pt-14 pb-16 md:pt-0 md:pb-0">
        <Outlet />
      </main>
      <div className="w-80 p-6 hidden lg:block">
        <div className="space-y-6">
          {/* Suggested for you — dùng component thật */}
          <SuggestedUsers sidebar />

          <TrendingTags />
        </div>
      </div>
        {/* Message Popup */}
        <MessagePopup />
    </div>
  );
}