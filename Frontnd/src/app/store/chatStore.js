import { create } from "zustand";
import axiosInstance, {
  deleteMessageForEveryone as deleteMessageForEveryoneAPI,
  deleteMessageForMe as deleteMessageForMeAPI,
} from "../lib/axios";
import { toast } from "sonner";
import useAuthStore from "./authStore";
import {
  encryptMessage,
  decryptMessage,
  deriveSharedKey,
  importPublicKey,
} from "../lib/crypto";

// Crypto — Group
import {
  generateSenderKey,
  wrapSenderKeyForRecipient,
  unwrapSenderKey,
  encryptGroupMessage,
  decryptGroupMessage,
} from "../lib/crypto";

// Storage — Identity
import { getPrivateKey } from "../lib/keyStorage";

// Storage — Sender Keys
import {
  storeOwnSenderKey,
  getOwnSenderKey,
  deleteOwnSenderKey,
  storePeerSenderKey,
  getPeerSenderKey,
  updatePeerCounter,
  deletePeerSenderKeys,
} from "../lib/keyStorage";

const getEntityId = (entity) => entity?._id || entity;

const sharedKeyCache = new Map();
const publicKeyCache = new Map();

const pendingMessageQueue = new Map();

const senderKeyMutex = new Map();

// ─────────────────────────────────────────────────────────────────────────────
// MUTEX HELPER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Queues a function to run exclusively within a per-conversation lock.
 * This prevents the counter read-increment-write cycle from racing when
 * a user sends two messages in quick succession.
 *
 * Usage: await withSenderKeyLock(convoId, async () => { ... })
 */
function withSenderKeyLock(convoId, fn) {
  const current = senderKeyMutex.get(convoId) ?? Promise.resolve();
  const next = current.then(fn).catch(fn); // catch so chain never breaks on error
  senderKeyMutex.set(convoId, next);
  return next;
}

