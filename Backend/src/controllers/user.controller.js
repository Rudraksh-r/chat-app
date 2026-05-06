import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";

const searchUsers = asyncHandler(async (req, res) => {
    const keyword = req.query.search;

    if (!keyword) {
        throw new ApiError(400, "Keyword is required")
    }

    const users = await User.find({
        $and: [
            { $or: [
                { fullName: { $regex: keyword, $options: "i" } },
                { username: { $regex: keyword, $options: "i" } },
                { email: { $regex: keyword, $options: "i" } },
            ]},
            { _id: { $ne: req.user._id } }
        ]
    }).select("-password -refreshToken").limit(10);

    return res
        .status(200)
        .json(new ApiResponse(200, users, "Users fetched successfully"))
})

const updateProfile = asyncHandler(async (req, res) => {
    const { fullName, username } = req.body;

    if (!fullName && !username) {
        throw new ApiError(400, "At least one field is required to update")
    }

    const updateData = {};
    if (fullName) updateData.fullName = fullName;
    if (username) updateData.username = username;

    const user = await User.findByIdAndUpdate(
        req.user._id,
        { $set: updateData },
        { new: true }
    ).select("-password -refreshToken");

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Profile updated successfully"))
})

export { searchUsers, updateProfile }