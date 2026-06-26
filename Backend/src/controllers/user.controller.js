import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";

const searchUsers = asyncHandler(async (req, res) => {
  const keyword = req.query.search;
  if (!keyword) throw new ApiError(400, "Keyword is required");

  const users = await User.find({
    $and: [
      {
        $or: [
          { fullName: { $regex: keyword, $options: "i" } },
          { username: { $regex: keyword, $options: "i" } },
          { email: { $regex: keyword, $options: "i" } },
        ],
      },
      { _id: { $ne: req.user._id } },
    ],
  })
    .select("-password -refreshToken")
    .limit(10);

  return res.status(200).json(new ApiResponse(200, users, "Users fetched successfully"));
});

const updateProfile = asyncHandler(async (req, res) => {
  const { fullName, username } = req.body;

  if (!fullName && !username) {
    throw new ApiError(400, "At least one field is required to update");
  }

  const updateData = {};
  if (fullName) updateData.fullName = fullName;
  if (username) updateData.username = username;

  const user = await User.findByIdAndUpdate(req.user._id, { $set: updateData }, { new: true }).select(
    "-password -refreshToken"
  );

  return res.status(200).json(new ApiResponse(200, user, "Profile updated successfully"));
});

const updateAvatar = asyncHandler(async (req, res) => {
  // req.file comes from multer — it has .buffer (the file bytes) and .mimetype
  console.log("📸 Avatar upload request received");
  console.log("   req.file:", req.file ? `${req.file.originalname} (${req.file.size} bytes)` : "❌ MISSING");

  if (!req.file) {
    throw new ApiError(400, "Avatar image is required");
  }

  // Upload buffer directly to Cloudinary (no temp file)
  const cloudinaryResult = await uploadToCloudinary(req.file.buffer, {
    public_id: `user_${req.user._id}`, // deterministic ID — overwrites on re-upload
  });

  // Save the secure URL to the user's profile
  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        avatar: {
          url: cloudinaryResult.secure_url,
          public_id: cloudinaryResult.public_id || "",
        },
      },
    },
    { new: true }
  ).select("-password -refreshToken");

  return res.status(200).json(new ApiResponse(200, user, "Avatar updated successfully"));
});

export { searchUsers, updateProfile, updateAvatar };
