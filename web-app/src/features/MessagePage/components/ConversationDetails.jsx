import { useState, useEffect } from "react";
import { UserPlus, LogOut, Bell, Image as ImageIcon, Link as LinkIcon, FileText, Search, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../../components/ui/dialog";
import { UserAvatar } from "../../../components/ui/user-avatar";
import { Spinner } from "../../../components/ui/spinner";
import { searchApi } from "../../../api/searchApi";
import { messageApi } from "../../../api/messageApi";

export function ConversationDetails({ conversation, onClose }) {
  // Add Member State
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  // Search members
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const delay = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await searchApi.searchUsers(searchQuery);
        setSearchResults(res.data?.result || []);
      } catch (err) {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 400);
    return () => clearTimeout(delay);
  }, [searchQuery]);

  const handleAddMember = async (userId) => {
    setIsAdding(true);
    try {
      await messageApi.addParticipants(conversation.id, [userId]);
      setIsAddMemberOpen(false);
      setSearchQuery("");
      // Ideally show toast success
    } catch (err) {
      console.error("Failed to add member:", err);
    } finally {
      setIsAdding(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (!window.confirm("Are you sure you want to leave this group?")) return;

    try {
      const token = localStorage.getItem("accessToken");
      if (!token) return;

      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentUserId = payload.sub;

      await messageApi.removeParticipant(conversation.id, currentUserId);
      window.location.reload(); 
    } catch (err) {
      console.error("Failed to leave group:", err);
    }
  };

  if (!conversation) return null;

  const isGroup = conversation.type === "GROUP";
  const avatar = conversation.user?.avatar || conversation.conversationAvatar;
  const name = conversation.user?.displayName || conversation.conversationName || "Unknown";

  return (
    <div className="w-80 border-l border-[#333] bg-[#0b0b0b] flex flex-col h-full z-10 overflow-hidden flex-shrink-0">
      <div className="p-4 border-b border-[#333] flex items-center justify-between">
        <h2 className="text-lg font-medium">Details</h2>
        <button onClick={onClose} className="p-2 hover:bg-[#1a1a1a] rounded-full transition-colors text-gray-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Profile Info */}
        <div className="flex flex-col items-center p-6 border-b border-[#1a1a1a]">
          {avatar ? (
            <img src={avatar} alt={name} className="w-20 h-20 rounded-full object-cover mb-4" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gray-600 flex items-center justify-center text-white text-2xl font-medium mb-4">
              {name.charAt(0).toUpperCase()}
            </div>
          )}
          <h3 className="text-xl font-semibold text-center">{name}</h3>
        </div>

        {/* Quick Actions */}
        <div className="flex justify-center gap-6 p-4 border-b border-[#1a1a1a]">
          <button className="flex flex-col items-center gap-2 group">
            <div className="p-3 bg-[#1a1a1a] rounded-full group-hover:bg-[#252525] transition-colors">
              <Bell className="w-5 h-5 text-gray-300" />
            </div>
            <span className="text-xs text-gray-400">Mute</span>
          </button>
          <button className="flex flex-col items-center gap-2 group">
            <div className="p-3 bg-[#1a1a1a] rounded-full group-hover:bg-[#252525] transition-colors">
              <Search className="w-5 h-5 text-gray-300" />
            </div>
            <span className="text-xs text-gray-400">Search</span>
          </button>
        </div>

        {/* Group Actions */}
        {isGroup && (
          <div className="p-2 border-b border-[#1a1a1a]">
            <button 
              onClick={() => setIsAddMemberOpen(true)}
              className="w-full flex items-center gap-3 p-3 hover:bg-[#1a1a1a] rounded-lg transition-colors text-sm"
            >
              <UserPlus className="w-5 h-5 text-gray-400" />
              <span>Add Member</span>
            </button>
            <button 
              onClick={handleLeaveGroup}
              className="w-full flex items-center gap-3 p-3 hover:bg-[#1a1a1a] rounded-lg transition-colors text-sm text-red-500"
            >
              <LogOut className="w-5 h-5" />
              <span>Leave Group</span>
            </button>
          </div>
        )}

        {/* Shared Media Mockup */}
        <div className="p-4 space-y-4">
          <div className="space-y-3">
            <button className="w-full flex items-center justify-between group">
              <div className="flex items-center gap-3">
                <ImageIcon className="w-5 h-5 text-gray-400" />
                <span className="text-sm">Shared Media</span>
              </div>
              <span className="text-xs text-blue-500 hidden group-hover:block transition-all">See All</span>
            </button>
            <div className="grid grid-cols-3 gap-2">
              <div className="aspect-square bg-[#1a1a1a] rounded-lg flex items-center justify-center">
                <span className="text-xs text-gray-600">Photo</span>
              </div>
              <div className="aspect-square bg-[#1a1a1a] rounded-lg flex items-center justify-center">
                <span className="text-xs text-gray-600">Photo</span>
              </div>
              <div className="aspect-square bg-[#1a1a1a] rounded-lg flex items-center justify-center">
                <span className="text-xs text-gray-600">Photo</span>
              </div>
            </div>
          </div>

          <button className="w-full flex items-center gap-3 py-3 group">
            <FileText className="w-5 h-5 text-gray-400" />
            <span className="text-sm">Files</span>
          </button>
          <button className="w-full flex items-center gap-3 py-3 group">
            <LinkIcon className="w-5 h-5 text-gray-400" />
            <span className="text-sm">Links</span>
          </button>
        </div>
      </div>

      {/* Add Member Dialog */}
      <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
        <DialogContent className="bg-[#0b0b0b] border-[#333] text-white">
          <DialogHeader>
            <DialogTitle>Add New Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-[#555]"
              />
            </div>
            <div className="max-h-60 overflow-y-auto space-y-2">
              {searchLoading ? (
                <div className="flex justify-center p-4">
                  <Spinner className="w-5 h-5 text-gray-500" />
                </div>
              ) : searchResults.map(user => (
                <div key={user.userId} className="flex items-center justify-between p-2 hover:bg-[#1a1a1a] rounded-lg">
                  <div className="flex items-center gap-3">
                    <UserAvatar user={{...user, id: user.userId, avatar: user.avatarUrl}} avatarClassName="w-8 h-8" />
                    <span className="text-sm">{user.fullName || user.username}</span>
                  </div>
                  <button
                    onClick={() => handleAddMember(user.userId)}
                    disabled={isAdding}
                    className="text-xs bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded-md transition-colors"
                  >
                    Add
                  </button>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
