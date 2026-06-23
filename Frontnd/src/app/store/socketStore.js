import { create } from 'zustand';
import { io } from 'socket.io-client';
import useChatStore from './chatStore';

const SOCKET_URL = 'http://localhost:5001';

// Phase 2.5 #10: Mirror backend event names on the frontend
const SOCKET_EVENTS = {
  USER_ONLINE: "user:online",
  MESSAGE_RECEIVE: "message:receive",
  MESSAGE_SEEN: "message:seen",
  TYPING_START: "typing:start",
  TYPING_STOP: "typing:stop",
  ERROR: "socket:error",
  MESSAGE_DELETED: "message:deleted",
  MESSAGE_REACTION: "message:reaction",
  
  // Group Management
  GROUP_MEMBER_ADDED: "group:member_added",
  GROUP_MEMBER_REMOVED: "group:member_removed",
  GROUP_ADMIN_PROMOTED: "group:admin_promoted",
  GROUP_METADATA_UPDATED: "group:metadata_updated",
};

const useSocketStore = create((set, get) => ({
  socket: null,

  // Connect to Socket.IO server after login
  // Phase 2.5 #9: No longer passes userId in query — uses cookie auth instead
  connectSocket: (userId) => {
    const { socket } = get();
    if (socket?.connected) return;

    const newSocket = io(SOCKET_URL, {
      withCredentials: true, // Send cookies for JWT auth
    });

    newSocket.on('connect', () => {
      console.log('🟢 Socket connected:', newSocket.id);
    });

    // Listen for online users list
    newSocket.on(SOCKET_EVENTS.USER_ONLINE, (users) => {
      useChatStore.getState().setOnlineUsers(users);
    });

    // Listen for incoming messages
    newSocket.on(SOCKET_EVENTS.MESSAGE_RECEIVE, (message) => {
      useChatStore.getState().addIncomingMessage(message);
    });

    // Listen for read receipts
    newSocket.on(SOCKET_EVENTS.MESSAGE_SEEN, ({ convoId, seenBy }) => {
      useChatStore.getState().markMessagesSeen(convoId, seenBy);
    });

    // Listen for typing indicators
    newSocket.on(SOCKET_EVENTS.TYPING_START, (typingUserId) => {
      useChatStore.getState().addTypingUser(typingUserId);
    });

    newSocket.on(SOCKET_EVENTS.TYPING_STOP, (typingUserId) => {
      useChatStore.getState().removeTypingUser(typingUserId);
    });

    // Phase 2.5 #6: Listen for server errors
    newSocket.on(SOCKET_EVENTS.ERROR, (errorMsg) => {
      console.error('🔴 Socket error from server:', errorMsg);
    });

    newSocket.on('connect_error', (err) => {
      console.error('🔴 Socket connection error:', err.message);
    });

    newSocket.on('disconnect', () => {
      console.log('🔴 Socket disconnected');
    });

    newSocket.on(SOCKET_EVENTS.MESSAGE_DELETED, ({ messageId, convoId, permanently }) => {
      useChatStore.getState().markMessagesAsDeleted(messageId, convoId, permanently);
    });

    newSocket.on(SOCKET_EVENTS.MESSAGE_REACTION, (payload) => {
      useChatStore.getState().updateIncomingReaction(payload);
    });

    // Group events
    newSocket.on(SOCKET_EVENTS.GROUP_MEMBER_ADDED, (payload) => {
      if (useChatStore.getState().handleIncomingGroupMemberAdded) {
        useChatStore.getState().handleIncomingGroupMemberAdded(payload);
      }
    });

    newSocket.on(SOCKET_EVENTS.GROUP_MEMBER_REMOVED, (payload) => {
      if (useChatStore.getState().handleIncomingGroupMemberRemoved) {
        useChatStore.getState().handleIncomingGroupMemberRemoved(payload);
      }
    });

    newSocket.on(SOCKET_EVENTS.GROUP_ADMIN_PROMOTED, (payload) => {
      if (useChatStore.getState().handleIncomingGroupAdminPromoted) {
        useChatStore.getState().handleIncomingGroupAdminPromoted(payload);
      }
    });

    newSocket.on(SOCKET_EVENTS.GROUP_METADATA_UPDATED, (payload) => {
      if (useChatStore.getState().handleIncomingGroupMetadataUpdated) {
        useChatStore.getState().handleIncomingGroupMetadataUpdated(payload);
      }
    });

    set({ socket: newSocket });
  },

  // Disconnect socket (on logout)
  disconnectSocket: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null });
    }
  },

  // Emit typing event
  emitTyping: (payload) => {
    const { socket } = get();
    if (socket) socket.emit(SOCKET_EVENTS.TYPING_START, payload);
  },

  // Emit stop typing event
  emitStopTyping: (payload) => {
    const { socket } = get();
    if (socket) socket.emit(SOCKET_EVENTS.TYPING_STOP, payload);
  },

  // Emit message seen event
  emitMessageSeen: (convoId, senderId) => {
    const { socket } = get();
    if (socket) socket.emit(SOCKET_EVENTS.MESSAGE_SEEN, { convoId, senderId });
  },


}));

export default useSocketStore;
