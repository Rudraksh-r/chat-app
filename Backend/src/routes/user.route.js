import express from "express";
import {
  searchUsers,
  updateProfile,
  updateAvatar,
  getUserPublicKey,
  updatePublicKey,
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

export default router;
