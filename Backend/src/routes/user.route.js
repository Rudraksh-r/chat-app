import express from "express";
import { searchUsers, updateProfile, uploadAvatar } from "../controllers/user.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/multer.middleware.js";

const router = express.Router()

router.get("/search", verifyJWT, searchUsers)
router.put("/profile", verifyJWT, updateProfile)
router.put("/avatar", verifyJWT, upload.single("avatar"), uploadAvatar)


export default router;