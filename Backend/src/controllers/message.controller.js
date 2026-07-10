import { asyncHandler } from "../utils/asyncHandler.js";
import { Message } from "../models/message.model.js";
import { Conversation } from "../models/conversation.model.js";
import { User } from "../models/user.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { getReceiverSocketIds, io } from "../socket/socket.js";
import { SOCKET_EVENTS } from "../socket/events.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";

const sendMessage = asyncHandler(async (req, res) => {
  // req.body is already validated by sendMessageSchema (convoId, type, ciphertext, iv, counter, keyVersion, etc.)
  const {
    convoId,
    type = "text",
    ciphertext,
    iv,
    counter,
    keyVersion,
    keyDistribution,
    replyTo,
  } = req.body;
  const senderId = req.user._id;

  const convoExists = await Conversation.findById(convoId);
  if (!convoExists) {
    throw new ApiError(404, "Conversation not found");
  }

  const isSenderMember = convoExists.members.some(
    (member) => member.toString() === senderId.toString(),
  );

  if (!isSenderMember) {
    throw new ApiError(403, "You are not a member of this conversation");
  }

  // Enforce block rules for direct messages
  if (!convoExists.isGroupChat) {
    const otherMemberId = convoExists.members.find(
      (m) => m.toString() !== senderId.toString()
    );
    if (otherMemberId) {
      const otherUser = await User.findById(otherMemberId);
      const currentUser = await User.findById(senderId);
      if (
        (currentUser.blockedUsers && currentUser.blockedUsers.some(id => id.toString() === otherMemberId.toString())) ||
        (otherUser.blockedUsers && otherUser.blockedUsers.some(id => id.toString() === senderId.toString()))
      ) {
        throw new ApiError(400, "Message transmission blocked. Check block status.");
      }
    }
  }

  // ── Multi-format upload pipeline ─────────────────────────────
  let imageUrl = "";
  let documentData = {};
  let audioData = {};

  if (req.file) {
    const mime = req.file.mimetype;

    if (mime.startsWith("image/")) {
      const cloudinaryResult = await uploadToCloudinary(req.file.buffer, {
        folder: "chat_app/images",
        resource_type: "image",
        transformation: [{ quality: "auto", fetch_format: "auto" }],
      });
      imageUrl = cloudinaryResult.secure_url;
    } else if (mime.startsWith("audio/")) {
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

  let message;

  if (type === "sender_key_distribution") {
    if (!Array.isArray(keyDistribution) || keyDistribution.length === 0) {
      throw new ApiError(400, "keyDistribution array is required");
    }

    for (const entry of keyDistribution) {
      if (!entry.recipientId || !entry.wrappedKey || !entry.iv || !entry.keyVersion) {
        throw new ApiError(
          400,
          "Each keyDistribution entry must have recipientId, wrappedKey, iv, keyVersion",
        );
      }
    }

    const messageData = {
      convoId,
      senderId,
      type: "sender_key_distribution",
      keyDistribution,
      image: imageUrl,
      ...(audioData.url && { audio: audioData }),
      ...(documentData.url && { document: documentData }),
    };

    if (replyTo) {
      const parentMessage = await Message.findById(replyTo);
      if (!parentMessage || parentMessage.convoId.toString() !== convoId) {
        throw new ApiError(400, "Invalid parent message reference provided");
      }
      messageData.replyTo = replyTo;
    }

    message = await Message.create(messageData);
  } else {
    if (!ciphertext) {
      throw new ApiError(400, "ciphertext is required");
    }

    const isGroup = convoExists.isGroupChat;

    if (isGroup && (counter === undefined || counter === null)) {
      throw new ApiError(400, "counter is required for group messages");
    }

    if (!isGroup && !iv) {
      throw new ApiError(400, "iv is required for 1:1 messages");
    }

    message = await Message.create({
      convoId,
      senderId,
      type: "text",
      ciphertext,
      iv: iv || "",
      counter: counter ?? null,
      keyVersion: keyVersion ?? null,
    });

    await Conversation.findByIdAndUpdate(convoId, {
      lastMessage: "[Encrypted]",
    });
  }

  const otherMembers = convoExists.members.filter(
    (member) => member.toString() !== senderId.toString(),
  );

  const targetSocketIds = [];
  otherMembers.forEach((memberId) => {
    const receiverSocketIds = getReceiverSocketIds(memberId.toString());
    if (receiverSocketIds.length > 0) {
      targetSocketIds.push(...receiverSocketIds);
    }
  });

  if (targetSocketIds.length > 0) {
    message.status = "delivered";
    await message.save();
    targetSocketIds.forEach((socketId) => {
      io.to(socketId).emit(SOCKET_EVENTS.MESSAGE_RECEIVE, message);
    });
  }

  return res
    .status(201)
    .json(new ApiResponse(201, message, "Message sent successfully"));
});

const getMessage = asyncHandler(async (req, res) => {
  const { convoId } = req.params;
  const limit = parseInt(req.query.limit) || 20;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * limit;

  const totalMessages = await Message.countDocuments({
    convoId,
    deletedFor: { $ne: req.user._id },
  });

  // Fetch latest messages first for pagination skipping
  const messages = await Message.find({
    convoId,
    deletedFor: { $ne: req.user._id },
  })
    .sort({ createdAt: -1 })
    .skip(skip)
    .populate([
      { path: "senderId", select: "fullName avatar" },
      {
        path: "replyTo",
        select: "text senderId",
        populate: { path: "senderId", select: "fullName" },
      },
    ])
    .limit(limit);

  // Reverse them to chronological order (ascending) for display
  messages.reverse();

  const hasMore = skip + messages.length < totalMessages;

  res.status(200).json(
    new ApiResponse(
      200,
      {
        messages,
        page,
        limit,
        hasMore,
        totalMessages,
      },
      "Messages fetched successfully",
    ),
  );
});

const deleteMessage = asyncHandler(async (req, res) => {
  const { id: messageId } = req.params;
  const userId = req.user._id;

  const message = await Message.findById(messageId);

  if (!message) {
    throw new ApiError(400, "message not found");
  }

  if (message.deletedForEveryone) {
    return res
      .status(200)
      .json(
        new ApiResponse(200, message, "Message already deleted for everyone"),
      );
  }

  if (message.deletedFor.includes(userId)) {
    return res
      .status(200)
      .json(new ApiResponse(200, message, "Message already deleted for you"));
  }

  message.deletedFor.push(userId);
  await message.save();

  // Broadcast to the user's own sockets so UI can update locally
  const userSockets = getReceiverSocketIds(userId.toString());
  userSockets.forEach((sid) => {
    io.to(sid).emit(SOCKET_EVENTS.MESSAGE_DELETED, {
      messageId: message._id,
      convoId: message.convoId,
      permanently: false,
    });
  });

  return res
    .status(200)
    .json(new ApiResponse(200, message, "Message deleted for you"));
});

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
  const conversation = await Conversation.findById(message.convoId).select(
    "members",
  );
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

  return res
    .status(200)
    .json(new ApiResponse(200, message, "Message deleted for everyone"));
});

