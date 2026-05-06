// ⚡ Phase 2.5 Enhancement #10: Event Naming Standardization
// Clean, consistent event names for all socket communication

export const SOCKET_EVENTS = {
  // Connection
  CONNECTION: "connection",
  DISCONNECT: "disconnect",

  // User Presence
  USER_ONLINE: "user:online",           // Server → Client: list of online user IDs
  USER_OFFLINE: "user:offline",         // Server → Client: a specific user went offline

  // Messages
  MESSAGE_SEND: "message:send",         // Client → Server: new message
  MESSAGE_RECEIVE: "message:receive",   // Server → Client: incoming message
  MESSAGE_DELIVERED: "message:delivered",// Server → Client: message was delivered
  MESSAGE_SEEN: "message:seen",         // Client ↔ Server: message was read

  // Typing
  TYPING_START: "typing:start",         // Client → Server → Client
  TYPING_STOP: "typing:stop",           // Client → Server → Client

  // Errors
  ERROR: "socket:error",                // Server → Client: error occurred
};
