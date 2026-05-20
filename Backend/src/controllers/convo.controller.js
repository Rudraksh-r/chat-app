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
    }).populate("members", "fullName username email avatar lastSeen")

    if (!conversation) {
        conversation = await Conversation.create({
            members: [senderId, receiverId]
        })
        conversation = await conversation.populate("members", "fullName username email avatar lastSeen")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, conversation, "Conversation created successfully")
        )
})

const createGroup = asyncHandler(async (req, res) => {
    const { groupName, members } = req.body;
    const senderId = req.user._id;

    if (!groupName || !members) {
        throw new ApiError(400, "Group name and members are required");
    }

    let parsedMembers = [];
    if (typeof members === "string") {
        try {
            parsedMembers = JSON.parse(members);
        } catch (e) {
            throw new ApiError(400, "Invalid format for members array");
        }
    } else {
        parsedMembers = members;
    }

    if (!Array.isArray(parsedMembers) || parsedMembers.length === 0) {
        throw new ApiError(400, "Members must be a non-empty array of user IDs");
    }

    // Include the sender in the group members list
    const allMembers = Array.from(new Set([...parsedMembers, senderId.toString()]));

    if (allMembers.length < 2) {
        throw new ApiError(400, "A group must have at least 2 members");
    }

    const conversation = await Conversation.create({
        members: allMembers,
        isGroupChat: true,
        groupName,
        groupAdmin: senderId,
        groupAvatar: req.body.groupAvatar || ""
    });

    const populatedConvo = await Conversation.findById(conversation._id)
        .populate("members", "fullName username email avatar lastSeen")
        .populate("groupAdmin", "fullName username email avatar lastSeen");

    return res
        .status(201)
        .json(
            new ApiResponse(201, populatedConvo, "Group conversation created successfully")
        );
});

const getAllConvo = asyncHandler( async (req, res) => {
    const conversations = await Conversation.find({
        members: req.user._id
    })
    .populate("members", "fullName username email avatar lastSeen")
    .populate("groupAdmin", "fullName username email avatar lastSeen")
    .sort({updatedAt: -1})

    return res
        .status(200)
        .json(
            new ApiResponse(200, conversations, "Conversations fetched successfully")
        )
})

export {createConvo, getAllConvo, createGroup}