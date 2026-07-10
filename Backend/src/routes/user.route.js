import express from "express";
import {
  searchUsers,
  updateProfile,
  updateAvatar,
  getUserPublicKey,
  updatePublicKey,
  getUserProfile,
  updateProfileDetails,
  blockUser,
  unblockUser,
  getBlockedUsers,
} from "../controllers/user.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/multer.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  searchQuerySchema,
  updatePublicKeySchema,
  updateProfileSchema,
  updateProfileDetailsSchema,
  userIdParamSchema,
  idParamSchema,
} from "../validators/userSchemas.js";

const router = express.Router();

router.get("/search", verifyJWT, validate(searchQuerySchema, "query"), searchUsers);
router.get("/public-key/:userId", verifyJWT, validate(userIdParamSchema, "params"), getUserPublicKey);
router.put("/profile", verifyJWT, validate(updateProfileSchema), updateProfile);
router.put("/public-key", verifyJWT, validate(updatePublicKeySchema), updatePublicKey);

// single("avatar") tells multer to look for a field named "avatar" in the form
router.put("/avatar", verifyJWT, upload.single("avatar"), updateAvatar);

// Blocking routes (must be above /:id/profile to avoid wildcard match)
router.get("/blocked", verifyJWT, getBlockedUsers);
router.post("/block/:id", verifyJWT, validate(idParamSchema, "params"), blockUser);
router.post("/unblock/:id", verifyJWT, validate(idParamSchema, "params"), unblockUser);

// Extended profile routes
router.get("/:id/profile", verifyJWT, validate(idParamSchema, "params"), getUserProfile);
router.patch("/profile", verifyJWT, validate(updateProfileDetailsSchema), updateProfileDetails);

export default router;
