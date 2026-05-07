import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadToCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";

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

const uploadAvatar = asyncHandler(async (req, res) => {
    console.log("📸 Avatar upload started...");
    if(!req.file) {
        console.log("❌ No file found in request");
        throw new ApiError(400, "File is required");
    }
    
    const currentUser = await User.findById(req.user._id);
    console.log("👤 Current user found:", currentUser.username);

    if(currentUser.avatar?.public_id){
        console.log("🗑️ Deleting old avatar from Cloudinary:", currentUser.avatar.public_id);
        await deleteFromCloudinary(currentUser.avatar.public_id);
    }
    
    console.log("☁️ Uploading to Cloudinary...");
    const uploadResult = await uploadToCloudinary(req.file.buffer, "avatars");
    console.log("✅ Cloudinary upload successful:", uploadResult.url);

    const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
       {
        $set: {
            "avatar.url": uploadResult.url,
            "avatar.public_id": uploadResult.public_id
        }
       } , {new: true} 
    ).select("-password -refreshToken");

    console.log("💾 Database updated successfully");

    return res
    .status(200)
    .json(new ApiResponse(200, updatedUser, "Avatar uploaded successfully"))
});

export {searchUsers, updateProfile, uploadAvatar}

