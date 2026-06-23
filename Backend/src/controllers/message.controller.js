import { asyncHandler } from "../utils/asyncHandler.js";
import { Message } from "../models/message.model.js";
import { Conversation } from "../models/conversation.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { getReceiverSocketIds, io } from "../socket/socket.js";
import { SOCKET_EVENTS } from "../socket/events.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";

const sendMessage = asyncHandler(async (req, res) => {
    const { convoId, text, replyTo } = req.body;
    const senderId = req.user._id;

    if (!convoId) {
        throw new ApiError(400, "convoId is required")
    }

    if (!text && !req.file) {
        throw new ApiError(400, "Message must contain either text or a file")
    }

    const convoExists = await Conversation.findById(convoId)
    if (!convoExists) {
        throw new ApiError(404, "Conversation not found")
    }

    // ── Multi-format upload pipeline ─────────────────────────────
    let imageUrl = "";
    let documentData = {};
    let audioData = {};

    if (req.file) {
        const mime = req.file.mimetype;

        if (mime.startsWith("image/")) {
            // Image upload
            const cloudinaryResult = await uploadToCloudinary(req.file.buffer, {
                folder: "chat_app/images",
                resource_type: "image",
                transformation: [{ quality: "auto", fetch_format: "auto" }]
            });
            imageUrl = cloudinaryResult.secure_url;

        } else if (mime.startsWith("audio/")) {
            // Audio upload — Cloudinary treats audio under resource_type "video"
            const cloudinaryResult = await uploadToCloudinary(req.file.buffer, {
                folder: "chat_app/audio",
                resource_type: "video",
                transformation: [],
            });
            audioData = {
                url: cloudinaryResult.secure_url,
                name: req.file.originalname,
                duration: cloudinaryResult.duration || 0,
            };

        } else {
            // Document upload (PDF, DOC, TXT, etc.) — resource_type "raw"
            const cloudinaryResult = await uploadToCloudinary(req.file.buffer, {
                folder: "chat_app/documents",
                resource_type: "raw",
                transformation: [],
            });
            documentData = {
                url: cloudinaryResult.secure_url,
                name: req.file.originalname,
                size: req.file.size,
            };
        }
    }

    let messageData = {
        convoId,
        senderId,
        text: text || "",
        image: imageUrl,
        ...(audioData.url && { audio: audioData }),
        ...(documentData.url && { document: documentData }),
    };

    if (replyTo) {
        const parentMessage = await Message.findById(replyTo);
        // Cross-Room Verification Guard
        if (!parentMessage || parentMessage.convoId.toString() !== convoId) {
            throw new ApiError(400, "Invalid parent message reference provided");
        }
        messageData.replyTo = replyTo;
    }

    let message = await Message.create(messageData);

    message = await message.populate([
        { path: "senderId", select: "fullName avatar" },
        {
            path: "replyTo",
            select: "text senderId image document audio",
            // Deep Thread-Level Clamping: Only populate immediate parent details
            populate: { path: "senderId", select: "fullName" }
        }
    ]);

    await Conversation.findByIdAndUpdate(convoId, { lastMessage: text });

    const receiverId = convoExists.members.find(
        (member) => member.toString() !== senderId.toString()
    );

    if (receiverId) {
        const receiverSocketIds = getReceiverSocketIds(receiverId.toString());
        if (receiverSocketIds.length > 0) {
            message.status = "delivered";
            await message.save();

            receiverSocketIds.forEach((socketId) => {
                io.to(socketId).emit(SOCKET_EVENTS.MESSAGE_RECEIVE, message);
            });
        }
    }

    // Determine sidebar preview text based on media type
    let displayLastMessage = text;
    if (!displayLastMessage) {
        if (imageUrl)        displayLastMessage = "📷 Image";
        else if (audioData.url)    displayLastMessage = "🎵 Audio";
        else if (documentData.url) displayLastMessage = "📎 Document";
    }
    await Conversation.findByIdAndUpdate(convoId, { lastMessage: displayLastMessage })

    // Broadcast to ALL other members of the conversation
    const otherMembers = convoExists.members.filter(
        (member) => member.toString() !== senderId.toString()
    );

    let isAnyDelivered = false;

    otherMembers.forEach((memberId) => {
        const receiverSocketIds = getReceiverSocketIds(memberId.toString());
        if (receiverSocketIds.length > 0) {
            isAnyDelivered = true;
            receiverSocketIds.forEach((socketId) => {
                io.to(socketId).emit(SOCKET_EVENTS.MESSAGE_RECEIVE, message);
            });
        }
    });

    if (isAnyDelivered) {
        message.status = "delivered";
        await message.save();
    }

    return res.status(201)
        .json(new ApiResponse(201, message, "Message sent successfully"))
})

