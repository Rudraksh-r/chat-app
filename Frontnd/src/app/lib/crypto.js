// Frontnd/src/app/lib/crypto.js
// Complete file — includes all 1:1 functions from before plus new group functions

// ── Algorithm constants ───────────────────────────────────────────────────────
const ECDH_ALGORITHM = { name: "ECDH", namedCurve: "P-256" };
const AES_ALGORITHM  = { name: "AES-GCM", length: 256 };

// ─────────────────────────────────────────────────────────────────────────────
// IDENTITY KEY OPERATIONS (unchanged from 1:1 implementation)
// ─────────────────────────────────────────────────────────────────────────────

export async function generateKeyPair() {
    return crypto.subtle.generateKey(ECDH_ALGORITHM, true, [
        "deriveKey",
        "deriveBits",
    ]);
}

export async function exportPublicKey(publicKey) {
    const raw = await crypto.subtle.exportKey("raw", publicKey);
    return arrayBufferToBase64(raw);
}

export async function importPublicKey(base64Key) {
    const raw = base64ToArrayBuffer(base64Key);
    return crypto.subtle.importKey("raw", raw, ECDH_ALGORITHM, true, []);
}

export async function exportPrivateKey(privateKey) {
    return crypto.subtle.exportKey("jwk", privateKey);
}

export async function importPrivateKey(jwkData) {
    return crypto.subtle.importKey(
        "jwk",
        jwkData,
        ECDH_ALGORITHM,
        true,
        ["deriveKey", "deriveBits"]
    );
}

