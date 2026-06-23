import { Conversation } from "../models/conversation.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const verifyGroupAdmin = asyncHandler(async (req, _, next) => {
    const { chatId } = req.params;
    const userId = req.user?._id;

    if (!chatId) {
        throw new ApiError(400, "Target Chat ID parameter is required");
    }

    const conversation = await Conversation.findById(chatId);

    if (!conversation) {
        throw new ApiError(404, "Group conversation context not found");
    }

    if (!conversation.isGroupChat) {
        throw new ApiError(400, "Action prohibited: Target context is a direct 1-to-1 message thread");
    }

    // Check if the current user's ID is included within the groupAdmins array
    const isAdmin = conversation.groupAdmins.some(
        (adminId) => adminId.toString() === userId.toString()
    );

    if (!isAdmin) {
        throw new ApiError(403, "Access Denied: You do not possess administrative access privileges for this group");
    }

    // Attach conversation to request object to eliminate redundant downstream DB queries
    req.conversation = conversation;
    next();
});