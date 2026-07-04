import mongoose, { Schema } from "mongoose";

const messageSchema = new Schema(
  {
    convoId: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    type: {
      type: String,
      enum: ["text", "sender_key_distribution"],
      default: "text",
    },
    ciphertext: {
      type: String,
      required: true,
    },
    image: {
      type: String,
      default: "",
    },
    document: {
      url: { type: String, default: "" },
      name: { type: String, default: "" },
      size: { type: Number, default: 0 },
    },
    audio: {
      url: { type: String, default: "" },
      name: { type: String, default: "" },
      duration: { type: Number, default: 0 },
    },
    status: {
      type: String,
      enum: ["sent", "delivered", "seen"],
      default: "sent",
    },
    deletedForEveryone: {
      type: Boolean,
      default: false,
    },
    deletedFor: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    deletedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    deletedBySenderAt: {
      type: Date,
      default: null,
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    replyTo: {
      type: Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
    reactions: [
      {
        userId: {
          type: Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        emoji: {
          type: String,
          required: true,
        },
      },
    ],
    iv: {
      type: String,
      default: "",
      required: true,
    },
    // ─── Group-only fields ────────────────────────────────────────────
    // counter: monotonically increasing per sender per group.
    //          Used to derive the AES-GCM IV deterministically.
    //          Also enables replay attack detection on the receiver side.
    counter: {
      type: Number,
      default: null,
    },

    // keyVersion: which epoch's sender key was used to encrypt this message.
    //             Receivers verify this matches or exceeds their stored version.
    //             If keyVersion < current epoch, the message may be from a
    //             removed member using a stale key — clients should flag or reject.
    keyVersion: {
      type: Number,
      default: null,
    },

    // ─── For type: "sender_key_distribution" ─────────────────────────
    // Array of per-recipient wrapped sender keys.
    // wrappedKey: the sender's AES key encrypted via ECDH pairwise channel.
    // iv: AES-GCM IV used during the wrapping operation.
    // Each recipient finds their own entry by matching recipientId.
    keyDistribution: [
      {
        recipientId: {
          type: Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        wrappedKey: {
          type: String,
          required: true,
        },
        iv: {
          type: String,
          required: true,
        },
        keyVersion: {
          type: Number,
          required: true,
        },
      },
    ],

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
  },
  { timestamps: true },
);
messageSchema.index({ convoId: 1, createdAt: 1 });
export const Message = mongoose.model("Message", messageSchema);
