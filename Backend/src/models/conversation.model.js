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
        }
    },
    { timestamps: true }
)

convoSchema.index({ members: 1 });
convoSchema.index({ isGroupChat: 1, updatedAt: -1 });

export const Conversation = mongoose.model("Conversation", convoSchema);