import { getAvatarUrl } from "../lib/avatar";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion as Motion, AnimatePresence } from "framer-motion";
import EmojiPicker from "emoji-picker-react";
import {
  ArrowUp,
  ChevronLeft,
  CirclePlus,
  Settings,
  SquarePen,
  MoreVertical,
  Phone,
  Video,
  Smile,
  Check,
  CheckCheck,
  X,
  LogOut,
  Loader2,
  Search,
  Trash2,
  Pencil,
  CornerUpLeft,
  FileText,
  Music,
  Download,
  Sun,
  Moon,
  Palette,
} from "lucide-react";
import { formatTime, formatTimeAgo, cn } from "../lib/utils";
import { Button, Avatar } from "../components/ui/index";
import { SearchField } from "../components/ui/search-field";
import useAuthStore from "../store/authStore";
import useChatStore from "../store/chatStore";
import useSocketStore from "../store/socketStore";
import useThemeStore from "../store/themeStore";
import { toast } from "sonner";
import ProfileModal from "../components/ProfileModal";
import UserInfoModal from "../components/UserInfoModal";
import ThemePicker, { CHAT_THEMES } from "../components/ThemePicker";

const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

export function ChatLayout() {
  const { authUser, logout } = useAuthStore();
  const { theme, toggleTheme, chatThemes } = useThemeStore();
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
    editMessage,
    replyingToMessage,
    setReplyingToMessage,
    clearReplyingToMessage,
    sendToggleReaction,
    removeGroupMember,
    promoteToAdmin,
    updateGroupMetadata,
  } = useChatStore();
  const { emitTyping, emitStopTyping, emitMessageSeen } = useSocketStore();

  const handleScrollToParent = (parentId) => {
    const el = document.getElementById(parentId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("highlight-pulse");
      setTimeout(() => {
        el.classList.remove("highlight-pulse");
      }, 2000);
    }
  };

  const getMessageSenderId = (msg) =>
    typeof msg.senderId === "object" ? msg.senderId?._id : msg.senderId;

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [contextMenuMsgId, setContextMenuMsgId] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editMessageText, setEditMessageText] = useState("");

  useEffect(() => {
    const handleClick = () => setContextMenuMsgId(null);
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, []);
  const [messageText, setMessageText] = useState("");
  const [mediaPreview, setMediaPreview] = useState("");
  const [mediaPreviewType, setMediaPreviewType] = useState(null); // "image" | "audio" | "document"
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedImageModal, setSelectedImageModal] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const fileInputRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isHeaderScrolled, setIsHeaderScrolled] = useState(false);

  // Group creation modal state
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedGroupMembers, setSelectedGroupMembers] = useState([]);
  const [groupSearchQuery, setGroupSearchQuery] = useState("");
  const [groupSearchResults, setGroupSearchResults] = useState([]);
  const [isGroupSearching, setIsGroupSearching] = useState(false);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [isGroupInfoOpen, setIsGroupInfoOpen] = useState(false);
  const [isEditingGroupName, setIsEditingGroupName] = useState(false);
  const [editGroupNameText, setEditGroupNameText] = useState("");
  const groupAvatarInputRef = useRef(null);

  // Profile preview, info, and theme picker modals
  const [profileModalUserId, setProfileModalUserId] = useState(null);
  const [userInfoProfile, setUserInfoProfile] = useState(null);
  const [showThemePicker, setShowThemePicker] = useState(false);

  // Compute active chat theme styles
  const activeChatThemeKey = activeConversation?._id ? (chatThemes[activeConversation._id] || 'default') : 'default';
  const activeChatThemeConfig = CHAT_THEMES[activeChatThemeKey] || CHAT_THEMES.default;
  const activeChatStyle = activeChatThemeKey !== 'default' ? {
    background: activeChatThemeConfig.wallpaper && activeChatThemeConfig.wallpaper !== 'none'
      ? activeChatThemeConfig.wallpaper
      : activeChatThemeConfig.backgroundColor,
    '--bubble-sent': activeChatThemeConfig.bubbleColor,
    '--bubble-received': 'rgba(255,255,255,0.10)',
    '--bubble-sent-foreground': '#FFFFFF',
    '--bubble-received-foreground': '#FFFFFF',
  } : {};

  useEffect(() => {
    const updateCurrentTime = () => setCurrentTime(Date.now());
    const timeoutId = setTimeout(updateCurrentTime, 0);
    const intervalId = setInterval(updateCurrentTime, 30000);
    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, []);

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
        conversations.forEach((convo) => {
          convo.members.forEach((member) => {
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
        activeConversation.members.forEach((member) => {
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
    setShowEmojiPicker(false);

    // Stop typing indicator
    if (activeConversation) {
      if (activeConversation.isGroupChat) {
        emitStopTyping({ convoId: activeConversation._id });
      } else {
        const otherUser = getOtherUser(activeConversation);
        if (otherUser)
          emitStopTyping({
            convoId: activeConversation._id,
            receiverId: otherUser._id,
          });
      }
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }

    setSelectedFile(file);

    if (file.type.startsWith("image/")) {
      setMediaPreviewType("image");
      const objectUrl = URL.createObjectURL(file);
      setMediaPreview(objectUrl);
    } else if (file.type.startsWith("audio/")) {
      setMediaPreviewType("audio");
      setMediaPreview(file.name);
    } else {
      setMediaPreviewType("document");
      setMediaPreview(file.name);
    }
  };

  const removefile = () => {
    // Revoke object URL to prevent memory leaks
    if (
      mediaPreviewType === "image" &&
      mediaPreview &&
      mediaPreview.startsWith("blob:")
    ) {
      URL.revokeObjectURL(mediaPreview);
    }
    setMediaPreview(null);
    setMediaPreviewType(null);
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
      if (otherUser)
        emitTyping({
          convoId: activeConversation._id,
          receiverId: otherUser._id,
        });
    }

    // Clear previous timeout and set a new one
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      if (activeConversation.isGroupChat) {
        emitStopTyping({ convoId: activeConversation._id });
      } else {
        const otherUser = getOtherUser(activeConversation);
        if (otherUser)
          emitStopTyping({
            convoId: activeConversation._id,
            receiverId: otherUser._id,
          });
      }
    }, 1500);
  };

  // Handle scroll pagination
  const handleScroll = async (e) => {
    const container = e.currentTarget;
    setIsHeaderScrolled(container.scrollTop > 4);
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
  const otherUser =
    activeConversation && !activeConversation.isGroupChat
      ? getOtherUser(activeConversation)
      : null;

  const chatTitle = activeConversation
    ? activeConversation.isGroupChat
      ? activeConversation.groupName
      : otherUser?.fullName || otherUser?.username || "Chat"
    : "Chat";

  const chatAvatar = activeConversation
    ? activeConversation.isGroupChat
      ? activeConversation.groupAvatar ||
        getAvatarUrl({ fullName: activeConversation.groupName })
      : getAvatarUrl(otherUser)
    : "";

  const isOtherOnline =
    !activeConversation?.isGroupChat && otherUser
      ? isUserOnline(otherUser._id)
      : false;

  const isOtherTyping = activeConversation
    ? activeConversation.isGroupChat
      ? typingUsers.some(
          (t) => typeof t === "object" && t.convoId === activeConversation._id,
        )
      : typingUsers.some(
          (t) =>
            (typeof t === "object" && t.convoId === activeConversation._id) ||
            (typeof t === "string" && t === otherUser?._id),
        )
    : false;

  const getTypingText = () => {
    if (!activeConversation) return "";
    if (activeConversation.isGroupChat) {
      const typingInThisConvo = typingUsers
        .filter(
          (t) => typeof t === "object" && t.convoId === activeConversation._id,
        )
        .map((t) => activeConversation.members?.find((m) => m._id === t.userId))
        .filter(Boolean);

      if (typingInThisConvo.length === 0) return "";
      if (typingInThisConvo.length === 1)
        return `${typingInThisConvo[0].fullName} is typing...`;
      if (typingInThisConvo.length === 2)
        return `${typingInThisConvo[0].fullName} and ${typingInThisConvo[1].fullName} are typing...`;
      return "Multiple members are typing...";
    } else {
      return "typing...";
    }
  };

  const getSubTitleText = () => {
    if (!activeConversation) return "";
    if (activeConversation.isGroupChat) {
      const total = activeConversation.members?.length || 0;
      const online =
        activeConversation.members?.filter(
          (m) => m._id !== authUser?._id && isUserOnline(m._id),
        ).length || 0;
      const actualOnline = online + 1; // Include ourselves
      return `${total} members, ${actualOnline} online`;
    } else {
      return isOtherOnline
        ? "Online"
        : otherUser?.lastSeen
          ? `Last seen ${formatTimeAgo(otherUser.lastSeen)}`
          : "Offline";
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background font-sans text-foreground app-shell">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && activeConversation && (
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/20 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <Motion.div
        className={cn(
          "fixed md:relative z-50 flex h-full w-full shrink-0 flex-col bg-sidebar transition-all duration-300 ease-out md:w-[360px] md:border-r md:border-sidebar-border",
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        {/* Sidebar Header */}
        <div className="px-4 pb-3 pt-6">
          <div className="mb-5 flex min-h-11 items-center justify-between">
            <Link to="/profile" className="rounded-full">
              <Avatar src={getAvatarUrl(authUser)} status="online" size="sm" />
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="text-primary"
              onClick={() => setIsCreateGroupOpen(true)}
            >
              <SquarePen className="size-5" />
            </Button>
          </div>

          <div className="mb-4 flex items-end justify-between gap-3">
            <h1 className="text-[34px] font-bold leading-[41px] tracking-tight">
              Messages
            </h1>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="text-label-secondary hover:text-primary"
                onClick={toggleTheme}
              >
                {theme === "dark" ? (
                  <Sun className="size-5" />
                ) : (
                  <Moon className="size-5" />
                )}
              </Button>
              <Link to="/profile">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-label-secondary hover:text-primary"
                >
                  <Settings className="size-5" />
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                className="text-label-secondary hover:text-destructive"
                onClick={logout}
              >
                <LogOut className="size-5" />
              </Button>
            </div>
          </div>

          <SearchField
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          {!searchQuery && (
            <div className="mt-3 flex justify-end">
              <Button
                onClick={() => setIsCreateGroupOpen(true)}
                variant="ghost"
                size="sm"
                className="min-h-9 rounded-full px-3 text-primary"
              >
                <SquarePen className="size-4" />
                New Group
              </Button>
            </div>
          )}
        </div>

        {/* Search Results or Chat List */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
          {searchQuery ? (
            // Search results
            isSearching ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
              </div>
            ) : searchResults.length > 0 ? (
              searchResults.map((user) => (
                <div
                  key={user._id}
                  onClick={() => handleStartChat(user._id)}
                  className="mx-2 flex min-h-[76px] cursor-pointer items-center gap-3 rounded-2xl px-3 transition-all hover:bg-secondary/60"
                >
                  <Avatar
                    src={getAvatarUrl(user)}
                    status={isUserOnline(user._id) ? "online" : "offline"}
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="truncate text-[17px] font-semibold leading-[22px] text-foreground">
                      {user.fullName}
                    </h4>
                    <p className="truncate text-[13px] leading-[18px] text-label-secondary">
                      @{user.username}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-sm text-muted-foreground p-8">
                No users found
              </p>
            )
          ) : // Conversation list
          isLoadingConversations ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            </div>
          ) : conversations.length > 0 ? (
            conversations.map((convo) => {
              const isGroup = convo.isGroupChat;
              const other = !isGroup ? getOtherUser(convo) : null;
              if (!isGroup && !other) return null;

              const isActive = activeConversation?._id === convo._id;
              const name = isGroup
                ? convo.groupName
                : other?.fullName || other?.username || "Chat";
              const avatar = isGroup
                ? convo.groupAvatar ||
                  getAvatarUrl({ fullName: convo.groupName })
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
                    "group mx-2 flex min-h-[76px] cursor-pointer items-center gap-3 rounded-2xl px-3 transition-all",
                    isActive ? "bg-secondary/60" : "hover:bg-secondary/45",
                  )}
                >
                  <Avatar
                    src={avatar}
                    status={isGroup ? undefined : online ? "online" : "offline"}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <h4
                        className="truncate text-[17px] font-semibold leading-[22px] text-foreground"
                      >
                        {name}
                      </h4>
                      <span className="ml-2 whitespace-nowrap text-xs leading-4 text-label-tertiary">
                        {formatTime(convo.updatedAt)}
                      </span>
                    </div>
                    <p
                      className={cn(
                        "truncate text-[13px] leading-[18px]",
                        unreadCounts[convo._id]
                          ? "font-semibold text-foreground"
                          : "text-label-secondary",
                      )}
                    >
                      <span className="flex items-center gap-1">
                        {convo.lastMessage === "[Encrypted]"
                          ? "New message"
                          : convo.lastMessage || "No messages yet"}
                      </span>
                    </p>
                  </div>
                  {unreadCounts[convo._id] > 0 && (
                    <div className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-medium leading-[13px] text-primary-foreground">
                      {unreadCounts[convo._id]}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-center p-8">
              <p className="text-sm text-muted-foreground">
                No conversations yet
              </p>
              <p className="text-xs text-muted-foreground/80 mt-1">
                Search for users above to start chatting!
              </p>
            </div>
          )}
        </div>
      </Motion.div>

      {/* Main Chat Area */}
      <div className="relative flex min-w-0 flex-1 flex-col bg-background">
        {activeConversation ? (
          <>
            {/* Chat Header */}
            <Motion.div
              key={activeConversation?._id}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "glass sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between px-3 sm:px-5",
                isHeaderScrolled && "hairline",
              )}
            >
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="mr-1 -ml-2 text-primary md:hidden"
                  onClick={() => setSidebarOpen(true)}
                >
                  <ChevronLeft className="size-6" />
                </Button>
                <button
                  type="button"
                  className="rounded-full"
                  onClick={() => {
                    if (!activeConversation.isGroupChat && otherUser?._id) {
                      setProfileModalUserId(otherUser._id);
                    } else if (activeConversation.isGroupChat) {
                      setIsGroupInfoOpen(true);
                    }
                  }}
                >
                  <Avatar
                    src={chatAvatar}
                    status={
                      activeConversation.isGroupChat
                        ? undefined
                        : isOtherOnline
                          ? "online"
                          : "offline"
                    }
                  />
                </button>
                <div
                  className="group cursor-pointer"
                  onClick={() => {
                    if (activeConversation?.isGroupChat) {
                      setIsGroupInfoOpen(true);
                    } else if (otherUser?._id) {
                      setProfileModalUserId(otherUser._id);
                    }
                  }}
                >
                  <h2 className="text-[17px] font-semibold leading-[22px] text-foreground transition-colors group-hover:text-primary">
                    {chatTitle}
                  </h2>
                  <div className="flex items-center gap-1 text-[13px] leading-[18px] text-label-secondary">
                    {isOtherTyping ? (
                      <span className="text-primary">{getTypingText()}</span>
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
                  className="hidden text-primary sm:flex"
                >
                  <Phone className="size-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="hidden text-primary sm:flex"
                >
                  <Video className="size-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-label-secondary hover:text-primary hover:bg-secondary/70"
                  onClick={() => setShowThemePicker(true)}
                  title="Chat theme"
                >
                  <Palette className="size-5" />
                </Button>
              </div>
            </Motion.div>

            {/* Messages Area */}
            <div
              ref={messagesContainerRef}
              onScroll={handleScroll}
              className="custom-scrollbar flex-1 space-y-3 overflow-y-auto px-4 py-5 sm:px-6"
              style={activeChatStyle}
            >
              {isLoadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
              ) : messages.length > 0 ? (
                <>
                  {isLoadingMore && (
                    <div className="flex justify-center items-center py-2 animate-fadeIn">
                      <Loader2 className="w-5 h-5 text-primary animate-spin" />
                    </div>
                  )}
                  {messages.map((msg, index) => {
                    const senderIdStr = getMessageSenderId(msg);
                    const isMe = senderIdStr === authUser?._id;
                    const prevSenderIdStr =
                      index > 0
                        ? getMessageSenderId(messages[index - 1])
                        : null;
                    const showAvatar =
                      index === 0 || prevSenderIdStr !== senderIdStr;
                    const nextSenderIdStr =
                      index < messages.length - 1
                        ? getMessageSenderId(messages[index + 1])
                        : null;
                    const isLastInGroup =
                      index === messages.length - 1 ||
                      nextSenderIdStr !== senderIdStr ||
                      new Date(messages[index + 1]?.createdAt).getTime() -
                        new Date(msg.createdAt).getTime() >
                        60 * 1000;
                    const sender = activeConversation.members?.find(
                      (m) => m._id === senderIdStr,
                    );

                    return (
                      <Motion.div
                        id={msg._id}
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
                            <Motion.div
                              initial={{ opacity: 0, scale: 0.95, y: 10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: 10 }}
                              transition={{ duration: 0.1 }}
                              className={cn(
                                "glass-thick absolute bottom-full z-50 mb-1 min-w-[190px] overflow-hidden rounded-2xl py-1",
                                isMe ? "right-8" : "left-8",
                              )}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={() => {
                                  deleteMessageForMe(msg._id);
                                  setContextMenuMsgId(null);
                                }}
                                className="flex min-h-10 w-full items-center gap-2 px-4 text-left text-[15px] leading-5 text-foreground transition-colors hover:bg-secondary/60"
                              >
                                <Trash2 className="size-4 text-label-secondary" />
                                Delete for me
                              </button>

                              {getMessageSenderId(msg) === authUser?._id &&
                                currentTime > 0 &&
                                currentTime -
                                  new Date(msg.createdAt).getTime() <
                                  15 * 60 * 1000 && (
                                  <button
                                    onClick={() => {
                                      setEditingMessageId(msg._id);
                                      setEditMessageText(msg.text);
                                      setContextMenuMsgId(null);
                                    }}
                                    className="flex min-h-10 w-full items-center gap-2 px-4 text-left text-[15px] leading-5 text-foreground transition-colors hover:bg-secondary/60"
                                  >
                                    <Pencil className="size-4 text-label-secondary" />
                                    Edit message
                                  </button>
                                )}

                              <button
                                onClick={() => {
                                  setReplyingToMessage(msg);
                                  setContextMenuMsgId(null);
                                }}
                                className="flex min-h-10 w-full items-center gap-2 px-4 text-left text-[15px] leading-5 text-foreground transition-colors hover:bg-secondary/60"
                              >
                                <CornerUpLeft className="size-4 text-label-secondary" />
                                Reply
                              </button>

                              {getMessageSenderId(msg) === authUser?._id &&
                                currentTime > 0 &&
                                currentTime -
                                  new Date(msg.createdAt).getTime() <
                                  60 * 60 * 1000 && (
                                  <button
                                    onClick={() => {
                                      deleteMessageForEveryone(msg._id);
                                      setContextMenuMsgId(null);
                                    }}
                                    className="hairline mt-1 flex min-h-10 w-full items-center gap-2 px-4 text-left text-[15px] leading-5 text-destructive transition-colors hover:bg-destructive/10"
                                  >
                                    <Trash2 className="size-4" />
                                    Delete for everyone
                                  </button>
                                )}
                            </Motion.div>
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
                              <button
                                type="button"
                                className="rounded-full"
                                onClick={() => {
                                  if (!isMe && sender?._id) {
                                    setProfileModalUserId(sender._id);
                                  }
                                }}
                              >
                                <Avatar
                                  src={
                                    isMe
                                      ? getAvatarUrl(authUser)
                                      : getAvatarUrl(sender)
                                  }
                                  size="sm"
                                />
                              </button>
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
                            {!isMe &&
                              activeConversation.isGroupChat &&
                              showAvatar && (
                                <span className="text-xs text-muted-foreground mb-1 ml-1 font-medium">
                                  {sender?.fullName || "Unknown Member"}
                                </span>
                              )}
                            <div
                              className={cn(
                                "group relative flex flex-col gap-2 rounded-[18px] px-4 py-2.5",
                                isMe
                                  ? cn(
                                      "bg-bubble-sent text-bubble-sent-foreground",
                                      isLastInGroup && "rounded-br-md",
                                    )
                                  : cn(
                                      "bg-bubble-received text-bubble-received-foreground",
                                      isLastInGroup && "rounded-bl-md",
                                    ),
                              )}
                            >
                              {/* Floating Reaction Menu */}
                              <div
                                className={cn(
                                  "glass absolute -top-10 z-20 hidden gap-1 rounded-full p-1.5 transition-all group-hover:flex",
                                  isMe ? "right-0" : "left-0",
                                )}
                              >
                                {REACTION_EMOJIS.map((emoji) => (
                                  <button
                                    key={emoji}
                                    onClick={() =>
                                      sendToggleReaction(msg._id, emoji)
                                    }
                                    className="flex size-8 cursor-pointer items-center justify-center rounded-full text-lg transition-transform hover:scale-110 hover:bg-secondary"
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                              {msg.replyTo && (
                                <div
                                  onClick={() =>
                                    handleScrollToParent(msg.replyTo._id)
                                  }
                                  className={cn(
                                    "mb-1 cursor-pointer rounded-xl border-l-2 bg-black/10 p-2 transition-colors hover:bg-black/20",
                                    isMe
                                      ? "border-primary-foreground/40"
                                      : "border-muted-foreground/40",
                                  )}
                                >
                                  <p className="text-xs font-semibold opacity-80 mb-0.5">
                                    {typeof msg.replyTo.senderId === "object"
                                      ? msg.replyTo.senderId?.fullName || "User"
                                      : activeConversation.members?.find(
                                          (m) => m._id === msg.replyTo.senderId,
                                        )?.fullName || "User"}
                                  </p>
                                  <p className="text-xs opacity-70 truncate max-w-[200px] sm:max-w-[300px]">
                                    {msg.replyTo.text ||
                                      (msg.replyTo.image
                                        ? "📷 Image"
                                        : msg.replyTo.audio?.url
                                          ? "🎵 Audio"
                                          : msg.replyTo.document?.url
                                            ? "📎 Document"
                                            : "Attachment")}
                                  </p>
                                </div>
                              )}
                              {msg.image && (
                                <img
                                  src={msg.image}
                                  alt="Attachment"
                                  className="sm:max-w-[200px] rounded-md object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                  onClick={() =>
                                    setSelectedImageModal(msg.image)
                                  }
                                />
                              )}
                              {msg.audio?.url && (
                                <div className="flex flex-col gap-1.5 min-w-[220px] max-w-[280px]">
                                  <div className="flex items-center gap-2 text-xs opacity-70">
                                    <Music className="w-3.5 h-3.5 shrink-0" />
                                    <span className="truncate">
                                      {msg.audio.name || "Audio"}
                                    </span>
                                  </div>
                                  <audio
                                    controls
                                    preload="metadata"
                                    className="w-full h-8 rounded-lg"
                                    style={{
                                      filter:
                                        theme === "dark"
                                          ? "invert(1) hue-rotate(180deg) brightness(0.85)"
                                          : "none",
                                    }}
                                  >
                                    <source src={msg.audio.url} />
                                    Your browser does not support audio
                                    playback.
                                  </audio>
                                </div>
                              )}
                              {msg.document?.url && (
                                <a
                                  href={msg.document.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={cn(
                                    "flex items-center gap-3 px-3 py-2.5 rounded-xl min-w-[200px] max-w-[280px] transition-colors group/doc",
                                    isMe
                                      ? "bg-primary/20 hover:bg-primary/30"
                                      : "bg-secondary/60 hover:bg-secondary border border-border",
                                  )}
                                >
                                  <div
                                    className={cn(
                                      "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                                      isMe ? "bg-primary/30" : "bg-primary/20",
                                    )}
                                  >
                                    <FileText className="w-5 h-5 text-primary" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">
                                      {msg.document.name || "Document"}
                                    </p>
                                    {msg.document.size > 0 && (
                                      <p className="text-[11px] opacity-60">
                                        {msg.document.size < 1024
                                          ? `${msg.document.size} B`
                                          : msg.document.size < 1024 * 1024
                                            ? `${(msg.document.size / 1024).toFixed(1)} KB`
                                            : `${(msg.document.size / (1024 * 1024)).toFixed(1)} MB`}
                                      </p>
                                    )}
                                  </div>
                                  <Download className="w-4 h-4 opacity-40 group-hover/doc:opacity-100 transition-opacity shrink-0" />
                                </a>
                              )}
                              {msg.deletedForEveryone ? (
                                <div className="text-sm italic text-muted-foreground">
                                  Message deleted
                                </div>
                              ) : editingMessageId === msg._id ? (
                                <div className="flex flex-col gap-2 min-w-[200px]">
                                  <input
                                    type="text"
                                    value={editMessageText}
                                    onChange={(e) =>
                                      setEditMessageText(e.target.value)
                                    }
                                    onKeyDown={async (e) => {
                                      if (e.key === "Enter") {
                                        e.preventDefault();
                                        if (
                                          editMessageText.trim() &&
                                          editMessageText !== msg.text
                                        ) {
                                          await editMessage(
                                            msg._id,
                                            editMessageText,
                                          );
                                        }
                                        setEditingMessageId(null);
                                      } else if (e.key === "Escape") {
                                        setEditingMessageId(null);
                                      }
                                    }}
                                    autoFocus
                                    className={cn(
                                      "text-[15px] bg-input/50 text-foreground rounded-md px-2 py-1 outline-none border transition-colors",
                                      isMe
                                        ? "border-primary-foreground/45 focus:border-primary-foreground"
                                        : "border-border focus:border-primary",
                                    )}
                                  />
                                  <div className="flex justify-end gap-2 text-xs">
                                    <button
                                      onClick={() => setEditingMessageId(null)}
                                      className="text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      onClick={async () => {
                                        if (
                                          editMessageText.trim() &&
                                          editMessageText !== msg.text
                                        ) {
                                          await editMessage(
                                            msg._id,
                                            editMessageText,
                                          );
                                        }
                                        setEditingMessageId(null);
                                      }}
                                      className="font-medium text-primary transition-opacity hover:opacity-80"
                                    >
                                      Save
                                    </button>
                                  </div>
                                </div>
                              ) : (msg.type === "text" || msg.decryptedText != null) ? (
                                <div className="flex flex-col">
                                  <p className="break-words text-[17px] leading-[22px]">
                                    {msg.decryptedText ?? msg.text ?? "[Unable to decrypt]"}
                                  </p>
                                  {msg.isEdited && (
                                    <span className="text-[10px] opacity-70 mt-0.5">
                                      (edited)
                                    </span>
                                  )}
                                </div>
                              ) : null}
                            </div>

                            {/* Active Reactions Container */}
                            {msg.reactions && msg.reactions.length > 0 && (
                              <div
                                className={cn(
                                  "flex flex-wrap gap-1 mt-1 z-10",
                                  isMe
                                    ? "justify-end pr-1"
                                    : "justify-start pl-1",
                                )}
                              >
                                {Object.entries(
                                  msg.reactions.reduce((acc, curr) => {
                                    acc[curr.emoji] =
                                      (acc[curr.emoji] || 0) + 1;
                                    return acc;
                                  }, {}),
                                ).map(([emoji, count]) => {
                                  const hasReacted = msg.reactions.some(
                                    (r) =>
                                      r.userId === authUser?._id &&
                                      r.emoji === emoji,
                                  );
                                  return (
                                    <button
                                      key={emoji}
                                      onClick={() =>
                                        sendToggleReaction(msg._id, emoji)
                                      }
                                      className={cn(
                                        "flex cursor-pointer items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px] leading-[13px] transition-all hover:scale-105",
                                        hasReacted
                                          ? "border-primary/40 bg-primary/15 text-primary"
                                          : "border-border bg-card text-foreground hover:bg-secondary/70",
                                      )}
                                    >
                                      <span>{emoji}</span>
                                      {count > 1 && (
                                        <span className="font-medium ml-0.5">
                                          {count}
                                        </span>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            )}

                            <div className="flex items-center gap-1 mt-1 px-1">
                              <span className="text-xs leading-4 text-label-tertiary">
                                {formatTime(msg.createdAt)}
                              </span>
                              {isMe && (
                                <span
                                  className={cn(
                                    msg.status === "seen"
                                      ? "text-success"
                                      : "text-label-tertiary",
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
                      </Motion.div>
                    );
                  })}
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <p className="text-sm">No messages yet. Say hello! 👋</p>
                </div>
              )}

              {/* Typing indicators */}
              {activeConversation &&
                (activeConversation.isGroupChat
                  ? typingUsers
                      .filter(
                        (t) =>
                          typeof t === "object" &&
                          t.convoId === activeConversation._id,
                      )
                      .map((t) => {
                        const user = activeConversation.members?.find(
                          (m) => m._id === t.userId,
                        );
                        if (!user) return null;
                        return (
                          <div
                            key={user._id}
                            className="flex w-full justify-start mt-2"
                          >
                            <div className="flex max-w-[70%] gap-3">
                              <div className="shrink-0 mt-auto">
                                <Avatar src={getAvatarUrl(user)} size="sm" />
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[10px] text-muted-foreground ml-1 mb-0.5">
                                  {user.fullName}
                                </span>
                                <div className="flex h-9 items-center gap-1.5 rounded-[18px] rounded-bl-md bg-bubble-received px-4 py-2.5 text-bubble-received-foreground">
                                  <Motion.div
                                    animate={{ y: [0, -3, 0] }}
                                    transition={{
                                      repeat: Infinity,
                                      duration: 0.6,
                                      delay: 0,
                                    }}
                                  className="size-1.5 rounded-full bg-label-secondary"
                                  />
                                  <Motion.div
                                    animate={{ y: [0, -3, 0] }}
                                    transition={{
                                      repeat: Infinity,
                                      duration: 0.6,
                                      delay: 0.2,
                                    }}
                                    className="size-1.5 rounded-full bg-label-secondary"
                                  />
                                  <Motion.div
                                    animate={{ y: [0, -3, 0] }}
                                    transition={{
                                      repeat: Infinity,
                                      duration: 0.6,
                                      delay: 0.4,
                                    }}
                                    className="size-1.5 rounded-full bg-label-secondary"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                  : isOtherTyping && (
                      <div className="flex w-full justify-start mt-2">
                        <div className="flex max-w-[70%] gap-3">
                          <div className="shrink-0 mt-auto">
                            <Avatar src={chatAvatar} size="sm" />
                          </div>
                          <div className="flex h-11 items-center gap-1.5 rounded-[18px] rounded-bl-md bg-bubble-received px-4 py-3.5 text-bubble-received-foreground">
                            <Motion.div
                              animate={{ y: [0, -3, 0] }}
                              transition={{
                                repeat: Infinity,
                                duration: 0.6,
                                delay: 0,
                              }}
                              className="size-1.5 rounded-full bg-label-secondary"
                            />
                            <Motion.div
                              animate={{ y: [0, -3, 0] }}
                              transition={{
                                repeat: Infinity,
                                duration: 0.6,
                                delay: 0.2,
                              }}
                              className="size-1.5 rounded-full bg-label-secondary"
                            />
                            <Motion.div
                              animate={{ y: [0, -3, 0] }}
                              transition={{
                                repeat: Infinity,
                                duration: 0.6,
                                delay: 0.4,
                              }}
                              className="size-1.5 rounded-full bg-label-secondary"
                            />
                          </div>
                        </div>
                      </div>
                    ))}

              <div ref={messagesEndRef} className="h-1" />
            </div>

            {/* Input Area */}
            <div className="shrink-0 px-3 py-3 sm:px-5">
              {replyingToMessage && (
                <div className="animate-fadeIn mx-auto mb-2 flex max-w-4xl items-center justify-between rounded-2xl border-l-4 border-primary bg-secondary/60 p-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-primary mb-1">
                      Replying to{" "}
                      {getMessageSenderId(replyingToMessage) === authUser?._id
                        ? "yourself"
                        : typeof replyingToMessage.senderId === "object"
                          ? replyingToMessage.senderId.fullName
                          : activeConversation.members?.find(
                              (m) =>
                                m._id === getMessageSenderId(replyingToMessage),
                            )?.fullName || "user"}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {replyingToMessage.text ||
                        (replyingToMessage.image
                          ? "📷 Image"
                          : replyingToMessage.audio?.url
                            ? "🎵 Audio"
                            : replyingToMessage.document?.url
                              ? "📎 Document"
                              : "Attachment")}
                    </p>
                  </div>
                  <button
                    onClick={clearReplyingToMessage}
                    className="p-1 ml-2 text-muted-foreground hover:text-foreground hover:bg-secondary/40 rounded-full transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              {mediaPreview && (
                <div className="animate-fadeIn mx-auto mb-3 max-w-4xl">
                  {mediaPreviewType === "image" ? (
                    <div className="relative w-32 h-32 rounded-lg overflow-hidden border border-border mx-auto">
                      <img
                        src={mediaPreview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={removefile}
                        type="button"
                      className="absolute right-1 top-1 flex size-7 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="mx-auto flex max-w-xs items-center gap-3 rounded-2xl bg-card px-4 py-3">
                      <div
                        className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                          mediaPreviewType === "audio"
                            ? "bg-emerald-500/10"
                            : "bg-primary/10",
                        )}
                      >
                        {mediaPreviewType === "audio" ? (
                          <Music className="w-5 h-5 text-emerald-500" />
                        ) : (
                          <FileText className="w-5 h-5 text-primary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground font-medium truncate">
                          {mediaPreview}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {selectedFile &&
                            (selectedFile.size < 1024 * 1024
                              ? `${(selectedFile.size / 1024).toFixed(1)} KB`
                              : `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB`)}
                        </p>
                      </div>
                      <button
                        onClick={removefile}
                        type="button"
                        className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}
              <form
                onSubmit={handleSendMessage}
                className="glass mx-auto flex max-w-4xl items-end gap-1 rounded-[26px] p-1.5"
              >
                <input
                  type="file"
                  accept="image/*,audio/*,.pdf,.doc,.docx,.txt"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="mb-0.5 size-10 shrink-0 text-primary hover:bg-secondary/50"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <CirclePlus className="size-6" />
                </Button>

                <div className="relative flex flex-1 items-end rounded-[22px] transition-all focus-within:ring-2 focus-within:ring-primary/20">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="mb-0.5 ml-0.5 size-10 shrink-0 text-label-secondary hover:text-primary"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  >
                    <Smile className="size-5" />
                  </Button>

                  {showEmojiPicker && (
                    <div className="glass-thick absolute bottom-14 left-0 z-50 overflow-hidden rounded-[24px]">
                      <EmojiPicker
                        theme={theme === "dark" ? "dark" : "light"}
                        onEmojiClick={(emojiData) => {
                          setMessageText((prev) => prev + emojiData.emoji);
                        }}
                      />
                    </div>
                  )}

                  <textarea
                    value={messageText}
                    onChange={handleTyping}
                    placeholder="Type a message..."
                    className="custom-scrollbar min-h-11 max-h-32 w-full resize-none bg-transparent px-2 py-3 text-[17px] leading-[22px] text-foreground outline-none placeholder:text-muted-foreground"
                    rows={1}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e);
                      }
                    }}
                  />
                </div>

                <AnimatePresence initial={false}>
                  {(messageText.trim() || selectedFile) && (
                    <Motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="mb-0.5 shrink-0"
                    >
                      <Button type="submit" size="icon" className="size-10">
                        <ArrowUp className="size-5" />
                      </Button>
                    </Motion.div>
                  )}
                </AnimatePresence>
              </form>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center bg-background p-8 text-center text-label-secondary">
            <div className="mb-6 flex size-24 items-center justify-center rounded-full bg-secondary">
              <svg
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="text-label-secondary"
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
            <h3 className="animate-fadeIn mb-2 text-xl font-semibold text-foreground">
              Welcome, {authUser?.fullName}!
            </h3>
            <p className="max-w-md">
              Search for users or create a group in the sidebar to start
              collaborating.
            </p>
          </div>
        )}
      </div>

      {/* Image Modal */}
      <AnimatePresence>
        {selectedImageModal && (
          <Motion.div
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
                className="absolute -top-12 right-0 rounded-full bg-black/40 text-white hover:bg-white/10"
              >
                <X className="w-6 h-6" />
              </Button>
              <Motion.img
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                src={selectedImageModal}
                alt="Fullscreen Attachment"
                className="max-h-[85vh] max-w-full rounded-lg object-contain"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </Motion.div>
        )}
      </AnimatePresence>

      {/* Create Group Modal */}
      <AnimatePresence>
        {isCreateGroupOpen && (
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-3 sm:items-center"
            onClick={() => {
              setIsCreateGroupOpen(false);
              setGroupName("");
              setSelectedGroupMembers([]);
              setGroupSearchQuery("");
            }}
          >
            <Motion.div
              initial={{ y: 96, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 96, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-thick mb-3 flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-t-[28px] sm:mb-0 sm:rounded-[28px]"
            >
              <div className="mx-auto mt-2 h-1 w-9 rounded-full bg-label-tertiary/40" />
              {/* Header */}
              <div className="hairline flex min-h-12 items-center justify-between px-3">
                <div>
                  <h3 className="text-[17px] font-semibold leading-[22px] text-foreground">
                    Create Group Chat
                  </h3>
                  <p className="text-xs text-label-secondary">
                    Collaborate with multiple people
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-primary"
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
              <div className="custom-scrollbar flex-1 space-y-4 overflow-y-auto p-4">
                {/* Group Name input */}
                <div className="space-y-1.5">
                  <label className="ml-1 text-[13px] font-medium leading-[18px] text-label-secondary">
                    Group Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Project Avengers 🚀"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    className="min-h-11 w-full rounded-2xl border-0 bg-input-background px-4 py-3 text-[17px] leading-[22px] text-foreground outline-none transition-all placeholder:text-muted-foreground focus:bg-input focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                {/* Selected Members Chips */}
                {selectedGroupMembers.length > 0 && (
                  <div className="space-y-1.5">
                    <label className="ml-1 text-[13px] font-medium leading-[18px] text-label-secondary">
                      Selected Members ({selectedGroupMembers.length})
                    </label>
                    <div className="custom-scrollbar flex max-h-24 flex-wrap gap-1.5 overflow-y-auto rounded-2xl bg-card p-2">
                      {selectedGroupMembers.map((memberId) => {
                        const member =
                          groupSearchResults.find((m) => m._id === memberId) ||
                          conversations
                            .flatMap((c) => c.members)
                            .find((m) => m._id === memberId);
                        if (!member) return null;
                        return (
                          <div
                            key={memberId}
                            className="animate-fadeIn flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary"
                          >
                            <span>{member.fullName}</span>
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedGroupMembers(
                                  selectedGroupMembers.filter(
                                    (id) => id !== memberId,
                                  ),
                                )
                              }
                              className="text-primary transition-opacity hover:opacity-70"
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
                  <label className="ml-1 text-[13px] font-medium leading-[18px] text-label-secondary">
                    Add Members
                  </label>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-label-secondary" />
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={groupSearchQuery}
                      onChange={(e) => setGroupSearchQuery(e.target.value)}
                      className="h-11 w-full rounded-full border-0 bg-secondary/70 pl-10 pr-4 text-[17px] leading-[22px] text-foreground outline-none transition-all placeholder:text-muted-foreground focus:bg-input focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                </div>

                {/* Search Results list */}
                <div className="custom-scrollbar max-h-56 overflow-y-auto pr-1">
                  {isGroupSearching ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="size-5 animate-spin text-primary" />
                    </div>
                  ) : groupSearchResults.length > 0 ? (
                    groupSearchResults.map((user) => {
                      const isSelected = selectedGroupMembers.includes(
                        user._id,
                      );
                      return (
                        <div
                          key={user._id}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedGroupMembers(
                                selectedGroupMembers.filter(
                                  (id) => id !== user._id,
                                ),
                              );
                            } else {
                              setSelectedGroupMembers([
                                ...selectedGroupMembers,
                                user._id,
                              ]);
                            }
                          }}
                          className={cn(
                            "flex min-h-[58px] cursor-pointer items-center justify-between rounded-2xl px-3 transition-all",
                            isSelected
                              ? "bg-primary/10"
                              : "hover:bg-secondary/60",
                          )}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Avatar
                              src={getAvatarUrl(user)}
                              size="sm"
                              status={
                                isUserOnline(user._id) ? "online" : "offline"
                              }
                            />
                            <div className="min-w-0">
                              <h4 className="truncate text-[15px] font-medium leading-5 text-foreground">
                                {user.fullName}
                              </h4>
                              <p className="truncate text-xs leading-4 text-label-secondary">
                                @{user.username}
                              </p>
                            </div>
                          </div>

                          <div
                            className={cn(
                              "flex size-5 shrink-0 items-center justify-center rounded-full border transition-all",
                              isSelected
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border",
                            )}
                          >
                            {isSelected && (
                              <Check className="size-3 stroke-[3]" />
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="py-6 text-center text-xs text-label-tertiary">
                      No users found
                    </p>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="hairline flex items-center justify-end gap-2 px-4 py-3">
                <Button
                  variant="ghost"
                  className="text-primary"
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
                    const newGroup = await createGroupConversation(
                      groupName.trim(),
                      selectedGroupMembers,
                    );
                    setIsCreatingGroup(false);
                    if (newGroup) {
                      setIsCreateGroupOpen(false);
                      setGroupName("");
                      setSelectedGroupMembers([]);
                      setGroupSearchQuery("");
                    }
                  }}
                  className="px-4 py-2"
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
            </Motion.div>
          </Motion.div>
        )}
      </AnimatePresence>

      {/* Group Info Modal */}
      <AnimatePresence>
        {isGroupInfoOpen && activeConversation?.isGroupChat && (
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-3 sm:items-center"
          >
            <Motion.div
              initial={{ y: 96, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 96, opacity: 0 }}
              className="glass-thick mb-3 flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-t-[28px] sm:mb-0 sm:rounded-[28px]"
            >
              <div className="mx-auto mt-2 h-1 w-9 rounded-full bg-label-tertiary/40" />
              <div className="hairline flex min-h-12 items-center justify-between px-3">
                <h2 className="flex items-center gap-2 text-[17px] font-semibold leading-[22px] text-foreground">
                  <span className="text-primary">👥</span> Group Info
                </h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsGroupInfoOpen(false)}
                  className="text-primary"
                >
                  <X className="size-5" />
                </Button>
              </div>

              <div className="custom-scrollbar flex-1 overflow-y-auto p-5">
                <div className="flex flex-col items-center gap-3 mb-6">
                  {/* Group Avatar — click to change (admin only) */}
                  <div className="relative group/avatar">
                    <Avatar
                      size="xl"
                      src={chatAvatar}
                      className="size-20 ring-4 ring-background"
                    />
                    {activeConversation.groupAdmins?.some(
                      (a) => (a._id || a) === authUser?._id,
                    ) && (
                      <>
                        <input
                          type="file"
                          accept="image/*"
                          ref={groupAvatarInputRef}
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            if (file.size > 5 * 1024 * 1024) {
                              toast.error("Image must be under 5MB");
                              return;
                            }
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              updateGroupMetadata(
                                activeConversation._id,
                                null,
                                reader.result,
                              );
                            };
                            reader.readAsDataURL(file);
                            e.target.value = "";
                          }}
                        />
                        <button
                          onClick={() => groupAvatarInputRef.current?.click()}
                          className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full bg-black/45 opacity-0 transition-opacity group-hover/avatar:opacity-100"
                        >
                          <Pencil className="size-4 text-white" />
                        </button>
                      </>
                    )}
                  </div>

                  {/* Group Name — click to edit (admin only) */}
                  {isEditingGroupName ? (
                    <input
                      autoFocus
                      value={editGroupNameText}
                      onChange={(e) => setEditGroupNameText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && editGroupNameText.trim()) {
                          updateGroupMetadata(
                            activeConversation._id,
                            editGroupNameText.trim(),
                            null,
                          );
                          setIsEditingGroupName(false);
                        } else if (e.key === "Escape") {
                          setIsEditingGroupName(false);
                        }
                      }}
                      onBlur={() => {
                        if (
                          editGroupNameText.trim() &&
                          editGroupNameText.trim() !== chatTitle
                        ) {
                          updateGroupMetadata(
                            activeConversation._id,
                            editGroupNameText.trim(),
                            null,
                          );
                        }
                        setIsEditingGroupName(false);
                      }}
                      className="w-full max-w-[260px] rounded-2xl border-0 bg-input-background px-3 py-2 text-center text-xl font-bold text-foreground outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  ) : (
                    <h3
                      className={`text-xl font-bold text-foreground ${activeConversation.groupAdmins?.some((a) => (a._id || a) === authUser?._id) ? "cursor-pointer hover:text-primary transition-colors" : ""}`}
                      onClick={() => {
                        if (
                          activeConversation.groupAdmins?.some(
                            (a) => (a._id || a) === authUser?._id,
                          )
                        ) {
                          setEditGroupNameText(chatTitle);
                          setIsEditingGroupName(true);
                        }
                      }}
                      title={
                        activeConversation.groupAdmins?.some(
                          (a) => (a._id || a) === authUser?._id,
                        )
                          ? "Click to edit group name"
                          : undefined
                      }
                    >
                      {chatTitle}
                      {activeConversation.groupAdmins?.some(
                        (a) => (a._id || a) === authUser?._id,
                      ) && (
                          <Pencil className="ml-2 inline size-3 text-label-secondary" />
                      )}
                    </h3>
                  )}

                  <p className="text-sm text-label-secondary">
                    {activeConversation.members?.length} Members
                  </p>
                </div>

                <div className="space-y-3">
                  <h4 className="mb-2 text-[13px] font-medium leading-[18px] text-label-secondary">
                    Members
                  </h4>
                  {activeConversation.members?.map((member) => {
                    const isAdmin = activeConversation.groupAdmins?.some(
                      (a) => (a._id || a) === member._id,
                    );
                    const isMe = member._id === authUser?._id;
                    const amIAdmin = activeConversation.groupAdmins?.some(
                      (a) => (a._id || a) === authUser?._id,
                    );

                    return (
                      <div
                        key={member._id}
                        className="flex min-h-[64px] items-center justify-between rounded-2xl bg-card px-3 py-2 transition-colors hover:bg-secondary/60"
                      >
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            className="rounded-full"
                            onClick={() => {
                              if (!isMe) setProfileModalUserId(member._id);
                            }}
                          >
                            <Avatar
                              src={getAvatarUrl(member)}
                              status={
                                isUserOnline(member._id) ? "online" : "offline"
                              }
                            />
                          </button>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-[15px] font-medium leading-5 text-foreground">
                                {member.fullName}{" "}
                                {isMe && (
                                  <span className="text-xs font-normal text-primary">
                                    (You)
                                  </span>
                                )}
                              </p>
                              {isAdmin && (
                                <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                                  Admin
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-label-secondary">
                              @{member.username}
                            </p>
                          </div>
                        </div>

                        {/* Admin Controls */}
                        {amIAdmin && !isMe && (
                          <div className="flex gap-1">
                            {!isAdmin && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="min-h-9 text-xs text-primary"
                                onClick={() =>
                                  promoteToAdmin(
                                    activeConversation._id,
                                    member._id,
                                  )
                                }
                              >
                                Promote
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="min-h-9 text-xs text-destructive hover:bg-destructive/10"
                              onClick={() =>
                                removeGroupMember(
                                  activeConversation._id,
                                  member._id,
                                )
                              }
                            >
                              Remove
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </Motion.div>
          </Motion.div>
        )}
      </AnimatePresence>

      {/* Profile Preview Modal */}
      {profileModalUserId && (
        <ProfileModal
          userId={profileModalUserId}
          onClose={() => setProfileModalUserId(null)}
          onOpenInfo={(profile) => {
            setUserInfoProfile(profile);
            setProfileModalUserId(null);
          }}
        />
      )}

      {/* Full User Info Modal */}
      {userInfoProfile && (
        <UserInfoModal
          profile={userInfoProfile}
          onClose={() => setUserInfoProfile(null)}
        />
      )}

      {/* Chat Theme Picker */}
      {showThemePicker && activeConversation && (
        <ThemePicker
          chatId={activeConversation._id}
          onClose={() => setShowThemePicker(false)}
        />
      )}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: var(--label-tertiary);
          border-radius: 10px;
        }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb {
          background-color: var(--label-secondary);
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.15s ease-out forwards;
        }

        .highlight-pulse {
          animation: pulseHighlight 2s ease-out;
        }

        @keyframes pulseHighlight {
          0% {
            background-color: rgba(79, 70, 229, 0.4);
          }
          100% {
            background-color: transparent;
          }
        }
      `}</style>
    </div>
  );
}
