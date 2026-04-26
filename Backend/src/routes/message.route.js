import express from "express";
import { sendMessage, getMessage } from "../controllers/message.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/send", verifyJWT, sendMessage)
router.get("/:convoId", verifyJWT, getMessage)

export default router
