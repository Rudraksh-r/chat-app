// Frontnd/src/app/lib/keyStorage.js
// Complete rewrite — adds SENDER_KEYS_OWN and SENDER_KEYS_PEER stores

// ── Database constants ────────────────────────────────────────────────────────
const DB_NAME    = "e2ee-keystore";
const DB_VERSION = 2; // bumped from 1 to add new stores

const STORES = {
    IDENTITY_KEYS:    "identity-keys",    // long-term ECDH keypair per user
    SENDER_KEYS_OWN:  "sender-keys-own",  // my AES sender key per group
    SENDER_KEYS_PEER: "sender-keys-peer", // peer sender keys: { key, lastCounter, version }
};

// ── Open + initialize IndexedDB ───────────────────────────────────────────────
// onupgradeneeded handles both fresh install (creates all stores)
// and migration from version 1 (creates only the 2 new stores).
function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            // Always safe to check before creating — idempotent
            if (!db.objectStoreNames.contains(STORES.IDENTITY_KEYS)) {
                db.createObjectStore(STORES.IDENTITY_KEYS);
            }

            if (!db.objectStoreNames.contains(STORES.SENDER_KEYS_OWN)) {
                // Key: convoId (string)
                // Value: { keyJwk, counter, version }
                db.createObjectStore(STORES.SENDER_KEYS_OWN);
            }

            if (!db.objectStoreNames.contains(STORES.SENDER_KEYS_PEER)) {
                // Key: "${convoId}:${senderId}" (string)
                // Value: { keyJwk, lastCounter, version }
                db.createObjectStore(STORES.SENDER_KEYS_PEER);
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror  = () => reject(request.error);
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// IDENTITY KEYS (unchanged from 1:1 implementation)
// ─────────────────────────────────────────────────────────────────────────────

export async function storePrivateKey(userId, privateKey) {
    const jwk = await crypto.subtle.exportKey("jwk", privateKey);
    const db  = await openDB();

    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORES.IDENTITY_KEYS, "readwrite");
        tx.objectStore(STORES.IDENTITY_KEYS).put(jwk, `${userId}:privateKey`);
        tx.oncomplete = () => resolve();
        tx.onerror    = () => reject(tx.error);
    });
}

export async function getPrivateKey(userId) {
    const db = await openDB();

    return new Promise((resolve, reject) => {
        const tx      = db.transaction(STORES.IDENTITY_KEYS, "readonly");
        const request = tx.objectStore(STORES.IDENTITY_KEYS).get(`${userId}:privateKey`);

        request.onsuccess = async () => {
            if (!request.result) return resolve(null);
            try {
                const key = await crypto.subtle.importKey(
                    "jwk",
                    request.result,
                    { name: "ECDH", namedCurve: "P-256" },
                    true,
                    ["deriveKey", "deriveBits"]
                );
                resolve(key);
            } catch (err) {
                console.error("Failed to import private key:", err);
                resolve(null);
            }
        };

        request.onerror = () => reject(request.error);
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// OWN SENDER KEYS
// My outgoing AES-256 key for each group I send in.
// Stored as JWK + counter (outgoing, incremented on each send) + version.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Stores or overwrites my sender key for a group.
 *
 * @param {string} convoId
 * @param {{ key: CryptoKey, counter: number, version: number }} data
 */
export async function storeOwnSenderKey(convoId, { key, counter, version }) {
    const keyJwk = await crypto.subtle.exportKey("jwk", key);
    const db     = await openDB();

    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORES.SENDER_KEYS_OWN, "readwrite");
        tx.objectStore(STORES.SENDER_KEYS_OWN).put(
            { keyJwk, counter, version },
            convoId
        );
        tx.oncomplete = () => resolve();
        tx.onerror    = () => reject(tx.error);
    });
}

/**
 * Retrieves my sender key for a group.
 * Returns null if not yet initialized (first send will trigger generation).
 *
 * @param {string} convoId
 * @returns {Promise<{ key: CryptoKey, counter: number, version: number } | null>}
 */
export async function getOwnSenderKey(convoId) {
    const db = await openDB();

    return new Promise((resolve, reject) => {
        const tx      = db.transaction(STORES.SENDER_KEYS_OWN, "readonly");
        const request = tx.objectStore(STORES.SENDER_KEYS_OWN).get(convoId);

        request.onsuccess = async () => {
            if (!request.result) return resolve(null);
            try {
                const key = await crypto.subtle.importKey(
                    "jwk",
                    request.result.keyJwk,
                    { name: "AES-GCM" },
                    true,
                    ["encrypt", "decrypt"]
                );
                resolve({
                    key,
                    counter: request.result.counter,
                    version: request.result.version,
                });
            } catch (err) {
                console.error("Failed to import own sender key:", err);
                resolve(null);
            }
        };

        request.onerror = () => reject(request.error);
    });
}