const getMessage = asyncHandler(async (req, res) => {
    const { convoId } = req.params;
    const limit = parseInt(req.query.limit) || 20;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;

    const totalMessages = await Message.countDocuments({ convoId, deletedFor: { $ne: req.user._id } });

    // Fetch latest messages first for pagination skipping
    const messages = await Message.find({ convoId, deletedFor: { $ne: req.user._id } })
        .sort({ createdAt: -1 })
        .skip(skip)
        .populate([
            { path: "senderId", select: "fullName avatar" },
            {
                path: "replyTo",
                select: "text senderId",
                populate: { path: "senderId", select: "fullName" }
            }
        ])
        .limit(limit);

    // Reverse them to chronological order (ascending) for display
    messages.reverse();

    const hasMore = skip + messages.length < totalMessages;

    res.status(200).json(new ApiResponse(200, {
        messages,
        page,
        limit,
        hasMore,
        totalMessages
    }, "Messages fetched successfully"))
})

const deleteMessage = asyncHandler(async (req, res) => {
    const { id: messageId } = req.params
    const userId = req.user._id

    const message = await Message.findById(messageId);

    if (!message) {
        throw new ApiError(400, "message not found")
    }

    if (message.deletedForEveryone) {
        return res.status(200).json(new ApiResponse(200, message, "Message already deleted for everyone"));
    }

    if (message.deletedFor.includes(userId)) {
        return res.status(200).json(new ApiResponse(200, message, "Message already deleted for you"));
    }

    message.deletedFor.push(userId);
    await message.save();

    // Broadcast to the user's own sockets so UI can update locally
    const userSockets = getReceiverSocketIds(userId.toString());
    userSockets.forEach((sid) => {
        io.to(sid).emit(SOCKET_EVENTS.MESSAGE_DELETED, {
            messageId: message._id,
            convoId: message.convoId,
            permanently: false
        });
    });

    return res
        .status(200)
        .json(new ApiResponse(200, message, "Message deleted for you"))


})

// Delete for Everyone – only sender, within 1 hour window
const DELETE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

const deleteForEveryone = asyncHandler(async (req, res) => {
    const { id: messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) {
        throw new ApiError(404, "Message not found");
    }

    // Must be the original sender
    if (message.senderId.toString() !== userId.toString()) {
        throw new ApiError(403, "Only the original sender can delete for everyone");
    }

    // Must be within allowed time window
    if (Date.now() - message.createdAt.getTime() > DELETE_WINDOW_MS) {
        throw new ApiError(400, "Delete window has expired");
    }

    // Mark as deleted for everyone
    message.deletedForEveryone = true;
    message.deletedBy = userId;
    message.deletedBySenderAt = new Date();
    // Permanently erase content for privacy
    message.text = "";
    message.image = "";
    // If other media types exist in the future, we erase them here
    message.document = undefined;
    message.audio = undefined;
    message.video = undefined;

    await message.save();

    // Broadcast to all participants with a permanent flag
    const conversation = await Conversation.findById(message.convoId).select("members");
    if (conversation) {
        conversation.members.forEach((memberId) => {
            const socketIds = getReceiverSocketIds(memberId.toString());
            socketIds.forEach((sid) => {
                io.to(sid).emit(SOCKET_EVENTS.MESSAGE_DELETED, {
                    messageId: message._id,
                    convoId: message.convoId,
                    permanently: true,
                });
            });
        });
    }

    return res.status(200).json(new ApiResponse(200, message, "Message deleted for everyone"));
});

