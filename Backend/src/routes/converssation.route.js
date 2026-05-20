import express from "express";
import { createConvo, getAllConvo, createGroup } from "../controllers/convo.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = express.Router()
router.post("/", verifyJWT, createConvo)
router.post("/group", verifyJWT, createGroup)
router.get("/", verifyJWT, getAllConvo)

export default router