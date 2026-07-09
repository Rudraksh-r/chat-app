import express from "express";
import {
  searchUsers,
  updateProfile,
  updateAvatar,
  getUserPublicKey,
  updatePublicKey,
  getUserProfile,
  updateProfileDetails,
  blockUser,
  unblockUser,
  getBlockedUsers,
} from "../controllers/user.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/multer.middleware.js";

const router = express.Router();

router.get("/search", verifyJWT, searchUsers);
router.get("/public-key/:userId", verifyJWT, getUserPublicKey);
router.put("/profile", verifyJWT, updateProfile);
router.put("/public-key", verifyJWT, updatePublicKey);

// single("avatar") tells multer to look for a field named "avatar" in the form
router.put("/avatar", verifyJWT, upload.single("avatar"), updateAvatar);

// Blocking routes (must be above /:id/profile to avoid wildcard match)
router.get("/blocked", verifyJWT, getBlockedUsers);
router.post("/block/:id", verifyJWT, blockUser);
router.post("/unblock/:id", verifyJWT, unblockUser);

// Extended profile routes
router.get("/:id/profile", verifyJWT, getUserProfile);
router.patch("/profile", verifyJWT, updateProfileDetails);

export default router;
