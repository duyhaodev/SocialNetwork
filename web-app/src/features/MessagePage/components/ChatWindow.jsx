import { useEffect, useState, useRef } from "react";
import { Phone, Video, Camera, Info, Smile, Mic, Image, Heart, Send, X, RotateCcw, Pencil } from "lucide-react";
import EmojiPicker from "emoji-picker-react";
import { messageApi } from "../../../api/messageApi";
import mediaApi from "../../../api/mediaApi";
import { Spinner } from "../../../components/ui/spinner";
import { showUnderDevelopmentToast } from "../../../utils/commonUtils";

import { searchApi } from "../../../api/searchApi";
import { Search } from "lucide-react";
import { UserAvatar } from "../../../components/ui/user-avatar";
import { useSelector, useDispatch } from "react-redux";
import { startOutgoingCall } from "../../../store/callSlice";
import { receiveRevokeMessage, receiveEditMessage, receiveReactionUpdate } from "../../../store/chatSlice";
import { useSocket } from "../../../context/SocketContext";
import { ConversationDetails } from "./ConversationDetails";
import { ImageViewer } from "../../../components/ImageViewer/ImageViewer";

export function ChatWindow({ conversation, onSendMessageSuccess, incomingMessage, revokedMessage, editedMessage, reactionUpdate }) {
  const { profile } = useSelector(state => state.user);
  const dispatch = useDispatch();
  const socket = useSocket();
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [showEmojiPickerFor, setShowEmojiPickerFor] = useState(null);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const emojiRef = useRef(null);
  const emojiPickerRef = useRef(null);

  const EMOJI_LIST = ['❤️', '👍', '😂', '😮', '😢', '😡'];

  // Helper to determine if a message is from me
  const checkIsMe = (msg) => {
    if (!profile || !msg) return false;
    const senderId = msg.sender?.id || msg.senderId;
    return senderId === profile.id || senderId === profile.userId;
  };

  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerMediaList, setViewerMediaList] = useState([]);
  const [viewerIndex, setViewerIndex] = useState(0);

  const handleOpenViewer = (media, index) => {
    const formattedMedia = media.map(m => ({
      mediaUrl: m.url,
      mediaType: m.type
    }));
    setViewerMediaList(formattedMedia);
    setViewerIndex(index);
    setViewerOpen(true);
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle incoming real-time message (New Message)
  useEffect(() => {
    if (incomingMessage && conversation && incomingMessage.conversationId === conversation.id) {
      setMessages((prev) => {
        // Prevent duplicates
        if (prev.some((msg) => msg.id === incomingMessage.id)) return prev;

        const newMessage = {
          ...incomingMessage,
          isMe: checkIsMe(incomingMessage)
        };
        return [...prev, newMessage];
      });
    }
  }, [incomingMessage, conversation, profile]);

  // Handle incoming real-time message (Revoke Message)
  useEffect(() => {
    if (revokedMessage && conversation && revokedMessage.conversationId === conversation.id) {
      setMessages((prev) => prev.map(m => m.id === revokedMessage.id ? { ...m, isRevoked: true } : m));
    }
  }, [revokedMessage, conversation]);

  // Handle incoming real-time message (Edit Message)
  useEffect(() => {
    if (editedMessage && conversation && editedMessage.conversationId === conversation.id) {
      setMessages((prev) => prev.map(m => m.id === editedMessage.id ? { ...m, content: editedMessage.content, isEdited: true } : m));
    }
  }, [editedMessage, conversation]);

  // Handle incoming real-time message (Reaction Update)
  useEffect(() => {
    if (reactionUpdate && conversation && reactionUpdate.conversationId === conversation.id) {
      setMessages((prev) => prev.map(m => m.id === reactionUpdate.id ? { ...m, reactions: reactionUpdate.reactions } : m));
    }
  }, [reactionUpdate, conversation]);

  const handleRevokeMessage = async (messageId) => {
    try {
      const res = await messageApi.revokeMessage(messageId);
      const data = res.data || res;
      if (data.code === 1000) {
        // Optimistic update locally
        setMessages(prev => prev.map(m => m.id === messageId ? { ...m, isRevoked: true } : m));
        // Update Redux (this will update sidebar)
        dispatch(receiveRevokeMessage(data.result));
      }
    } catch (error) {
      console.error("Failed to revoke message:", error);
    }
  };

  const handleStartEdit = (msg) => {
    setEditingMessageId(msg.id);
    setMessageInput(msg.content);
    setEmojiOpen(false);
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setMessageInput("");
  };

  const handleReact = async (messageId, emoji) => {
    try {
      const res = await messageApi.reactToMessage({ messageId, emoji });
      const data = res.data || res;
      if (data.code === 1000) {
        setMessages(prev => prev.map(m => m.id === messageId ? { ...m, reactions: data.result.reactions } : m));
        dispatch(receiveReactionUpdate(data.result));
      }
    } catch (error) {
      console.error("Failed to react to message:", error);
    } finally {
      setShowEmojiPickerFor(null);
    }
  };

  // EMOJI PICKER & EDIT POPUP: Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target)) {
        setEmojiOpen(false);
      }
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) {
        setShowEmojiPickerFor(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Load messages when conversation changes
  useEffect(() => {
    const fetchMessages = async () => {
      if (!conversation?.id || conversation.id.startsWith("temp_")) {
        setMessages([]);
        return;
      }

      setMessagesLoading(true);
      try {
        const res = await messageApi.getMessages(conversation.id);
        const data = res.data || res;

        if (data && data.code === 1000) {
          // Backend returns newest first -> Reverse to show oldest on top
          const sortedMsgs = (data.result || [])
            .slice()
            .reverse()
            .map((m) => ({
              ...m,
              isMe: checkIsMe(m),
            }));
          setMessages(sortedMsgs);
        } else {
          setMessages([]);
        }
      } catch (err) {
        console.error("❌ getMessages error:", err);
        setMessages([]);
      } finally {
        setMessagesLoading(false);
      }
    };

    fetchMessages();
  }, [conversation?.id, profile]);

  const handleInitiateCall = async (type) => {
    const partnerId = conversation.partnerId || (conversation.user && conversation.user.userId) || conversation.userId;
    if (!partnerId) return;
    const payload = {
      calleeId: partnerId,
      conversationId: conversation.id,
      type: type
    };
    try {
      const res = await messageApi.initiateCall(payload);
      const callData = res.data?.result || res.result || res.data || payload;
      dispatch(startOutgoingCall(callData));
    } catch (error) {
      console.error("Failed to initiate call:", error);
    }
  };

  const handleEmojiClick = (emojiData) => {
    setMessageInput((prev) => prev + emojiData.emoji);
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      // Create previews
      const newFiles = files.map(file => ({
        file,
        preview: URL.createObjectURL(file),
        type: file.type.startsWith('image/') ? 'image' : 'video'
      }));
      setSelectedFiles(prev => [...prev, ...newFiles]);
    }
    e.target.value = null; // Reset input
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => {
      const newFiles = [...prev];
      URL.revokeObjectURL(newFiles[index].preview);
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const handleSendMessage = async () => {
    const content = messageInput.trim();
    if (!content && selectedFiles.length === 0) return;
    if (!conversation?.id) return;

    if (editingMessageId) {
      try {
        const res = await messageApi.editMessage({ messageId: editingMessageId, content });
        const data = res.data || res;
        if (data.code === 1000) {
          setMessages(prev => prev.map(m => m.id === editingMessageId ? { ...m, content, isEdited: true } : m));
          dispatch(receiveEditMessage(data.result));
          handleCancelEdit();
        }
      } catch (error) {
        console.error("Failed to edit message:", error);
      }
      return;
    }

    try {
      setIsUploading(true);

      let mediaData = [];
      if (selectedFiles.length > 0) {
        const fd = new FormData();
        selectedFiles.forEach(f => {
          fd.append("files", f.file);
        });

        const uploadRes = await mediaApi.upload(fd);
        // media-service returns a raw List<MediaResponse> which axiosClient interceptor unwraps to an array
        const uploadData = Array.isArray(uploadRes) ? uploadRes : (uploadRes?.result || []);

        mediaData = uploadData.map(m => ({
          id: m.id,
          url: m.mediaUrl,
          type: m.mediaType
        }));
      }

      setMessageInput(""); // Clear input immediately
      setSelectedFiles([]); // Clear files
      setEmojiOpen(false); // Close emoji picker

      const res = await messageApi.sendMessage({
        conversationId: conversation.id,
        content: content,
        media: mediaData
      });

      const data = res.data || res;

      if (data && data.code === 1000) {
        const newMsg = data.result;
        const normalized = { ...newMsg, isMe: true };

        setMessages((prev) => {
          if (prev.some(m => m.id === normalized.id)) {
            return prev;
          }
          return [...prev, normalized];
        });

        if (onSendMessageSuccess) {
          onSendMessageSuccess(newMsg);
        }
      }
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-row overflow-hidden relative">
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#333]">
          <div className="flex items-center gap-3">
            {conversation?.user?.avatar ? (
              <img
                src={conversation.user.avatar}
                alt={conversation.user?.displayName || ""}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center text-white font-medium">
                {(conversation?.user?.displayName || "")
                  .charAt(0)
                  .toUpperCase()}
              </div>
            )}
            <div>
              <h3 className="font-medium">
                {conversation?.user?.displayName || "Chưa chọn cuộc trò chuyện"}
              </h3>
            </div>
          </div>
          {conversation ? (
            <div className="flex items-center gap-2">
              <button
                className="p-2 hover:bg-[#1a1a1a] rounded-lg transition-colors"
                onClick={() => handleInitiateCall('AUDIO')}
              >
                <Phone className="w-5 h-5" />
              </button>
              <button
                className="p-2 hover:bg-[#1a1a1a] rounded-lg transition-colors"
                onClick={() => handleInitiateCall('VIDEO')}
              >
                <Video className="w-5 h-5" />
              </button>
              <button className="p-2 hover:bg-[#1a1a1a] rounded-lg transition-colors" onClick={() => setIsInfoOpen(!isInfoOpen)}>
                <Info className={`w-5 h-5 ${isInfoOpen ? "text-[#0095f6]" : ""}`} />
              </button>
            </div>
          ) : null}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messagesLoading ? (
            <div className="flex items-center justify-center h-full">
              <Spinner className="w-8 h-8 text-gray-500" />
            </div>
          ) : messages && messages.length > 0 ? (
            messages.map((msg) => (
              <div key={msg.id} className="space-y-1">
                <div className={`flex ${msg.isMe ? "justify-end" : "justify-start"}`}>
                  {!msg.isMe && (
                    <div className="mr-2 mt-1 flex-shrink-0">
                      {msg.sender?.avatarUrl ? (
                        <img src={msg.sender.avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-gray-600 flex items-center justify-center text-white text-xs">
                          {(msg.sender?.fullName || "U").charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                  )}

                  <div className={`flex flex-col max-w-md ${msg.isMe ? "items-end" : "items-start"}`}>
                    {conversation?.type === "GROUP" && !msg.isMe && (
                      <p className="text-[10px] font-bold text-gray-400 mb-1 ml-1">
                        {msg.sender?.fullName || "Unknown"}
                      </p>
                    )}

                    {msg.isRevoked ? (
                      <div className="px-4 py-2 rounded-2xl bg-[#1a1a1a] border border-[#333] text-gray-500 italic text-sm">
                        Tin nhắn đã bị thu hồi
                      </div>
                    ) : (
                      <div className="relative group flex flex-col items-inherit">
                        <div className={`flex items-center gap-2 ${msg.isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                          {/* Message Content Bubble */}
                          {msg.content && !msg.content.startsWith("📞 Cuộc gọi") && (
                            <div
                              title={msg.createdAt ? new Date(msg.createdAt).toLocaleString() : ""}
                              className={`px-4 py-2 rounded-2xl break-words relative ${msg.media && msg.media.length > 0 ? "mb-2" : ""} ${msg.isMe ? "bg-[#0095f6] text-white" : "bg-[#262626] text-white"}`}
                            >
                              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                              {msg.isEdited && (
                                <span className="text-[9px] opacity-60 block mt-1">(đã chỉnh sửa)</span>
                              )}
                            </div>
                          )}

                          {/* Controls (Smile, Pencil, Revoke) */}
                          {!msg.content?.startsWith("📞 Cuộc gọi") && (
                            <div className={`flex items-center gap-1 transition-opacity duration-200 ${showEmojiPickerFor === msg.id ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto'}`}>
                              <button 
                                onClick={() => setShowEmojiPickerFor(msg.id === showEmojiPickerFor ? null : msg.id)}
                                className={`p-1.5 bg-[#1a1a1a] rounded-full hover:text-yellow-500 ${showEmojiPickerFor === msg.id ? 'text-yellow-500 opacity-100' : 'text-gray-400'}`}
                                title="Thả cảm xúc"
                              >
                                <Smile size={14} />
                              </button>
                              
                              {msg.isMe && (
                                <>
                                  {/* Chỉ hiện nút sửa cho tin nhắn cuối cùng của mình */}
                                  {messages.filter(m => m.isMe && !m.isRevoked && !m.content?.startsWith("📞")).pop()?.id === msg.id && (
                                    <button 
                                      onClick={() => handleStartEdit(msg)}
                                      className="p-1.5 bg-[#1a1a1a] rounded-full text-gray-400 hover:text-blue-500"
                                      title="Sửa"
                                    >
                                      <Pencil size={14} />
                                    </button>
                                  )}
                                  <button 
                                    onClick={() => handleRevokeMessage(msg.id)}
                                    className="p-1.5 bg-[#1a1a1a] rounded-full text-gray-400 hover:text-red-500"
                                    title="Thu hồi"
                                  >
                                    <RotateCcw size={14} />
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Call Logs */}
                        {msg.content && msg.content.startsWith("📞 Cuộc gọi") && (
                          <div
                            title={msg.createdAt ? new Date(msg.createdAt).toLocaleString() : ""}
                            onClick={() => handleInitiateCall(msg.content.includes("Video") ? 'VIDEO' : 'AUDIO')}
                            className={`px-4 py-3 rounded-2xl flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity ${msg.media && msg.media.length > 0 ? "mb-2" : ""} ${msg.isMe ? "bg-[#262626] text-white" : "bg-[#1a1a1a] border border-[#333] text-white"}`}
                          >
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${msg.content.includes("nhỡ") || msg.content.includes("từ chối") ? 'bg-red-500/20 text-red-500' : 'bg-gray-700 text-white'}`}>
                                {msg.content.includes("Video") ? <Video size={20} /> : <Phone size={20} />}
                            </div>
                            <div className="flex flex-col">
                                <p className="text-sm font-medium">{msg.content.replace("📞 ", "")}</p>
                                <span className="text-xs text-gray-400 mt-0.5">Nhấn để gọi lại</span>
                            </div>
                          </div>
                        )}

                        {/* Media */}
                        {msg.media && msg.media.length > 0 && (
                          <div
                            className={`grid gap-2 mt-1 ${msg.media.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}
                            title={msg.createdAt ? new Date(msg.createdAt).toLocaleString() : ""}
                          >
                            {msg.media.map((m, idx) => (
                              <div key={idx} className="rounded-2xl overflow-hidden border border-[#333]">
                                {m.type === 'image' ? (
                                  <img
                                    src={m.url}
                                    alt=""
                                    className="max-w-64 h-auto object-cover cursor-pointer hover:opacity-90 transition-opacity block"
                                    onClick={() => handleOpenViewer(msg.media, idx)}
                                  />
                                ) : (
                                  <video src={m.url} controls className="max-w-64 h-auto block" />
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Emoji Picker Popover */}
                        {showEmojiPickerFor === msg.id && (
                          <div 
                            ref={emojiPickerRef}
                            className={`absolute bottom-full mb-2 bg-[#1a1a1a] border border-[#333] p-1.5 rounded-full flex gap-1 shadow-2xl z-50 ${msg.isMe ? 'right-0' : 'left-0'}`}
                          >
                            {EMOJI_LIST.map(emoji => (
                              <button 
                                key={emoji} 
                                onClick={() => handleReact(msg.id, emoji)}
                                className={`hover:scale-125 transition-transform p-1 rounded-full ${msg.reactions?.[profile?.id || profile?.userId] === emoji ? 'bg-[#333]' : ''}`}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Reactions Display */}
                        {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                          <div className={`flex flex-wrap gap-1 -mt-3 mb-1 relative z-10 ${msg.isMe ? 'justify-end pr-2' : 'justify-start pl-2'}`}>
                            {Object.entries(
                              Object.values(msg.reactions).reduce((acc, emoji) => {
                                acc[emoji] = (acc[emoji] || 0) + 1;
                                return acc;
                              }, {})
                            ).map(([emoji, count]) => (
                              <button
                                key={emoji}
                                onClick={() => handleReact(msg.id, emoji)}
                                className={`flex items-center gap-1 bg-[#1a1a1a] border border-[#333] rounded-full px-1.5 py-0.5 text-[10px] shadow-sm hover:bg-[#262626] transition-colors ${msg.reactions?.[profile?.id || profile?.userId] === emoji ? 'border-blue-500/50 bg-[#1e293b]' : ''}`}
                              >
                                <span>{emoji}</span>
                                {count > 1 && <span className="font-medium">{count}</span>}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400 p-6">
              <p className="mb-2 text-lg">No messages found</p>
              <p className="mb-4 text-sm">Start a new conversation.</p>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="p-4 border-t border-[#333]">
          {editingMessageId && (
            <div className="flex items-center justify-between bg-[#1a1a1a] px-4 py-2 mb-2 rounded-lg border-l-4 border-blue-500">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Pencil size={12} />
                <span>Đang chỉnh sửa tin nhắn...</span>
              </div>
              <button onClick={handleCancelEdit} className="text-gray-400 hover:text-white">
                <X size={14} />
              </button>
            </div>
          )}
          {selectedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {selectedFiles.map((file, idx) => (
                <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border border-[#333]">
                  {file.type === 'image' ? (
                    <img src={file.preview} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                      <Video className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                  <button onClick={() => removeFile(idx)} className="absolute top-1 right-1 bg-black/50 rounded-full p-0.5 hover:bg-black/70">
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3 bg-[#1a1a1a] rounded-full px-4 py-2 border border-[#333]">
            <input
              type="text"
              placeholder="Messaging ..."
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && !isUploading && handleSendMessage()}
              className="flex-1 bg-transparent border-none outline-none text-sm"
            />
            <div className="flex items-center gap-2">
              <div className="relative flex" ref={emojiRef}>
                <button className="text-gray-400 hover:text-white transition-colors" onClick={() => setEmojiOpen((v) => !v)}>
                  <Smile className="w-5 h-5" />
                </button>
                {emojiOpen && (
                  <div className="absolute bottom-12 right-0 z-50 w-72 rounded-xl border border-gray-700 bg-[#111] shadow-lg">
                    <EmojiPicker
                      theme="dark" width="100%" height={400} emojiStyle="native"
                      searchDisabled previewConfig={{ showPreview: false }} onEmojiClick={handleEmojiClick}
                    />
                  </div>
                )}
              </div>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" multiple onChange={handleFileSelect} />
              <button className="text-gray-400 hover:text-white transition-colors" onClick={() => fileInputRef.current?.click()}>
                <Image className="w-5 h-5" />
              </button>
              <button
                className={`text-gray-400 hover:text-white transition-colors ${isUploading ? 'opacity-50' : ''}`}
                onClick={handleSendMessage} disabled={isUploading}
              >
                {isUploading ? <Spinner className="w-5 h-5" /> : <Send className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>
      {isInfoOpen && (
        <ConversationDetails conversation={conversation} onClose={() => setIsInfoOpen(false)} />
      )}

      <ImageViewer
        open={viewerOpen}
        onClose={() => setViewerOpen(false)}
        mediaList={viewerMediaList}
        index={viewerIndex}
      />
    </div>
  );
}
