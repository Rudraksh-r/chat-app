import express from "express";
import { createConvo, getAllConvo } from "../controllers/convo.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = express.Router()
router.post("/", verifyJWT, createConvo)
router.get("/", verifyJWT, getAllConvo)

// giving "/" to both post and get is not a problem?
// Is it not a problem that I'm not using "/create" or "/get-all"?

export default router