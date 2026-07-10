import { z } from "zod";
import { BASE64_PATTERN, mongoIdParam } from "./shared.js";

// ── GET /api/user/search?search=... ─────────────────────────────────────────

export const searchQuerySchema = z.object({
  search: z
    .string({ required_error: "Search keyword is required" })
    .trim()
    .min(1, "Search keyword cannot be empty")
    .max(100, "Search keyword must be at most 100 characters"),
});

// ── PUT /api/user/public-key ────────────────────────────────────────────────

export const updatePublicKeySchema = z.object({
  publicKey: z
    .string({ required_error: "Public key is required" })
    .trim()
    .min(20, "Public key is too short")
    .regex(BASE64_PATTERN, { message: "Public key must be valid base64" }),
});

// ── PUT /api/user/profile ───────────────────────────────────────────────────

export const updateProfileSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(1, "Full name cannot be empty")
      .max(50, "Full name must be at most 50 characters")
      .optional(),

    username: z
      .string()
      .min(3, "Username must be at least 3 characters")
      .max(30, "Username must be at most 30 characters")
      .regex(/^[a-zA-Z0-9_]+$/, {
        message:
          "Username may only contain letters, numbers, and underscores",
      })
      .optional(),
  })
  .refine((data) => data.fullName || data.username, {
    message: "At least one of fullName or username must be provided",
  });

// ── PATCH /api/user/profile (extended details) ──────────────────────────────

const socialLinksSchema = z
  .object({
    github: z.string().max(500, "URL too long").optional(),
    linkedin: z.string().max(500, "URL too long").optional(),
    twitter: z.string().max(500, "URL too long").optional(),
    instagram: z.string().max(500, "URL too long").optional(),
    website: z.string().max(500, "URL too long").optional(),
  })
  .optional();

export const updateProfileDetailsSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, "Full name cannot be empty")
    .max(50, "Full name must be at most 50 characters")
    .optional(),

  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(/^[a-zA-Z0-9_]+$/, {
      message:
        "Username may only contain letters, numbers, and underscores",
    })
    .optional(),

  about: z
    .string()
    .trim()
    .max(300, "About section cannot exceed 300 characters")
    .optional(),

  socialLinks: socialLinksSchema,
});

// ── Param schemas ───────────────────────────────────────────────────────────

/** GET /api/user/public-key/:userId */
export const userIdParamSchema = mongoIdParam("userId");

/** GET /:id/profile, POST /block/:id, POST /unblock/:id */
export const idParamSchema = mongoIdParam("id");
