import mongoose, { Schema } from "mongoose";

const convoSchema = new Schema(
    {
        members: [
            {
                type: Schema.Types.ObjectId,
                ref: "User"
            }
        ],
        lastMessage: {
            type: String,
            default: ""
        },
        isGroupChat: {
            type: Boolean,
            default: false
        },
        groupName: {
            type: String,
            trim: true,
            default: ""
        },
        groupAdmins: [
            {
                type: Schema.Types.ObjectId,
                ref: "User"
            }
        ],
        groupAvatar: {
            type: String,
            default: ""
        },
        // ─── E2EE: Key Epoch ──────────────────────────────────────────────
        // Incremented every time a member is removed from the group.
        // Clients use this to know which "version" of sender keys are current.
        // When epoch bumps, all remaining members must rotate their sender keys.
        // Messages carry keyVersion = the epoch when their sender key was created.
        // Clients reject messages whose keyVersion < current epoch (stale key).
        //
        // Why not reset to 1 on rotation?
        // Because versions must be strictly monotonic across the group's lifetime.
        // If we reset, a message from epoch 3 and a message from a re-reset epoch 1
        // would be indistinguishable, breaking the staleness check.
        keyEpoch: {
            type: Number,
            default: 1,
        },
    },
    { timestamps: true }
)

convoSchema.index({ members: 1 });
convoSchema.index({ isGroupChat: 1, updatedAt: -1 });

export const Conversation = mongoose.model("Conversation", convoSchema);