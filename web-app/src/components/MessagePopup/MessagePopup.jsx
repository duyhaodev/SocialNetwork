import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle, Maximize2, X, Edit3 } from "lucide-react";
import { useSelector, useDispatch } from "react-redux";
import {formatTimeAgo} from "../../utils/dateUtils.js"
import { UserAvatar } from "../ui/user-avatar";
import { fetchConversations } from "../../store/chatSlice";

export function MessagePopup() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  // Get data from Redux Store
  const { conversations, loading, isFetched } = useSelector((state) => state.chat);

  // Load conversations on mount if empty
  useEffect(() => {
    if (!isFetched && !loading) {
      dispatch(fetchConversations());
    }
  }, [dispatch, isFetched, loading]);

  // Calculate unread count from Redux data
  const unreadCount = conversations.filter(c => c.unread).length;  

  const handleOpenFullPage = () => {
    setIsOpen(false);
    navigate('/messages', { state: { fromPopup: true } });
  };

  const handleConversationClick = (conv) => {
    setIsOpen(false);
    navigate('/messages', { state: { fromPopup: true, selectedId: conv.id } });
  };

  return (
    <>
      {/* Floating Message Button */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-50">
          <button
            onClick={() => setIsOpen(true)}
            className="relative bg-[#1a1a1a] hover:bg-[#252525] text-white rounded-full px-5 py-3 flex items-center gap-3 shadow-lg border border-[#333] transition-all"
          >
            <div className="relative">
              <MessageCircle className="w-5 h-5" />
              {unreadCount > 0 && (
                <div className="absolute top-0 right-0 w-2 h-2 bg-blue-500 rounded-full" />
              )}
            </div>
            <span className="font-medium">Message</span>
            
            {/* Recent avatars (taking top 3 from Redux data) */}
            <div className="flex -space-x-2">
              {conversations.slice(0, 3).map((conv, index) => (
                <img
                  key={conv.id}
                  src={conv.conversationAvatar || "https://github.com/shadcn.png"} // Fallback
                  alt={conv.conversationName}
                  className="w-6 h-6 rounded-full border-2 border-[#1a1a1a] object-cover"
                  style={{ zIndex: 3 - index }}
                />
              ))}
            </div>
          </button>
        </div>
      )}

      {/* Message Popup */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-96 h-[500px] bg-[#181818] rounded-2xl shadow-2xl border border-[#333] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-[#333]">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">Message</h3>
              {unreadCount > 0 && (
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
              )}
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={handleOpenFullPage}
                className="p-1.5 hover:bg-[#252525] rounded-lg transition-colors"
                title="Mở trang tin nhắn đầy đủ"  
              > 
                <Maximize2 className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-[#252525] rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
                <div className="flex items-center justify-center h-full text-gray-500">Loading...</div>
            ) : conversations.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-500 text-sm">No message</div>
            ) : (
                conversations.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => handleConversationClick(conv)}
                    className="flex items-start gap-3 p-4 hover:bg-[#1f1f1f] cursor-pointer transition-colors border-b border-[#252525]"
                  >
                    <div className="relative">
                      <UserAvatar 
                        user={{
                          id: conv.partnerId, 
                          avatar: conv.conversationAvatar, 
                          userName: conv.conversationName
                        }} 
                        avatarClassName="w-12 h-12"
                      />
                      
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium text-sm truncate">
                          {conv.conversationName}
                        </p>
                        {conv.timestamp && (
                          <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                            {formatTimeAgo(conv.timestamp)}
                          </span>
                        )}
                      </div>
                      <p className={`text-sm truncate ${conv.unread ? 'text-white font-medium' : 'text-muted-foreground'}`}>
                        {conv.lastMessage}
                      </p>
                    </div>
                    {conv.unread && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                      )}
                  </div>
                ))
            )}
          </div>     
        </div>
      )}
    </>
  );
}