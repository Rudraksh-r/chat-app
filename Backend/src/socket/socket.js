import { Server } from "socket.io";
import http from "http";
import express from "express";
import jwt from "jsonwebtoken";
import { RateLimiterMemory } from "rate-limiter-flexible";
import { User } from "../models/user.model.js";
import { Message } from "../models/message.model.js";
import { Conversation } from "../models/conversation.model.js";
import { SOCKET_EVENTS } from "./events.js";
import logger from "../utils/logger.js";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: [process.env.CORS_ORIGIN, "http://localhost:5173", "http://localhost:5174", "http://localhost:5175"],
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

// WARNING: Using in-memory Map-based limiting. Only works correctly on a single server instance.
// For production horizontal scaling, this must be moved to Redis (e.g., using rate-limiter-flexible with RedisStore).
function isRateLimited(socketId) {
    const now = Date.now();
    let entry = rateLimitMap.get(socketId);
    const rateLimitMax = parseInt(process.env.RATE_LIMIT_TYPING_MAX) || 5;
    const rateWindowMs = parseInt(process.env.RATE_LIMIT_TYPING_WINDOW_MS) || 1000;

    if (!entry || now - entry.lastReset > rateWindowMs) {
        entry = { count: 1, lastReset: now };
        rateLimitMap.set(socketId, entry);
        return false;
    }

    entry.count++;
    if (entry.count > rateLimitMax) {
        return true;
    }
    return false;
}

// ─────────────────────────────────────────────────────────
// Socket Connection Authentication Rate Limiter
// ─────────────────────────────────────────────────────────
// WARNING: Using in-memory store (RateLimiterMemory). This only works correctly
// on a single server instance. Move to RedisStore (RateLimiterRedis) before horizontal scaling.
const socketAuthLimiter = new RateLimiterMemory({
    keyPrefix: "socket_auth_fail",
    points: parseInt(process.env.RATE_LIMIT_SOCKET_AUTH_MAX) || 10,
    duration: (parseInt(process.env.RATE_LIMIT_SOCKET_AUTH_WINDOW_MS) || 60000) / 1000,
    blockDuration: (parseInt(process.env.RATE_LIMIT_SOCKET_AUTH_BLOCK_MS) || 300000) / 1000,
});

// Helper to handle authentication failure rate limit point consumption
async function handleSocketAuthFailure(ip) {
    try {
        await socketAuthLimiter.consume(ip);
    } catch (rejRes) {
        logger.warn(`🔒 Socket auth rate limit exceeded for IP: ${ip}. Blocked for ${Math.ceil(rejRes.msBeforeNext / 1000)}s.`);
    }
}

// ─────────────────────────────────────────────────────────
// Phase 2.5 #9: Socket Authentication (CRITICAL)
// Verify JWT before allowing connection
// ─────────────────────────────────────────────────────────
io.use(async (socket, next) => {
    const ip = socket.handshake.address || socket.handshake.headers["x-forwarded-for"] || "unknown";

    try {
        // Pre-check if client IP is currently blocked
        const blockRes = await socketAuthLimiter.get(ip);
        if (blockRes && blockRes.remainingPoints <= 0) {
            const retryAfter = Math.ceil(blockRes.msBeforeNext / 1000);
            logger.warn(`🔒 Socket connection blocked for IP ${ip}. Try again in ${retryAfter}s.`);
            return next(new Error(`Too many failed authentication attempts. Please try again in ${retryAfter} seconds.`));
        }

        // Accept token from auth object, query param, or cookie header
        const token =
            socket.handshake.auth?.token ||
            socket.handshake.query?.token ||
            parseCookieToken(socket.handshake.headers?.cookie);

        if (!token) {
            await handleSocketAuthFailure(ip);
            return next(new Error("Authentication error: No token provided"));
        }

        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, { algorithms: ["HS256"] });
        const user = await User.findById(decoded._id).select("-password -refreshToken");

        if (!user) {
            await handleSocketAuthFailure(ip);
            return next(new Error("Authentication error: User not found"));
        }

        // Clear socket auth failures for this IP upon successful connection
        await socketAuthLimiter.delete(ip).catch((err) => {
            logger.error("Failed to reset socket auth limiter count: %s", err.stack || err.message || err);
        });

        // Attach user to socket for use in event handlers
        socket.userId = user._id.toString();
        socket.user = user;
        next();
    } catch (error) {
        logger.error("🔒 Socket auth failed: %s", error.stack || error.message || error);
        await handleSocketAuthFailure(ip);
        next(new Error("Authentication error: Invalid token"));
    }
});

// Helper to extract accessToken from cookie string
function parseCookieToken(cookieStr) {
    if (!cookieStr) return null;
    const match = cookieStr.split(";").find((c) => c.trim().startsWith("accessToken="));
    return match ? match.split("=")[1]?.trim() : null;
}

export const broadcastOnlineUsers = async () => {
    try {
        const onlineUserIds = Object.keys(userSocketMap);
        for (const targetUserId of onlineUserIds) {
            const targetUser = await User.findById(targetUserId).select("blockedUsers blockedBy");
            if (!targetUser) continue;
            
            const filteredOnlineUsers = onlineUserIds.filter(userId => {
                const isBlocked = 
                    (targetUser.blockedUsers && targetUser.blockedUsers.some(id => id.toString() === userId)) ||
                    (targetUser.blockedBy && targetUser.blockedBy.some(id => id.toString() === userId));
                return !isBlocked;
            });

            const sockets = getReceiverSocketIds(targetUserId);
            sockets.forEach(socketId => {
                io.to(socketId).emit(SOCKET_EVENTS.USER_ONLINE, filteredOnlineUsers);
            });
        }
    } catch (error) {
        logger.error("❌ broadcastOnlineUsers error: %s", error.stack || error.message || error);
    }
};