export async function deriveSharedKey(myPrivateKey, theirPublicKey) {
    return crypto.subtle.deriveKey(
        { name: "ECDH", public: theirPublicKey },
        myPrivateKey,
        AES_ALGORITHM,
        false,
        ["encrypt", "decrypt"]
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// 1:1 ENCRYPTION (unchanged from 1:1 implementation)
// ─────────────────────────────────────────────────────────────────────────────

export async function encryptMessage(plaintext, sharedKey) {
    const iv      = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(plaintext);

    const ciphertext = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        sharedKey,
        encoded
    );

    return {
        ciphertext: arrayBufferToBase64(ciphertext),
        iv:         arrayBufferToBase64(iv),
    };
}

export async function decryptMessage(ciphertextB64, ivB64, sharedKey) {
    try {
        const ciphertext = base64ToArrayBuffer(ciphertextB64);
        const iv         = base64ToArrayBuffer(ivB64);

        const decrypted = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv },
            sharedKey,
            ciphertext
        );

        return new TextDecoder().decode(decrypted);
    } catch (error) {
        throw new Error(`1:1 decryption failed: ${error.message}`);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP: SENDER KEY GENERATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates a new random AES-256-GCM sender key.
 * This key will be used to encrypt all messages a member sends
 * in a group until they rotate it (on removal of another member).
 *
 * extractable: true — must be wrapped and distributed to others,
 * which requires exporting the raw key bytes.
 */
export async function generateSenderKey() {
    return crypto.subtle.generateKey(
        AES_ALGORITHM,
        true, // extractable — needed for wrapSenderKeyForRecipient
        ["encrypt", "decrypt"]
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP: SENDER KEY DISTRIBUTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Wraps (encrypts) a sender key for a specific recipient.
 * Uses the 1:1 ECDH pairwise channel as the transport —
 * so the sender key is encrypted with the shared secret that
 * only this specific pair can derive.
 *
 * Flow:
 *   Alice wants to send SK_Alice to Bob:
 *   1. Alice exports SK_Alice as raw bytes
 *   2. Alice encrypts those bytes with ECDH(Alice.priv, Bob.pub) → wrapped
 *   3. Alice sends {wrappedKey, iv} to Bob via the backend
 *   4. Bob decrypts with ECDH(Bob.priv, Alice.pub) → raw SK_Alice bytes
 *   5. Bob imports raw bytes as a CryptoKey and stores it
 *
 * @param {CryptoKey} senderKey - The AES sender key to wrap
 * @param {CryptoKey} pairwiseSharedKey - ECDH-derived key for this specific recipient
 * @returns {{ wrappedKey: string, iv: string }} Both base64-encoded
 */
export async function wrapSenderKeyForRecipient(senderKey, pairwiseSharedKey) {
    // Export the sender key to raw bytes
    const rawKeyBytes = await crypto.subtle.exportKey("raw", senderKey);

    // Encrypt those bytes using the pairwise shared key
    // Random IV here — this is a one-time wrap operation, not a stream,
    // so random IV is correct and fine (no counter needed)
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const wrapped = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        pairwiseSharedKey,
        rawKeyBytes
    );

    return {
        wrappedKey: arrayBufferToBase64(wrapped),
        iv:         arrayBufferToBase64(iv),
    };
}

/**
 * Unwraps (decrypts) a sender key received from another member.
 * Inverse of wrapSenderKeyForRecipient.
 *
 * @param {string} wrappedKeyB64
 * @param {string} ivB64
 * @param {CryptoKey} pairwiseSharedKey
 * @returns {Promise<CryptoKey>} The unwrapped AES sender key
 */
export async function unwrapSenderKey(wrappedKeyB64, ivB64, pairwiseSharedKey) {
    try {
        const wrapped = base64ToArrayBuffer(wrappedKeyB64);
        const iv      = base64ToArrayBuffer(ivB64);

        // Decrypt to get raw key bytes
        const rawKeyBytes = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv },
            pairwiseSharedKey,
            wrapped
        );

        // Import raw bytes as an AES-256-GCM CryptoKey
        return crypto.subtle.importKey(
            "raw",
            rawKeyBytes,
            AES_ALGORITHM,
            true,           // extractable — so we can store and re-import from IndexedDB
            ["encrypt", "decrypt"]
        );
    } catch (error) {
        throw new Error(`Sender key unwrap failed: ${error.message}`);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP: MESSAGE ENCRYPTION / DECRYPTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Derives an AES-GCM IV deterministically from a counter value.
 *
 * Counter occupies bytes 8-11 (big-endian uint32) of the 12-byte IV.
 * Bytes 0-7 are zeros, giving headroom for sender ID prefix in future
 * if you ever upgrade to a more complex IV derivation scheme.
 *
 * Why deterministic instead of random?
 *   Sender keys are reused across many messages (unlike 1:1 ECDH which
 *   effectively re-derives per session). Random IVs have birthday collision
 *   probability that becomes significant at large message counts with one key.
 *   A monotonic counter guarantees zero IV collisions as long as the counter
 *   never wraps (uint32 = 4 billion messages per sender key — more than enough
 *   before a key rotation happens due to group membership changes).
 *
 * Side benefit: enables replay attack detection.
 *   Receiver tracks lastCounter per sender. If incoming counter ≤ lastCounter,
 *   it's a replay or out-of-order delivery — reject it.
 */
function deriveIvFromCounter(counter) {
    const iv   = new Uint8Array(12);          // 12 bytes, initialized to 0
    const view = new DataView(iv.buffer);
    view.setUint32(8, counter, false);         // big-endian uint32 in bytes 8-11
    return iv;
}

/**
 * Encrypts a group message using the sender's own sender key.
 *
 * The counter MUST be incremented before calling this function,
 * and the caller MUST persist the new counter to IndexedDB after
 * this call succeeds. This function is a pure crypto operation —
 * it does not mutate any state.
 *
 * @param {string} plaintext
 * @param {CryptoKey} senderKey - The sender's own AES sender key
 * @param {number} counter - The next counter value (already incremented by caller)
 * @returns {{ ciphertext: string, counter: number }}
 */
export async function encryptGroupMessage(plaintext, senderKey, counter) {
    const iv      = deriveIvFromCounter(counter);
    const encoded = new TextEncoder().encode(plaintext);

    const ciphertext = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        senderKey,
        encoded
    );

    return {
        ciphertext: arrayBufferToBase64(ciphertext),
        counter,    // return the counter so caller can persist it
    };
}

/**
 * Decrypts a group message using a stored peer sender key.
 *
 * Enforces the replay guard: if counter ≤ lastSeenCounter, throws.
 * Callers MUST update lastSeenCounter in IndexedDB after successful decryption.
 *
 * @param {string} ciphertextB64
 * @param {number} counter - From the message metadata
 * @param {CryptoKey} peerSenderKey - Retrieved from IndexedDB via getPeerSenderKey
 * @param {number} lastSeenCounter - The counter from the last successfully decrypted message
 * @returns {Promise<string>} Decrypted plaintext
 */
export async function decryptGroupMessage(
    ciphertextB64,
    counter,
    peerSenderKey,
    lastSeenCounter
) {
    // ── Replay / out-of-order guard ───────────────────────────────────────
    // counter must be strictly greater than lastSeenCounter.
    // Equal would mean we're seeing the same message twice (replay).
    // Less than would mean someone sent a message with an older counter —
    // either a programming bug on the sender's side or a replay attack.
    if (counter <= lastSeenCounter) {
        throw new Error(
            `Replay or stale message rejected. ` +
            `Message counter ${counter} ≤ last seen ${lastSeenCounter}.`
        );
    }

    try {
        const iv         = deriveIvFromCounter(counter);
        const ciphertext = base64ToArrayBuffer(ciphertextB64);

        const decrypted = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv },
            peerSenderKey,
            ciphertext
        );

        return new TextDecoder().decode(decrypted);
    } catch (error) {
        // AES-GCM authentication tag failure — ciphertext was tampered with,
        // or the key doesn't match (wrong epoch / stale key after rotation).
        throw new Error(`Group message decryption failed: ${error.message}`);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

export function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary  = "";
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

export function base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const bytes  = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}