import { Conversation } from "../models/conversation.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";


const createConvo = asyncHandler(async (req, res) => {
    const { receiverId } = req.body;
    const senderId = req.user._id;

    if (!receiverId) {
        throw new ApiError(400, "Receiver ID is required")
    }

    if (senderId.toString() === receiverId.toString()) {
        throw new ApiError(400, "You cannot create a conversation with yourself")
    }

    let conversation = await Conversation.findOne({
        members: { $all: [senderId, receiverId] }
    }).populate("members", "fullName username email avatar")

    if (!conversation) {
        conversation = await Conversation.create({
            members: [senderId, receiverId]
        })
        conversation = await conversation.populate("members", "fullName username email avatar")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, conversation, "Conversation created successfully")
        )
})

const getAllConvo = asyncHandler( async (req, res) => {
    const conversations = await Conversation.find({
        members: req.user._id
    })
    .populate("members", "fullName username email avatar")
    .sort({updatedAt: -1})
    // what does .sort({updatedAt: -1}) do?

    return res
        .status(200)
        .json(
            new ApiResponse(200, conversations, "Conversations fetched successfully")
        )
})

export {createConvo, getAllConvo}