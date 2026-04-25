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

export { searchUsers }