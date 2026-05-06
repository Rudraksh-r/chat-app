export const currentUser = {
  id: "u1",
  name: "Alex Designer",
  email: "alex@example.com",
  avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
  status: "online"
};

export const mockUsers = [
  { id: "u2", name: "Sarah Connor", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80", status: "online" },
  { id: "u3", name: "John Smith", avatar: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&w=150&q=80", status: "offline" },
  { id: "u4", name: "Emily Chen", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&q=80", status: "online" },
  { id: "u5", name: "Design Team", avatar: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=150&q=80", isGroup: true, status: "online" },
];

export const mockChats = [
  {
    id: "c1",
    participants: ["u1", "u2"],
    unread: 2,
    lastMessage: {
      text: "Did you check out the new Figma designs?",
      timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    }
  },
  {
    id: "c2",
    participants: ["u1", "u3"],
    unread: 0,
    lastMessage: {
      text: "Sure, let's sync at 2 PM.",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    }
  },
  {
    id: "c3",
    participants: ["u1", "u5"],
    unread: 5,
    isGroup: true,
    name: "Design Team Sync",
    avatar: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=150&q=80",
    lastMessage: {
      text: "Emily: I've uploaded the assets.",
      timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    }
  }
];

export const mockMessages: Record<string, any[]> = {
  "c1": [
    { id: "m1", chatId: "c1", senderId: "u2", text: "Hey Alex! How's it going?", timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(), status: "read" },
    { id: "m2", chatId: "c1", senderId: "u1", text: "Hey Sarah! Doing well. Just finishing up the new UI kit.", timestamp: new Date(Date.now() - 1000 * 60 * 55).toISOString(), status: "read" },
    { id: "m3", chatId: "c1", senderId: "u2", text: "Awesome. Did you check out the new Figma designs?", timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), status: "delivered" },
  ],
  "c3": [
    { id: "m4", chatId: "c3", senderId: "u4", text: "Hey team, design review is in 10 mins.", timestamp: new Date(Date.now() - 1000 * 60 * 40).toISOString() },
    { id: "m5", chatId: "c3", senderId: "u4", text: "I've uploaded the assets.", timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString() },
  ]
};