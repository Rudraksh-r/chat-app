export const currentUser = { id: "u1", name: "Current User", avatar: "https://i.pravatar.cc/150?u=u1" };

export const mockUsers = [
  { id: "u2", name: "Alice", avatar: "https://i.pravatar.cc/150?u=u2", status: "online" },
  { id: "u3", name: "Bob", avatar: "https://i.pravatar.cc/150?u=u3", status: "offline" }
];

export const mockChats = [
  { id: "c1", isGroup: false, participants: ["u1", "u2"], name: "Alice", avatar: "https://i.pravatar.cc/150?u=u2", lastMessage: { text: "Hello", timestamp: Date.now() }, unread: 2 },
  { id: "c2", isGroup: false, participants: ["u1", "u3"], name: "Bob", avatar: "https://i.pravatar.cc/150?u=u3", lastMessage: { text: "Are we still on?", timestamp: Date.now() - 3600000 }, unread: 0 }
];

export const mockMessages = {
  "c1": [
    { id: "m1", senderId: "u2", text: "Hello there!", timestamp: Date.now() - 100000, status: "read" },
    { id: "m2", senderId: "u1", text: "Hi Alice!", timestamp: Date.now() - 50000, status: "read" }
  ]
};
