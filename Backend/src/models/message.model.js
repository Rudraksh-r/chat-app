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
    replyTo: {
        type: Schema.Types.ObjectId,
        ref: "Message",
        default: null
    },
    reactions: [
        {
            userId: {
                type: Schema.Types.ObjectId,
                ref: "User",
                required: true
            },
            emoji: {
                type: String,
                required: true
            }
        }
    ]
    // isForwarded: {
    //     type: Boolean,
    //     default: false
    // },
    // forwardedFrom: {
    //     type: Schema.Types.ObjectId,
    //     ref: "User",
    //     default: null
    // },
    // forwardedAt: {
    //     type: Date,
    //     default: null
    // },
    // isPinned: {
    //     type: Boolean,
    //     default: false
    // },
    // pinnedBy: {
    //     type: Schema.Types.ObjectId,
    //     ref: "User",
    //     default: null
    // },
    // pinnedAt: {
    //     type: Date,
    //     default: null
    // },
    // messageId: {
    //     type: String,
    //     default: "",
    // },
    // repliedMessageId: {
    //     type: String,
    //     default: "",
    // },
    // forwardedMessageId: {
    //     type: String,
    //     default: "",
    // },
    // editedMessageId: {
    //     type: String,
    //     default: "",
    // },
    // deletedMessageId: {
    //     type: String,
    //     default: "",
    // },
    // pinnedMessageId: {
    //     type: String,
    //     default: "",
    // },
}, { timestamps: true });

export const Message = mongoose.model("Message", messageSchema);