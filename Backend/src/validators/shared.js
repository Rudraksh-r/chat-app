import { z } from "zod";

// ── Shared Constants ────────────────────────────────────────────────────────

/** Matches a 24-character hex string (Mongo ObjectId format) */
export const MONGO_OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

/** Base64 pattern (standard alphabet + padding) */
export const BASE64_PATTERN = /^[A-Za-z0-9+/=]+$/;

/** Emoji regex — matches standard emoji presentations (unicode-aware) */
export const EMOJI_REGEX = /(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/u;

// ── Reusable field helpers ──────────────────────────────────────────────────

/** Validates a string as a syntactically valid Mongo ObjectId */
export const objectIdString = (fieldName = "id") =>
  z
    .string({ required_error: `${fieldName} is required` })
    .regex(MONGO_OBJECT_ID_REGEX, {
      message: `${fieldName} must be a valid 24-character hex ObjectId`,
    });

/**
 * Creates a params schema for a single ObjectId route parameter.
 * Usage: validate(mongoIdParam("chatId"), "params")
 */
export const mongoIdParam = (paramName) =>
  z.object({
    [paramName]: objectIdString(paramName),
  });
