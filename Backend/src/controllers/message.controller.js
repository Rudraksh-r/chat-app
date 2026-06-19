import { asyncHandler } from "../utils/asyncHandler.js";
import { Message } from "../models/message.model.js";
import { Conversation } from "../models/conversation.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { getReceiverSocketIds, io } from "../socket/socket.js";
import { SOCKET_EVENTS } from "../socket/events.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";

const sendMessage = asyncHandler(async (req, res) => {
    const { convoId, text } = req.body;
    const senderId = req.user._id;

    if (!convoId) {
        throw new ApiError(400, "convoId is required")
    }

    if (!text && !req.file) {
        throw new ApiError(400, "Message must contain either text or an image")
    }

    const convoExists = await Conversation.findById(convoId)
    if (!convoExists) {
        throw new ApiError(404, "Conversation not found")
    }

    let imageUrl = "";
    if (req.file) {
        // Upload image to Cloudinary
        const cloudinaryResult = await uploadToCloudinary(req.file.buffer, {
            folder: "chat_app/chat_images",
            // Override the avatar face-cropping transformation
            transformation: [{ quality: "auto", fetch_format: "auto" }]
        });
        imageUrl = cloudinaryResult.secure_url;
    }

    const message = await Message.create({
        convoId,
        senderId,
        text: text || "",
        image: imageUrl
    })

    const displayLastMessage = text || "📷 Image";
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

export { sendMessage, getMessage, deleteMessage, deleteForEveryone }