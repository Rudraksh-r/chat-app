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
        default: "",
    },
    image: {
        type: String,
        default: "",
    },
    status: {
        type: String,
        enum: ["sent", "delivered", "seen"],
        default: "sent"
    },
    deletedForEveryone: {
        type: Boolean,
        default: false,
    },
    deletedFor: [
        {
            type: Schema.Types.ObjectId,
            ref: "User"
        }
    ],
    deletedBy: {
        type: Schema.Types.ObjectId,
        ref: "User", default: null
    },
    deletedBySenderAt: {
        type: Date,
        default: null
    },
    isEdited: {
        type: Boolean,
        default: false
    },
}, { timestamps: true });

export const Message = mongoose.model("Message", messageSchema);