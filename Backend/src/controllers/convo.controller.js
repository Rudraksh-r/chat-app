import { Conversation } from "../models/conversation.model.js";
import { GroupAuditLog } from "../models/groupAuditLog.model.js";
import { User } from "../models/user.model.js";
import { io, getReceiverSocketIds } from "../socket/socket.js";
import { SOCKET_EVENTS } from "../socket/events.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";

const emitGroupEvent = (members, event, payload) => {
  members.forEach((member) => {
    const memberIdStr = member._id ? member._id.toString() : member.toString();
    const socketIds = getReceiverSocketIds(memberIdStr);
    socketIds.forEach((socketId) => {
      io.to(socketId).emit(event, payload);
    });
  });
};

const createConvo = asyncHandler(async (req, res) => {
  // req.body is already validated by createConvoSchema (receiverId is a valid ObjectId)
  const { receiverId } = req.body;
  const senderId = req.user._id;

  if (senderId.toString() === receiverId.toString()) {
    throw new ApiError(400, "You cannot create a conversation with yourself");
  }

  let conversation = await Conversation.findOne({
    members: { $all: [senderId, receiverId] },
  }).populate("members", "fullName username email avatar lastSeen");

  if (!conversation) {
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      throw new ApiError(404, "Receiver not found");
    }
    const sender = await User.findById(senderId);
    if (
      (sender.blockedUsers && sender.blockedUsers.some(id => id.toString() === receiverId.toString())) ||
      (receiver.blockedUsers && receiver.blockedUsers.some(id => id.toString() === senderId.toString()))
    ) {
      throw new ApiError(400, "Cannot start a new conversation. Check block status.");
    }

    conversation = await Conversation.create({
      members: [senderId, receiverId],
    });
    conversation = await conversation.populate(
      "members",
      "fullName username email avatar lastSeen",
    );
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, conversation, "Conversation created successfully"),
    );
});

// 1. Instantiates a production-ready group context
const createGroupChat = asyncHandler(async (req, res) => {
  // req.body is already validated by createGroupSchema (name 1-100, memberIds array of ObjectIds, min 1)
  const { name, memberIds } = req.body;
  const creatorId = req.user._id;

  // Deduplicate members list and ensure creator is explicitly present
  const uniqueMembers = [...new Set([...memberIds, creatorId.toString()])];

  const newGroup = await Conversation.create({
    isGroupChat: true,
    groupName: name,
    members: uniqueMembers,
    groupAdmins: [creatorId],
  });

  const fullyPopulatedGroup = await Conversation.findById(newGroup._id)
    .populate("members", "fullName username email avatar lastSeen")
    .populate("groupAdmins", "fullName username email avatar");

  await GroupAuditLog.create({
    convoId: fullyPopulatedGroup._id,
    action: "GROUP_CREATED",
    performedBy: creatorId,
    description: `Group created by ${req.user?.fullName || "User"}`,
  });

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        fullyPopulatedGroup,
        "Group conversation created successfully",
      ),
    );
});

// 2. Add members securely
const addGroupMembers = asyncHandler(async (req, res) => {
  // req.body is already validated by addMembersSchema (newUserIds array of ObjectIds, min 1)
  const { newUserIds } = req.body;
  const conversation = req.conversation; // Provided cleanly by verifyGroupAdmin middleware

  // Use $addToSet to prevent duplicate item entries inside the array safely
  const updatedGroup = await Conversation.findByIdAndUpdate(
    conversation._id,
    {
      $addToSet: { members: { $each: newUserIds } },
    },
    { new: true },
  ).populate("members", "fullName username email avatar lastSeen");

  await GroupAuditLog.create({
    convoId: updatedGroup._id,
    action: "MEMBER_ADDED",
    performedBy: req.user._id,
    description: `Added ${newUserIds.length} members`,
  });

  emitGroupEvent(updatedGroup.members, SOCKET_EVENTS.GROUP_MEMBER_ADDED, {
    convoId: updatedGroup._id,
    addedUserIds: newUserIds,
    updatedGroup,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, updatedGroup, "New members added successfully"));
});

