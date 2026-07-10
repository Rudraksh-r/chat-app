import express from "express";
import { registerUser, login, getUser, changePassword } from "../controllers/auth.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/multer.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { authLimiter } from "../middleware/rateLimiter.middleware.js";
import {
  registerSchema,
  loginSchema,
  changePasswordSchema,
} from "../validators/authSchemas.js";

const router = express.Router()

router.post("/register", authLimiter, upload.none(), validate(registerSchema), registerUser)
router.post("/login", authLimiter, validate(loginSchema), login)
router.get("/get-user", verifyJWT, getUser)
router.put("/change-password", verifyJWT, validate(changePasswordSchema), changePassword)

export default router