const editMessage = asyncHandler(async (req, res) => {
    const { id: messageId } = req.params
    const userId = req.user._id
    const { text } = req.body

    if (!text || text.trim() == "") {
        throw new ApiError(400, "Updated text context cannot be blank")
    }

    const message = await Message.findById(messageId);
    if (!message) {
        throw new ApiError(404, "Message not found")
    }

    if (message.senderId.toString() != userId.toString()) {
        throw new ApiError(403, "You are not authorized to edit this message")
    }

    const EDIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
    if (Date.now() - message.createdAt.getTime() > EDIT_WINDOW_MS) {
        throw new ApiError(400, "Edit window has expired");
    }

    // presist modifications
    message.text = text;
    message.isEdited = true;
    await message.save();

    // Update sidebar context
    const conversation = await Conversation.findById(message.convoId);
    if (conversation) {
        const lastSavedMsg = await Message.findOne({ ConvoId: message.convoId }).sort({ createdAt: -1 })
        if (lastSavedMsg && lastSavedMsg._id.toString() === message._id.toString()) {
            conversation.lastMessage = text;
            await conversation.save();
        }
    }

    // Broadcast Real-time event to all relevant conversation members
    if (conversation) {
        conversation.members.forEach((memberId) => {
            const clientSockets = getReceiverSocketIds(memberId.toString());
            clientSockets.forEach((socketId) => {
                io.to(socketId).emit(SOCKET_EVENTS.MESSAGE_EDITED, message
                );
            })
        })
    }

    return res
        .status(200)
        .json(new ApiResponse(200, message, "Message edited successfully"))
});

// Rate limiting map for reactions
const reactionRateLimits = new Map();

// Periodic cleanup for rate limit map to prevent memory leaks
setInterval(() => {
    const now = Date.now();
    for (const [userId, lastTime] of reactionRateLimits.entries()) {
        if (now - lastTime > 60000) { // remove if older than 1 minute
            reactionRateLimits.delete(userId);
        }
    }
}, 60000);

const toggleReaction = asyncHandler(async (req, res) => {
    const { id: messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user._id;

    // Rate Limiting Debouncer (500ms lock)
    const now = Date.now();
    const lastReaction = reactionRateLimits.get(userId.toString());
    if (lastReaction && now - lastReaction < 500) {
        throw new ApiError(429, "Too many reaction requests. Please slow down.");
    }
    reactionRateLimits.set(userId.toString(), now);

    // Validate Emoji Payload (Regex to match standard emojis & length check)
    const emojiRegex = /(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/u;
    if (!emoji || emoji.trim().length === 0 || emoji.length > 10 || !emojiRegex.test(emoji)) {
        throw new ApiError(400, "Invalid emoji character payload");
    }

    const message = await Message.findById(messageId);
    if (!message) {
        throw new ApiError(404, "Message target resource not found");
    }

    // Determine if the user has already left a reaction
    const existingReactionIndex = message.reactions.findIndex(
        (r) => r.userId.toString() === userId.toString()
    );

    if (existingReactionIndex > -1) {
        if (message.reactions[existingReactionIndex].emoji === emoji) {
            // Remove it if same emoji
            message.reactions.splice(existingReactionIndex, 1);
        } else {
            // Change it if different emoji
            message.reactions[existingReactionIndex].emoji = emoji;
        }
    } else {
        // Add new reaction
        message.reactions.push({ userId, emoji });
    }

    const updatedMessage = await message.save();

    // Real-Time Propagation via Active Socket Matrix Channels
    const conversation = await Conversation.findById(message.convoId);
    if (conversation) {
        conversation.members.forEach((memberId) => {
            const targets = getReceiverSocketIds(memberId.toString());
            targets.forEach((socketId) => {
                io.to(socketId).emit(SOCKET_EVENTS.MESSAGE_REACTION, {
                    messageId: message._id,
                    reactions: updatedMessage.reactions
                });
            });
        });
    }

    return res.status(200)
        .json(new ApiResponse(200, updatedMessage.reactions, "Reaction updated successfully"));
});
export { sendMessage, getMessage, deleteMessage, deleteForEveryone, editMessage, toggleReaction }