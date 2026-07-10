import express from "express";
import { sendMessage, getMessage, deleteMessage, deleteForEveryone, editMessage, toggleReaction } from "../controllers/message.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/multer.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { looseLimiter } from "../middleware/rateLimiter.middleware.js";
import {
  sendMessageSchema,
  convoIdParamSchema,
  messageIdParamSchema,
  editMessageSchema,
  reactSchema,
} from "../validators/messageSchemas.js";

const router = express.Router();

router.post("/send", verifyJWT, looseLimiter, upload.single("file"), validate(sendMessageSchema), sendMessage)
router.get("/:convoId", verifyJWT, looseLimiter, validate(convoIdParamSchema, "params"), getMessage)
router.patch("/:id/delete", verifyJWT, looseLimiter, validate(messageIdParamSchema, "params"), deleteMessage);
router.patch("/:id/delete-for-everyone", verifyJWT, looseLimiter, validate(messageIdParamSchema, "params"), deleteForEveryone);
router.patch("/:id/edit", verifyJWT, looseLimiter, validate(messageIdParamSchema, "params"), validate(editMessageSchema), editMessage)
router.post("/:id/react", verifyJWT, looseLimiter, validate(messageIdParamSchema, "params"), validate(reactSchema), toggleReaction);

export default router
