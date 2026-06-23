import { create } from 'zustand';
import axiosInstance, { deleteMessageForEveryone as deleteMessageForEveryoneAPI, deleteMessageForMe as deleteMessageForMeAPI } from '../lib/axios';
import { toast } from 'sonner';
import useAuthStore from './authStore';
import { convertBoundingBoxToBox, updateMotionValuesFromProps } from 'framer-motion';



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
  replyingToMessage: null, 

  setReplyingToMessage: (message) => set({ replyingToMessage: message }),
  clearReplyingToMessage: () => set({ replyingToMessage: null }),

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
      if (file) formData.append("file", file);
      
      const { replyingToMessage } = get();
      if (replyingToMessage) {
          formData.append("replyTo", replyingToMessage._id);
      }

      const res = await axiosInstance.post('/message/send', formData);
      const newMessage = res.data.data;

      // Append the new message to the messages array
      set({ messages: [...messages, newMessage] });

      // Update the conversation's lastMessage in the sidebar

      const sidebarMessageText = newMessage.text || (newMessage.image ? "📷 Image" : newMessage.audio?.url ? "🎵 Audio" : newMessage.document?.url ? "📎 Document" : "");

      set({
        conversations: get().conversations.map(c =>
          c._id === activeConversation._id
            ? { ...c, lastMessage: sidebarMessageText, updatedAt: new Date().toISOString() }
            : c
        ),
      });
      set({ replyingToMessage: null });
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

      const previewText = message.text || (message.image ? "📷 Image" : message.audio?.url ? "🎵 Audio" : message.document?.url ? "📎 Document" : "New message");
      toast(`New message from ${senderName}`, { description: previewText });

      set({
        unreadCounts: {
          ...unreadCounts,
          [message.convoId]: (unreadCounts[message.convoId] || 0) + 1,
        }
      });
    }

    // Update sidebar lastMessage for the relevant conversation
    const sidebarMessageText = message.text || (message.image ? "📷 Image" : message.audio?.url ? "🎵 Audio" : message.document?.url ? "📎 Document" : "");

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
      const res = await axiosInstance.post('/conversation/group', { name: groupName, memberIds: memberIds });
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
          msg._id === messageId ? { ...msg, deletedForEveryone: true, text: "Message deleted", image: null, document: null, audio: null } : msg
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
              sidebarMessageText = lastMsg.deletedForEveryone ? "Message deleted" : (lastMsg.text || (lastMsg.image ? "📷 Image" : lastMsg.audio?.url ? "🎵 Audio" : lastMsg.document?.url ? "📎 Document" : ""));
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
  //Edit message
  editMessage: async (messageId, newText) => {
    try {
      const res = await axiosInstance.patch(`/message/${messageId}/edit`, { text: newText });
      const updatedMessage = res.data.data;

      // Local State Mutation (Pessimistic UI Sync on sender side)
      const updatedMessages = get().messages.map((msg) =>
        msg._id === messageId ? updatedMessage : msg
      );
      set({ messages: updatedMessages });

      // Synchronize Sidebar list view item reference instantly
      const updatedConversations = get().conversations.map((c) =>
        c._id === updatedMessage.convoId
        ? {...c, lastMessage: newText, updatedAt: new Date().toISOString()}
        : c
      );
      set({conversations: updatedConversations});
      return true;
    } catch (error) {
      console.error("Failed executing edit payload", error);
      toast.error(error.response?.data?.message || "Failed to save message edits");
      return false;
    }
  },
  // Real-time Event Receiver Handler invoked via socket connection mapping
  updateIncomingEditMessage: (editedMessage) => {
    const {activeConversation, messages, setMessages, conversations, setConversations} = get();
    const {messageId, text, updatedAt} = editedMessage;

    // If the message belongs to the currently active conversation (the one open in chat window)
    if(activeConversation && activeConversation._id === editedMessage.convoId) {
      // Update the message in the messages array
      setMessages(prev => prev.map(msg => 
        msg._id === messageId
        ? editedMessage
        : msg
      ));
    }

    // Also update the conversation's last message preview if it was an incoming message
    if(activeConversation && activeConversation._id === editedMessage.convoId && editedMessage.senderId !== useAuthStore.getState().user._id) {
      setConversations(prev => prev.map(c => 
        c._id === editedMessage.convoId
        ? {...c, lastMessage: editedMessage.text, updatedAt: editedMessage.updatedAt}
        : c
      ));
      set({conversations: setConversations})
    }
  },

  sendToggleReaction: async (messageId, emoji) => {
    try {
      // Execute the request via the HTTP pipeline
      const res = await axiosInstance.post(`/message/${messageId}/react`, { emoji });
      const serverReactions = res.data.data;

      // Optimistic/Pessimistic reconciliation on sender node instantly
      const structuralRebuild = get().messages.map((m) =>
        m._id === messageId ? { ...m, reactions: serverReactions } : m
      );
      set({ messages: structuralRebuild });
    } catch (error) {
      console.error("Failed to apply emoji selection matrix sequence: ", error);
    }
  },

  // Real-time socket receiver event listener callback hook
  updateIncomingReaction: ({ messageId, reactions }) => {
    const messages = get().messages;
    const messageIndex = messages.findIndex((msg) => msg._id === messageId);
    if (messageIndex > -1) {
      const updatedMessages = [...messages];
      updatedMessages[messageIndex] = { ...updatedMessages[messageIndex], reactions };
      set({ messages: updatedMessages });
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

  // Group actions
  removeGroupMember: async (convoId, targetUserId) => {
    const { activeConversation, conversations } = get();
    // Save previous state for rollback
    const prevActiveConversation = activeConversation;
    const prevConversations = [...conversations];

    // Optimistic UI update
    if (activeConversation && activeConversation._id === convoId) {
       const updatedMembers = activeConversation.members.filter(m => m._id !== targetUserId);
       const updatedAdmins = activeConversation.groupAdmins.filter(adminId => (adminId._id || adminId) !== targetUserId);
       set({ activeConversation: { ...activeConversation, members: updatedMembers, groupAdmins: updatedAdmins } });
    }

    set({ conversations: conversations.map(c => {
      if (c._id === convoId) {
        return { ...c, members: c.members.filter(m => m._id !== targetUserId), groupAdmins: c.groupAdmins.filter(adminId => (adminId._id || adminId) !== targetUserId) };
      }
      return c;
    })});

    try {
       await axiosInstance.patch(`/conversation/${convoId}/remove`, { targetUserId });
       toast.success("User removed from group");
    } catch(err) {
       // Rollback
       set({ activeConversation: prevActiveConversation, conversations: prevConversations });
       toast.error("Failed to remove user");
    }
  },

  promoteToAdmin: async (convoId, targetUserId) => {
    const { activeConversation, conversations } = get();
    const prevActiveConversation = activeConversation;
    const prevConversations = [...conversations];

    if (activeConversation && activeConversation._id === convoId) {
       const updatedAdmins = [...activeConversation.groupAdmins, targetUserId];
       set({ activeConversation: { ...activeConversation, groupAdmins: updatedAdmins } });
    }

    set({ conversations: conversations.map(c => {
      if (c._id === convoId) {
        return { ...c, groupAdmins: [...c.groupAdmins, targetUserId] };
      }
      return c;
    })});

    try {
       await axiosInstance.patch(`/conversation/${convoId}/promote`, { targetUserId });
       toast.success("Promoted to Admin");
    } catch(err) {
       set({ activeConversation: prevActiveConversation, conversations: prevConversations });
       toast.error("Failed to promote user");
    }
  },

  updateGroupMetadata: async (convoId, groupName, groupAvatar) => {
    const { activeConversation, conversations } = get();
    const prevActiveConversation = activeConversation;
    const prevConversations = [...conversations];

    const updatePayload = {};
    if (groupName) updatePayload.groupName = groupName;
    if (groupAvatar) updatePayload.groupAvatar = groupAvatar;

    if (activeConversation && activeConversation._id === convoId) {
       set({ activeConversation: { ...activeConversation, ...updatePayload } });
    }

    set({ conversations: conversations.map(c => {
      if (c._id === convoId) {
        return { ...c, ...updatePayload };
      }
      return c;
    })});

    try {
       await axiosInstance.patch(`/conversation/${convoId}/metadata`, updatePayload);
       toast.success("Group metadata updated");
    } catch(err) {
       set({ activeConversation: prevActiveConversation, conversations: prevConversations });
       toast.error("Failed to update group metadata");
    }
  },

  // Socket listener handlers
  handleIncomingGroupMemberRemoved: ({ convoId, targetUserId }) => {
    const { activeConversation, conversations } = get();
    
    // If the current user was the one removed from the group, they shouldn't see it anymore.
    const currentUser = useAuthStore.getState().user;
    if (currentUser && currentUser._id === targetUserId) {
        set({ conversations: conversations.filter(c => c._id !== convoId) });
        if (activeConversation && activeConversation._id === convoId) {
             set({ activeConversation: null, messages: [] });
             toast.info("You were removed from a group");
        }
        return;
    }

    if (activeConversation && activeConversation._id === convoId) {
       const updatedMembers = activeConversation.members.filter(m => m._id !== targetUserId);
       const updatedAdmins = activeConversation.groupAdmins.filter(adminId => (adminId._id || adminId) !== targetUserId);
       set({ activeConversation: { ...activeConversation, members: updatedMembers, groupAdmins: updatedAdmins } });
    }

    set({ conversations: conversations.map(c => {
      if (c._id === convoId) {
        return { ...c, members: c.members.filter(m => m._id !== targetUserId), groupAdmins: c.groupAdmins.filter(adminId => (adminId._id || adminId) !== targetUserId) };
      }
      return c;
    })});
  },

  handleIncomingGroupMemberAdded: ({ convoId, updatedGroup }) => {
     const { activeConversation, conversations } = get();
     if (activeConversation && activeConversation._id === convoId) {
        set({ activeConversation: { ...activeConversation, members: updatedGroup.members, groupAdmins: updatedGroup.groupAdmins } });
     }

     set({ conversations: conversations.map(c => {
       if (c._id === convoId) {
         return { ...c, members: updatedGroup.members, groupAdmins: updatedGroup.groupAdmins };
       }
       return c;
     })});
  },

  handleIncomingGroupAdminPromoted: ({ convoId, targetUserId }) => {
     const { activeConversation, conversations } = get();
     if (activeConversation && activeConversation._id === convoId) {
        if (!activeConversation.groupAdmins.some(a => (a._id || a) === targetUserId)) {
            const updatedAdmins = [...activeConversation.groupAdmins, targetUserId];
            set({ activeConversation: { ...activeConversation, groupAdmins: updatedAdmins } });
        }
     }
     
     set({ conversations: conversations.map(c => {
       if (c._id === convoId) {
           if (!c.groupAdmins.some(a => (a._id || a) === targetUserId)) {
              return { ...c, groupAdmins: [...c.groupAdmins, targetUserId] };
           }
       }
       return c;
     })});
  },

  handleIncomingGroupMetadataUpdated: ({ convoId, updatePayload }) => {
     const { activeConversation, conversations } = get();
     if (activeConversation && activeConversation._id === convoId) {
        set({ activeConversation: { ...activeConversation, groupName: updatePayload.groupName || activeConversation.groupName, groupAvatar: updatePayload.groupAvatar || activeConversation.groupAvatar } });
     }
     set({ conversations: conversations.map(c => {
       if (c._id === convoId) {
           return { ...c, groupName: updatePayload.groupName || c.groupName, groupAvatar: updatePayload.groupAvatar || c.groupAvatar };
       }
       return c;
     })});
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
