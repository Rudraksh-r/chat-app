import { create } from 'zustand';
import axiosInstance from '../lib/axios';
import { toast } from 'sonner';
import useAuthStore from './authStore';

const useChatStore = create((set, get) => ({
  // State
  conversations: [],
  activeConversation: null, // the full conversation object
  messages: [],
  isLoadingConversations: false,
  isLoadingMessages: false,
  isSending: false,
  onlineUsers: [],
  typingUsers: [], // array of userIds currently typing

  // Set online users (called from socketStore)
  setOnlineUsers: (users) => set({ onlineUsers: users }),

  // Set typing users
  addTypingUser: (userId) => {
    const { typingUsers } = get();
    if (!typingUsers.includes(userId)) {
      set({ typingUsers: [...typingUsers, userId] });
    }
  },
  removeTypingUser: (userId) => {
    set({ typingUsers: get().typingUsers.filter(id => id !== userId) });
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
    set({ activeConversation: conversation, messages: [], isLoadingMessages: true });
    try {
      const res = await axiosInstance.get(`/message/${conversation._id}`);
      set({ messages: res.data.data });
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      toast.error('Failed to load messages');
    } finally {
      set({ isLoadingMessages: false });
    }
  },

  // Send a message
  sendMessage: async (text) => {
    const { activeConversation, messages } = get();
    if (!activeConversation) return;

    set({ isSending: true });
    try {
      const res = await axiosInstance.post('/message/send', {
        convoId: activeConversation._id,
        text,
      });
      // Append the new message to the messages array
      set({ messages: [...messages, res.data.data] });

      // Update the conversation's lastMessage in the sidebar
      set({
        conversations: get().conversations.map(c =>
          c._id === activeConversation._id
            ? { ...c, lastMessage: text, updatedAt: new Date().toISOString() }
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
  addIncomingMessage: (message) => {
    const { activeConversation, messages, conversations } = get();

    // If the message belongs to the currently active conversation, append it
    if (activeConversation && message.convoId === activeConversation._id) {
      set({ messages: [...messages, message] });
    }

    // Update sidebar lastMessage for the relevant conversation
    set({
      conversations: conversations.map(c =>
        c._id === message.convoId
          ? { ...c, lastMessage: message.text, updatedAt: new Date().toISOString() }
          : c
      ),
    });
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