/**
 * Deletes my sender key for a group (called during rotation).
 * After deletion, the next send will generate a fresh key.
 */
export async function deleteOwnSenderKey(convoId) {
    const db = await openDB();

    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORES.SENDER_KEYS_OWN, "readwrite");
        tx.objectStore(STORES.SENDER_KEYS_OWN).delete(convoId);
        tx.oncomplete = () => resolve();
        tx.onerror    = () => reject(tx.error);
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// PEER SENDER KEYS
// Keys received from other group members that we use to decrypt their messages.
// Stored keyed by "${convoId}:${senderId}" to scope per-sender per-group.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Stores a sender key received from another group member.
 *
 * @param {string} convoId
 * @param {string} senderId
 * @param {{ key: CryptoKey, version: number }} data
 *   lastCounter starts at -1 (no message seen yet from this sender in this epoch)
 */
export async function storePeerSenderKey(convoId, senderId, { key, version }) {
    const keyJwk = await crypto.subtle.exportKey("jwk", key);
    const db     = await openDB();
    const dbKey  = `${convoId}:${senderId}`;

    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORES.SENDER_KEYS_PEER, "readwrite");
        tx.objectStore(STORES.SENDER_KEYS_PEER).put(
            { keyJwk, lastCounter: -1, version },
            dbKey
        );
        tx.oncomplete = () => resolve();
        tx.onerror    = () => reject(tx.error);
    });
}

/**
 * Retrieves a peer's sender key.
 * Returns null if we haven't received their key distribution yet.
 *
 * @param {string} convoId
 * @param {string} senderId
 * @returns {Promise<{ key: CryptoKey, lastCounter: number, version: number } | null>}
 */
export async function getPeerSenderKey(convoId, senderId) {
    const db    = await openDB();
    const dbKey = `${convoId}:${senderId}`;

    return new Promise((resolve, reject) => {
        const tx      = db.transaction(STORES.SENDER_KEYS_PEER, "readonly");
        const request = tx.objectStore(STORES.SENDER_KEYS_PEER).get(dbKey);

        request.onsuccess = async () => {
            if (!request.result) return resolve(null);
            try {
                const key = await crypto.subtle.importKey(
                    "jwk",
                    request.result.keyJwk,
                    { name: "AES-GCM" },
                    true,
                    ["encrypt", "decrypt"]
                );
                resolve({
                    key,
                    lastCounter: request.result.lastCounter,
                    version:     request.result.version,
                });
            } catch (err) {
                console.error("Failed to import peer sender key:", err);
                resolve(null);
            }
        };

        request.onerror = () => reject(request.error);
    });
}

/**
 * Updates the lastCounter for a peer's sender key after successfully decrypting
 * one of their messages. This is the replay-attack guard — we only advance
 * the counter forward, never backward.
 *
 * @param {string} convoId
 * @param {string} senderId
 * @param {number} newCounter - The counter value from the just-decrypted message
 */
export async function updatePeerCounter(convoId, senderId, newCounter) {
    const db    = await openDB();
    const dbKey = `${convoId}:${senderId}`;

    // Read-modify-write in a single transaction to avoid race conditions
    return new Promise((resolve, reject) => {
        const tx      = db.transaction(STORES.SENDER_KEYS_PEER, "readwrite");
        const store   = tx.objectStore(STORES.SENDER_KEYS_PEER);
        const request = store.get(dbKey);

        request.onsuccess = () => {
            if (!request.result) return resolve(); // key was deleted (rotation?)
            const updated = { ...request.result, lastCounter: newCounter };
            store.put(updated, dbKey);
        };

        tx.oncomplete = () => resolve();
        tx.onerror    = () => reject(tx.error);
    });
}

/**
 * Deletes all peer sender keys for a group (called during key rotation).
 * After deletion, incoming messages from peers will queue until
 * new distributions arrive and are stored.
 *
 * @param {string} convoId
 * @param {string[]} senderIds - Member IDs whose keys to delete
 */
export async function deletePeerSenderKeys(convoId, senderIds) {
    const db = await openDB();

    return new Promise((resolve, reject) => {
        const tx    = db.transaction(STORES.SENDER_KEYS_PEER, "readwrite");
        const store = tx.objectStore(STORES.SENDER_KEYS_PEER);

        for (const senderId of senderIds) {
            store.delete(`${convoId}:${senderId}`);
        }

        tx.oncomplete = () => resolve();
        tx.onerror    = () => reject(tx.error);
    });
}