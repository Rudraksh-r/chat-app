import mongoose, { Schema } from "mongoose";

const groupAuditLogSchema = new Schema(
    {
        convoId: {
            type: Schema.Types.ObjectId,
            ref: "Conversation",
            required: true,
            index: true
        },
        action: {
            type: String,
            required: true,
            enum: ["MEMBER_ADDED", "MEMBER_REMOVED", "ADMIN_PROMOTED", "METADATA_UPDATED", "GROUP_CREATED"]
        },
        performedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        targetUser: {
            type: Schema.Types.ObjectId,
            ref: "User"
        },
        description: {
            type: String,
            required: true
        }
    },
    { timestamps: true }
);

groupAuditLogSchema.index({ convoId: 1, createdAt: -1 });

export const GroupAuditLog = mongoose.model("GroupAuditLog", groupAuditLogSchema);
