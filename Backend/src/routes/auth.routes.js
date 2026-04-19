import express from "express";
import { registerUser, login, getUser } from "../controllers/auth.controller";
import { verifyJWT } from "../middleware/auth.middleware";

const router = express.Router()

router.post("/register", registerUser)
router.post("/login", login)
router.get("/get-user", verifyJWT, getUser)

export default router