// 3. Remove a member securely
const removeGroupMember = asyncHandler(async (req, res) => {
  const { targetUserId } = req.body;
  const conversation = req.conversation;

  if (!targetUserId) {
    throw new ApiError(400, "Target User ID to remove must be specified");
  }

  // Prevent removing a user who is an admin unless they are explicitly demoted first
  const isTargetAdmin = conversation.groupAdmins.some(
    (adminId) => adminId.toString() === targetUserId.toString(),
  );

  if (isTargetAdmin && conversation.groupAdmins.length === 1) {
    throw new ApiError(
      400,
      "Cannot remove the sole administrator. Designate another admin before removal.",
    );
  }

  const newKeyEpoch = conversation.keyEpoch + 1;

  const updatedGroup = await Conversation.findByIdAndUpdate(
    conversation._id,
    {
      $pull: {
        members: targetUserId,
        groupAdmins: targetUserId, // Auto pull from admins array if present
      },
      $set: {
        keyEpoch: newKeyEpoch,
      },
    },
    { new: true },
  ).populate("members", "fullName username email avatar lastSeen");

  await GroupAuditLog.create({
    convoId: updatedGroup._id,
    action: "MEMBER_REMOVED",
    performedBy: req.user._id,
    targetUser: targetUserId,
    description: `Removed member`,
  });

  const allMembers = [...updatedGroup.members, { _id: targetUserId }];
  emitGroupEvent(allMembers, SOCKET_EVENTS.GROUP_MEMBER_REMOVED, {
    convoId: updatedGroup._id,
    targetUserId,
  });

  // Notify remaining members that the group key epoch has advanced.
  // This must happen after the member removal is persisted so the removed
  // member is excluded from the new sender-key distribution.
  emitGroupEvent(updatedGroup.members, SOCKET_EVENTS.GROUP_KEY_ROTATION_REQUIRED, {
    convoId: updatedGroup._id,
    newKeyEpoch,
  });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedGroup,
        "Target user ejected from group successfully",
      ),
    );
});

// 4. Elevate permissions via admin promotion
const promoteToAdmin = asyncHandler(async (req, res) => {
  const { targetUserId } = req.body;
  const conversation = req.conversation;

  const isMember = conversation.members.some(
    (memberId) => memberId.toString() === targetUserId.toString(),
  );

  if (!isMember) {
    throw new ApiError(
      400,
      "Target user is not currently an active member of this group",
    );
  }

  const updatedGroup = await Conversation.findByIdAndUpdate(
    conversation._id,
    {
      $addToSet: { groupAdmins: targetUserId },
    },
    { new: true },
  ).populate("members groupAdmins", "fullName username email avatar");

  await GroupAuditLog.create({
    convoId: updatedGroup._id,
    action: "ADMIN_PROMOTED",
    performedBy: req.user._id,
    targetUser: targetUserId,
    description: `Promoted to admin`,
  });

  emitGroupEvent(updatedGroup.members, SOCKET_EVENTS.GROUP_ADMIN_PROMOTED, {
    convoId: updatedGroup._id,
    targetUserId,
  });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedGroup,
        "Member promoted to Group Administrator status successfully",
      ),
    );
});

// 5. Mutate Metadata (Name/Avatar)
const updateGroupMetadata = asyncHandler(async (req, res) => {
  const { groupName, groupAvatar } = req.body;
  const conversation = req.conversation;

  const updatePayload = {};
  if (groupName) updatePayload.groupName = groupName.trim();
  if (groupAvatar) updatePayload.groupAvatar = groupAvatar;

  if (Object.keys(updatePayload).length === 0) {
    throw new ApiError(400, "No valid metadata updates were provided");
  }

  const updatedGroup = await Conversation.findByIdAndUpdate(
    conversation._id,
    { $set: updatePayload },
    { new: true },
  ).populate("members groupAdmins", "fullName username email avatar");

  await GroupAuditLog.create({
    convoId: updatedGroup._id,
    action: "METADATA_UPDATED",
    performedBy: req.user._id,
    description: `Updated group metadata`,
  });

  emitGroupEvent(updatedGroup.members, SOCKET_EVENTS.GROUP_METADATA_UPDATED, {
    convoId: updatedGroup._id,
    updatePayload,
  });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedGroup,
        "Group metadata properties updated successfully",
      ),
    );
});

const getAllConvo = asyncHandler(async (req, res) => {
  const conversations = await Conversation.find({
    members: req.user._id,
  })
    .populate("members", "fullName username email avatar lastSeen")
    .populate("groupAdmins", "fullName username email avatar lastSeen")
    .sort({ updatedAt: -1 });

  return res
    .status(200)
    .json(
      new ApiResponse(200, conversations, "Conversations fetched successfully"),
    );
});

export {
  createConvo,
  getAllConvo,
  createGroupChat,
  updateGroupMetadata,
  promoteToAdmin,
  removeGroupMember,
  addGroupMembers,
};
