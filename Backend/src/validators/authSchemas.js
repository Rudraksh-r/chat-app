import { z } from "zod";
import { BASE64_PATTERN } from "./shared.js";

// ── POST /api/auth/register ─────────────────────────────────────────────────

export const registerSchema = z.object({
  fullName: z
    .string({ required_error: "Full name is required" })
    .trim()
    .min(1, "Full name cannot be empty")
    .max(50, "Full name must be at most 50 characters"),

  username: z
    .string({ required_error: "Username is required" })
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(/^[a-zA-Z0-9_]+$/, {
      message: "Username may only contain letters, numbers, and underscores",
    }),

  email: z
    .string({ required_error: "Email is required" })
    .email("Must be a valid email address"),

  password: z
    .string({ required_error: "Password is required" })
    .min(8, "Password must be at least 8 characters")
    .regex(/\d/, { message: "Password must contain at least one number" }),

  publicKey: z
    .string()
    .trim()
    .min(20, "Public key is too short")
    .regex(BASE64_PATTERN, { message: "Public key must be valid base64" })
    .optional()
    .nullable(),
});

// ── POST /api/auth/login ────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .email("Must be a valid email address"),

  password: z
    .string({ required_error: "Password is required" })
    .min(1, "Password cannot be empty"),
});

// ── PUT /api/auth/change-password ───────────────────────────────────────────

export const changePasswordSchema = z.object({
  oldPassword: z
    .string({ required_error: "Old password is required" })
    .min(1, "Old password cannot be empty"),

  newPassword: z
    .string({ required_error: "New password is required" })
    .min(8, "New password must be at least 8 characters")
    .regex(/\d/, { message: "New password must contain at least one number" }),
});