const useChatStore = create((set, get) => ({
  // State
  conversations: [],
  activeConversation: null, // the full conversation object
  messages: [],
  isLoadingConversations: false,
  isLoadingMessages: false,
  isLoadingMore: false,
  isSending: false,
  onlineUsers: [],
  typingUsers: [], // array of userIds currently typing
  unreadCounts: {},
  page: 1,
  hasMore: false,
  isDeleting: false,
  replyingToMessage: null,

  // ─────────────────────────────────────────────────────────────────────────
  // CRYPTO HELPERS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Gets or derives the shared AES key for communication with a specific user.
   *
   * Flow:
   * 1. Check in-memory cache first
   * 2. If not cached: fetch their public key from server
   * 3. Import it as a CryptoKey
   * 4. Get our private key from IndexedDB
   * 5. Derive shared key via ECDH
   * 6. Cache and return
   *
   * @param {string} otherUserId - The other party's MongoDB _id
   * @param {string|null} knownPublicKey - If we already have their public key
   *   (e.g., from a conversation's populated member data), pass it to skip
   *   the network fetch. Otherwise null and we'll fetch it.
   */
  getSharedKey: async (otherUserId, knownPublicKey = null) => {
    // ── Cache hit ─────────────────────────────────────────────────────────
    if (sharedKeyCache.has(otherUserId)) {
      return sharedKeyCache.get(otherUserId);
    }

    // ── Get their public key ──────────────────────────────────────────────
    let publicKeyB64 = knownPublicKey;
    if (!publicKeyB64) {
      if (publicKeyCache.has(otherUserId)) {
        publicKeyB64 = publicKeyCache.get(otherUserId);
      } else {
        try {
          const res = await axiosInstance.get(`/user/public-key/${otherUserId}`);
          publicKeyB64 = res.data.data?.publicKey ?? null;
          if (publicKeyB64) {
            publicKeyCache.set(otherUserId, publicKeyB64);
          }
        } catch (error) {
          throw new Error(
            `Could not fetch public key for user ${otherUserId}: ${error.message}`,
          );
        }
      }
    }

    if (!publicKeyB64) {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 600));
        if (publicKeyCache.has(otherUserId)) {
          publicKeyB64 = publicKeyCache.get(otherUserId);
          break;
        }

        try {
          const res = await axiosInstance.get(`/user/public-key/${otherUserId}`);
          publicKeyB64 = res.data.data?.publicKey ?? null;
          if (publicKeyB64) {
            publicKeyCache.set(otherUserId, publicKeyB64);
            break;
          }
        } catch {
          // Keep retrying briefly; the peer may still be finishing key setup.
        }
      }
    }

    if (!publicKeyB64) {
      throw new Error(
        "The other user hasn't set up encryption yet. " +
        "Ask them to log out and log back in — that will generate their key.",
      );
    }

    // ── Get our private key ───────────────────────────────────────────────
    const { authUser } = useAuthStore.getState();
    const myPrivateKey = await getPrivateKey(authUser._id);

    if (!myPrivateKey) {
      throw new Error(
        "Your private key is missing from this device. " +
        "Please log out and log back in to regenerate it.",
      );
    }

    // ── Derive shared key ─────────────────────────────────────────────────
    const theirPublicKey = await importPublicKey(publicKeyB64);
    const sharedKey = await deriveSharedKey(myPrivateKey, theirPublicKey);

    // ── Cache it ──────────────────────────────────────────────────────────
    sharedKeyCache.set(otherUserId, sharedKey);
    return sharedKey;
  },

  /**
   * Decrypts a single message object in place.
   * Returns the message with a `decryptedText` field added.
   * On failure, adds `decryptedText: "[Unable to decrypt]"` so the UI
   * doesn't crash — it shows a graceful fallback instead.
   *
   * @param {object} message - Raw message from server/socket
   * @param {string} otherUserId - Who to derive the shared key with
   */
  decryptOneMessage: async (message, otherUserId) => {
    try {
      const sharedKey = await get().getSharedKey(otherUserId);
      const plaintext = await decryptMessage(
        message.ciphertext,
        message.iv,
        sharedKey,
      );
      return { ...message, decryptedText: plaintext };
    } catch (error) {
      console.error("Failed to decrypt message:", message._id, error.message);
      return { ...message, decryptedText: "[Unable to decrypt]" };
    }
  },

  /**
   * Decrypts all messages in an array.
   * Uses Promise.all for parallel decryption — faster than sequential for
   * large message histories since each decrypt is an independent operation.
   *
   * @param {Array} messages - Array of raw message objects
   * @param {string} otherUserId
   */
  decryptAllMessages: async (messages, otherUserId) => {
    return Promise.all(
      messages.map((msg) => get().decryptOneMessage(msg, otherUserId)),
    );
  },

  decryptOneToOneMessage: async (message, otherUserId) => {
    try {
      const sharedKey = await get().getSharedKey(otherUserId);
      const plaintext = await decryptMessage(
        message.ciphertext,
        message.iv,
        sharedKey,
      );
      return { ...message, decryptedText: plaintext };
    } catch (error) {
      console.error("Failed to decrypt 1:1 message:", message._id, error.message);
      return { ...message, decryptedText: "[Unable to decrypt]" };
    }
  },

  // chatStore.js
  decryptGroupMessageItem: async (message) => {
    const { authUser } = useAuthStore.getState();
    const senderId = (message.senderId?._id ?? message.senderId).toString();
    const convoId = message.convoId.toString();

    // ── Self-sent messages: decrypt with our own sender key ─────────────
    if (senderId === authUser._id.toString()) {
      const ownKeyData = await getOwnSenderKey(convoId);

      // Our key has rotated since this message was sent (member was
      // removed) — the old key was deliberately deleted. Unrecoverable
      // by design, not a bug.
      if (
        !ownKeyData ||
        (message.keyVersion != null && ownKeyData.version !== message.keyVersion)
      ) {
        return { ...message, decryptedText: "[Message unavailable — key rotated]" };
      }

      try {
        const plaintext = await decryptGroupMessage(
          message.ciphertext,
          message.counter,
          ownKeyData.key,
          -1, // no replay guard — we're re-reading our own sent history, not accepting new input
        );
        return { ...message, decryptedText: plaintext };
      } catch (error) {
        console.warn(
          `E2EE: Self-decrypt failed for message ${message._id}: ${error.message}`,
        );
        return { ...message, decryptedText: "[Unable to decrypt]" };
      }
    }

    // ── Peer-sent messages: unchanged from your existing logic ──────────
    const peerKeyData = await getPeerSenderKey(convoId, senderId);
    if (!peerKeyData) {
      return null;
    }

    if (
      message.keyVersion != null &&
      peerKeyData.version != null &&
      peerKeyData.version < message.keyVersion
    ) {
      return null;
    }

    try {
      const plaintext = await decryptGroupMessage(
        message.ciphertext,
        message.counter,
        peerKeyData.key,
        peerKeyData.lastCounter,
      );
      await updatePeerCounter(convoId, senderId, message.counter);
      return { ...message, decryptedText: plaintext };
    } catch (error) {
      console.warn(
        `E2EE: Group decryption failed for message ${message._id}: ${error.message}`,
      );
      return null;
    }
  },

  setReplyingToMessage: (message) => set({ replyingToMessage: message }),
  clearReplyingToMessage: () => set({ replyingToMessage: null }),

  // Set online users (called from socketStore)
  setOnlineUsers: (users) => set({ onlineUsers: users }),

  // Set typing users
  addTypingUser: (typingData) => {
    const { typingUsers } = get();
    if (typeof typingData === "object" && typingData !== null) {
      const { convoId, userId } = typingData;
      const exists = typingUsers.some(
        (t) =>
          typeof t === "object" && t.convoId === convoId && t.userId === userId,
      );
      if (!exists) {
        set({ typingUsers: [...typingUsers, typingData] });
      }
    } else {
      if (!typingUsers.includes(typingData)) {
        set({ typingUsers: [...typingUsers, typingData] });
      }
    }
  },
  removeTypingUser: (typingData) => {
    const { typingUsers } = get();
    if (typeof typingData === "object" && typingData !== null) {
      const { convoId, userId } = typingData;
      set({
        typingUsers: typingUsers.filter(
          (t) =>
            !(
              typeof t === "object" &&
              t.convoId === convoId &&
              t.userId === userId
            ),
        ),
      });
    } else {
      set({ typingUsers: typingUsers.filter((id) => id !== typingData) });
    }
  },

  // ─────────────────────────────────────────
  // NEW: Fetch and cache a user's public key
  // ─────────────────────────────────────────
  getOtherUserPublicKey: async (userId) => {
    if (publicKeyCache.has(userId)) {
      return publicKeyCache.get(userId);
    }

    try {
      const res = await axiosInstance.get(`/user/public-key/${userId}`);
      const publicKey = res.data.data?.publicKey ?? null;

      if (publicKey) {
        publicKeyCache.set(userId, publicKey);
      }

      return publicKey;
    } catch (error) {
      console.error("Failed to fetch public key for user:", userId, error.message);
      return null;
    }
  },

  // ─────────────────────────────────────────
  // NEW: Decrypt a list of messages
  // ─────────────────────────────────────────
  _decryptMessages: async (messages, otherUserId) => {
    const { myPrivateKey } = useAuthStore.getState();
    const { getOtherUserPublicKey } = get();

    if (!myPrivateKey) {
      console.warn("No private key available — cannot decrypt");
      return messages;
    }

    const otherPublicKey = await getOtherUserPublicKey(otherUserId);
    if (!otherPublicKey) {
      console.warn("No public key for other user — cannot decrypt");
      return messages;
    }

    // Decrypt all messages in parallel for speed
    const decrypted = await Promise.all(
      messages.map(async (msg) => {
        try {
          const plaintext = await decryptMessage(
            msg.text,
            myPrivateKey,
            otherPublicKey,
          );
          return { ...msg, text: plaintext };
        } catch {
          return { ...msg, text: "[Encrypted message]" };
        }
      }),
    );

    return decrypted;
  },

  // ─────────────────────────────────────────────────────────────────────────
  // SENDER KEY LIFECYCLE
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Returns this user's sender key for a group, generating and distributing
   * a new one if it doesn't exist yet (lazy initialization).
   *
   * MUST be called inside withSenderKeyLock to prevent concurrent calls
   * from both generating new keys simultaneously.
   */
  ensureOwnSenderKey: async (convoId, conversation) => {
    const existing = await getOwnSenderKey(convoId);
    if (existing) return existing;

    // First time sending in this group — generate a fresh sender key
    console.log(`🔑 E2EE: Generating sender key for group ${convoId}`);
    const key = await generateSenderKey();
    const version = conversation.keyEpoch ?? 1;
    const senderData = { key, counter: 0, version };

    await storeOwnSenderKey(convoId, senderData);

    // Distribute to all current members immediately
    await get().distributeSenderKey(convoId, senderData, conversation);

    return senderData;
  },

  /**
   * Distributes the given sender key to all other members of the group.
   * Wraps the key for each member using the 1:1 ECDH pairwise channel.
   * Posts a "sender_key_distribution" message through the regular message API.
   *
   * Called:
   *   1. When a user generates their sender key for the first time (lazy init)
   *   2. After key rotation (new version must reach all remaining members)
   *   3. When a new member is added to the group (distribute to new member only)
   */
  distributeSenderKey: async (convoId, senderData, conversation) => {
    const { authUser } = useAuthStore.getState();

    const otherMembers = (conversation.members ?? []).filter(
      (m) => (m._id ?? m).toString() !== authUser._id.toString(),
    );

    if (otherMembers.length === 0) return; // solo group or error

    // Wrap the sender key for each member in parallel
    const keyDistribution = await Promise.all(
      otherMembers.map(async (member) => {
        const memberId = (member._id ?? member).toString();
        const publicKey = member.publicKey ?? null;

        try {
          const pairwiseKey = await get().getSharedKey(memberId, publicKey);
          const wrapped = await wrapSenderKeyForRecipient(
            senderData.key,
            pairwiseKey,
          );

          return {
            recipientId: memberId,
            wrappedKey: wrapped.wrappedKey,
            iv: wrapped.iv,
            keyVersion: senderData.version,
          };
        } catch (err) {
          // Member has no public key — they can't receive the distribution.
          // Log and skip rather than failing the entire distribution.
          console.warn(
            `Cannot distribute key to member ${memberId}: ${err.message}`,
          );
          return null;
        }
      }),
    );

    // Filter out nulls (members we couldn't wrap for)
    const validDistributions = keyDistribution.filter(Boolean);

    if (validDistributions.length === 0) return;

    await axiosInstance.post("/message/send", {
      convoId,
      type: "sender_key_distribution",
      keyDistribution: validDistributions,
    });

    console.log(
      `✅ E2EE: Sender key v${senderData.version} distributed to ` +
      `${validDistributions.length} members in group ${convoId}`,
    );
  },

  /**
   * Processes an incoming sender_key_distribution message.
   * Finds our entry, unwraps the sender key, stores it.
   * Then retries any queued messages from this sender.
   */
  handleSenderKeyDistribution: async (message) => {
    const { authUser } = useAuthStore.getState();
    const senderId = (message.senderId?._id ?? message.senderId).toString();
    const convoId = message.convoId.toString();

    // Find the entry addressed to us
    const myEntry = message.keyDistribution?.find(
      (entry) => entry.recipientId.toString() === authUser._id.toString(),
    );

    if (!myEntry) {
      // This distribution wasn't addressed to us (e.g., we sent it to others)
      return;
    }

    try {
      // Get the pairwise shared key with the sender (ECDH channel)
      const pairwiseKey = await get().getSharedKey(senderId);

      // Unwrap (decrypt) the sender key
      const senderKey = await unwrapSenderKey(
        myEntry.wrappedKey,
        myEntry.iv,
        pairwiseKey,
      );

      // Store it indexed by convoId:senderId
      await storePeerSenderKey(convoId, senderId, {
        key: senderKey,
        version: myEntry.keyVersion,
      });

      console.log(
        `✅ E2EE: Stored sender key v${myEntry.keyVersion} ` +
        `from ${senderId} for group ${convoId}`,
      );

      // ── Retry queued messages ─────────────────────────────────────
      // Any messages that arrived before this distribution can now be decrypted.
      const queueKey = `${convoId}:${senderId}`;
      const queued = pendingMessageQueue.get(queueKey) ?? [];

      if (queued.length > 0) {
        console.log(
          `🔄 E2EE: Retrying ${queued.length} queued message(s) from ${senderId}`,
        );
        pendingMessageQueue.delete(queueKey);

        for (const queuedMessage of queued) {
          // Process each queued message through the normal incoming flow
          await get().addIncomingMessage(queuedMessage);
        }
      }
    } catch (err) {
      console.error(
        `❌ E2EE: Failed to process key distribution from ${senderId}:`,
        err.message,
      );
    }
  },

  /**
   * Rotates this user's sender key for a group after a member removal.
   * Generates a new key with the new epoch version.
   * Distributes it to all remaining members (the removed member is
   * no longer in conversation.members, so they're automatically excluded).
   */
  rotateSenderKey: async (convoId, newKeyEpoch) => {
    const { conversations } = get();
    const conversation = conversations.find(
      (c) => c._id.toString() === convoId,
    );
    if (!conversation) return;

    console.log(
      `🔄 E2EE: Rotating sender key for group ${convoId} to epoch ${newKeyEpoch}`,
    );

    // Delete old sender key — next ensureOwnSenderKey will generate fresh
    await deleteOwnSenderKey(convoId);

    // Delete all cached peer sender keys for this group —
    // all peers must re-distribute their new keys before we can decrypt again
    const peerIds = (conversation.members ?? []).map((m) =>
      (m._id ?? m).toString(),
    );
    await deletePeerSenderKeys(convoId, peerIds);

    // Generate new key with the updated epoch version
    const key = await generateSenderKey();
    const senderData = { key, counter: 0, version: newKeyEpoch };
    await storeOwnSenderKey(convoId, senderData);

    // Distribute to remaining members
    await get().distributeSenderKey(convoId, senderData, conversation);

    // Update the conversation locally so future sends use the new epoch
    set({
      conversations: get().conversations.map((c) =>
        c._id.toString() === convoId ? { ...c, keyEpoch: newKeyEpoch } : c,
      ),
    });

    console.log(`✅ E2EE: Key rotation complete for group ${convoId}`);
  },

  // Fetch all conversations for the logged-in user
  getConversations: async () => {
    set({ isLoadingConversations: true });
    try {
      const res = await axiosInstance.get("/conversation");
      set({ conversations: res.data.data });
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
      toast.error("Failed to load conversations");
    } finally {
      set({ isLoadingConversations: false });
    }
  },

  // ── Set active conversation and load + decrypt its messages ──────────────
  setActiveConversation: async (conversation) => {
    const { authUser } = useAuthStore.getState();

    set({
      activeConversation: conversation,
      messages: [],
      isLoadingMessages: true,
    });

    try {
      const res = await axiosInstance.get(`/message/${conversation._id}`);
      const { messages: raw } = res.data.data;

      const isGroup = conversation.isGroupChat;
      let decrypted;

      if (isGroup) {
        const textMessages = raw.filter((m) => m.type === "text");

        decrypted = await Promise.all(
          textMessages.map(async (msg) => {
            const result = await get().decryptGroupMessageItem(msg);

            if (result === null) {
              // Peer key not available yet — queue for retry when the
              // distribution message arrives
              const senderId = (msg.senderId?._id ?? msg.senderId).toString();
              const queueKey = `${msg.convoId}:${senderId}`;
              const existing = pendingMessageQueue.get(queueKey) ?? [];
              pendingMessageQueue.set(queueKey, [...existing, msg]);
              return { ...msg, decryptedText: "[Awaiting decryption key...]" };
            }

            return result;
          }),
        );
      } else {
  // 1:1 — decrypt all messages using the pairwise shared key
  const otherUser = conversation.members?.find(
    (m) => (m._id ?? m).toString() !== authUser._id.toString(),
  );

  if (!otherUser) {
    decrypted = raw;
  } else {
    const otherId = (otherUser._id ?? otherUser).toString();
    decrypted = await Promise.all(
      raw.map((msg) => get().decryptOneToOneMessage(msg, otherId)),
    );
  }
}

set({ messages: decrypted ?? [] });
    } catch (err) {
  console.error("Failed to load messages:", err);
  toast.error("Failed to load messages");
} finally {
  set({ isLoadingMessages: false });
}
  },

// ── Send a message (encrypts before sending) ──────────────────────────────
sendMessage: async (text, file = null) => {
  const { activeConversation, messages } = get();
  const { authUser } = useAuthStore.getState();
  if (!activeConversation || (!text?.trim() && !file)) return;

  const plaintext = text?.trim() || "";

  set({ isSending: true });

  try {
    const isGroup = activeConversation.isGroupChat;
    let payload;
    let useFormData = false;

    if (isGroup) {
      // ── Group send (inside mutex to prevent counter race) ──────────
      payload = await withSenderKeyLock(
        activeConversation._id.toString(),
        async () => {
          // Ensure we have a sender key (generate + distribute if first time)
          const senderData = await get().ensureOwnSenderKey(
            activeConversation._id.toString(),
            activeConversation,
          );

          // Increment counter BEFORE encrypting
          const nextCounter = senderData.counter + 1;

          // Encrypt with our sender key
          const { ciphertext } = await encryptGroupMessage(
            plaintext,
            senderData.key,
            nextCounter,
          );

          // Persist the new counter
          await storeOwnSenderKey(activeConversation._id.toString(), {
            ...senderData,
            counter: nextCounter,
          });

          return {
            type: "text",
            ciphertext,
            counter: nextCounter,
            keyVersion: senderData.version,
          };
        },
      );
    } else {
      // ── 1:1 send ──────────────────────────────────────────────────
      const otherUser = activeConversation.members?.find(
        (m) => (m._id ?? m).toString() !== authUser._id.toString(),
      );

      if (!otherUser) throw new Error("Cannot identify recipient");

      const otherId = (otherUser._id ?? otherUser).toString();
      const sharedKey = await get().getSharedKey(
        otherId,
        otherUser.publicKey ?? null,
      );

      const { ciphertext, iv } = await encryptMessage(plaintext, sharedKey);

      payload = { type: "text", ciphertext, iv };
    }

    let res;

    if (file) {
      const formData = new FormData();
      formData.append("convoId", activeConversation._id.toString());
      formData.append("type", payload.type);
      formData.append("ciphertext", payload.ciphertext);

      if (payload.iv) {
        formData.append("iv", payload.iv);
      }

      if (payload.counter !== undefined && payload.counter !== null) {
        formData.append("counter", payload.counter.toString());
      }

      if (payload.keyVersion !== undefined && payload.keyVersion !== null) {
        formData.append("keyVersion", payload.keyVersion.toString());
      }

      formData.append("file", file);
      useFormData = true;

      res = await axiosInstance.post("/message/send", formData);
    } else {
      res = await axiosInstance.post("/message/send", {
        convoId: activeConversation._id,
        ...payload,
      });
    }

    // Append with plaintext immediately — we already have it, no need to decrypt
    const sentMessage = { ...res.data.data, decryptedText: text };
    set({ messages: [...messages, sentMessage] });

    const lastMessageLabel = text || (file ? "📎 Attachment" : "New message");

    // Update sidebar
    set({
      conversations: get().conversations.map((c) =>
        c._id === activeConversation._id
          ? {
            ...c,
            lastMessage: lastMessageLabel,
            updatedAt: new Date().toISOString(),
          }
          : c,
      ),
    });
  } catch (err) {
    console.error("Send failed:", err);
    if (err.message?.includes("hasn't set up encryption")) {
      toast.error(err.message, { duration: 8000 });
    } else if (err.message?.includes("missing from this device")) {
      toast.error(
        "Your encryption key is missing. Please log out and log back in.",
        { duration: 8000 },
      );
    } else {
      toast.error("Failed to send message");
    }
  } finally {
    set({ isSending: false });
  }
},

  // Handle incoming real-time message (called from socketStore)
  addIncomingMessage: async (message) => {
    const { activeConversation, messages, conversations, unreadCounts } = get();
    const { authUser } = useAuthStore.getState();

    const isCurrentConvo =
      activeConversation && message.convoId === activeConversation._id;

    // Check if the conversation is in the sidebar. If not, fetch them to sync the new convo/group
    const existingConvo = conversations.find((c) => c._id === message.convoId);
    if (!existingConvo) {
      await get().getConversations();
    }

    if (message.type === "sender_key_distribution") {
      // Key distribution — process and store, don't display
      await get().handleSenderKeyDistribution(message);
      return;
    }

    // Re-retrieve conversations after sync in case it was updated
    const currentConversations = get().conversations;

    // If the message belongs to the currently active conversation, append it
    const senderId = (message.senderId?._id ?? message.senderId).toString();
    const convoId = message.convoId;
    const isActive = isCurrentConvo;
    let decryptedMessage = null;

    if (isCurrentConvo) {
      const isGroupMessage = activeConversation?.isGroupChat;
      let appendedMessage = message;

      if (isGroupMessage) {
        const result = await get().decryptGroupMessageItem(message);
        if (result === null) {
          const queueKey = `${convoId}:${senderId}`;
          const existing = pendingMessageQueue.get(queueKey) ?? [];
          pendingMessageQueue.set(queueKey, [...existing, message]);
          appendedMessage = {
            ...message,
            decryptedText: "[Awaiting decryption key...]",
          };
        } else {
          appendedMessage = result;
        }
      } else {
        const otherUser = activeConversation?.members?.find(
          (m) => (m._id ?? m).toString() !== authUser._id.toString(),
        );
        const otherId = otherUser
          ? (otherUser._id ?? otherUser).toString()
          : senderId;
        appendedMessage = await get().decryptOneToOneMessage(message, otherId);
      }

      set({ messages: [...messages, appendedMessage] });
      decryptedMessage = appendedMessage;
    } else {
      const convo = currentConversations.find((c) => c._id === message.convoId);
      const sender = convo?.members.find(
        (m) => (m._id ?? m).toString() === senderId,
      );
      const isGroup = convo?.isGroupChat;
      const senderName = sender?.fullName || "Someone";

      if (isGroup) {
        const result = await get().decryptGroupMessageItem(message);

        if (result === null) {
          const queueKey = `${convoId}:${senderId}`;
          const existing = pendingMessageQueue.get(queueKey) ?? [];
          pendingMessageQueue.set(queueKey, [...existing, message]);

          console.log(
            `📥 E2EE: Queued message from ${senderId} (key not yet available)`,
          );

          return;
        }

        decryptedMessage = result;
      } else {
        const otherUser = convo?.members?.find(
          (m) => (m._id ?? m).toString() !== authUser._id.toString(),
        );
        const otherId = otherUser
          ? (otherUser._id ?? otherUser).toString()
          : senderId;

        decryptedMessage = await get().decryptOneToOneMessage(message, otherId);
      }

      const previewText =
        decryptedMessage?.decryptedText ||
        (message.image
          ? "📷 Image"
          : message.audio?.url
            ? "🎵 Audio"
            : message.document?.url
              ? "📎 Document"
              : "New message");
      toast(`New message from ${senderName}`, { description: previewText });

      set({
        unreadCounts: {
          ...unreadCounts,
          [message.convoId]: (unreadCounts[message.convoId] || 0) + 1,
        },
      });
    }

    // Update sidebar lastMessage for the relevant conversation
    const sidebarMessageText =
      decryptedMessage?.decryptedText ||
      message.text ||
      (message.image
        ? "📷 Image"
        : message.audio?.url
          ? "🎵 Audio"
          : message.document?.url
            ? "📎 Document"
            : "");

    set({
      conversations: currentConversations.map((c) =>
        c._id === message.convoId
          ? {
            ...c,
            lastMessage: sidebarMessageText,
            updatedAt: new Date().toISOString(),
          }
          : c,
      ),
    });
  },

    // Phase 2.5 #3: Mark messages as seen in the UI (called from socketStore)
    markMessagesSeen: (convoId, seenBy) => {
      const { activeConversation, messages } = get();

      // If we're viewing this conversation, update all messages from the other user
      if (activeConversation && activeConversation._id === convoId) {
        set({
          messages: messages.map((msg) =>
            msg.senderId !== seenBy ? { ...msg, status: "seen" } : msg,
          ),
        });
      }
    },

      // ─────────────────────────────────────────────────────────────────────────
      // GROUP MANAGEMENT SOCKET HANDLERS
      // ─────────────────────────────────────────────────────────────────────────

      handleGroupKeyRotationRequired: async ({ convoId, newKeyEpoch }) => {
        console.log(
          `🔔 E2EE: Key rotation required for group ${convoId}, new epoch: ${newKeyEpoch}`,
        );
        await get().rotateSenderKey(convoId, newKeyEpoch);
      },

        handleIncomingGroupMemberRemoved: ({ convoId, targetUserId }) => {
          const { authUser } = useAuthStore.getState();
          const { activeConversation, conversations } = get();

          // If we were removed, clear the active conversation
          if (authUser._id.toString() === targetUserId.toString()) {
            set({
              conversations: conversations.filter(
                (c) => c._id?.toString() !== convoId,
              ),
            });
            if (activeConversation?._id?.toString() === convoId) {
              set({ activeConversation: null, messages: [] });
              toast.info("You were removed from this group");
            }
            return;
          }

          // Update member lists for remaining members
          set({
            activeConversation:
              activeConversation?._id?.toString() === convoId
                ? {
                  ...activeConversation,
                  members: activeConversation.members.filter(
                    (m) => (m._id ?? m).toString() !== targetUserId.toString(),
                  ),
                }
                : activeConversation,
            conversations: conversations.map((c) =>
              c._id?.toString() === convoId
                ? {
                  ...c,
                  members: c.members.filter(
                    (m) => (m._id ?? m).toString() !== targetUserId.toString(),
                  ),
                }
                : c,
            ),
          });
        },

          // Create or get a conversation with a user (used when starting a new chat)
          createConversation: async (receiverId) => {
            try {
              const res = await axiosInstance.post("/conversation", { receiverId });
              const conversation = res.data.data;

              // Add to conversations list if not already there
              const { conversations } = get();
              const exists = conversations.find((c) => c._id === conversation._id);
              if (!exists) {
                set({ conversations: [conversation, ...conversations] });
              }

              // Set it as active
              await get().setActiveConversation(conversation);
              return conversation;
            } catch (error) {
              console.error("Failed to create conversation:", error);
              toast.error("Failed to start conversation");
              return null;
            }
          },

            // Create a new group conversation
            createGroupConversation: async (groupName, memberIds) => {
              try {
                const res = await axiosInstance.post("/conversation/group", {
                  name: groupName,
                  memberIds: memberIds,
                });
                const conversation = res.data.data;

                const { conversations } = get();
                set({ conversations: [conversation, ...conversations] });

                await get().setActiveConversation(conversation);
                return conversation;
              } catch (error) {
                console.error("Failed to create group conversation:", error);
                toast.error(
                  error.response?.data?.message || "Failed to create group chat",
                );
                return null;
              }
            },

              // Load more historical messages for pagination
              loadMoreMessages: async () => {
                const { activeConversation, messages, page, hasMore, isLoadingMore } =
                  get();
                if (!activeConversation || !hasMore || isLoadingMore) return;

                set({ isLoadingMore: true });
                try {
                  const nextPage = page + 1;
                  const res = await axiosInstance.get(
                    `/message/${activeConversation._id}?limit=20&page=${nextPage}`,
                  );
                  const { messages: newMessages, hasMore: nextHasMore } = res.data.data;

                  set({
                    messages: [...newMessages, ...messages],
                    page: nextPage,
                    hasMore: nextHasMore,
                  });
                } catch (error) {
                  console.error("Failed to load more messages:", error);
                  toast.error("Failed to load older messages");
                } finally {
                  set({ isLoadingMore: false });
                }
              },

                //soft-delete message (delete for everyone)
                deleteMessage: async (messageId) => {
                  set({ isDeleting: true });
                  try {
                    await axiosInstance.patch(`/message/${messageId}/delete`);
                    toast.success("Message deleted for you");
                  } catch (error) {
                    console.error("Failed to delete message:", error);
                    toast.error("Failed to delete message");
                  } finally {
                    set({ isDeleting: false });
                  }
                },
                  // Alias for clarity
                  deleteMessageForEveryone: async (messageId) => {
                    try {
                      await deleteMessageForEveryoneAPI(messageId);
                      toast.success("Message deleted for everyone");
                    } catch (error) {
                      console.error("Failed to delete for everyone:", error);
                      toast.error("Failed to delete for everyone");
                    }
                  },

                    deleteMessageForMe: async (messageId) => {
                      set({ isDeleting: true });
                      try {
                        await deleteMessageForMeAPI(messageId);
                        toast.success("Message deleted for you");
                        // The socket event will trigger markMessagesAsDeleted locally
                      } catch (error) {
                        console.error("Failed to delete message for you:", error);
                        toast.error("Failed to delete message");
                      } finally {
                        set({ isDeleting: false });
                      }
                    },

                      markMessagesAsDeleted: (messageId, convoId, permanently) => {
                        const { conversations, activeConversation, messages } = get();

                        let newMessages = messages;
                        if (activeConversation && activeConversation._id === convoId) {
                          if (permanently) {
                            newMessages = messages.map((msg) =>
                              msg._id === messageId
                                ? {
                                  ...msg,
                                  deletedForEveryone: true,
                                  text: "Message deleted",
                                  image: null,
                                  document: null,
                                  audio: null,
                                }
                                : msg,
                            );
                          } else {
                            newMessages = messages.filter((msg) => msg._id !== messageId);
                          }
                          set({ messages: newMessages });
                        }

                        set({
                          conversations: conversations.map((c) => {
                            if (c._id === convoId) {
                              let sidebarMessageText = c.lastMessage;

                              if (activeConversation && activeConversation._id === convoId) {
                                if (newMessages.length > 0) {
                                  const lastMsg = newMessages[newMessages.length - 1];
                                  sidebarMessageText = lastMsg.deletedForEveryone
                                    ? "Message deleted"
                                    : lastMsg.text ||
                                    (lastMsg.image
                                      ? "📷 Image"
                                      : lastMsg.audio?.url
                                        ? "🎵 Audio"
                                        : lastMsg.document?.url
                                          ? "📎 Document"
                                          : "");
                                } else {
                                  sidebarMessageText = "No messages yet";
                                }
                              } else if (permanently) {
                                sidebarMessageText = "Message deleted";
                              }

                              return {
                                ...c,
                                lastMessage: sidebarMessageText,
                                updatedAt: new Date().toISOString(),
                              };
                            }
                            return c;
                          }),
                        });
                      },
                        //Edit message
                        editMessage: async (messageId, newText) => {
                          try {
                            const res = await axiosInstance.patch(`/message/${messageId}/edit`, {
                              text: newText,
                            });
                            const updatedMessage = res.data.data;

                            // Local State Mutation (Pessimistic UI Sync on sender side)
                            const updatedMessages = get().messages.map((msg) =>
                              msg._id === messageId ? updatedMessage : msg,
                            );
                            set({ messages: updatedMessages });

                            const lastMessage = updatedMessages[updatedMessages.length - 1];
                            if (lastMessage?._id === messageId) {
                              // Synchronize Sidebar list view item reference instantly
                              const updatedConversations = get().conversations.map((c) =>
                                c._id === updatedMessage.convoId
                                  ? {
                                    ...c,
                                    lastMessage: newText,
                                    updatedAt: new Date().toISOString(),
                                  }
                                  : c,
                              );
                              set({ conversations: updatedConversations });
                            }
                            return true;
                          } catch (error) {
                            console.error("Failed executing edit payload", error);
                            toast.error(
                              error.response?.data?.message || "Failed to save message edits",
                            );
                            return false;
                          }
                        },
                          // Real-time Event Receiver Handler invoked via socket connection mapping
                          updateIncomingEditMessage: (editedMessage) => {
                            const { activeConversation, messages, conversations } = get();
                            const messageId = getEntityId(editedMessage) || editedMessage.messageId;

                            // If the message belongs to the currently active conversation (the one open in chat window)
                            if (
                              activeConversation &&
                              activeConversation._id === editedMessage.convoId
                            ) {
                              // Update the message in the messages array
                              set({
                                messages: messages.map((msg) =>
                                  msg._id === messageId ? editedMessage : msg,
                                ),
                              });
                            }

                            const lastMessage = messages[messages.length - 1];
                            if (
                              activeConversation?._id === editedMessage.convoId &&
                              lastMessage?._id === messageId
                            ) {
                              set({
                                conversations: conversations.map((c) =>
                                  c._id === editedMessage.convoId
                                    ? {
                                      ...c,
                                      lastMessage: editedMessage.text,
                                      updatedAt: editedMessage.updatedAt,
                                    }
                                    : c,
                                ),
                              });
                            }
                          },

                            sendToggleReaction: async (messageId, emoji) => {
                              try {
                                // Execute the request via the HTTP pipeline
                                const res = await axiosInstance.post(`/message/${messageId}/react`, {
                                  emoji,
                                });
                                const serverReactions = res.data.data;

                                // Optimistic/Pessimistic reconciliation on sender node instantly
                                const structuralRebuild = get().messages.map((m) =>
                                  m._id === messageId ? { ...m, reactions: serverReactions } : m,
                                );
                                set({ messages: structuralRebuild });
                              } catch (error) {
                                console.error("Failed to apply emoji selection matrix sequence: ", error);
                              }
                            },

                              // Real-time socket receiver event listener callback hook
                              updateIncomingReaction: ({ messageId, reactions }) => {
                                const messages = get().messages;
                                const messageIndex = messages.findIndex((msg) => msg._id === messageId);
                                if (messageIndex > -1) {
                                  const updatedMessages = [...messages];
                                  updatedMessages[messageIndex] = {
                                    ...updatedMessages[messageIndex],
                                    reactions,
                                  };
                                  set({ messages: updatedMessages });
                                }
                              },

                                // Search users
                                searchUsers: async (keyword) => {
                                  if (!keyword.trim()) return [];
                                  try {
                                    const res = await axiosInstance.get(`/user/search?search=${keyword}`);
                                    return res.data.data;
                                  } catch (error) {
                                    console.error("Failed to search users:", error);
                                    return [];
                                  }
                                },

                                  // Group actions
                                  removeGroupMember: async (convoId, targetUserId) => {
                                    const { activeConversation, conversations } = get();
                                    // Save previous state for rollback
                                    const prevActiveConversation = activeConversation;
                                    const prevConversations = [...conversations];

                                    // Optimistic UI update
                                    if (activeConversation && activeConversation._id === convoId) {
                                      const updatedMembers = activeConversation.members.filter(
                                        (m) => m._id !== targetUserId,
                                      );
                                      const updatedAdmins = activeConversation.groupAdmins.filter(
                                        (adminId) => getEntityId(adminId) !== targetUserId,
                                      );
                                      set({
                                        activeConversation: {
                                          ...activeConversation,
                                          members: updatedMembers,
                                          groupAdmins: updatedAdmins,
                                        },
                                      });
                                    }

                                    set({
                                      conversations: conversations.map((c) => {
                                        if (c._id === convoId) {
                                          return {
                                            ...c,
                                            members: c.members.filter((m) => m._id !== targetUserId),
                                            groupAdmins: c.groupAdmins.filter(
                                              (adminId) => getEntityId(adminId) !== targetUserId,
                                            ),
                                          };
                                        }
                                        return c;
                                      }),
                                    });

                                    try {
                                      await axiosInstance.patch(`/conversation/${convoId}/remove`, {
                                        targetUserId,
                                      });
                                      toast.success("User removed from group");
                                    } catch {
                                      // Rollback
                                      set({
                                        activeConversation: prevActiveConversation,
                                        conversations: prevConversations,
                                      });
                                      toast.error("Failed to remove user");
                                    }
                                  },

                                    promoteToAdmin: async (convoId, targetUserId) => {
                                      const { activeConversation, conversations } = get();
                                      const prevActiveConversation = activeConversation;
                                      const prevConversations = [...conversations];

                                      if (activeConversation && activeConversation._id === convoId) {
                                        const updatedAdmins = [...activeConversation.groupAdmins, targetUserId];
                                        set({
                                          activeConversation: {
                                            ...activeConversation,
                                            groupAdmins: updatedAdmins,
                                          },
                                        });
                                      }

                                      set({
                                        conversations: conversations.map((c) => {
                                          if (c._id === convoId) {
                                            return { ...c, groupAdmins: [...c.groupAdmins, targetUserId] };
                                          }
                                          return c;
                                        }),
                                      });

                                      try {
                                        await axiosInstance.patch(`/conversation/${convoId}/promote`, {
                                          targetUserId,
                                        });
                                        toast.success("Promoted to Admin");
                                      } catch {
                                        set({
                                          activeConversation: prevActiveConversation,
                                          conversations: prevConversations,
                                        });
                                        toast.error("Failed to promote user");
                                      }
                                    },

                                      updateGroupMetadata: async (convoId, groupName, groupAvatar) => {
                                        const { activeConversation, conversations } = get();
                                        const prevActiveConversation = activeConversation;
                                        const prevConversations = [...conversations];

                                        const updatePayload = {};
                                        if (groupName) updatePayload.groupName = groupName;
                                        if (groupAvatar) updatePayload.groupAvatar = groupAvatar;

                                        if (activeConversation && activeConversation._id === convoId) {
                                          set({ activeConversation: { ...activeConversation, ...updatePayload } });
                                        }

                                        set({
                                          conversations: conversations.map((c) => {
                                            if (c._id === convoId) {
                                              return { ...c, ...updatePayload };
                                            }
                                            return c;
                                          }),
                                        });

                                        try {
                                          await axiosInstance.patch(
                                            `/conversation/${convoId}/metadata`,
                                            updatePayload,
                                          );
                                          toast.success("Group metadata updated");
                                        } catch {
                                          set({
                                            activeConversation: prevActiveConversation,
                                            conversations: prevConversations,
                                          });
                                          toast.error("Failed to update group metadata");
                                        }
                                      },

                                        // Socket listener handlers
                                        handleIncomingGroupMemberRemoved: ({ convoId, targetUserId }) => {
                                          const { activeConversation, conversations } = get();

                                          // If the current user was the one removed from the group, they shouldn't see it anymore.
                                          const currentUser = useAuthStore.getState().authUser;
                                          if (currentUser && currentUser._id === targetUserId) {
                                            set({ conversations: conversations.filter((c) => c._id !== convoId) });
                                            if (activeConversation && activeConversation._id === convoId) {
                                              set({ activeConversation: null, messages: [] });
                                              toast.info("You were removed from a group");
                                            }
                                            return;
                                          }

                                          if (activeConversation && activeConversation._id === convoId) {
                                            const updatedMembers = activeConversation.members.filter(
                                              (m) => m._id !== targetUserId,
                                            );
                                            const updatedAdmins = activeConversation.groupAdmins.filter(
                                              (adminId) => getEntityId(adminId) !== targetUserId,
                                            );
                                            set({
                                              activeConversation: {
                                                ...activeConversation,
                                                members: updatedMembers,
                                                groupAdmins: updatedAdmins,
                                              },
                                            });
                                          }

                                          set({
                                            conversations: conversations.map((c) => {
                                              if (c._id === convoId) {
                                                return {
                                                  ...c,
                                                  members: c.members.filter((m) => m._id !== targetUserId),
                                                  groupAdmins: c.groupAdmins.filter(
                                                    (adminId) => getEntityId(adminId) !== targetUserId,
                                                  ),
                                                };
                                              }
                                              return c;
                                            }),
                                          });
                                        },

                                          handleIncomingGroupMemberAdded: ({ convoId, updatedGroup }) => {
                                            const { activeConversation, conversations } = get();
                                            if (activeConversation && activeConversation._id === convoId) {
                                              set({
                                                activeConversation: {
                                                  ...activeConversation,
                                                  members: updatedGroup.members,
                                                  groupAdmins: updatedGroup.groupAdmins,
                                                },
                                              });
                                            }

                                            set({
                                              conversations: conversations.map((c) => {
                                                if (c._id === convoId) {
                                                  return {
                                                    ...c,
                                                    members: updatedGroup.members,
                                                    groupAdmins: updatedGroup.groupAdmins,
                                                  };
                                                }
                                                return c;
                                              }),
                                            });
                                          },

                                            handleIncomingGroupAdminPromoted: ({ convoId, targetUserId }) => {
                                              const { activeConversation, conversations } = get();
                                              if (activeConversation && activeConversation._id === convoId) {
                                                if (
                                                  !activeConversation.groupAdmins.some(
                                                    (a) => getEntityId(a) === targetUserId,
                                                  )
                                                ) {
                                                  const updatedAdmins = [...activeConversation.groupAdmins, targetUserId];
                                                  set({
                                                    activeConversation: {
                                                      ...activeConversation,
                                                      groupAdmins: updatedAdmins,
                                                    },
                                                  });
                                                }
                                              }

                                              set({
                                                conversations: conversations.map((c) => {
                                                  if (c._id === convoId) {
                                                    if (!c.groupAdmins.some((a) => getEntityId(a) === targetUserId)) {
                                                      return { ...c, groupAdmins: [...c.groupAdmins, targetUserId] };
                                                    }
                                                  }
                                                  return c;
                                                }),
                                              });
                                            },

                                              handleIncomingGroupMetadataUpdated: ({ convoId, updatePayload }) => {
                                                const { activeConversation, conversations } = get();
                                                if (activeConversation && activeConversation._id === convoId) {
                                                  set({
                                                    activeConversation: {
                                                      ...activeConversation,
                                                      groupName: updatePayload.groupName || activeConversation.groupName,
                                                      groupAvatar:
                                                        updatePayload.groupAvatar || activeConversation.groupAvatar,
                                                    },
                                                  });
                                                }
                                                set({
                                                  conversations: conversations.map((c) => {
                                                    if (c._id === convoId) {
                                                      return {
                                                        ...c,
                                                        groupName: updatePayload.groupName || c.groupName,
                                                        groupAvatar: updatePayload.groupAvatar || c.groupAvatar,
                                                      };
                                                    }
                                                    return c;
                                                  }),
                                                });
                                              },

                                                // Clear chat state and E2EE caches (on logout)
                                                clearChat: () => {
                                                  sharedKeyCache.clear();
                                                  publicKeyCache.clear();
                                                  pendingMessageQueue.clear();
                                                  senderKeyMutex.clear();

                                                  set({
                                                    conversations: [],
                                                    activeConversation: null,
                                                    messages: [],
                                                    onlineUsers: [],
                                                    typingUsers: [],
                                                    unreadCounts: {},
                                                  });
                                                },
}));

export default useChatStore;