const editMessage = asyncHandler(async (req, res) => {
  const { id: messageId } = req.params;
  const userId = req.user._id;
  const { text } = req.body;

  if (!text || text.trim() == "") {
    throw new ApiError(400, "Updated text context cannot be blank");
  }

  const message = await Message.findById(messageId);
  if (!message) {
    throw new ApiError(404, "Message not found");
  }

  if (message.senderId.toString() != userId.toString()) {
    throw new ApiError(403, "You are not authorized to edit this message");
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
    const lastSavedMsg = await Message.findOne({
      convoId: message.convoId,
    }).sort({ createdAt: -1 });
    if (
      lastSavedMsg &&
      lastSavedMsg._id.toString() === message._id.toString()
    ) {
      conversation.lastMessage = text;
      await conversation.save();
    }
  }

  // Broadcast Real-time event to all relevant conversation members
  if (conversation) {
    conversation.members.forEach((memberId) => {
      const clientSockets = getReceiverSocketIds(memberId.toString());
      clientSockets.forEach((socketId) => {
        io.to(socketId).emit(SOCKET_EVENTS.MESSAGE_EDITED, message);
      });
    });
  }

  return res
    .status(200)
    .json(new ApiResponse(200, message, "Message edited successfully"));
});

// Rate limiting map for reactions
const reactionRateLimits = new Map();

// Periodic cleanup for rate limit map to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [userId, lastTime] of reactionRateLimits.entries()) {
    if (now - lastTime > 60000) {
      // remove if older than 1 minute
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

  // Emoji validation (format, length, regex) is now handled by reactSchema in middleware

  const message = await Message.findById(messageId);
  if (!message) {
    throw new ApiError(404, "Message target resource not found");
  }

  // Determine if the user has already left a reaction
  const existingReactionIndex = message.reactions.findIndex(
    (r) => r.userId.toString() === userId.toString(),
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
          reactions: updatedMessage.reactions,
        });
      });
    });
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedMessage.reactions,
        "Reaction updated successfully",
      ),
    );
});
export {
  sendMessage,
  getMessage,
  deleteMessage,
  deleteForEveryone,
  editMessage,
  toggleReaction,
};
