import { getAvatarUrl } from "../lib/avatar";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Plus,
  Settings,
  MoreVertical,
  Phone,
  Video,
  Paperclip,
  Smile,
  Send,
  Check,
  CheckCheck,
  Menu,
  X,
  LogOut,
  Loader2,
  Ban,
  Trash2,
} from "lucide-react";
import { formatTime, formatTimeAgo, cn } from "../lib/utils";
import { Button, Avatar } from "../components/ui/index";
import useAuthStore from "../store/authStore";
import useChatStore from "../store/chatStore";
import useSocketStore from "../store/socketStore";
import { toast } from "sonner";

export function ChatLayout() {
  const { authUser, logout } = useAuthStore();
  const {
    conversations,
    activeConversation,
    messages,
    isLoadingConversations,
    isLoadingMessages,
    isLoadingMore,
    hasMore,
    onlineUsers,
    typingUsers,
    getConversations,
    setActiveConversation,
    sendMessage,
    searchUsers,
    createConversation,
    createGroupConversation,
    loadMoreMessages,
    deleteMessageForEveryone,
    deleteMessageForMe,
    unreadCounts,
  } = useChatStore();
  const { emitTyping, emitStopTyping, emitMessageSeen } = useSocketStore();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [contextMenuMsgId, setContextMenuMsgId] = useState(null);

  useEffect(() => {
    const handleClick = () => setContextMenuMsgId(null);
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, []);
  const [messageText, setMessageText] = useState("");
  const [mediaPreview, setMediaPreview] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedImageModal, setSelectedImageModal] = useState(null);
  const fileInputRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Group creation modal state
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedGroupMembers, setSelectedGroupMembers] = useState([]);
  const [groupSearchQuery, setGroupSearchQuery] = useState("");
  const [groupSearchResults, setGroupSearchResults] = useState([]);
  const [isGroupSearching, setIsGroupSearching] = useState(false);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);

  // Handle user search inside group modal
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (groupSearchQuery.trim()) {
        setIsGroupSearching(true);
        const results = await searchUsers(groupSearchQuery);
        setGroupSearchResults(results);
        setIsGroupSearching(false);
      } else {
        // If search query is empty, suggest users from existing conversations
        const uniqueMembersMap = {};
        conversations.forEach(convo => {
          convo.members.forEach(member => {
            if (member._id !== authUser?._id) {
              uniqueMembersMap[member._id] = member;
            }
          });
        });
        setGroupSearchResults(Object.values(uniqueMembersMap));
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [groupSearchQuery, searchUsers, conversations, authUser]);

  // Get the other user in a 1-on-1 conversation
  const getOtherUser = useCallback(
    (conversation) => {
      if (!conversation?.members || !authUser) return null;
      return conversation.members.find((m) => m._id !== authUser._id);
    },
    [authUser],
  );

  // Check if a user is online
  const isUserOnline = useCallback(
    (userId) => {
      return onlineUsers.includes(userId);
    },
    [onlineUsers],
  );

  // Fetch conversations on mount
  useEffect(() => {
    getConversations();
  }, [getConversations]);

  // Auto scroll to bottom when new messages arrive (only if user is already near bottom)
  useEffect(() => {
    if (messages.length > 0 && !isLoadingMore) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoadingMore]);

  // Phase 2.5 #3: Emit 'seen' when we open/view a conversation
  useEffect(() => {
    if (activeConversation && authUser) {
      if (activeConversation.isGroupChat) {
        activeConversation.members.forEach(member => {
          if (member._id !== authUser._id) {
            emitMessageSeen(activeConversation._id, member._id);
          }
        });
      } else {
        const other = getOtherUser(activeConversation);
        if (other) {
          emitMessageSeen(activeConversation._id, other._id);
        }
      }
    }
  }, [activeConversation, authUser, getOtherUser, emitMessageSeen]);

  // Handle user search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.trim()) {
        setIsSearching(true);
        const results = await searchUsers(searchQuery);
        setSearchResults(results);
        setIsSearching(false);
      } else {
        setSearchResults([]);
      }
    }, 300); // debounce
    return () => clearTimeout(timer);
  }, [searchQuery, searchUsers]);

  // Handle starting a conversation from search
  const handleStartChat = async (userId) => {
    await createConversation(userId);
    setSearchQuery("");
    setSearchResults([]);
    setSidebarOpen(false);
  };

  // Handle send message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim() && !selectedFile) return;
    const text = messageText;
    setMessageText("");
    await sendMessage(text, selectedFile);

    removefile();

    // Stop typing indicator
    if (activeConversation) {
      if (activeConversation.isGroupChat) {
        emitStopTyping({ convoId: activeConversation._id });
      } else {
        const otherUser = getOtherUser(activeConversation);
        if (otherUser) emitStopTyping({ convoId: activeConversation._id, receiverId: otherUser._id });
      }
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Production check: Validate size (e.g., max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setMediaPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const removefile = () => {
    setMediaPreview(null);
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Handle typing indicators
  const handleTyping = (e) => {
    setMessageText(e.target.value);
    if (!activeConversation) return;

    if (activeConversation.isGroupChat) {
      emitTyping({ convoId: activeConversation._id });
    } else {
      const otherUser = getOtherUser(activeConversation);
      if (otherUser) emitTyping({ convoId: activeConversation._id, receiverId: otherUser._id });
    }

    // Clear previous timeout and set a new one
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      if (activeConversation.isGroupChat) {
        emitStopTyping({ convoId: activeConversation._id });
      } else {
        const otherUser = getOtherUser(activeConversation);
        if (otherUser) emitStopTyping({ convoId: activeConversation._id, receiverId: otherUser._id });
      }
    }, 1500);
  };

  // Handle scroll pagination
  const handleScroll = async (e) => {
    const container = e.currentTarget;
    if (container.scrollTop === 0 && hasMore && !isLoadingMore) {
      const previousScrollHeight = container.scrollHeight;
      await loadMoreMessages();
      requestAnimationFrame(() => {
        if (container) {
          const newScrollHeight = container.scrollHeight;
          container.scrollTop = newScrollHeight - previousScrollHeight;
        }
      });
    }
  };

  // Derive active chat info
  const otherUser = activeConversation && !activeConversation.isGroupChat
    ? getOtherUser(activeConversation)
    : null;
  
  const chatTitle = activeConversation
    ? (activeConversation.isGroupChat
      ? activeConversation.groupName
      : otherUser?.fullName || otherUser?.username || "Chat")
    : "Chat";

  const chatAvatar = activeConversation
    ? (activeConversation.isGroupChat
      ? (activeConversation.groupAvatar || getAvatarUrl({ fullName: activeConversation.groupName }))
      : getAvatarUrl(otherUser))
    : "";

  const isOtherOnline = !activeConversation?.isGroupChat && otherUser ? isUserOnline(otherUser._id) : false;
  
  const isOtherTyping = activeConversation
    ? (activeConversation.isGroupChat
      ? typingUsers.some(t => typeof t === "object" && t.convoId === activeConversation._id)
      : typingUsers.some(t => 
          (typeof t === "object" && t.convoId === activeConversation._id) || 
          (typeof t === "string" && t === otherUser?._id)
        ))
    : false;

  const getTypingText = () => {
    if (!activeConversation) return "";
    if (activeConversation.isGroupChat) {
      const typingInThisConvo = typingUsers
        .filter(t => typeof t === "object" && t.convoId === activeConversation._id)
        .map(t => activeConversation.members?.find(m => m._id === t.userId))
        .filter(Boolean);
      
      if (typingInThisConvo.length === 0) return "";
      if (typingInThisConvo.length === 1) return `${typingInThisConvo[0].fullName} is typing...`;
      if (typingInThisConvo.length === 2) return `${typingInThisConvo[0].fullName} and ${typingInThisConvo[1].fullName} are typing...`;
      return "Multiple members are typing...";
    } else {
      return "typing...";
    }
  };

  const getSubTitleText = () => {
    if (!activeConversation) return "";
    if (activeConversation.isGroupChat) {
      const total = activeConversation.members?.length || 0;
      const online = activeConversation.members?.filter(m => m._id !== authUser?._id && isUserOnline(m._id)).length || 0;
      const actualOnline = online + 1; // Include ourselves
      return `${total} members, ${actualOnline} online`;
    } else {
      return isOtherOnline ? "Online" : otherUser?.lastSeen ? `Last seen ${formatTimeAgo(otherUser.lastSeen)}` : "Offline";
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#0F172A] text-slate-200 overflow-hidden font-sans">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {!sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setSidebarOpen(true)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.div
        className={cn(
          "fixed md:relative z-50 flex flex-col w-80 h-full bg-[#111827] border-r border-slate-800/60 shrink-0 transition-transform duration-300 ease-in-out",
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        {/* Sidebar Header */}
        <div className="p-4 flex items-center justify-between border-b border-slate-800/60">
          <div className="flex items-center gap-3">
            <Avatar src={getAvatarUrl(authUser)} status="online" />
            <div>
              <h2 className="font-semibold text-slate-100 text-sm">
                {authUser?.fullName}
              </h2>
              <p className="text-xs text-indigo-400">@{authUser?.username}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Link to="/profile">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-400 hover:text-indigo-400"
              >
                <Settings className="w-4 h-4" />
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-400 hover:text-red-400"
              onClick={logout}
            >
              <LogOut className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-400 md:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Search & Actions */}
        <div className="p-4 space-y-4 border-b border-slate-800/60">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search users to start chatting..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0F172A] text-sm text-slate-200 rounded-lg pl-9 pr-4 py-2 border border-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-500"
            />
          </div>
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {searchQuery ? "Search Results" : "Messages"}
            </h3>
            {!searchQuery && (
              <Button
                onClick={() => setIsCreateGroupOpen(true)}
                variant="ghost"
                size="sm"
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 h-7 px-2.5 bg-[#4F46E5]/10 hover:bg-[#4F46E5]/20 rounded-lg transition-all"
              >
                <Plus className="w-3.5 h-3.5" /> Group
              </Button>
            )}
          </div>
        </div>

        {/* Search Results or Chat List */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
          {searchQuery ? (
            // Search results
            isSearching ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
              </div>
            ) : searchResults.length > 0 ? (
              searchResults.map((user) => (
                <div
                  key={user._id}
                  onClick={() => handleStartChat(user._id)}
                  className="flex items-center gap-3 p-3 mx-2 my-1 rounded-xl cursor-pointer transition-all hover:bg-slate-800/50"
                >
                  <Avatar
                    src={getAvatarUrl(user)}
                    status={isUserOnline(user._id) ? "online" : "offline"}
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-slate-200 truncate">
                      {user.fullName}
                    </h4>
                    <p className="text-xs text-slate-500 truncate">
                      @{user.username}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-sm text-slate-500 p-8">
                No users found
              </p>
            )
          ) : // Conversation list
          isLoadingConversations ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
            </div>
          ) : conversations.length > 0 ? (
            conversations.map((convo) => {
              const isGroup = convo.isGroupChat;
              const other = !isGroup ? getOtherUser(convo) : null;
              if (!isGroup && !other) return null;
              
              const isActive = activeConversation?._id === convo._id;
              const name = isGroup ? convo.groupName : (other?.fullName || other?.username || "Chat");
              const avatar = isGroup 
                ? (convo.groupAvatar || getAvatarUrl({ fullName: convo.groupName }))
                : getAvatarUrl(other);
              const online = !isGroup && isUserOnline(other?._id);

              return (
                <div
                  key={convo._id}
                  onClick={() => {
                    setActiveConversation(convo);
                    setSidebarOpen(false);
                  }}
                  className={cn(
                    "flex items-center gap-3 p-3 mx-2 my-1 rounded-xl cursor-pointer transition-all group",
                    isActive ? "bg-[#4F46E5]/10" : "hover:bg-slate-800/50",
                  )}
                >
                  <Avatar
                    src={avatar}
                    status={isGroup ? undefined : (online ? "online" : "offline")}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <h4
                        className={cn(
                          "text-sm font-medium truncate",
                          isActive ? "text-indigo-400" : "text-slate-200",
                        )}
                      >
                        {name}
                      </h4>
                      <span className="text-xs text-slate-500 whitespace-nowrap ml-2">
                        {formatTime(convo.updatedAt)}
                      </span>
                    </div>
                    <p className={cn(
                      "text-xs truncate", 
                      unreadCounts[convo._id] ? "text-slate-300 font-medium" : "text-slate-500"
                    )}>
                      {convo.lastMessage || "No messages yet"}
                    </p>
                  </div>
                  {unreadCounts[convo._id] > 0 && (
                    <div className="shrink-0 flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-indigo-500 text-[10px] font-bold text-white shadow-sm shadow-indigo-500/30">
                      {unreadCounts[convo._id]}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-center p-8">
              <p className="text-sm text-slate-500">No conversations yet</p>
              <p className="text-xs text-slate-600 mt-1">
                Search for users above to start chatting!
              </p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#0F172A] relative">
        {activeConversation ? (
          <>
            {/* Chat Header */}
            <div className="h-16 border-b border-slate-800/60 bg-[#111827]/80 backdrop-blur-md flex items-center justify-between px-4 sm:px-6 shrink-0 sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden mr-1 -ml-2 text-slate-400"
                  onClick={() => setSidebarOpen(true)}
                >
                  <Menu className="w-5 h-5" />
                </Button>
                <Avatar
                  src={chatAvatar}
                  status={activeConversation.isGroupChat ? undefined : (isOtherOnline ? "online" : "offline")}
                />
                <div>
                  <h2 className="font-semibold text-slate-100 text-sm sm:text-base">
                    {chatTitle}
                  </h2>
                  <div className="text-xs text-slate-400 flex items-center gap-1">
                    {isOtherTyping ? (
                      <span className="text-indigo-400">{getTypingText()}</span>
                    ) : (
                      getSubTitleText()
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 sm:gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-slate-400 hover:text-indigo-400 hidden sm:flex"
                >
                  <Phone className="w-5 h-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-slate-400 hover:text-indigo-400 hidden sm:flex"
                >
                  <Video className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="icon" className="text-slate-400">
                  <MoreVertical className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Messages Area */}
            <div 
              ref={messagesContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar bg-gradient-to-b from-transparent to-slate-900/20"
            >
              {isLoadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                </div>
              ) : messages.length > 0 ? (
                <>
                  {isLoadingMore && (
                    <div className="flex justify-center items-center py-2 animate-fadeIn">
                      <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
                    </div>
                  )}
                  {messages.map((msg, index) => {
                    const isMe = msg.senderId === authUser?._id;
                    const showAvatar =
                      index === 0 ||
                      messages[index - 1].senderId !== msg.senderId;
                    const sender = activeConversation.members?.find((m) => m._id === msg.senderId);

                    return (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          key={msg._id}
                          onContextMenu={(e) => { 
                            e.preventDefault(); 
                            setContextMenuMsgId(msg._id);
                          }}
                          className={cn(
                            "flex w-full relative",
                            isMe ? "justify-end" : "justify-start",
                          )}
                        >
                          <AnimatePresence>
                            {contextMenuMsgId === msg._id && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                transition={{ duration: 0.1 }}
                                className={cn(
                                  "absolute z-50 bottom-full mb-1 min-w-[180px] bg-[#1E293B] border border-slate-700/60 shadow-xl rounded-xl py-1 overflow-hidden backdrop-blur-xl",
                                  isMe ? "right-8" : "left-8"
                                )}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  onClick={() => {
                                    deleteMessageForMe(msg._id);
                                    setContextMenuMsgId(null);
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700/50 hover:text-white transition-colors flex items-center gap-2"
                                >
                                  <Trash2 className="w-4 h-4 text-slate-400" />
                                  Delete for me
                                </button>
                                
                                {msg.senderId === authUser?._id && 
                                 (Date.now() - new Date(msg.createdAt).getTime() < 60 * 60 * 1000) && (
                                  <button
                                    onClick={() => {
                                      deleteMessageForEveryone(msg._id);
                                      setContextMenuMsgId(null);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2"
                                  >
                                    <Ban className="w-4 h-4" />
                                    Delete for everyone
                                  </button>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        <div
                          className={cn(
                            "flex max-w-[85%] sm:max-w-[70%] gap-2 sm:gap-3",
                            isMe ? "flex-row-reverse" : "flex-row",
                          )}
                        >
                          {showAvatar ? (
                            <div className="shrink-0 mt-auto">
                              <Avatar
                                src={isMe ? getAvatarUrl(authUser) : getAvatarUrl(sender)}
                                size="sm"
                              />
                            </div>
                          ) : (
                            <div className="w-8 shrink-0" />
                          )}

                          <div
                            className={cn(
                              "flex flex-col",
                              isMe ? "items-end" : "items-start",
                            )}
                          >
                            {!isMe && activeConversation.isGroupChat && showAvatar && (
                              <span className="text-xs text-slate-400 mb-1 ml-1 font-medium">
                                {sender?.fullName || "Unknown Member"}
                              </span>
                            )}
                            <div
                              className={cn(
                                "px-4 py-2.5 rounded-2xl shadow-sm flex flex-col gap-2",
                                isMe
                                  ? "bg-indigo-600 text-white rounded-br-sm shadow-indigo-600/10"
                                  : "bg-[#1E293B] text-slate-200 rounded-bl-sm border border-slate-800/50",
                              )}
                            >
                              {msg.image && (
                                <img
                                  src={msg.image}
                                  alt="Attachment"
                                  className="sm:max-w-[200px] rounded-md object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                  onClick={() => setSelectedImageModal(msg.image)}
                                />
                              )}
                              {msg.deletedForEveryone ? (
                                 <div className="text-sm italic text-slate-400">Message deleted</div>
                               ) : (
                                 msg.text && (
                                   <p className="text-[15px] leading-relaxed break-words">
                                     {msg.text}
                                   </p>
                                 )
                               )}
                            </div>
                            <div className="flex items-center gap-1 mt-1 px-1">
                              <span className="text-[11px] text-slate-500">
                                {formatTime(msg.createdAt)}
                              </span>
                              {isMe && (
                                <span
                                  className={cn(
                                    msg.status === "seen"
                                      ? "text-green-400"
                                      : "text-indigo-400",
                                  )}
                                >
                                  {msg.status === "seen" ? (
                                    <CheckCheck className="w-3.5 h-3.5" />
                                  ) : msg.status === "delivered" ? (
                                    <CheckCheck className="w-3.5 h-3.5" />
                                  ) : (
                                    <Check className="w-3.5 h-3.5" />
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-slate-500">
                  <p className="text-sm">No messages yet. Say hello! 👋</p>
                </div>
              )}

              {/* Typing indicators */}
              {activeConversation && (
                activeConversation.isGroupChat ? (
                  typingUsers
                    .filter(t => typeof t === "object" && t.convoId === activeConversation._id)
                    .map(t => {
                      const user = activeConversation.members?.find(m => m._id === t.userId);
                      if (!user) return null;
                      return (
                        <div key={user._id} className="flex w-full justify-start mt-2">
                          <div className="flex max-w-[70%] gap-3">
                            <div className="shrink-0 mt-auto">
                              <Avatar src={getAvatarUrl(user)} size="sm" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[10px] text-slate-500 ml-1 mb-0.5">{user.fullName}</span>
                              <div className="px-4 py-2.5 rounded-2xl bg-[#1E293B] text-slate-200 rounded-bl-sm border border-slate-800/50 flex items-center gap-1.5 h-9">
                                <motion.div
                                  animate={{ y: [0, -3, 0] }}
                                  transition={{
                                    repeat: Infinity,
                                    duration: 0.6,
                                    delay: 0,
                                  }}
                                  className="w-1.5 h-1.5 bg-slate-400 rounded-full"
                                />
                                <motion.div
                                  animate={{ y: [0, -3, 0] }}
                                  transition={{
                                    repeat: Infinity,
                                    duration: 0.6,
                                    delay: 0.2,
                                  }}
                                  className="w-1.5 h-1.5 bg-slate-400 rounded-full"
                                />
                                <motion.div
                                  animate={{ y: [0, -3, 0] }}
                                  transition={{
                                    repeat: Infinity,
                                    duration: 0.6,
                                    delay: 0.4,
                                  }}
                                  className="w-1.5 h-1.5 bg-slate-400 rounded-full"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                ) : (
                  isOtherTyping && (
                    <div className="flex w-full justify-start mt-2">
                      <div className="flex max-w-[70%] gap-3">
                        <div className="shrink-0 mt-auto">
                          <Avatar src={chatAvatar} size="sm" />
                        </div>
                        <div className="px-4 py-3.5 rounded-2xl bg-[#1E293B] text-slate-200 rounded-bl-sm border border-slate-800/50 flex items-center gap-1.5 h-11">
                          <motion.div
                            animate={{ y: [0, -3, 0] }}
                            transition={{
                              repeat: Infinity,
                              duration: 0.6,
                              delay: 0,
                            }}
                            className="w-1.5 h-1.5 bg-slate-400 rounded-full"
                          />
                          <motion.div
                            animate={{ y: [0, -3, 0] }}
                            transition={{
                              repeat: Infinity,
                              duration: 0.6,
                              delay: 0.2,
                            }}
                            className="w-1.5 h-1.5 bg-slate-400 rounded-full"
                          />
                          <motion.div
                            animate={{ y: [0, -3, 0] }}
                            transition={{
                              repeat: Infinity,
                              duration: 0.6,
                              delay: 0.4,
                            }}
                            className="w-1.5 h-1.5 bg-slate-400 rounded-full"
                          />
                        </div>
                      </div>
                    </div>
                  )
                )
              )}

              <div ref={messagesEndRef} className="h-1" />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-[#111827] border-t border-slate-800/60 shrink-0">
              {mediaPreview && (
                <div className="mb-3 relative w-32 h-32 rounded-lg overflow-hidden border border-slate-700 mx-auto max-w-4xl animate-fadeIn">
                  <img src={mediaPreview} alt="Preview" className="w-full h-full object-cover" />
                  <button 
                    onClick={removefile}
                    type="button"
                    className="absolute top-1 right-1 w-6 h-6 bg-slate-900/80 rounded-full flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              <form
                onSubmit={handleSendMessage}
                className="flex items-end gap-2 max-w-4xl mx-auto"
              >
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleImageChange}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-slate-400 hover:text-slate-300 hover:bg-slate-800 mb-1 shrink-0"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip className="w-5 h-5" />
                </Button>

                <div className="flex-1 bg-[#0F172A] border border-slate-800/80 rounded-2xl flex items-end focus-within:ring-1 focus-within:ring-indigo-500 focus-within:border-indigo-500 transition-all shadow-inner shadow-black/10">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-slate-400 hover:text-yellow-500 mb-1 ml-1 shrink-0"
                  >
                    <Smile className="w-5 h-5" />
                  </Button>
                  <textarea
                    value={messageText}
                    onChange={handleTyping}
                    placeholder="Type a message..."
                    className="w-full bg-transparent text-slate-200 py-3 px-2 max-h-32 min-h-[44px] outline-none resize-none text-[15px] placeholder:text-slate-500 custom-scrollbar"
                    rows={1}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e);
                      }
                    }}
                  />
                </div>

                <Button
                  type="submit"
                  size="icon"
                  disabled={!messageText.trim() && !selectedFile}
                  className={cn(
                    "mb-1 shrink-0 rounded-xl transition-all duration-200 h-11 w-11",
                    (messageText.trim() || selectedFile)
                      ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-600/20"
                      : "bg-slate-800 text-slate-500",
                  )}
                >
                  <Send className="w-5 h-5 ml-1" />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8 text-center bg-gradient-to-b from-[#0F172A] to-[#111827]">
            <div className="w-24 h-24 bg-slate-800/50 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-black/20 border border-slate-700/50">
              <svg
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="text-slate-400"
              >
                <path
                  d="M21 11.5C21.0034 12.8199 20.6951 14.1219 20.1 15.3C19.3944 16.7118 18.3098 17.8992 16.9674 18.7293C15.6251 19.5594 14.0782 19.9994 12.5 20C11.1801 20.0035 9.87812 19.6951 8.7 19.1L3 21L4.9 15.3C4.30493 14.1219 3.99656 12.8199 4 11.5C4.00061 9.92179 4.44061 8.37488 5.27072 7.03258C6.10083 5.69028 7.28825 4.6056 8.7 3.90003C9.87812 3.30496 11.1801 2.99659 12.5 3C14.7533 3.00305 16.913 3.89966 18.5055 5.49216C20.098 7.08466 20.9946 9.24436 20.997 11.5H21Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-slate-200 mb-2 animate-fadeIn">
              Welcome, {authUser?.fullName}!
            </h3>
            <p className="max-w-md">
              Search for users or create a group in the sidebar to start collaborating.
            </p>
          </div>
        )}
      </div>

      {/* Image Modal */}
      <AnimatePresence>
        {selectedImageModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedImageModal(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <div className="relative max-w-5xl w-full max-h-full flex justify-center items-center">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedImageModal(null)}
                className="absolute -top-12 right-0 text-slate-300 hover:text-white hover:bg-white/10 rounded-full bg-black/40"
              >
                <X className="w-6 h-6" />
              </Button>
              <motion.img
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                src={selectedImageModal}
                alt="Fullscreen Attachment"
                className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
                onClick={(e) => e.stopPropagation()} 
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Group Modal */}
      <AnimatePresence>
        {isCreateGroupOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={() => {
              setIsCreateGroupOpen(false);
              setGroupName("");
              setSelectedGroupMembers([]);
              setGroupSearchQuery("");
            }}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#111827] border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-4 border-b border-slate-800/60 flex items-center justify-between bg-slate-900/50">
                <div>
                  <h3 className="text-lg font-semibold text-slate-100 font-sans">Create Group Chat</h3>
                  <p className="text-xs text-slate-500">Collaborate with multiple people</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-slate-400 hover:text-white"
                  onClick={() => {
                    setIsCreateGroupOpen(false);
                    setGroupName("");
                    setSelectedGroupMembers([]);
                    setGroupSearchQuery("");
                  }}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Body */}
              <div className="p-4 space-y-4 flex-1 overflow-y-auto custom-scrollbar">
                {/* Group Name input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Group Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Project Avengers 🚀"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    className="w-full bg-[#0F172A] text-sm text-slate-200 rounded-lg px-3 py-2.5 border border-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-600"
                  />
                </div>

                {/* Selected Members Chips */}
                {selectedGroupMembers.length > 0 && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Selected Members ({selectedGroupMembers.length})
                    </label>
                    <div className="flex flex-wrap gap-1.5 p-2 bg-[#0F172A]/50 rounded-lg border border-slate-800/40 max-h-24 overflow-y-auto custom-scrollbar">
                      {selectedGroupMembers.map(memberId => {
                        const member = groupSearchResults.find(m => m._id === memberId) || 
                                       conversations.flatMap(c => c.members).find(m => m._id === memberId);
                        if (!member) return null;
                        return (
                          <div 
                            key={memberId} 
                            className="flex items-center gap-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs px-2.5 py-1 rounded-full animate-fadeIn"
                          >
                            <span>{member.fullName}</span>
                            <button
                              type="button"
                              onClick={() => setSelectedGroupMembers(selectedGroupMembers.filter(id => id !== memberId))}
                              className="text-indigo-400 hover:text-indigo-200 transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Member Search input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Add Members</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={groupSearchQuery}
                      onChange={(e) => setGroupSearchQuery(e.target.value)}
                      className="w-full bg-[#0F172A] text-sm text-slate-200 rounded-lg pl-9 pr-4 py-2 border border-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-600"
                    />
                  </div>
                </div>

                {/* Search Results list */}
                <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                  {isGroupSearching ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
                    </div>
                  ) : groupSearchResults.length > 0 ? (
                    groupSearchResults.map((user) => {
                      const isSelected = selectedGroupMembers.includes(user._id);
                      return (
                        <div
                          key={user._id}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedGroupMembers(selectedGroupMembers.filter(id => id !== user._id));
                            } else {
                              setSelectedGroupMembers([...selectedGroupMembers, user._id]);
                            }
                          }}
                          className={cn(
                            "flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all border border-transparent",
                            isSelected ? "bg-[#4F46E5]/10 border-[#4F46E5]/20" : "hover:bg-slate-800/40"
                          )}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Avatar
                              src={getAvatarUrl(user)}
                              size="sm"
                              status={isUserOnline(user._id) ? "online" : "offline"}
                            />
                            <div className="min-w-0">
                              <h4 className="text-xs font-medium text-slate-200 truncate">
                                {user.fullName}
                              </h4>
                              <p className="text-[10px] text-slate-500 truncate">
                                @{user.username}
                              </p>
                            </div>
                          </div>
                          
                          <div className={cn(
                            "w-4 h-4 rounded flex items-center justify-center border transition-all shrink-0",
                            isSelected ? "bg-indigo-600 border-indigo-500 text-white" : "border-slate-700"
                          )}>
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-center text-xs text-slate-600 py-6 font-sans">No users found</p>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-slate-800/60 flex items-center justify-end gap-2 bg-slate-900/30">
                <Button
                  variant="ghost"
                  className="text-slate-400 hover:text-slate-200"
                  onClick={() => {
                    setIsCreateGroupOpen(false);
                    setGroupName("");
                    setSelectedGroupMembers([]);
                    setGroupSearchQuery("");
                  }}
                  disabled={isCreatingGroup}
                >
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    if (!groupName.trim()) {
                      toast.error("Please enter a group name");
                      return;
                    }
                    if (selectedGroupMembers.length < 1) {
                      toast.error("Please select at least 1 member to add");
                      return;
                    }
                    setIsCreatingGroup(true);
                    const newGroup = await createGroupConversation(groupName.trim(), selectedGroupMembers);
                    setIsCreatingGroup(false);
                    if (newGroup) {
                      setIsCreateGroupOpen(false);
                      setGroupName("");
                      setSelectedGroupMembers([]);
                      setGroupSearchQuery("");
                    }
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 px-4 py-2"
                  disabled={isCreatingGroup}
                >
                  {isCreatingGroup ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Creating...
                    </span>
                  ) : (
                    "Create Group"
                  )}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #334155;
          border-radius: 10px;
        }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb {
          background-color: #475569;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.15s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