// ─────────────────────────────────────────────────────────
// Main Connection Handler
// ─────────────────────────────────────────────────────────
io.on(SOCKET_EVENTS.CONNECTION, (socket) => {
    const userId = socket.userId;
    logger.info(`🟢 User connected: ${socket.user.fullName || userId} (${socket.id})`);

    // Phase 2.5 #5: Add this socket to the user's set (multi-tab support)
    if (!userSocketMap[userId]) {
        userSocketMap[userId] = new Set();
    }
    userSocketMap[userId].add(socket.id);

    // Broadcast updated online users list (filtered by blocks)
    broadcastOnlineUsers().catch(err => logger.error("Error broadcasting online users: %s", err.stack || err.message || err));

    // ─────────────────────────────────────────────────────
    // Phase 2.5 #6: Error Handling — wrap all listeners in try/catch
    // ─────────────────────────────────────────────────────

    // Listen for typing events
    socket.on(SOCKET_EVENTS.TYPING_START, async (payload) => {
        try {
            if (isRateLimited(socket.id)) return; // #8: Rate limit
            let targetUserIds = [];
            let convoId = null;

            if (typeof payload === "object" && payload !== null) {
                convoId = payload.convoId;
                if (payload.receiverId) {
                    targetUserIds = [payload.receiverId];
                } else if (payload.convoId) {
                    const conversation = await Conversation.findById(payload.convoId);
                    if (conversation) {
                        targetUserIds = conversation.members
                            .filter(m => m.toString() !== userId)
                            .map(m => m.toString());
                    }
                }
            } else if (typeof payload === "string") {
                targetUserIds = [payload];
            }

            for (const targetId of targetUserIds) {
                const targetUser = await User.findById(targetId).select("blockedUsers blockedBy");
                if (targetUser) {
                    const isBlocked = 
                        (targetUser.blockedUsers && targetUser.blockedUsers.some(id => id.toString() === userId)) ||
                        (targetUser.blockedBy && targetUser.blockedBy.some(id => id.toString() === userId));
                    if (isBlocked) continue;
                }
                const receiverSocketIds = getReceiverSocketIds(targetId);
                receiverSocketIds.forEach((sid) => {
                    io.to(sid).emit(SOCKET_EVENTS.TYPING_START, convoId ? { convoId, userId } : userId);
                });
            }
        } catch (error) {
            logger.error("❌ Typing event error: %s", error.stack || error.message || error);
            socket.emit(SOCKET_EVENTS.ERROR, "Failed to send typing indicator");
        }
    });

    socket.on(SOCKET_EVENTS.TYPING_STOP, async (payload) => {
        try {
            let targetUserIds = [];
            let convoId = null;

            if (typeof payload === "object" && payload !== null) {
                convoId = payload.convoId;
                if (payload.receiverId) {
                    targetUserIds = [payload.receiverId];
                } else if (payload.convoId) {
                    const conversation = await Conversation.findById(payload.convoId);
                    if (conversation) {
                        targetUserIds = conversation.members
                            .filter(m => m.toString() !== userId)
                            .map(m => m.toString());
                    }
                }
            } else if (typeof payload === "string") {
                targetUserIds = [payload];
            }

            for (const targetId of targetUserIds) {
                const targetUser = await User.findById(targetId).select("blockedUsers blockedBy");
                if (targetUser) {
                    const isBlocked = 
                        (targetUser.blockedUsers && targetUser.blockedUsers.some(id => id.toString() === userId)) ||
                        (targetUser.blockedBy && targetUser.blockedBy.some(id => id.toString() === userId));
                    if (isBlocked) continue;
                }
                const receiverSocketIds = getReceiverSocketIds(targetId);
                receiverSocketIds.forEach((sid) => {
                    io.to(sid).emit(SOCKET_EVENTS.TYPING_STOP, convoId ? { convoId, userId } : userId);
                });
            }
        } catch (error) {
            logger.error("❌ Stop typing event error: %s", error.stack || error.message || error);
            socket.emit(SOCKET_EVENTS.ERROR, "Failed to send stop typing indicator");
        }
    });

    // Phase 2.5 #3: Message delivery confirmation
    socket.on(SOCKET_EVENTS.MESSAGE_DELIVERED, async (messageId) => {
        try {
            await Message.findByIdAndUpdate(messageId, { status: "delivered" });
        } catch (error) {
            logger.error("❌ Delivery status update error: %s", error.stack || error.message || error);
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
            logger.error("❌ Seen receipt error: %s", error.stack || error.message || error);
            socket.emit(SOCKET_EVENTS.ERROR, "Failed to update read receipts");
        }
    });

    // ─────────────────────────────────────────────────────
    // Phase 2.5 #2 & #7: Clean Disconnect + Last Seen
    // ─────────────────────────────────────────────────────
    socket.on(SOCKET_EVENTS.DISCONNECT, async () => {
        logger.info(`🔴 User disconnected: ${socket.user.fullName || userId} (${socket.id})`);

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

            // Broadcast updated online users (filtered by blocks)
            broadcastOnlineUsers().catch(err => logger.error("Error broadcasting online users: %s", err.stack || err.message || err));
        } catch (error) {
            logger.error("❌ Disconnect handler error: %s", error.stack || error.message || error);
        }
    });
});

export { app, io, server };
