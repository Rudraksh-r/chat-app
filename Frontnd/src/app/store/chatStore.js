import { create } from 'zustand';
import axiosInstance, { deleteMessageForEveryone as deleteMessageForEveryoneAPI, deleteMessageForMe as deleteMessageForMeAPI } from '../lib/axios';
import { toast } from 'sonner';
import useAuthStore from './authStore';


const useChatStore = create((set, get) => ({
  // State
  conversations: [],
  activeConversation: null, // the full conversation object
  messages: [],
  isLoadingConversations: false,
  isLoadingMessages: false,
  isLoadingMore: false,
  isSending: false,
  onlineUsers: [],
  typingUsers: [], // array of userIds currently typing
  unreadCounts: {},
  page: 1,
  hasMore: false,
  isDeleting: false,

  // Set online users (called from socketStore)
  setOnlineUsers: (users) => set({ onlineUsers: users }),

  // Set typing users
  addTypingUser: (typingData) => {
    const { typingUsers } = get();
    if (typeof typingData === "object" && typingData !== null) {
      const { convoId, userId } = typingData;
      const exists = typingUsers.some(t => typeof t === "object" && t.convoId === convoId && t.userId === userId);
      if (!exists) {
        set({ typingUsers: [...typingUsers, typingData] });
      }
    } else {
      if (!typingUsers.includes(typingData)) {
        set({ typingUsers: [...typingUsers, typingData] });
      }
    }
  },
  removeTypingUser: (typingData) => {
    const { typingUsers } = get();
    if (typeof typingData === "object" && typingData !== null) {
      const { convoId, userId } = typingData;
      set({
        typingUsers: typingUsers.filter(t =>
          !(typeof t === "object" && t.convoId === convoId && t.userId === userId)
        )
      });
    } else {
      set({ typingUsers: typingUsers.filter(id => id !== typingData) });
    }
  },

  // Fetch all conversations for the logged-in user
  getConversations: async () => {
    set({ isLoadingConversations: true });
    try {
      const res = await axiosInstance.get('/conversation');
      set({ conversations: res.data.data });
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
      toast.error('Failed to load conversations');
    } finally {
      set({ isLoadingConversations: false });
    }
  },

  // Set the active conversation and fetch its messages
  setActiveConversation: async (conversation) => {
    const { unreadCounts } = get();
    // Clear unread count for this conversation when opened
    set({
      activeConversation: conversation,
      messages: [],
      isLoadingMessages: true,
      page: 1,
      hasMore: false,
      unreadCounts: { ...unreadCounts, [conversation._id]: 0 }
    });
    try {
      const res = await axiosInstance.get(`/message/${conversation._id}?limit=20&page=1`);
      const { messages, hasMore } = res.data.data;
      set({ messages, hasMore, page: 1 });
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      toast.error('Failed to load messages');
    } finally {
      set({ isLoadingMessages: false });
    }
  },

  // Send a message
  sendMessage: async (text, file = null) => {
    const { activeConversation, messages } = get();
    if (!activeConversation) return;

    set({ isSending: true });
    try {
      const formData = new FormData();
      formData.append("convoId", activeConversation._id);
      if (text) formData.append("text", text);
      if (file) formData.append("image", file);

      const res = await axiosInstance.post('/message/send', formData);
      const newMessage = res.data.data;

      // Append the new message to the messages array
      set({ messages: [...messages, newMessage] });

      // Update the conversation's lastMessage in the sidebar

      const sidebarMessageText = newMessage.image ? (newMessage.text || "📷 Image") : newMessage.text;

      set({
        conversations: get().conversations.map(c =>
          c._id === activeConversation._id
            ? { ...c, lastMessage: sidebarMessageText, updatedAt: new Date().toISOString() }
            : c
        ),
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
    } finally {
      set({ isSending: false });
    }
  },

  // Handle incoming real-time message (called from socketStore)
  addIncomingMessage: async (message) => {
    const { activeConversation, messages, conversations, unreadCounts } = get();

    const isCurrentConvo = activeConversation && message.convoId === activeConversation._id;

    // Check if the conversation is in the sidebar. If not, fetch them to sync the new convo/group
    const existingConvo = conversations.find(c => c._id === message.convoId);
    if (!existingConvo) {
      await get().getConversations();
    }

    // Re-retrieve conversations after sync in case it was updated
    const currentConversations = get().conversations;

    // If the message belongs to the currently active conversation, append it
    if (isCurrentConvo) {
      set({ messages: [...messages, message] });
    } else {
      // If it's for a different conversation, show a toast and increment unread count
      const convo = currentConversations.find(c => c._id === message.convoId);
      const sender = convo?.members.find(m => m._id === message.senderId);
      const senderName = sender?.fullName || "Someone";

      const previewText = message.image ? "📷 Image" : message.text;
      toast(`New message from ${senderName}`, { description: previewText });

      set({
        unreadCounts: {
          ...unreadCounts,
          [message.convoId]: (unreadCounts[message.convoId] || 0) + 1,
        }
      });
    }

    // Update sidebar lastMessage for the relevant conversation
    const sidebarMessageText = message.image ? (message.text || "📷 Image") : message.text;

    set({
      conversations: currentConversations.map(c =>
        c._id === message.convoId
          ? { ...c, lastMessage: sidebarMessageText, updatedAt: new Date().toISOString() }
          : c
      ),
    });
  },

  // Phase 2.5 #3: Mark messages as seen in the UI (called from socketStore)
  markMessagesSeen: (convoId, seenBy) => {
    const { activeConversation, messages } = get();

    // If we're viewing this conversation, update all messages from the other user
    if (activeConversation && activeConversation._id === convoId) {
      set({
        messages: messages.map(msg =>
          msg.senderId !== seenBy ? { ...msg, status: "seen" } : msg
        ),
      });
    }
  },

  // Create or get a conversation with a user (used when starting a new chat)
  createConversation: async (receiverId) => {
    try {
      const res = await axiosInstance.post('/conversation', { receiverId });
      const conversation = res.data.data;

      // Add to conversations list if not already there
      const { conversations } = get();
      const exists = conversations.find(c => c._id === conversation._id);
      if (!exists) {
        set({ conversations: [conversation, ...conversations] });
      }

      // Set it as active
      await get().setActiveConversation(conversation);
      return conversation;
    } catch (error) {
      console.error('Failed to create conversation:', error);
      toast.error('Failed to start conversation');
      return null;
    }
  },

  // Create a new group conversation
  createGroupConversation: async (groupName, memberIds) => {
    try {
      const res = await axiosInstance.post('/conversation/group', { groupName, members: memberIds });
      const conversation = res.data.data;

      const { conversations } = get();
      set({ conversations: [conversation, ...conversations] });

      await get().setActiveConversation(conversation);
      return conversation;
    } catch (error) {
      console.error('Failed to create group conversation:', error);
      toast.error(error.response?.data?.message || 'Failed to create group chat');
      return null;
    }
  },

  // Load more historical messages for pagination
  loadMoreMessages: async () => {
    const { activeConversation, messages, page, hasMore, isLoadingMore } = get();
    if (!activeConversation || !hasMore || isLoadingMore) return;

    set({ isLoadingMore: true });
    try {
      const nextPage = page + 1;
      const res = await axiosInstance.get(`/message/${activeConversation._id}?limit=20&page=${nextPage}`);
      const { messages: newMessages, hasMore: nextHasMore } = res.data.data;

      set({
        messages: [...newMessages, ...messages],
        page: nextPage,
        hasMore: nextHasMore
      });
    } catch (error) {
      console.error('Failed to load more messages:', error);
      toast.error('Failed to load older messages');
    } finally {
      set({ isLoadingMore: false });
    }
  },

  //soft-delete message (delete for everyone)
  deleteMessage: async (messageId) => {
    set({ isDeleting: true });
    try {
      await axiosInstance.patch(`/message/${messageId}/delete`);
      toast.success('Message deleted for everyone');
    } catch (error) {
      console.error('Failed to delete message:', error);
      toast.error('Failed to delete message');
    } finally {
      set({ isDeleting: false });
    }
  },
  // Alias for clarity
  deleteMessageForEveryone: async (messageId) => {
    try {
      await deleteMessageForEveryoneAPI(messageId);
      toast.success('Message deleted for everyone');
    } catch (error) {
      console.error('Failed to delete for everyone:', error);
      toast.error('Failed to delete for everyone');
    }
  },

  deleteMessageForMe: async (messageId) => {
    set({ isDeleting: true });
    try {
      await deleteMessageForMeAPI(messageId);
      toast.success('Message deleted for you');
      // The socket event will trigger markMessagesAsDeleted locally
    } catch (error) {
      console.error('Failed to delete message for you:', error);
      toast.error('Failed to delete message');
    } finally {
      set({ isDeleting: false });
    }
  },

  markMessagesAsDeleted: (messageId, convoId, permanently) => {
    const { conversations, activeConversation, messages } = get();

    let newMessages = messages;
    if (activeConversation && activeConversation._id === convoId) {
      if (permanently) {
        newMessages = messages.map((msg) =>
          msg._id === messageId ? { ...msg, deletedForEveryone: true, text: "Message deleted", image: null } : msg
        );
      } else {
        newMessages = messages.filter((msg) => msg._id !== messageId);
      }
      set({ messages: newMessages });
    }

    set({
      conversations: conversations.map(c => {
        if (c._id === convoId) {
          let sidebarMessageText = c.lastMessage;
          
          if (activeConversation && activeConversation._id === convoId) {
            if (newMessages.length > 0) {
              const lastMsg = newMessages[newMessages.length - 1];
              sidebarMessageText = lastMsg.deletedForEveryone ? "Message deleted" : (lastMsg.image ? (lastMsg.text || "📷 Image") : lastMsg.text);
            } else {
              sidebarMessageText = "No messages yet";
            }
          } else if (permanently) {
             sidebarMessageText = "Message deleted";
          }
          
          return { ...c, lastMessage: sidebarMessageText, updatedAt: new Date().toISOString() };
        }
        return c;
      })
    });
  },



  // Search users
  searchUsers: async (keyword) => {
    if (!keyword.trim()) return [];
    try {
      const res = await axiosInstance.get(`/user/search?search=${keyword}`);
      return res.data.data;
    } catch (error) {
      console.error('Failed to search users:', error);
      return [];
    }
  },

  // Clear chat state (on logout)
  clearChat: () => {
    set({
      conversations: [],
      activeConversation: null,
      messages: [],
      onlineUsers: [],
      typingUsers: [],
    });
  },
}));

export default useChatStore;
