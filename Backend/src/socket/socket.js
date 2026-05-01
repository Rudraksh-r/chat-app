import { Server } from "socket.io";
import http from "http";
import express from "express";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.CORS_ORIGIN || "http://localhost:5173",
        methods: ["GET", "POST"]
    }
});

// Used to map a logged in user to their socket connection
const userSocketMap = {}; // { userId: socketId }

export const getReceiverSocketId = (receiverId) => {
    return userSocketMap[receiverId];
}

io.on("connection", (socket) => {
    console.log("🟢 User connected:", socket.id);
    
    const userId = socket.handshake.query.userId;

    // Map the connected user to their socket ID
    if(userId && userId !== "undefined") {
        userSocketMap[userId] = socket.id;
    }

    // Broadcast the updated online users list to all connected clients
    io.emit("getOnlineUsers", Object.keys(userSocketMap));

    // Listen for typing events
    socket.on("typing", (receiverId) => {
        const receiverSocketId = getReceiverSocketId(receiverId);
        if(receiverSocketId) {
            io.to(receiverSocketId).emit("userTyping", userId);
        }
    });

    socket.on("stopTyping", (receiverId) => {
        const receiverSocketId = getReceiverSocketId(receiverId);
        if(receiverSocketId) {
            io.to(receiverSocketId).emit("userStoppedTyping", userId);
        }
    });

    socket.on("disconnect", () => {
        console.log("🔴 User disconnected:", socket.id);
        if (userId) {
            delete userSocketMap[userId];
        }
        // Broadcast the updated online users list after disconnection
        io.emit("getOnlineUsers", Object.keys(userSocketMap));
    });
});

export { app, io, server };
