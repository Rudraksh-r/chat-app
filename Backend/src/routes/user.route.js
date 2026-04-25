import express from "express";
import { searchUsers } from "../controllers/user.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = express.Router()

router.get("/search", verifyJWT, searchUsers)

export default router;