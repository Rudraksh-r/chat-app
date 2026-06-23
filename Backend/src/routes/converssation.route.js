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

const router = express.Router()
router.post("/", verifyJWT, createConvo)
router.post("/group", verifyJWT, createGroupChat)
router.get("/", verifyJWT, getAllConvo)

// Target-Specific Protected Operations via RBAC Middleware Chain
router.patch('/:chatId/add', verifyJWT, verifyGroupAdmin, addGroupMembers);
router.patch('/:chatId/remove', verifyJWT, verifyGroupAdmin, removeGroupMember);
router.patch('/:chatId/promote', verifyJWT, verifyGroupAdmin, promoteToAdmin);
router.patch('/:chatId/metadata', verifyJWT, verifyGroupAdmin, updateGroupMetadata);

export default router