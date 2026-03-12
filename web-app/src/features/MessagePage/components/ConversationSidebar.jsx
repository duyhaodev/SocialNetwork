import { useState, useRef, useEffect } from "react";
import { Search, ChevronLeft } from "lucide-react";
import { Spinner } from "../../../components/ui/spinner";
import { searchApi } from "../../../api/searchApi";
import {formatTimeAgo} from "../../../utils/dateUtils"
import { UserAvatar } from "../../../components/ui/user-avatar";

export function ConversationSidebar({
  conversations,
  loading: conversationsLoading,
  selectedId,
  onSelectConversation,
  onSearchSelect,
  onBack,
  shouldShowBack,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchInputRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      if (typeof searchQuery !== "string" || !searchQuery.trim()) {
        setSearchResults([]);
        return;
      }

      setSearchLoading(true);
      try {
        const req = await searchApi.searchUsers(searchQuery);
        const data = req.data || req;

        if (data.code === 1000 && Array.isArray(data.result)) {
          setSearchResults(data.result || []);
        } else {
          setSearchResults([]);
        }
      } catch (err) {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    };

    const delay = setTimeout(fetchData, 400);
    return () => clearTimeout(delay);
  }, [searchQuery]);

  const handleSelectSearchResult = (user) => {
    setSearchQuery("");
    setSearchResults([]);
    onSearchSelect(user);
  };

  return (
    <div className="w-80 border-r border-[#333] flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-[#333]">
        <div className="flex items-center gap-3 mb-4">
          {shouldShowBack && (
            <button
              onClick={onBack}
              className="p-1 hover:bg-[#252525] rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <h2 className="text-xl">Message</h2>
        </div>
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-[#555]"
          />

          {/* Inline search dropdown */}
          {searchQuery ? (
            <div className="absolute left-0 right-0 mt-2 bg-[#0b0b0b] border border-[#333] rounded-md max-h-60 overflow-auto z-10">
              {searchLoading ? (
                <div className="p-3 flex items-center gap-2 text-sm text-gray-400">
                  <Spinner className="w-4 h-4 text-gray-400" />
                  <span>Searching ...</span>
                </div>
              ) : searchResults && searchResults.length > 0 ? (
                searchResults.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleSelectSearchResult(user)}
                    className="w-full text-left flex items-center gap-3 p-3 hover:bg-[#111111] transition-colors border-b border-[#0f0f0f]"
                  >
                    <UserAvatar 
                      user={{...user, avatar: user.avatarUrl}} 
                      avatarClassName="w-8 h-8"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {user.fullName || user.userName}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        @{user.userName}
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="p-3 text-sm text-gray-500">
                  User not found
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {conversationsLoading ? (
          <div className="p-4 flex items-center justify-center">
            <Spinner className="w-5 h-5 text-gray-400" />
          </div>
        ) : conversations && conversations.length > 0 ? (
          conversations.map((item) => {
            const isApiConv = !!item.conversationName;
            const id = item.id;
            const avatar = isApiConv
              ? item.conversationAvatar
              : item.user?.avatar;
            const displayName = isApiConv
              ? item.conversationName
              : item.user?.displayName;
            const lastMessage = isApiConv
              ? item.lastMessage || ""
              : item.lastMessage;
            const timestampRaw = item.timestamp; // Luôn sử dụng item.timestamp
            const unread = item.unread;

            // Helper to construct the standardized object for onSelect
            const normalizedConv = isApiConv
              ? {
                  id,
                  user: { displayName, avatar },
                  lastMessage,
                  unread: unread || false,
                  timestamp: timestampRaw,
                }
              : item;

            // Tìm đối tác chat (partnerId) để hiển thị status online
            // Trong conversation 1-1 đơn giản này, ta có thể lấy từ item.participantIds hoặc tương tự
            // Ở đây tôi giả định logic lấy ID đối phương:
            const partnerId = item.partnerId || (item.user && item.user.id); 

            return (
              <div
                key={id}
                onClick={() => onSelectConversation(normalizedConv)}
                className={`flex items-start gap-3 p-4 cursor-pointer transition-colors border-b border-[#1a1a1a] ${
                  selectedId === id ? "bg-[#1a1a1a]" : "hover:bg-[#0f0f0f]"
                }`}
              >
                <UserAvatar 
                  user={{
                    id: partnerId, // Cần ID để check online
                    avatar: avatar,
                    userName: displayName
                  }}
                  avatarClassName="w-12 h-12 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium text-sm truncate">
                      {displayName}
                    </p>
                    {timestampRaw && (
                      <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                        {formatTimeAgo(timestampRaw)}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400 truncate">{lastMessage}</p>
                </div>
                {unread && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                )}
              </div>
            );
          })
        ) : (
          <div className="p-6 text-center text-gray-400">
            <p className="mb-3 text-sm">Không có cuộc hội thoại nào.</p>
            <p className="mb-4 text-xs">
              Hãy bắt đầu một cuộc trò chuyện mới: tìm kiếm người dùng bằng ô tìm
              kiếm phía trên.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
