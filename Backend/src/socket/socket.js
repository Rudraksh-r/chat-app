import { Server } from "socket.io";
import http from "http";
import express from "express";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import { Message } from "../models/message.model.js";
import { SOCKET_EVENTS } from "./events.js";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.CORS_ORIGIN || "http://localhost:5173",
        methods: ["GET", "POST"],
        credentials: true,
    },
});

// ─────────────────────────────────────────────────────────
// Phase 2.5 #5: Duplicate Connection Handling
// Store MULTIPLE socket IDs per user (multi-tab / multi-device)
// ─────────────────────────────────────────────────────────
const userSocketMap = {}; // { userId: Set<socketId> }

export const getReceiverSocketIds = (receiverId) => {
    const socketIds = userSocketMap[receiverId];
    return socketIds ? Array.from(socketIds) : [];
};

// Legacy helper (returns first socket ID for backward compat)
export const getReceiverSocketId = (receiverId) => {
    const ids = getReceiverSocketIds(receiverId);
    return ids.length > 0 ? ids[0] : null;
};

// ─────────────────────────────────────────────────────────
// Phase 2.5 #8: Rate Limiting (Basic)
// Limit messages per second per socket to prevent spam
// ─────────────────────────────────────────────────────────
const rateLimitMap = new Map(); // socketId -> { count, lastReset }
const RATE_LIMIT = 5;          // max events per window
const RATE_WINDOW_MS = 1000;   // 1 second window

function isRateLimited(socketId) {
    const now = Date.now();
    let entry = rateLimitMap.get(socketId);

    if (!entry || now - entry.lastReset > RATE_WINDOW_MS) {
        entry = { count: 1, lastReset: now };
        rateLimitMap.set(socketId, entry);
        return false;
    }

    entry.count++;
    if (entry.count > RATE_LIMIT) {
        return true;
    }
    return false;
}

// ─────────────────────────────────────────────────────────
// Phase 2.5 #9: Socket Authentication (CRITICAL)
// Verify JWT before allowing connection
// ─────────────────────────────────────────────────────────
io.use(async (socket, next) => {
    try {
        // Accept token from auth object, query param, or cookie header
        const token =
            socket.handshake.auth?.token ||
            socket.handshake.query?.token ||
            parseCookieToken(socket.handshake.headers?.cookie);

        if (!token) {
            return next(new Error("Authentication error: No token provided"));
        }

        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        const user = await User.findById(decoded._id).select("-password -refreshToken");

        if (!user) {
            return next(new Error("Authentication error: User not found"));
        }

        // Attach user to socket for use in event handlers
        socket.userId = user._id.toString();
        socket.user = user;
        next();
    } catch (error) {
        console.error("🔒 Socket auth failed:", error.message);
        next(new Error("Authentication error: Invalid token"));
    }
});

// Helper to extract accessToken from cookie string
function parseCookieToken(cookieStr) {
    if (!cookieStr) return null;
    const match = cookieStr.split(";").find((c) => c.trim().startsWith("accessToken="));
    return match ? match.split("=")[1]?.trim() : null;
}

// ─────────────────────────────────────────────────────────
// Main Connection Handler
// ─────────────────────────────────────────────────────────
io.on(SOCKET_EVENTS.CONNECTION, (socket) => {
    const userId = socket.userId;
    console.log(`🟢 User connected: ${socket.user.fullName || userId} (${socket.id})`);

    // Phase 2.5 #5: Add this socket to the user's set (multi-tab support)
    if (!userSocketMap[userId]) {
        userSocketMap[userId] = new Set();
    }
    userSocketMap[userId].add(socket.id);

    // Broadcast updated online users list
    io.emit(SOCKET_EVENTS.USER_ONLINE, Object.keys(userSocketMap));

    // ─────────────────────────────────────────────────────
    // Phase 2.5 #6: Error Handling — wrap all listeners in try/catch
    // ─────────────────────────────────────────────────────

    // Listen for typing events
    socket.on(SOCKET_EVENTS.TYPING_START, (receiverId) => {
        try {
            if (isRateLimited(socket.id)) return; // #8: Rate limit
            const receiverSocketIds = getReceiverSocketIds(receiverId);
            receiverSocketIds.forEach((sid) => {
                io.to(sid).emit(SOCKET_EVENTS.TYPING_START, userId);
            });
        } catch (error) {
            console.error("❌ Typing event error:", error.message);
            socket.emit(SOCKET_EVENTS.ERROR, "Failed to send typing indicator");
        }
    });

    socket.on(SOCKET_EVENTS.TYPING_STOP, (receiverId) => {
        try {
            const receiverSocketIds = getReceiverSocketIds(receiverId);
            receiverSocketIds.forEach((sid) => {
                io.to(sid).emit(SOCKET_EVENTS.TYPING_STOP, userId);
            });
        } catch (error) {
            console.error("❌ Stop typing event error:", error.message);
            socket.emit(SOCKET_EVENTS.ERROR, "Failed to send stop typing indicator");
        }
    });

    // Phase 2.5 #3: Message delivery confirmation
    socket.on(SOCKET_EVENTS.MESSAGE_DELIVERED, async (messageId) => {
        try {
            await Message.findByIdAndUpdate(messageId, { status: "delivered" });
        } catch (error) {
            console.error("❌ Delivery status update error:", error.message);
        }
    });

    // Phase 2.5 #3: Message seen/read receipt
    socket.on(SOCKET_EVENTS.MESSAGE_SEEN, async ({ convoId, senderId }) => {
        try {
            // Mark all messages from 'senderId' in this convo as 'seen'
            await Message.updateMany(
                { convoId, senderId, status: { $ne: "seen" } },
                { status: "seen" }
            );

            // Notify the original sender that their messages were read
            const senderSocketIds = getReceiverSocketIds(senderId);
            senderSocketIds.forEach((sid) => {
                io.to(sid).emit(SOCKET_EVENTS.MESSAGE_SEEN, { convoId, seenBy: userId });
            });
        } catch (error) {
            console.error("❌ Seen receipt error:", error.message);
            socket.emit(SOCKET_EVENTS.ERROR, "Failed to update read receipts");
        }
    });

    // ─────────────────────────────────────────────────────
    // Phase 2.5 #2 & #7: Clean Disconnect + Last Seen
    // ─────────────────────────────────────────────────────
    socket.on(SOCKET_EVENTS.DISCONNECT, async () => {
        console.log(`🔴 User disconnected: ${socket.user.fullName || userId} (${socket.id})`);

        try {
            // Remove THIS specific socket from the user's set
            if (userSocketMap[userId]) {
                userSocketMap[userId].delete(socket.id);

                // Only mark fully offline if NO more sockets remain
                if (userSocketMap[userId].size === 0) {
                    delete userSocketMap[userId];

                    // Phase 2.5 #2: Save lastSeen timestamp to DB
                    await User.findByIdAndUpdate(userId, { lastSeen: new Date() });
                }
            }

            // Clean up rate limit entry
            rateLimitMap.delete(socket.id);

            // Broadcast updated online users
            io.emit(SOCKET_EVENTS.USER_ONLINE, Object.keys(userSocketMap));
        } catch (error) {
            console.error("❌ Disconnect handler error:", error.message);
        }
    });
});

export { app, io, server };
