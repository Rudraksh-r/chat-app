import express from "express";
import { sendMessage, getMessage } from "../controllers/message.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/multer.middleware.js";

const router = express.Router();

router.post("/send", verifyJWT, upload.single("image"), sendMessage)
router.get("/:convoId", verifyJWT, getMessage)

export default router
