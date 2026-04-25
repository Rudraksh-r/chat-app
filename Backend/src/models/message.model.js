import mongoose, { Schema } from "mongoose";

const messageSchema = new Schema({

    convoId: {
        type: Schema.Types.ObjectId,
        ref: "Conversation"
    },
    senderId: {
        type: Schema.Types.ObjectId,
        ref: "User"
    },
    text: {
        type: String,
        required: true
    },
    seen: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

export const Message = mongoose.model("Message", messageSchema);