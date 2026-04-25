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
        }
    },
    { timestamps: true }
)

export const Conversation = mongoose.model("Conversation", convoSchema);