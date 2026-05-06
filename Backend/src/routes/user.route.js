import express from "express";
import { searchUsers, updateProfile } from "../controllers/user.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = express.Router()

router.get("/search", verifyJWT, searchUsers)
router.put("/profile", verifyJWT, updateProfile)

export default router;