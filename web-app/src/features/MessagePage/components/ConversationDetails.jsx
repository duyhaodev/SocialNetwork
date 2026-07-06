import { useState, useEffect, useRef } from "react";
import {
  UserPlus, LogOut, Bell, BellOff, Image as ImageIcon,
  Link as LinkIcon, FileText, Search, X, Users, Camera, ChevronRight, ArrowLeft
} from "lucide-react";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../../components/ui/dialog";
import { UserAvatar } from "../../../components/ui/user-avatar";
import { Spinner } from "../../../components/ui/spinner";
import { searchApi } from "../../../api/searchApi";
import { messageApi } from "../../../api/messageApi";
import mediaApi from "../../../api/mediaApi";
import { useDispatch, useSelector } from "react-redux";
import { removeConversation, updateConversationAvatar, toggleMuteConversation, selectIsConversationMuted } from "../../../store/chatSlice";
import { AvatarCropDialog } from "../.././../components/AvatarCropDialog/AvatarCropDialog";
import { useSocket } from "../../../context/SocketContext";
import { ImageViewer } from "../../../components/ImageViewer/ImageViewer";

export function ConversationDetails({ conversation, messages = [], onClose, onLeaveGroup, onScrollToMessage }) {
  const dispatch = useDispatch();
  const { conversations } = useSelector(state => state.chat);
  const socket = useSocket();
  const isMuted = useSelector(selectIsConversationMuted(conversation?.id));

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [isLinksOpen, setIsLinksOpen] = useState(false);
  const [isMediaOpen, setIsMediaOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchMsgQuery, setSearchMsgQuery] = useState("");
  const [searchMsgResults, setSearchMsgResults] = useState([]);
  const [searchMsgLoading, setSearchMsgLoading] = useState(false);
  const [searchHasMore, setSearchHasMore] = useState(false);
  const [searchPage, setSearchPage] = useState(0);
  const [searchLoadingMore, setSearchLoadingMore] = useState(false);
  const searchLoadMoreRef = useRef(null);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isLeaveConfirmOpen, setIsLeaveConfirmOpen] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isMembersOpen, setIsMembersOpen] = useState(false);
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(
    conversation?.user?.avatar || conversation?.conversationAvatar || null
  );
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState(null);
  const [isCropOpen, setIsCropOpen] = useState(false);
  const avatarInputRef = useRef(null);
  const [sharedMedia, setSharedMedia] = useState([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaPage, setMediaPage] = useState(0);
  const [mediaHasMore, setMediaHasMore] = useState(true);
  const [mediaLoadingMore, setMediaLoadingMore] = useState(false);
  const mediaLoadMoreRef = useRef(null);

  useEffect(() => {
    setAvatarUrl(conversation?.user?.avatar || conversation?.conversationAvatar || null);
  }, [conversation?.id]);

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

  useEffect(() => {
    const fetchMedia = async () => {
      if (!conversation?.id) return;
      setMediaLoading(true);
      setSharedMedia([]);
      setMediaPage(0);
      setMediaHasMore(true);
      try {
        const res = await mediaApi.getConversationMediaPaged(conversation.id, 0, 18);
        const data = res.data?.result || res.data || res || {};
        const content = data.content || [];
        setSharedMedia(Array.isArray(content) ? content : []);
        setMediaHasMore(data.hasMore ?? false);
        setMediaPage(1);
      } catch (err) {
        console.error("Failed to fetch shared media:", err);
      } finally {
        setMediaLoading(false);
      }
    };
    fetchMedia();
  }, [conversation?.id]);

  // Infinite scroll cho panel Media
  useEffect(() => {
    if (!mediaHasMore || mediaLoadingMore || !isMediaOpen) return;
    const el = mediaLoadMoreRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      setMediaLoadingMore(true);
      mediaApi.getConversationMediaPaged(conversation.id, mediaPage, 18)
        .then(res => {
          const data = res.data?.result || res.data || res || {};
          const content = data.content || [];
          setSharedMedia(prev => [...prev, ...content]);
          setMediaHasMore(data.hasMore ?? false);
          setMediaPage(p => p + 1);
        })
        .catch(() => {})
        .finally(() => setMediaLoadingMore(false));
    }, { threshold: 0.1 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [mediaHasMore, mediaLoadingMore, isMediaOpen, mediaPage, conversation?.id]);

  // Search messages qua BE — debounce 400ms
  useEffect(() => {
    if (!searchMsgQuery.trim()) { setSearchMsgResults([]); setSearchHasMore(false); setSearchPage(0); return; }
    setSearchMsgLoading(true);
    setSearchMsgResults([]);
    setSearchPage(0);
    setSearchHasMore(false);
    const delay = setTimeout(async () => {
      try {
        const res = await messageApi.searchMessages(conversation.id, searchMsgQuery.trim(), 0, 20);
        const data = res.data || res;
        const result = data?.result || {};
        const msgs = result?.messages || [];
        setSearchMsgResults(Array.isArray(msgs) ? msgs : []);
        setSearchHasMore(result?.hasMore ?? false);
        setSearchPage(1);
      } catch {
        setSearchMsgResults([]);
      } finally {
        setSearchMsgLoading(false);
      }
    }, 400);
    return () => clearTimeout(delay);
  }, [searchMsgQuery, conversation?.id]);

  // Infinite scroll cho search results
  useEffect(() => {
    if (!searchHasMore || searchLoadingMore || !isSearchOpen) return;
    const el = searchLoadMoreRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      setSearchLoadingMore(true);
      messageApi.searchMessages(conversation.id, searchMsgQuery.trim(), searchPage, 20)
        .then(res => {
          const data = res.data || res;
          const result = data?.result || {};
          const msgs = result?.messages || [];
          setSearchMsgResults(prev => [...prev, ...(Array.isArray(msgs) ? msgs : [])]);
          setSearchHasMore(result?.hasMore ?? false);
          setSearchPage(p => p + 1);
        })
        .catch(() => {})
        .finally(() => setSearchLoadingMore(false));
    }, { threshold: 0.1 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [searchHasMore, searchLoadingMore, isSearchOpen, searchPage, searchMsgQuery, conversation?.id]);

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const delay = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await searchApi.searchUsers(searchQuery);
        const data = res.data || res;
        setSearchResults(data?.result || data || []);
      } catch { setSearchResults([]); }
      finally { setSearchLoading(false); }
    }, 400);
    return () => clearTimeout(delay);
  }, [searchQuery]);

  const handleAddMember = async (userId) => {
    setIsAdding(true);
    try {
      await messageApi.addParticipants(conversation.id, [userId]);
      setIsAddMemberOpen(false);
      setSearchQuery("");
    } catch (err) { console.error("Failed to add member:", err); }
    finally { setIsAdding(false); }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { setCropImageSrc(reader.result); setIsCropOpen(true); };
    reader.readAsDataURL(file);
    e.target.value = null;
  };

  const handleCropDone = async (croppedFile, previewUrl) => {
    setAvatarUrl(previewUrl);
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
    } catch (err) { console.error("Failed to update group avatar:", err); }
    finally { setIsUploadingAvatar(false); }
  };

  const handleViewMembers = async () => {
    setIsMembersOpen(true);
    if (members.length > 0) return;
    setMembersLoading(true);
    try {
      const res = await messageApi.getMembers(conversation.id);
      const data = res.data || res;
      setMembers(data?.result || data || []);
    } catch (err) { console.error("Failed to fetch members:", err); }
    finally { setMembersLoading(false); }
  };

  const handleLeaveGroup = async () => {
    setIsLeaving(true);
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) return;
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentUserId = payload.sub;
      await messageApi.removeParticipant(conversation.id, currentUserId);
      dispatch(removeConversation(conversation.id));
      const remaining = conversations.filter(c => c.id !== conversation.id);
      onLeaveGroup?.(conversation.id, remaining[0] || null);
      onClose?.();
    } catch (err) { console.error("Failed to leave group:", err); }
    finally { setIsLeaving(false); setIsLeaveConfirmOpen(false); }
  };

  if (!conversation) return null;

  const isGroup = conversation.type === "GROUP";
  const name = conversation.user?.displayName || conversation.conversationName || "Unknown";

  // Extract tất cả links từ messages
  const URL_REGEX = /(https?:\/\/[^\s]+)/g;
  const extractedLinks = [];
  messages.forEach((msg) => {
    if (!msg.content || msg.isRevoked) return;
    const matches = msg.content.match(URL_REGEX);
    if (matches) {
      matches.forEach((url) => {
        extractedLinks.push({ url, createdAt: msg.createdAt, sender: msg.sender });
      });
    }
  });
  // Mới nhất lên đầu, deduplicate theo url
  const seen = new Set();
  const uniqueLinks = extractedLinks.reverse().filter(({ url }) => {
    if (seen.has(url)) return false;
    seen.add(url);
    return true;
  });

  // Animation variants
  const slideIn = {
    hidden: { x: 40, opacity: 0 },
    visible: { x: 0, opacity: 1, transition: { type: "spring", stiffness: 300, damping: 28 } },
    exit: { x: 40, opacity: 0, transition: { duration: 0.18 } }
  };

  const staggerContainer = {
    visible: { transition: { staggerChildren: 0.06 } }
  };

  const fadeUp = {
    hidden: { y: 12, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 350, damping: 26 } }
  };

  return (
    <motion.div
      variants={slideIn}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="w-80 border-l border-white/[0.06] bg-[#0a0a0a] flex flex-col h-full z-10 overflow-hidden flex-shrink-0 relative"
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between backdrop-blur-sm bg-[#0a0a0a]/80">
        <span className="text-[15px] font-semibold tracking-tight text-white">Details</span>
        <motion.button
          whileHover={{ scale: 1.1, backgroundColor: "rgba(255,255,255,0.08)" }}
          whileTap={{ scale: 0.92 }}
          onClick={onClose}
          className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </motion.button>
      </div>

      <div className="flex-1 overflow-y-auto details-scroll">
        <motion.div variants={staggerContainer} initial="hidden" animate="visible">

          {/* Profile Section */}
          <motion.div variants={fadeUp} className="flex flex-col items-center px-6 pt-7 pb-6">
            <div className="relative mb-4">
              {/* Glow ring */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-violet-500/30 via-blue-500/20 to-transparent blur-md scale-110 pointer-events-none" />
              <div className="relative">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={name}
                    className="w-[72px] h-[72px] rounded-full object-cover ring-2 ring-white/10" />
                ) : (
                  <div className="w-[72px] h-[72px] rounded-full bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center text-white text-2xl font-bold ring-2 ring-white/10">
                    {name.charAt(0).toUpperCase()}
                  </div>
                )}
                {isGroup && (
                  <>
                    <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={isUploadingAvatar}
                      className="absolute -bottom-0.5 -right-0.5 w-6 h-6 bg-[#333] hover:bg-[#444] rounded-full flex items-center justify-center border-2 border-[#0a0a0a] transition-colors disabled:opacity-50"
                    >
                      {isUploadingAvatar ? <Spinner className="w-3 h-3" /> : <Camera className="w-3 h-3 text-white" />}
                    </motion.button>
                  </>
                )}
              </div>
            </div>
            <h3 className="text-[17px] font-bold text-white text-center leading-tight">{name}</h3>
          </motion.div>

          {/* Quick Actions */}
          <motion.div variants={fadeUp} className="flex justify-center gap-4 px-6 pb-6">
            {/* Mute button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.90 }}
              onClick={() => dispatch(toggleMuteConversation(conversation.id))}
              className="flex flex-col items-center gap-2 group"
            >
              <div className={`relative w-12 h-12 rounded-2xl flex items-center justify-center overflow-hidden ${
                isMuted
                  ? "bg-[#1c1c1c] ring-1 ring-white/10"
                  : "bg-white/[0.07] group-hover:bg-white/[0.11]"
              }`}
                style={{ transition: "background 0.15s" }}
              >
                {/* shimmer on active */}
                {isMuted && (
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                    animate={{ x: ["-100%", "100%"] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: "linear", repeatDelay: 1.5 }}
                  />
                )}
                {/* Cross-fade: cả 2 icon luôn tồn tại, opacity đổi ngay — không có khoảng trống */}
                <div className="relative w-5 h-5">
                  <motion.div
                    animate={{ opacity: isMuted ? 0 : 1, scale: isMuted ? 0.6 : 1 }}
                    transition={{ duration: 0.12 }}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <Bell className="w-5 h-5 text-gray-300 group-hover:text-white transition-colors" />
                  </motion.div>
                  <motion.div
                    animate={{ opacity: isMuted ? 1 : 0, scale: isMuted ? 1 : 0.6 }}
                    transition={{ duration: 0.12 }}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <BellOff className="w-5 h-5 text-white" />
                  </motion.div>
                </div>
              </div>
              <span className={`text-[11px] font-medium transition-colors ${isMuted ? "text-zinc-300" : "text-gray-500 group-hover:text-gray-300"}`}>
                {isMuted ? "Muted" : "Mute"}
              </span>
            </motion.button>

            {/* Search button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.93 }}
              onClick={() => setIsSearchOpen(true)}
              className="flex flex-col items-center gap-2 group"
            >
              <div className="w-12 h-12 rounded-2xl bg-white/[0.07] group-hover:bg-white/[0.11] flex items-center justify-center transition-colors">
                <Search className="w-5 h-5 text-gray-300 group-hover:text-white transition-colors" />
              </div>
              <span className="text-[11px] font-medium text-gray-500 group-hover:text-gray-300 transition-colors">Search</span>
            </motion.button>
          </motion.div>

          {/* Divider */}
          <div className="mx-5 h-px bg-white/[0.05]" />

          {/* Group Actions */}
          {isGroup && (
            <motion.div variants={fadeUp} className="p-3 mt-2">
              <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider px-2 mb-2">Group</p>
              {[
                { icon: Users, label: "Members", onClick: handleViewMembers },
                { icon: UserPlus, label: "Add Member", onClick: () => setIsAddMemberOpen(true) },
              ].map(({ icon: Icon, label, onClick }) => (
                <motion.button
                  key={label}
                  whileHover={{ x: 2, backgroundColor: "rgba(255,255,255,0.05)" }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onClick}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors text-sm group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-white/[0.06] flex items-center justify-center group-hover:bg-white/[0.1] transition-colors">
                      <Icon className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" />
                    </div>
                    <span className="text-gray-300 group-hover:text-white transition-colors font-medium">{label}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors" />
                </motion.button>
              ))}
              <motion.button
                whileHover={{ x: 2, backgroundColor: "rgba(239,68,68,0.07)" }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsLeaveConfirmOpen(true)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-sm group mt-1"
              >
                <div className="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center group-hover:bg-red-500/15 transition-colors">
                  <LogOut className="w-4 h-4 text-red-400" />
                </div>
                <span className="text-red-400 font-medium">Leave Group</span>
              </motion.button>
            </motion.div>
          )}

          {/* Divider */}
          {isGroup && <div className="mx-5 h-px bg-white/[0.05] mt-1" />}

          {/* Shared Media — header là button clickable giống Links, grid preview 6 ảnh bên dưới */}
          <motion.div variants={fadeUp} className="px-3 pt-4 pb-2">
            {/* Header button — giống Links */}
            <motion.button
              whileHover={{ x: 2, backgroundColor: "rgba(255,255,255,0.04)" }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsMediaOpen(true)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-white/[0.06] flex items-center justify-center group-hover:bg-white/[0.09] transition-colors">
                  <ImageIcon className="w-4 h-4 text-gray-400 group-hover:text-gray-200 transition-colors" />
                </div>
                <span className="text-sm font-medium text-gray-400 group-hover:text-gray-200 transition-colors">Shared Media</span>
                {sharedMedia.length > 0 && (
                  <span className="text-[10px] font-semibold bg-white/[0.1] text-gray-400 px-1.5 py-0.5 rounded-full">
                    {sharedMedia.length}
                  </span>
                )}
              </div>
              <ChevronRight className="w-4 h-4 text-gray-700 group-hover:text-gray-500 transition-colors" />
            </motion.button>

            {/* Grid preview 6 ảnh */}
            {mediaLoading ? (
              <div className="flex justify-center py-6">
                <Spinner className="w-5 h-5 text-gray-600" />
              </div>
            ) : sharedMedia.length > 0 ? (
              <div className="grid grid-cols-3 gap-1.5 mt-2 px-1">
                {sharedMedia.slice(0, 6).map((m, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.05, type: "spring", stiffness: 400, damping: 24 }}
                    whileHover={{ scale: 1.04, zIndex: 1 }}
                    className="aspect-square bg-[#1a1a1a] rounded-xl overflow-hidden cursor-pointer relative"
                    onClick={() => { setViewerIndex(idx); setViewerOpen(true); }}
                  >
                    {m.mediaType === 'image' ? (
                      <img src={m.mediaUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="relative w-full h-full bg-[#111]">
                        <video src={m.mediaUrl} className="w-full h-full object-cover" preload="metadata" muted />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                          <div className="w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center border border-white/20">
                            <svg className="w-3 h-3 text-white ml-0.5" viewBox="0 0 12 12" fill="currentColor">
                              <polygon points="2,1 11,6 2,11" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors rounded-xl" />
                  </motion.div>
                ))}
              </div>
            ) : null}
          </motion.div>

          {/* Files & Links */}
          <motion.div variants={fadeUp} className="px-3 pb-6 space-y-1">

            {[
              { icon: FileText, label: "Files" },
            ].map(({ icon: Icon, label }) => (
              <motion.button
                key={label}
                whileHover={{ x: 2, backgroundColor: "rgba(255,255,255,0.04)" }}
                whileTap={{ scale: 0.98 }}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-white/[0.06] flex items-center justify-center group-hover:bg-white/[0.09] transition-colors">
                    <Icon className="w-4 h-4 text-gray-400 group-hover:text-gray-200 transition-colors" />
                  </div>
                  <span className="text-sm font-medium text-gray-400 group-hover:text-gray-200 transition-colors">{label}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-700 group-hover:text-gray-500 transition-colors" />
              </motion.button>
            ))}

            {/* Links button */}
            <motion.button
              whileHover={{ x: 2, backgroundColor: "rgba(255,255,255,0.04)" }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsLinksOpen(true)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-white/[0.06] flex items-center justify-center group-hover:bg-white/[0.09] transition-colors">
                  <LinkIcon className="w-4 h-4 text-gray-400 group-hover:text-gray-200 transition-colors" />
                </div>
                <span className="text-sm font-medium text-gray-400 group-hover:text-gray-200 transition-colors">Links</span>
                {uniqueLinks.length > 0 && (
                  <span className="text-[10px] font-semibold bg-white/[0.1] text-gray-400 px-1.5 py-0.5 rounded-full">
                    {uniqueLinks.length}
                  </span>
                )}
              </div>
              <ChevronRight className="w-4 h-4 text-gray-700 group-hover:text-gray-500 transition-colors" />
            </motion.button>
          </motion.div>

        </motion.div>
      </div>

      {/* Scrollbar style */}
      <style>{`
        .details-scroll::-webkit-scrollbar { width: 3px; }
        .details-scroll::-webkit-scrollbar-track { background: transparent; }
        .details-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 10px; }
      `}</style>

      {/* Search slide-in panel */}
      <div
        className="absolute inset-0 bg-[#0a0a0a] flex flex-col z-20"
        style={{ transform: isSearchOpen ? "translateX(0)" : "translateX(100%)", transition: "transform 0.22s ease-in-out" }}
      >
        {/* Header */}
        <div className="px-4 py-3.5 border-b border-white/[0.06] flex items-center gap-3 flex-shrink-0">
          <motion.button
            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
            onClick={() => { setIsSearchOpen(false); setSearchMsgQuery(""); setSearchMsgResults([]); }}
            className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/[0.08] transition-colors text-gray-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
          </motion.button>
          <span className="text-[15px] font-semibold text-white">Search</span>
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-b border-white/[0.04] flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search in conversation..."
              value={searchMsgQuery}
              onChange={(e) => setSearchMsgQuery(e.target.value)}
              autoFocus={isSearchOpen}
              className="w-full bg-white/[0.06] border border-white/[0.08] rounded-xl pl-9 pr-9 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-white/[0.2] transition-colors"
            />
            {searchMsgQuery && (
              <button onClick={() => setSearchMsgQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto details-scroll py-1">
          {!searchMsgQuery.trim() ? (
            <div className="flex flex-col items-center py-12 gap-2">
              <div className="w-10 h-10 rounded-2xl bg-white/[0.04] flex items-center justify-center">
                <Search className="w-5 h-5 text-gray-600" />
              </div>
              <p className="text-xs text-gray-600">Type to search messages</p>
            </div>
          ) : searchMsgLoading ? (
            <div className="flex justify-center py-12">
              <Spinner className="w-5 h-5 text-gray-600" />
            </div>
          ) : searchMsgResults.length === 0 ? (
            <div className="flex flex-col items-center py-12 gap-2">
              <div className="w-10 h-10 rounded-2xl bg-white/[0.04] flex items-center justify-center">
                <Search className="w-5 h-5 text-gray-600" />
              </div>
              <p className="text-xs text-gray-600">No results found</p>
            </div>
          ) : (
            <div className="px-2 space-y-0.5 pt-1">
              {searchMsgResults.map((msg, idx) => {
                const senderName = msg.sender?.fullName || "Unknown";
                const senderAvatar = msg.sender?.avatarUrl;
                const keyword = searchMsgQuery.trim();
                const highlight = (text) => {
                  if (!text) return null;
                  const parts = text.split(new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
                  return parts.map((part, i) =>
                    part.toLowerCase() === keyword.toLowerCase()
                      ? <span key={i} className="text-white font-semibold">{part}</span>
                      : <span key={i} className="text-gray-400">{part}</span>
                  );
                };
                return (
                  <motion.div
                    key={msg.id ?? idx}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.02 }}
                    onClick={() => onScrollToMessage?.(msg.id)}
                    className="flex items-start gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.05] transition-colors cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                      {senderAvatar
                        ? <img src={senderAvatar} alt="" className="w-full h-full object-cover" />
                        : senderName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[12px] font-semibold text-gray-200 truncate">{senderName}</span>
                        <span className="text-[10px] text-gray-600 flex-shrink-0">
                          {msg.createdAt ? new Date(msg.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) : ""}
                        </span>
                      </div>
                      <p className="text-[12px] leading-relaxed line-clamp-2">
                        {highlight(msg.content)}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
              {/* sentinel infinite scroll */}
              {searchHasMore && (
                <div ref={searchLoadMoreRef} className="py-3 flex justify-center">
                  {searchLoadingMore && <Spinner className="w-4 h-4 text-gray-600" />}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Media slide-in panel */}
      <div
        className="absolute inset-0 bg-[#0a0a0a] flex flex-col z-20"
        style={{ transform: isMediaOpen ? "translateX(0)" : "translateX(100%)", transition: "transform 0.22s ease-in-out" }}
      >
        {/* Header */}
        <div className="px-4 py-3.5 border-b border-white/[0.06] flex items-center gap-3 flex-shrink-0">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsMediaOpen(false)}
            className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/[0.08] transition-colors text-gray-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
          </motion.button>
          <span className="text-[15px] font-semibold text-white">Shared Media</span>
        </div>

        {/* Grid tất cả media */}
        <div className="flex-1 overflow-y-auto details-scroll p-3">
          {sharedMedia.length === 0 && !mediaLoading ? (
            <div className="flex flex-col items-center py-12 gap-2">
              <div className="w-10 h-10 rounded-2xl bg-white/[0.04] flex items-center justify-center">
                <ImageIcon className="w-5 h-5 text-gray-600" />
              </div>
              <p className="text-xs text-gray-600">No media shared yet</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-1.5">
                {sharedMedia.map((m, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, scale: 0.88 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: Math.min(idx * 0.03, 0.3), type: "spring", stiffness: 380, damping: 24 }}
                    whileHover={{ scale: 1.03, zIndex: 1 }}
                    className="aspect-square bg-[#1a1a1a] rounded-xl overflow-hidden cursor-pointer relative"
                    onClick={() => {
                      setViewerIndex(idx);
                      setViewerOpen(true);
                    }}
                  >
                    {m.mediaType === 'image' ? (
                      <img src={m.mediaUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="relative w-full h-full bg-[#111]">
                        <video src={m.mediaUrl} className="w-full h-full object-cover" preload="metadata" muted />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                          <div className="w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center border border-white/20">
                            <svg className="w-3 h-3 text-white ml-0.5" viewBox="0 0 12 12" fill="currentColor">
                              <polygon points="2,1 11,6 2,11" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors rounded-xl" />
                  </motion.div>
                ))}
              </div>
              {/* sentinel cho infinite scroll */}
              {mediaHasMore && (
                <div ref={mediaLoadMoreRef} className="py-4 flex justify-center">
                  {mediaLoadingMore && <Spinner className="w-4 h-4 text-gray-600" />}
                </div>
              )}
              {!mediaHasMore && sharedMedia.length > 0 && (
                <div className="flex items-center gap-3 py-4 px-2">
                  <div className="flex-1 h-px bg-white/[0.06]" />
                  <span className="text-[11px] text-gray-400 font-semibold tracking-wide">All media loaded</span>
                  <div className="flex-1 h-px bg-white/[0.06]" />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Links slide-in panel — absolute overlay bên trong panel Details */}
      <div
        className="absolute inset-0 bg-[#0a0a0a] flex flex-col z-20 transition-transform duration-250 ease-in-out"
        style={{ transform: isLinksOpen ? "translateX(0)" : "translateX(100%)", transition: "transform 0.22s ease-in-out" }}
      >
        {/* Header */}
        <div className="px-4 py-3.5 border-b border-white/[0.06] flex items-center gap-3 flex-shrink-0">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsLinksOpen(false)}
            className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/[0.08] transition-colors text-gray-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
          </motion.button>
          <span className="text-[15px] font-semibold text-white">Links</span>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto details-scroll py-2">
          {uniqueLinks.length === 0 ? (
            <div className="flex flex-col items-center py-12 gap-2">
              <div className="w-10 h-10 rounded-2xl bg-white/[0.04] flex items-center justify-center">
                <LinkIcon className="w-5 h-5 text-gray-600" />
              </div>
              <p className="text-xs text-gray-600">No links shared yet</p>
            </div>
          ) : (
            <div className="px-3 pt-1 space-y-0.5">
              {uniqueLinks.map(({ url }, idx) => {
                let displayUrl = url;
                try {
                  const u = new URL(url);
                  displayUrl = u.hostname.replace(/^www\./, "") + (u.pathname !== "/" ? u.pathname : "");
                  if (displayUrl.length > 36) displayUrl = displayUrl.slice(0, 36) + "…";
                } catch {}
                return (
                  <a
                    key={idx}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.05] transition-colors group"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="w-8 h-8 rounded-xl bg-white/[0.07] flex items-center justify-center flex-shrink-0 group-hover:bg-white/[0.11] transition-colors">
                      <LinkIcon className="w-3.5 h-3.5 text-blue-400" />
                    </div>
                    <span className="text-sm text-gray-300 group-hover:text-blue-400 truncate transition-colors">
                      {displayUrl}
                    </span>
                  </a>
                );
              })}
            </div>
          )}
        </div>
      </div>
      {/* Avatar Crop Dialog */}
      <AvatarCropDialog open={isCropOpen} imageSrc={cropImageSrc}
        onClose={() => setIsCropOpen(false)} onCropDone={handleCropDone} />

      {/* Members Dialog */}
      <Dialog open={isMembersOpen} onOpenChange={setIsMembersOpen}>
        <DialogContent className="bg-[#111] border-[#1e1e1e] text-white max-w-sm rounded-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Members</DialogTitle>
          </DialogHeader>
          <div className="pt-1 pb-2">
            {membersLoading ? (
              <div className="flex justify-center p-6"><Spinner className="w-5 h-5 text-gray-500" /></div>
            ) : (
              <div className="max-h-72 overflow-y-auto space-y-0.5 pr-1">
                {members.map(member => (
                  <div key={member.userId} className="flex items-center gap-3 px-2 py-2.5 hover:bg-white/[0.04] rounded-xl transition-colors">
                    <UserAvatar user={{ ...member, id: member.userId, avatar: member.avatarUrl }} avatarClassName="w-8 h-8" />
                    <p className="text-sm font-medium text-gray-200 truncate">{member.fullName || "Unknown"}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Leave Confirm Dialog */}
      <Dialog open={isLeaveConfirmOpen} onOpenChange={setIsLeaveConfirmOpen}>
        <DialogContent className="bg-[#0f0f0f] border-[#1e1e1e] text-white max-w-xs rounded-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Leave group?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-400 leading-relaxed">
            Bạn sẽ không nhận được tin nhắn từ <span className="text-white font-medium">{name}</span> nữa.
          </p>
          <div className="flex gap-2 pt-1">
            <button onClick={() => setIsLeaveConfirmOpen(false)}
              className="flex-1 py-2 text-sm font-medium rounded-xl bg-white/[0.06] hover:bg-white/[0.1] transition-colors">
              Huỷ
            </button>
            <button onClick={handleLeaveGroup} disabled={isLeaving}
              className="flex-1 py-2 text-sm font-semibold rounded-xl bg-red-500/90 hover:bg-red-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {isLeaving && <Spinner className="w-3.5 h-3.5" />}
              Rời nhóm
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Member Dialog */}
      <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
        <DialogContent className="bg-[#111] border-[#1e1e1e] text-white max-w-sm rounded-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Add Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1 pb-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
              <input type="text" placeholder="Search users..." value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl pl-9 pr-4 py-2.5 text-sm placeholder-gray-600 focus:outline-none focus:border-white/[0.18] transition-colors"
              />
            </div>
            <div className="max-h-56 overflow-y-auto space-y-0.5">
              {searchLoading ? (
                <div className="flex justify-center p-6"><Spinner className="w-5 h-5 text-gray-500" /></div>
              ) : searchResults.length === 0 && searchQuery ? (
                <p className="text-sm text-gray-600 text-center py-6">No users found</p>
              ) : searchResults.map(user => (
                <div key={user.userId} className="flex items-center justify-between px-2 py-2.5 hover:bg-white/[0.04] rounded-xl transition-colors">
                  <div className="flex items-center gap-3">
                    <UserAvatar user={{ ...user, id: user.userId, avatar: user.avatarUrl }} avatarClassName="w-9 h-9" />
                    <div>
                      <p className="text-sm font-medium">{user.fullName || user.username}</p>
                      <p className="text-xs text-gray-500">@{user.username}</p>
                    </div>
                  </div>
                  <button onClick={() => handleAddMember(user.userId)} disabled={isAdding}
                    className="text-xs font-semibold bg-white text-black hover:bg-gray-200 px-3.5 py-1.5 rounded-full transition-colors disabled:opacity-50">
                    Add
                  </button>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Viewer */}
      <ImageViewer open={viewerOpen} onClose={() => setViewerOpen(false)}
        mediaList={sharedMedia.map(m => ({ mediaUrl: m.mediaUrl, mediaType: m.mediaType }))}
        index={viewerIndex}
      />
    </motion.div>
  );
}
