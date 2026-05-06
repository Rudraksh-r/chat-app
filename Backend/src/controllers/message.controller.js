import { asyncHandler } from "../utils/asyncHandler.js";
import { Message } from "../models/message.model.js";
import { Conversation } from "../models/conversation.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { getReceiverSocketIds, io } from "../socket/socket.js";
import { SOCKET_EVENTS } from "../socket/events.js";

const sendMessage = asyncHandler(async (req, res) => {
    const { convoId, text } = req.body;
    const senderId = req.user._id;

    if (!convoId || !text) {
        throw new ApiError(400, "convoId and text are required")
    }

    const convoExists = await Conversation.findById(convoId)
    if (!convoExists) {
        throw new ApiError(404, "Conversation not found")
    }

    const message = await Message.create({ convoId, senderId, text })

    await Conversation.findByIdAndUpdate(convoId, { lastMessage: text })

    // Phase 2.5 #3 + #5: Emit to ALL sockets of the receiver (multi-tab)
    const receiverId = convoExists.members.find(
        (member) => member.toString() !== senderId.toString()
    );
    
    if (receiverId) {
        const receiverSocketIds = getReceiverSocketIds(receiverId.toString());

        if (receiverSocketIds.length > 0) {
            // Message was delivered to at least one socket
            message.status = "delivered";
            await message.save();

            receiverSocketIds.forEach((socketId) => {
                io.to(socketId).emit(SOCKET_EVENTS.MESSAGE_RECEIVE, message);
            });
        }
    }

    return res.status(201)
        .json(new ApiResponse(201, message, "Message sent successfully"))
})

const getMessage = asyncHandler(async (req, res) => {
    const { convoId } = req.params;

    // what is the diffrencve between req.body, res.params, res.query, req.user?
    const messages = await Message.find({ convoId })
        .sort({ createdAt: 1 })
    // what does .sort({updatedAt: 1}) do here?

    res.status(200).json(new ApiResponse(200, messages, "Messages fetched successfully"))
})

export { sendMessage, getMessage }