import { useState, useEffect } from "react";
import { UserPlus, LogOut, Bell, Image as ImageIcon, Link as LinkIcon, FileText, Search, X, Video, Users, Camera } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../../components/ui/dialog";
import { UserAvatar } from "../../../components/ui/user-avatar";
import { Spinner } from "../../../components/ui/spinner";
import { searchApi } from "../../../api/searchApi";
import { messageApi } from "../../../api/messageApi";
import mediaApi from "../../../api/mediaApi";
import { useDispatch, useSelector } from "react-redux";
import { removeConversation, updateConversationAvatar } from "../../../store/chatSlice";
import { useRef } from "react";
import { AvatarCropDialog } from "../.././../components/AvatarCropDialog/AvatarCropDialog";
import { useSocket } from "../../../context/SocketContext";

export function ConversationDetails({ conversation, onClose, onLeaveGroup }) {
  const dispatch = useDispatch();
  const { conversations } = useSelector(state => state.chat);
  const socket = useSocket();

  // Add Member State
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  // Leave Group Confirm State
  const [isLeaveConfirmOpen, setIsLeaveConfirmOpen] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  // Members State
  const [isMembersOpen, setIsMembersOpen] = useState(false);
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);

  // Avatar State
  const [avatarUrl, setAvatarUrl] = useState(
    conversation?.user?.avatar || conversation?.conversationAvatar || null
  );
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState(null);
  const [isCropOpen, setIsCropOpen] = useState(false);
  const avatarInputRef = useRef(null);

  // Shared Media State
  const [sharedMedia, setSharedMedia] = useState([]);
  const [mediaLoading, setMediaLoading] = useState(false);

  // Lắng nghe realtime khi thành viên khác đổi avatar nhóm
  useEffect(() => {
    if (!socket || !conversation?.id) return;
    const handler = (data) => {
      if (data?.conversationId === conversation.id && data?.avatarUrl) {
        setAvatarUrl(data.avatarUrl);
      }
    };
    socket.on("group_avatar_updated", handler);
    return () => socket.off("group_avatar_updated", handler);
  }, [socket, conversation?.id]);

  // Fetch shared media
  useEffect(() => {
    const fetchMedia = async () => {
      if (!conversation?.id) return;
      setMediaLoading(true);
      try {
        const res = await mediaApi.getConversationMedia(conversation.id);
        const data = res.data?.result || res.data || res || [];
        setSharedMedia(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to fetch shared media:", err);
      } finally {
        setMediaLoading(false);
      }
    };

    fetchMedia();
  }, [conversation?.id]);

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
        const data = res.data || res;
        setSearchResults(data?.result || data || []);
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

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCropImageSrc(reader.result);
      setIsCropOpen(true);
    };
    reader.readAsDataURL(file);
    e.target.value = null;
  };

  const handleCropDone = async (croppedFile, previewUrl) => {
    setAvatarUrl(previewUrl); // preview ngay
    setIsUploadingAvatar(true);
    try {
      const fd = new FormData();
      fd.append("files", croppedFile);
      const uploadRes = await mediaApi.upload(fd);
      const uploadData = Array.isArray(uploadRes) ? uploadRes : (uploadRes?.result || []);
      const newUrl = uploadData[0]?.mediaUrl;
      if (!newUrl) throw new Error("Upload failed");

      await messageApi.updateGroupAvatar(conversation.id, newUrl);
      setAvatarUrl(newUrl);
      dispatch(updateConversationAvatar({ conversationId: conversation.id, avatarUrl: newUrl }));
    } catch (err) {
      console.error("Failed to update group avatar:", err);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleViewMembers = async () => {
    setIsMembersOpen(true);
    if (members.length > 0) return; // đã load rồi
    setMembersLoading(true);
    try {
      const res = await messageApi.getMembers(conversation.id);
      const data = res.data || res;
      setMembers(data?.result || data || []);
    } catch (err) {
      console.error("Failed to fetch members:", err);
    } finally {
      setMembersLoading(false);
    }
  };

  const handleLeaveGroup = async () => {
    setIsLeaving(true);
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) return;

      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentUserId = payload.sub;

      await messageApi.removeParticipant(conversation.id, currentUserId);

      // Xóa optimistic khỏi Redux ngay lập tức
      dispatch(removeConversation(conversation.id));

      // Tìm conversation tiếp theo để auto-select
      const remaining = conversations.filter(c => c.id !== conversation.id);
      onLeaveGroup?.(conversation.id, remaining[0] || null);
      onClose?.();
    } catch (err) {
      console.error("Failed to leave group:", err);
    } finally {
      setIsLeaving(false);
      setIsLeaveConfirmOpen(false);
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
          <div className="relative mb-4">
            {avatarUrl ? (
              <img src={avatarUrl} alt={name} className="w-20 h-20 rounded-full object-cover" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gray-600 flex items-center justify-center text-white text-2xl font-medium">
                {name.charAt(0).toUpperCase()}
              </div>
            )}
            {isGroup && (
              <>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  className="absolute bottom-0 right-0 w-7 h-7 bg-[#333] hover:bg-[#444] rounded-full flex items-center justify-center border-2 border-[#0b0b0b] transition-colors disabled:opacity-50"
                >
                  {isUploadingAvatar
                    ? <Spinner className="w-3 h-3" />
                    : <Camera className="w-3.5 h-3.5 text-white" />
                  }
                </button>
              </>
            )}
          </div>
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
              onClick={handleViewMembers}
              className="w-full flex items-center gap-3 p-3 hover:bg-[#1a1a1a] rounded-lg transition-colors text-sm"
            >
              <Users className="w-5 h-5 text-gray-400" />
              <span>Members</span>
            </button>
            <button
              onClick={() => setIsAddMemberOpen(true)}
              className="w-full flex items-center gap-3 p-3 hover:bg-[#1a1a1a] rounded-lg transition-colors text-sm"
            >
              <UserPlus className="w-5 h-5 text-gray-400" />
              <span>Add Member</span>
            </button>
            <button
              onClick={() => setIsLeaveConfirmOpen(true)}
              className="w-full flex items-center gap-3 p-3 hover:bg-[#1a1a1a] rounded-lg transition-colors text-sm text-red-500"
            >
              <LogOut className="w-5 h-5" />
              <span>Leave Group</span>
            </button>
          </div>
        )}

        {/* Shared Media */}
        <div className="p-4 space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ImageIcon className="w-5 h-5 text-gray-400" />
                <span className="text-sm font-medium">Shared Media</span>
              </div>
            </div>

            {mediaLoading ? (
              <div className="flex justify-center p-4">
                <Spinner className="w-5 h-5 text-gray-500" />
              </div>
            ) : sharedMedia.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {sharedMedia.slice(0, 6).map((m, idx) => (
                  <div
                    key={idx}
                    className="aspect-square bg-[#1a1a1a] rounded-lg overflow-hidden border border-[#222] cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => window.open(m.mediaUrl, '_blank')}
                  >
                    {m.mediaType === 'image' ? (
                      <img src={m.mediaUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-900">
                        <Video className="w-4 h-4 text-gray-400" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500 text-center py-2">No media shared yet</p>
            )}
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

      {/* Avatar Crop Dialog */}
      <AvatarCropDialog
        open={isCropOpen}
        imageSrc={cropImageSrc}
        onClose={() => setIsCropOpen(false)}
        onCropDone={handleCropDone}
      />

      {/* Members Dialog */}
      <Dialog open={isMembersOpen} onOpenChange={setIsMembersOpen}>
        <DialogContent
          className="bg-[#111] border-[#2a2a2a] text-white max-w-md rounded-2xl"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Members</DialogTitle>
          </DialogHeader>
          <div className="pt-2 pb-2">
            {membersLoading ? (
              <div className="flex justify-center p-6">
                <Spinner className="w-5 h-5 text-gray-500" />
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto space-y-1 pr-1">
                {members.map(member => (
                  <div key={member.userId} className="flex items-center gap-3 px-2 py-2.5 hover:bg-[#1a1a1a] rounded-xl transition-colors">
                    <UserAvatar user={{ ...member, id: member.userId, avatar: member.avatarUrl }} avatarClassName="w-9 h-9" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-tight truncate">{member.fullName || "Unknown"}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Leave Group Confirm Dialog */}
      <Dialog open={isLeaveConfirmOpen} onOpenChange={setIsLeaveConfirmOpen}>
        <DialogContent className="bg-[#0b0b0b] border-[#333] text-white max-w-sm">
          <DialogHeader>
            <DialogTitle>Rời khỏi nhóm</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <p className="text-sm text-gray-400">
              Bạn có chắc muốn rời khỏi nhóm <span className="text-white font-medium">{conversation?.conversationName}</span> không? Bạn sẽ không nhận được tin nhắn từ nhóm này nữa.
            </p>
          </div>
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setIsLeaveConfirmOpen(false)}
              className="px-3 py-1.5 text-sm rounded-lg bg-[#1a1a1a] hover:bg-[#252525] transition-colors"
            >
              Huỷ
            </button>
            <button
              onClick={handleLeaveGroup}
              disabled={isLeaving}
              className="px-3 py-1.5 text-sm rounded-lg bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isLeaving && <Spinner className="w-3 h-3" />}
              Rời nhóm
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Member Dialog */}
      <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>        <DialogContent className="bg-[#111] border-[#2a2a2a] text-white max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Add New Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2 pb-2">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl pl-10 pr-4 py-2.5 text-sm placeholder-gray-600 focus:outline-none focus:border-[#444] transition-colors"
              />
            </div>
            <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
              {searchLoading ? (
                <div className="flex justify-center p-6">
                  <Spinner className="w-5 h-5 text-gray-500" />
                </div>
              ) : searchResults.length === 0 && searchQuery ? (
                <p className="text-sm text-gray-600 text-center py-6">No users found</p>
              ) : searchResults.map(user => (
                <div key={user.userId} className="flex items-center justify-between px-2 py-2.5 hover:bg-[#1a1a1a] rounded-xl transition-colors">
                  <div className="flex items-center gap-3">
                    <UserAvatar user={{ ...user, id: user.userId, avatar: user.avatarUrl }} avatarClassName="w-9 h-9" />
                    <div>
                      <p className="text-sm font-medium leading-tight">{user.fullName || user.username}</p>
                      <p className="text-xs text-gray-500">@{user.username}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleAddMember(user.userId)}
                    disabled={isAdding}
                    className="text-xs font-medium bg-white text-black hover:bg-gray-200 px-4 py-1.5 rounded-full transition-colors disabled:opacity-50"
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
