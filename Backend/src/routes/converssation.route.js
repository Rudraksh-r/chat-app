import express from "express";
import {
    createConvo,
    getAllConvo,
    createGroupChat,
    updateGroupMetadata,
    addGroupMembers,
    removeGroupMember,
    promoteToAdmin
} from "../controllers/convo.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { verifyGroupAdmin, } from "../middleware/groupAuth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
    createConvoSchema,
    createGroupSchema,
    chatIdParamSchema,
    addMembersSchema,
    removeMemberSchema,
    promoteMemberSchema,
    updateMetadataSchema,
} from "../validators/conversationSchemas.js";

const router = express.Router()
router.post("/", verifyJWT, validate(createConvoSchema), createConvo)
router.post("/group", verifyJWT, validate(createGroupSchema), createGroupChat)
router.get("/", verifyJWT, getAllConvo)

// Target-Specific Protected Operations via RBAC Middleware Chain
router.patch('/:chatId/add', verifyJWT, validate(chatIdParamSchema, "params"), validate(addMembersSchema), verifyGroupAdmin, addGroupMembers);
router.patch('/:chatId/remove', verifyJWT, validate(chatIdParamSchema, "params"), validate(removeMemberSchema), verifyGroupAdmin, removeGroupMember);
router.patch('/:chatId/promote', verifyJWT, validate(chatIdParamSchema, "params"), validate(promoteMemberSchema), verifyGroupAdmin, promoteToAdmin);
router.patch('/:chatId/metadata', verifyJWT, validate(chatIdParamSchema, "params"), validate(updateMetadataSchema), verifyGroupAdmin, updateGroupMetadata);

export default router