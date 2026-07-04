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

// Backend/src/controllers/user.controller.js — add this function

const updatePublicKey = asyncHandler(async (req, res) => {
  const { publicKey } = req.body;

  if (!publicKey) {
    throw new ApiError(400, 'Public key is required');
  }

  // Basic validation — browser-generated ECDH public keys are base64-encoded
  // and are typically shorter than 100 chars, so we accept any non-empty,
  // base64-like string rather than enforcing an overly large minimum length.
  const normalizedPublicKey = publicKey.trim();
  if (
    typeof normalizedPublicKey !== 'string' ||
    normalizedPublicKey.length < 20 ||
    !/^[A-Za-z0-9+/=]+$/.test(normalizedPublicKey)
  ) {
    throw new ApiError(400, 'Invalid public key format');
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: { publicKey: normalizedPublicKey } },
    { new: true }
  ).select('-password -refreshToken');

  return res
    .status(200)
    .json(new ApiResponse(200, user, 'Public key updated successfully'));
});

const getUserPublicKey = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!userId || userId.length !== 24) {
    throw new ApiError(400, "Invalid user ID format");
  }

  const user = await User.findById(userId).select("publicKey fullName");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        publicKey: user.publicKey ?? null,
        userId: user._id,
        fullName: user.fullName,
      },
      user.publicKey
        ? "Public key fetched successfully"
        : "User found but has no public key registered"
    )
  );
});

export { searchUsers, updateProfile, updateAvatar, updatePublicKey, getUserPublicKey };
