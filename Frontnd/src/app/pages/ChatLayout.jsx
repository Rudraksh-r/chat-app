import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, Plus, Settings, MoreVertical, 
  Phone, Video, Paperclip, Smile, Send, Check, CheckCheck, Menu, X, LogOut, Loader2
} from "lucide-react";
import { formatTime, cn } from "../lib/utils";
import { Button, Avatar } from "../components/ui/index";
import useAuthStore from "../store/authStore";
import useChatStore from "../store/chatStore";
import useSocketStore from "../store/socketStore";

export function ChatLayout() {
  const { authUser, logout } = useAuthStore();
  const {
    conversations, activeConversation, messages,
    isLoadingConversations, isLoadingMessages,
    onlineUsers, typingUsers,
    getConversations, setActiveConversation, sendMessage,
    searchUsers, createConversation,
  } = useChatStore();
  const { emitTyping, emitStopTyping } = useSocketStore();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [messageText, setMessageText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Fetch conversations on mount
  useEffect(() => {
    getConversations();
  }, [getConversations]);

  // Auto scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Get the other user in a 1-on-1 conversation
  const getOtherUser = useCallback((conversation) => {
    if (!conversation?.members || !authUser) return null;
    return conversation.members.find(m => m._id !== authUser._id);
  }, [authUser]);

  // Check if a user is online
  const isUserOnline = useCallback((userId) => {
    return onlineUsers.includes(userId);
  }, [onlineUsers]);

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
    if (!messageText.trim()) return;
    const text = messageText;
    setMessageText("");
    await sendMessage(text);

    // Stop typing indicator
    const otherUser = getOtherUser(activeConversation);
    if (otherUser) emitStopTyping(otherUser._id);
  };

  // Handle typing indicators
  const handleTyping = (e) => {
    setMessageText(e.target.value);
    const otherUser = getOtherUser(activeConversation);
    if (!otherUser) return;

    emitTyping(otherUser._id);

    // Clear previous timeout and set a new one
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      emitStopTyping(otherUser._id);
    }, 1500);
  };

  // Derive active chat info
  const otherUser = activeConversation ? getOtherUser(activeConversation) : null;
  const chatTitle = otherUser?.fullName || otherUser?.username || "Chat";
  const chatAvatar = otherUser?.avatar;
  const isOtherOnline = otherUser ? isUserOnline(otherUser._id) : false;
  const isOtherTyping = otherUser ? typingUsers.includes(otherUser._id) : false;

  return (
    <div className="flex h-screen w-full bg-[#0F172A] text-slate-200 overflow-hidden font-sans">
      
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {!sidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setSidebarOpen(true)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.div 
        className={cn(
          "fixed md:relative z-50 flex flex-col w-80 h-full bg-[#111827] border-r border-slate-800/60 shrink-0 transition-transform duration-300 ease-in-out",
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Sidebar Header */}
        <div className="p-4 flex items-center justify-between border-b border-slate-800/60">
          <div className="flex items-center gap-3">
            <Avatar src={authUser?.avatar} status="online" />
            <div>
              <h2 className="font-semibold text-slate-100 text-sm">{authUser?.fullName}</h2>
              <p className="text-xs text-indigo-400">@{authUser?.username}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-400" onClick={logout}>
              <LogOut className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 md:hidden" onClick={() => setSidebarOpen(false)}>
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
                  <Avatar src={user.avatar} status={isUserOnline(user._id) ? "online" : "offline"} />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-slate-200 truncate">{user.fullName}</h4>
                    <p className="text-xs text-slate-500 truncate">@{user.username}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-sm text-slate-500 p-8">No users found</p>
            )
          ) : (
            // Conversation list
            isLoadingConversations ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
              </div>
            ) : conversations.length > 0 ? (
              conversations.map((convo) => {
                const other = getOtherUser(convo);
                if (!other) return null;
                const isActive = activeConversation?._id === convo._id;
                const online = isUserOnline(other._id);

                return (
                  <div 
                    key={convo._id}
                    onClick={() => { setActiveConversation(convo); setSidebarOpen(false); }}
                    className={cn(
                      "flex items-center gap-3 p-3 mx-2 my-1 rounded-xl cursor-pointer transition-all group",
                      isActive ? "bg-indigo-600/10" : "hover:bg-slate-800/50"
                    )}
                  >
                    <Avatar src={other.avatar} status={online ? "online" : "offline"} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <h4 className={cn("text-sm font-medium truncate", isActive ? "text-indigo-400" : "text-slate-200")}>
                          {other.fullName}
                        </h4>
                        <span className="text-xs text-slate-500 whitespace-nowrap ml-2">
                          {formatTime(convo.updatedAt)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 truncate">
                        {convo.lastMessage || "No messages yet"}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center p-8">
                <p className="text-sm text-slate-500">No conversations yet</p>
                <p className="text-xs text-slate-600 mt-1">Search for users above to start chatting!</p>
              </div>
            )
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
                <Button variant="ghost" size="icon" className="md:hidden mr-1 -ml-2 text-slate-400" onClick={() => setSidebarOpen(true)}>
                  <Menu className="w-5 h-5" />
                </Button>
                <Avatar src={chatAvatar} status={isOtherOnline ? "online" : "offline"} />
                <div>
                  <h2 className="font-semibold text-slate-100 text-sm sm:text-base">{chatTitle}</h2>
                  <p className="text-xs text-slate-400 flex items-center gap-1">
                    {isOtherTyping ? (
                      <span className="text-indigo-400">typing...</span>
                    ) : isOtherOnline ? (
                      <><span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" /> Online</>
                    ) : (
                      "Offline"
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 sm:gap-2">
                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-indigo-400 hidden sm:flex">
                  <Phone className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-indigo-400 hidden sm:flex">
                  <Video className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="icon" className="text-slate-400">
                  <MoreVertical className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar bg-gradient-to-b from-transparent to-slate-900/20">
              {isLoadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                </div>
              ) : messages.length > 0 ? (
                messages.map((msg, index) => {
                  const isMe = msg.senderId === authUser._id;
                  const showAvatar = index === 0 || messages[index - 1].senderId !== msg.senderId;

                  return (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={msg._id} 
                      className={cn("flex w-full", isMe ? "justify-end" : "justify-start")}
                    >
                      <div className={cn("flex max-w-[85%] sm:max-w-[70%] gap-2 sm:gap-3", isMe ? "flex-row-reverse" : "flex-row")}>
                        {showAvatar ? (
                          <div className="shrink-0 mt-auto">
                            <Avatar src={isMe ? authUser.avatar : chatAvatar} size="sm" />
                          </div>
                        ) : (
                          <div className="w-8 shrink-0" />
                        )}
                        
                        <div className={cn("flex flex-col", isMe ? "items-end" : "items-start")}>
                          <div className={cn(
                            "px-4 py-2.5 rounded-2xl shadow-sm",
                            isMe 
                              ? "bg-indigo-600 text-white rounded-br-sm shadow-indigo-600/10" 
                              : "bg-[#1E293B] text-slate-200 rounded-bl-sm border border-slate-800/50"
                          )}>
                            <p className="text-[15px] leading-relaxed break-words">{msg.text}</p>
                          </div>
                          <div className="flex items-center gap-1 mt-1 px-1">
                            <span className="text-[11px] text-slate-500">{formatTime(msg.createdAt)}</span>
                            {isMe && (
                              <span className="text-indigo-400">
                                <Check className="w-3.5 h-3.5" />
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <div className="flex items-center justify-center h-full text-slate-500">
                  <p className="text-sm">No messages yet. Say hello! 👋</p>
                </div>
              )}

              {/* Typing indicator */}
              {isOtherTyping && (
                <div className="flex w-full justify-start mt-2">
                  <div className="flex max-w-[70%] gap-3">
                    <div className="shrink-0 mt-auto">
                      <Avatar src={chatAvatar} size="sm" />
                    </div>
                    <div className="px-4 py-3.5 rounded-2xl bg-[#1E293B] text-slate-200 rounded-bl-sm border border-slate-800/50 flex items-center gap-1.5 h-11">
                      <motion.div animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
                      <motion.div animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
                      <motion.div animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} className="h-1" />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-[#111827] border-t border-slate-800/60 shrink-0">
              <form onSubmit={handleSendMessage} className="flex items-end gap-2 max-w-4xl mx-auto">
                <Button type="button" variant="ghost" size="icon" className="text-slate-400 hover:text-slate-300 hover:bg-slate-800 mb-1 shrink-0">
                  <Paperclip className="w-5 h-5" />
                </Button>
                
                <div className="flex-1 bg-[#0F172A] border border-slate-800/80 rounded-2xl flex items-end focus-within:ring-1 focus-within:ring-indigo-500 focus-within:border-indigo-500 transition-all shadow-inner shadow-black/10">
                  <Button type="button" variant="ghost" size="icon" className="text-slate-400 hover:text-yellow-500 mb-1 ml-1 shrink-0">
                    <Smile className="w-5 h-5" />
                  </Button>
                  <textarea 
                    value={messageText}
                    onChange={handleTyping}
                    placeholder="Type a message..."
                    className="w-full bg-transparent text-slate-200 py-3 px-2 max-h-32 min-h-[44px] outline-none resize-none text-[15px] placeholder:text-slate-500 custom-scrollbar"
                    rows={1}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e);
                      }
                    }}
                  />
                </div>

                <Button 
                  type="submit" 
                  size="icon" 
                  disabled={!messageText.trim()}
                  className={cn(
                    "mb-1 shrink-0 rounded-xl transition-all duration-200 h-11 w-11",
                    messageText.trim() 
                      ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-600/20" 
                      : "bg-slate-800 text-slate-500"
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
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-slate-400">
                <path d="M21 11.5C21.0034 12.8199 20.6951 14.1219 20.1 15.3C19.3944 16.7118 18.3098 17.8992 16.9674 18.7293C15.6251 19.5594 14.0782 19.9994 12.5 20C11.1801 20.0035 9.87812 19.6951 8.7 19.1L3 21L4.9 15.3C4.30493 14.1219 3.99656 12.8199 4 11.5C4.00061 9.92179 4.44061 8.37488 5.27072 7.03258C6.10083 5.69028 7.28825 4.6056 8.7 3.90003C9.87812 3.30496 11.1801 2.99659 12.5 3C14.7533 3.00305 16.913 3.89966 18.5055 5.49216C20.098 7.08466 20.9946 9.24436 20.997 11.5H21Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-slate-200 mb-2">Welcome, {authUser?.fullName}!</h3>
            <p className="max-w-md">Search for users in the sidebar to start a new conversation.</p>
          </div>
        )}
      </div>

      <style>{`
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
      `}</style>
    </div>
  );
}
