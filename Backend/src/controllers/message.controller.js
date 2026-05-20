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

    const totalMessages = await Message.countDocuments({ convoId });
    
    // Fetch latest messages first for pagination skipping
    const messages = await Message.find({ convoId })
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

export { sendMessage, getMessage }