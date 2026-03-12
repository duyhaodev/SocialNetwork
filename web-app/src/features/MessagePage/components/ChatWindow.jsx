import { useEffect, useState, useRef } from "react";
import { Phone, Video, Info, Smile, Mic, Image, Heart, Send } from "lucide-react";
import EmojiPicker from "emoji-picker-react";
import { messageApi } from "../../../api/messageApi";
import { Spinner } from "../../../components/ui/spinner";
import { showUnderDevelopmentToast } from "../../../utils/commonUtils";

export function ChatWindow({ conversation, onSendMessageSuccess, incomingMessage }) {
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  const messagesEndRef = useRef(null);

  // EMOJI STATE
  const [emojiOpen, setEmojiOpen] = useState(false);
  const emojiRef = useRef(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle incoming real-time message
  useEffect(() => {
    if (incomingMessage && conversation && incomingMessage.conversationId === conversation.id) {
      setMessages((prev) => {
        // Prevent duplicates
        if (prev.some((msg) => msg.id === incomingMessage.id)) return prev;

        const newMessage = {
            ...incomingMessage,
            isMe: Boolean(incomingMessage.me || incomingMessage.isMe) // Handle both potential field names
        };
        return [...prev, newMessage];
      });
    }
  }, [incomingMessage, conversation]);

  // EMOJI: Close when clicking outside
  useEffect(() => {
    if (!emojiOpen) return;

    const handleClickOutside = (e) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target)) {
        setEmojiOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [emojiOpen]);

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
              isMe: Boolean(m.me || m.isMe),
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
  }, [conversation?.id]);

  const handleEmojiClick = (emojiData) => {
    setMessageInput((prev) => prev + emojiData.emoji);
  };

  const handleSendMessage = async () => {
    const content = messageInput.trim();
    if (!content) return;
    if (!conversation?.id) return;

    try {
      setMessageInput(""); // Clear input immediately
      setEmojiOpen(false); // Close emoji picker

      const res = await messageApi.sendMessage({
        conversationId: conversation.id,
        content: content,
      });

      const data = res.data || res;

      if (data && data.code === 1000) {
        const newMsg = data.result;
        // Mark outgoing message as from me for UI rendering
        const normalized = { ...newMsg, isMe: true };
        
        setMessages((prev) => {
          // Check if message already exists (e.g. added via socket already)
          if (prev.some(m => m.id === normalized.id)) {
            return prev;
          }
          return [...prev, normalized];
        });

        // Notify parent to update conversation list
        if (onSendMessageSuccess) {
          onSendMessageSuccess(newMsg);
        }
      }
    } catch (err) {
      console.error("Failed to send message:", err);
      // Ideally show toast error here
    }
  };

  return (
    <div className="flex-1 flex flex-col">
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
            {!conversation && (
              <p className="text-xs text-gray-500">
                Find user to start a new conversation
              </p>
            )}
          </div>
        </div>
        {conversation ? (
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-[#1a1a1a] rounded-lg transition-colors" onClick={showUnderDevelopmentToast}>
              <Phone className="w-5 h-5" />
            </button>
            <button className="p-2 hover:bg-[#1a1a1a] rounded-lg transition-colors" onClick={showUnderDevelopmentToast}>
              <Video className="w-5 h-5" />
            </button>
            <button className="p-2 hover:bg-[#1a1a1a] rounded-lg transition-colors" onClick={showUnderDevelopmentToast}>
              <Info className="w-5 h-5" />
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
              <div
                className={`flex ${
                  msg.isMe ? "justify-end" : "justify-start"
                }`}
              >
                {!msg.isMe && (
                  <div className="mr-2 mt-1 flex-shrink-0">
                    {msg.sender?.avatarUrl ? (
                      <img
                        src={msg.sender.avatarUrl}
                        alt=""
                        className="w-7 h-7 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-gray-600 flex items-center justify-center text-white text-xs">
                        {(msg.sender?.fullName || "U").charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                )}

                <div
                  title={
                    msg.createdAt
                      ? new Date(msg.createdAt).toLocaleString()
                      : ""
                  }
                  className={`max-w-md px-4 py-2 rounded-2xl break-words ${
                    msg.isMe
                      ? "bg-[#0095f6] text-white"
                      : "bg-[#262626] text-white"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400 p-6">
            <p className="mb-2 text-lg">No messages found</p>
            <p className="mb-4 text-sm">
              Start a new conversation.
            </p>
          </div>
        )}
        {/* Dummy div to scroll to */}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-[#333]">
        <div className="flex items-center gap-3 bg-[#1a1a1a] rounded-full px-4 py-2 border border-[#333]">
          <input
            type="text"
            placeholder="Messaging ..."
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
            className="flex-1 bg-transparent border-none outline-none text-sm"
          />
          <div className="flex items-center gap-2">
            <div className="relative flex" ref={emojiRef}>
              <button
                className="text-gray-400 hover:text-white transition-colors"
                onClick={() => setEmojiOpen((v) => !v)}
              >
                <Smile className="w-5 h-5" />
              </button>

              {emojiOpen && (
                <div className="absolute bottom-12 right-0 z-50 w-72 rounded-xl border border-gray-700 bg-[#111] shadow-lg">
                  <EmojiPicker
                    theme="dark"
                    width="100%"
                    height={400}
                    emojiStyle="native"
                    searchDisabled
                    previewConfig={{ showPreview: false }}
                    onEmojiClick={handleEmojiClick}
                  />
                </div>
              )}
            </div>
            <button className="text-gray-400 hover:text-white transition-colors" onClick={showUnderDevelopmentToast}>
              <Image className="w-5 h-5" />
            </button>
            <button className="text-gray-400 hover:text-white transition-colors" onClick={handleSendMessage}>
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
