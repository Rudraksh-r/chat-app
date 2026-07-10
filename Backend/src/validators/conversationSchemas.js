import { z } from "zod";
import { objectIdString, mongoIdParam } from "./shared.js";

// ── POST /api/conversation ──────────────────────────────────────────────────

export const createConvoSchema = z.object({
  receiverId: objectIdString("receiverId"),
});

// ── POST /api/conversation/group ────────────────────────────────────────────

export const createGroupSchema = z.object({
  name: z
    .string({ required_error: "Group name is required" })
    .trim()
    .min(1, "Group name cannot be empty")
    .max(100, "Group name must be at most 100 characters"),

  memberIds: z
    .array(objectIdString("memberIds item"), {
      required_error: "memberIds array is required",
      invalid_type_error: "memberIds must be an array",
    })
    .min(1, "A group requires at least one other member"),
});

// ── PATCH /:chatId/* (param) ────────────────────────────────────────────────

export const chatIdParamSchema = mongoIdParam("chatId");

// ── PATCH /:chatId/add ──────────────────────────────────────────────────────

export const addMembersSchema = z.object({
  newUserIds: z
    .array(objectIdString("newUserIds item"), {
      required_error: "newUserIds array is required",
      invalid_type_error: "newUserIds must be an array",
    })
    .min(1, "At least one user ID is required"),
});

// ── PATCH /:chatId/remove ───────────────────────────────────────────────────

export const removeMemberSchema = z.object({
  targetUserId: objectIdString("targetUserId"),
});

// ── PATCH /:chatId/promote ──────────────────────────────────────────────────

export const promoteMemberSchema = z.object({
  targetUserId: objectIdString("targetUserId"),
});

// ── PATCH /:chatId/metadata ─────────────────────────────────────────────────

export const updateMetadataSchema = z
  .object({
    groupName: z
      .string()
      .trim()
      .min(1, "Group name cannot be empty")
      .max(100, "Group name must be at most 100 characters")
      .optional(),

    groupAvatar: z.string().optional(),
  })
  .refine((data) => data.groupName || data.groupAvatar, {
    message: "At least one of groupName or groupAvatar must be provided",
  });
