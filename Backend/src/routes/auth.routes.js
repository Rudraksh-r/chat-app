import express from "express";
import { registerUser, login, getUser } from "../controllers/auth.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/multer.middleware.js";

const router = express.Router()

router.post("/register", upload.none(), registerUser)
router.post("/login", login)
router.get("/get-user", verifyJWT, getUser)

export default router