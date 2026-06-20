import express from "express";
import { sendMessage, getMessage, deleteMessage, deleteForEveryone, editMessage } from "../controllers/message.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/multer.middleware.js";

const router = express.Router();

router.post("/send", verifyJWT, upload.single("image"), sendMessage)
router.get("/:convoId", verifyJWT, getMessage)
router.patch("/:id/delete", verifyJWT, deleteMessage);
router.patch("/:id/delete-for-everyone", verifyJWT, deleteForEveryone);
router.patch("/:id/edit", verifyJWT,editMessage)

export default router
