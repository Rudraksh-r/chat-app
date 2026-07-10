import { z } from "zod";
import {
  objectIdString,
  mongoIdParam,
  BASE64_PATTERN,
  EMOJI_REGEX,
} from "./shared.js";

// ── POST /api/message/send ──────────────────────────────────────────────────

export const sendMessageSchema = z
  .object({
    convoId: objectIdString("convoId"),

    type: z
      .enum(["text", "sender_key_distribution"], {
        errorMap: () => ({
          message: 'type must be either "text" or "sender_key_distribution"',
        }),
      })
      .default("text"),

    ciphertext: z
      .string()
      .regex(BASE64_PATTERN, { message: "ciphertext must be valid base64" })
      .optional(),

    iv: z
      .string()
      .regex(BASE64_PATTERN, { message: "iv must be valid base64" })
      .optional(),

    // z.coerce handles multipart/form-data string values ("3" → 3)
    counter: z.coerce
      .number({ invalid_type_error: "counter must be a number" })
      .int("counter must be an integer")
      .positive("counter must be a positive integer")
      .optional(),

    keyVersion: z.coerce
      .number({ invalid_type_error: "keyVersion must be a number" })
      .int("keyVersion must be an integer")
      .positive("keyVersion must be a positive integer")
      .optional(),

    keyDistribution: z
      .array(
        z.object({
          recipientId: objectIdString("recipientId"),
          wrappedKey: z.string({ required_error: "wrappedKey is required" }),
          iv: z.string({ required_error: "iv is required" }),
          keyVersion: z.coerce
            .number({ invalid_type_error: "keyVersion must be a number" })
            .int()
            .positive(),
        })
      )
      .optional(),

    replyTo: objectIdString("replyTo").optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === "text" && !data.ciphertext) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["ciphertext"],
        message: "ciphertext is required when type is \"text\"",
      });
    }

    if (
      data.type === "sender_key_distribution" &&
      (!data.keyDistribution || data.keyDistribution.length === 0)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["keyDistribution"],
        message:
          "keyDistribution array is required when type is \"sender_key_distribution\"",
      });
    }
  });

// ── GET /api/message/:convoId ───────────────────────────────────────────────

export const convoIdParamSchema = mongoIdParam("convoId");

// ── PATCH|POST /api/message/:id/* ───────────────────────────────────────────

export const messageIdParamSchema = mongoIdParam("id");

// ── PATCH /api/message/:id/edit ─────────────────────────────────────────────

export const editMessageSchema = z.object({
  text: z
    .string({ required_error: "Updated text is required" })
    .trim()
    .min(1, "Updated text cannot be blank"),
});

// ── POST /api/message/:id/react ─────────────────────────────────────────────

export const reactSchema = z.object({
  emoji: z
    .string({ required_error: "emoji is required" })
    .trim()
    .min(1, "emoji cannot be empty")
    .max(10, "emoji is too long")
    .refine((val) => EMOJI_REGEX.test(val), {
      message: "Invalid emoji character",
    }),
});
