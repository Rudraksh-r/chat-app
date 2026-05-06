import { create } from 'zustand';
import { io } from 'socket.io-client';
import useChatStore from './chatStore';

const SOCKET_URL = 'http://localhost:5001';

const useSocketStore = create((set, get) => ({
  socket: null,

  // Connect to Socket.IO server after login
  connectSocket: (userId) => {
    const { socket } = get();
    // Don't reconnect if already connected
    if (socket?.connected) return;

    const newSocket = io(SOCKET_URL, {
      query: { userId },
    });

    newSocket.on('connect', () => {
      console.log('🟢 Socket connected:', newSocket.id);
    });

    // Listen for online users list
    newSocket.on('getOnlineUsers', (users) => {
      useChatStore.getState().setOnlineUsers(users);
    });

    // Listen for incoming messages
    newSocket.on('newMessage', (message) => {
      useChatStore.getState().addIncomingMessage(message);
    });

    // Listen for typing indicators
    newSocket.on('userTyping', (userId) => {
      useChatStore.getState().addTypingUser(userId);
    });

    newSocket.on('userStoppedTyping', (userId) => {
      useChatStore.getState().removeTypingUser(userId);
    });

    newSocket.on('disconnect', () => {
      console.log('🔴 Socket disconnected');
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
  emitTyping: (receiverId) => {
    const { socket } = get();
    if (socket) {
      socket.emit('typing', receiverId);
    }
  },

  // Emit stop typing event
  emitStopTyping: (receiverId) => {
    const { socket } = get();
    if (socket) {
      socket.emit('stopTyping', receiverId);
    }
  },
}));

export default useSocketStore;
