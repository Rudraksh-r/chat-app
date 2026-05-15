import express from "express";
import { searchUsers, updateProfile, updateAvatar } from "../controllers/user.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/multer.middleware.js";

const router = express.Router();

router.get("/search", verifyJWT, searchUsers);
router.put("/profile", verifyJWT, updateProfile);

// single("avatar") tells multer to look for a field named "avatar" in the form
router.put("/avatar", verifyJWT, upload.single("avatar"), updateAvatar);

export default router;