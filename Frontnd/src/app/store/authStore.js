import { create } from "zustand";
import axiosInstance from "../lib/axios";
import { toast } from "sonner";
import useSocketStore from "./socketStore";
import useChatStore from "./chatStore";
import {
  generateKeyPair,
  exportPublicKey,
  encryptPrivateKeyWithPassword,
  decryptPrivateKeyWithPassword,
  getPublicKeyFromPrivateKey,
} from "../lib/crypto";
import { getPrivateKey, storePrivateKey } from "../lib/keyStorage";

let cryptoSetupPromise = null;

const useAuthStore = create((set, get) => ({
  // State
  authUser: null,
  isLoading: false,
  isCheckingAuth: true,
  isLoggingOut: false,
  isUploadingAvatar: false,
  myPrivateKey: null,
  needsKeyRestore: false, // true if no local key and server has encrypted backup

  // ── Ensure keypair exists on this device ─────────────────────────────────
  // password is only available during explicit login/signup, NOT during checkAuth.
  // If no local key and no password provided (checkAuth), we set needsKeyRestore flag.
  _setupCrypto: async (user, password = null) => {
    if (!user?._id) return false;

    if (cryptoSetupPromise) return cryptoSetupPromise;

    cryptoSetupPromise = (async () => {
      try {
        const existingPrivateKey = await getPrivateKey(user._id);

        // ── Case 1: Local key exists — verify or migrate ──────────────
        if (existingPrivateKey) {
          let keysMatch = true;

          if (user.publicKey) {
            try {
              const localPub = await getPublicKeyFromPrivateKey(existingPrivateKey);
              const localPubB64 = await exportPublicKey(localPub);
              if (localPubB64 !== user.publicKey) {
                console.warn("⚠️ E2EE: Local key matches but server public key is different (device reset/re-generation). Discarding local key.");
                keysMatch = false;
              }
            } catch (verifyErr) {
              console.error("❌ E2EE: Verification of local key failed:", verifyErr.message);
              keysMatch = false;
            }
          } else {
            // Server doesn't have a public key, but we have one locally. Re-upload it.
            try {
              const localPub = await getPublicKeyFromPrivateKey(existingPrivateKey);
              const localPubB64 = await exportPublicKey(localPub);
              await axiosInstance.put("/user/public-key", {
                publicKey: localPubB64,
              });
              if (password) {
                const encrypted = await encryptPrivateKeyWithPassword(existingPrivateKey, password);
                await axiosInstance.put("/user/encrypted-private-key", {
                  encryptedPrivateKey: encrypted.encryptedPrivateKey,
                  privateKeyIv: encrypted.iv,
                  privateKeySalt: encrypted.salt,
                });
              }
              console.log("✅ E2EE: Re-uploaded missing public key to server");
            } catch (uploadErr) {
              console.error("❌ E2EE: Re-uploading missing public key failed:", uploadErr.message);
            }
          }

          if (keysMatch) {
            console.log("✅ E2EE: Existing keypair found in IndexedDB and matches server");

            // If server doesn't have an encrypted backup yet, upload one
            // (migration path for users who had keys before this feature)
            if (password && !user.encryptedPrivateKey) {
              try {
                const encrypted = await encryptPrivateKeyWithPassword(existingPrivateKey, password);
                await axiosInstance.put("/user/encrypted-private-key", {
                  encryptedPrivateKey: encrypted.encryptedPrivateKey,
                  privateKeyIv: encrypted.iv,
                  privateKeySalt: encrypted.salt,
                });
                console.log("✅ E2EE: Migrated existing key — encrypted backup uploaded to server");
              } catch (migrationErr) {
                console.warn("⚠️ E2EE: Failed to upload key backup (non-critical):", migrationErr.message);
              }
            }

            return true;
          }
        }

        // ── Case 2: No local key, but server has encrypted backup ──────
        if (user.encryptedPrivateKey && user.privateKeyIv && user.privateKeySalt) {
          if (!password) {
            // checkAuth path — no password available. Flag for UI prompt.
            console.warn("⚠️ E2EE: Encrypted key backup exists on server but no password available to decrypt.");
            set({ needsKeyRestore: true });
            return false;
          }

          try {
            console.log("🔑 E2EE: Restoring private key from server backup...");
            const restoredKey = await decryptPrivateKeyWithPassword(
              user.encryptedPrivateKey,
              user.privateKeyIv,
              user.privateKeySalt,
              password
            );

            await storePrivateKey(user._id, restoredKey);
            set({ needsKeyRestore: false });
            console.log("✅ E2EE: Private key restored from server backup");
            return true;
          } catch (restoreErr) {
            console.error("❌ E2EE: Failed to restore key from server backup:", restoreErr.message);
            // Key restore failed — might be wrong password or corrupted data
            // Fall through to generate new keypair
          }
        }

        // ── Case 3: No local key and no server backup — generate new ───
        if (!password) {
          console.warn("⚠️ E2EE: No key anywhere and no password to generate. Needs login.");
          set({ needsKeyRestore: true });
          return false;
        }

        console.log("🔑 E2EE: No keypair found — generating new keypair");
        const keyPair = await generateKeyPair();
        const publicKeyB64 = await exportPublicKey(keyPair.publicKey);

        // Store locally
        await storePrivateKey(user._id, keyPair.privateKey);

        // Encrypt private key with password for server backup
        const encrypted = await encryptPrivateKeyWithPassword(keyPair.privateKey, password);

        // Upload public key + encrypted private key to server
        await axiosInstance.put("/user/encrypted-private-key", {
          publicKey: publicKeyB64,
          encryptedPrivateKey: encrypted.encryptedPrivateKey,
          privateKeyIv: encrypted.iv,
          privateKeySalt: encrypted.salt,
        });

        // Also update publicKey separately for backwards compat
        await axiosInstance.put("/user/public-key", {
          publicKey: publicKeyB64,
        });

        set({ needsKeyRestore: false });
        console.log("✅ E2EE: New keypair generated, encrypted backup uploaded");
        return true;
      } catch (error) {
        console.error("❌ E2EE: Key generation/setup failed:", error);
        return false;
      } finally {
        cryptoSetupPromise = null;
      }
    })();

    return cryptoSetupPromise;
  },

  // Restore key from server backup (called when user enters password from UI prompt)
  restoreKeyFromPassword: async (password) => {
    const { authUser } = get();
    if (!authUser) return false;

    set({ isLoading: true });
    try {
      // Re-fetch user to get encrypted key data
      const res = await axiosInstance.get("/auth/get-user");
      const user = res.data.data;

      if (!user.encryptedPrivateKey || !user.privateKeyIv || !user.privateKeySalt) {
        // No encrypted backup on server — need to generate fresh
        const result = await get()._setupCrypto(user, password);
        set({ authUser: user, isLoading: false });
        return result;
      }

      const restoredKey = await decryptPrivateKeyWithPassword(
        user.encryptedPrivateKey,
        user.privateKeyIv,
        user.privateKeySalt,
        password
      );

      await storePrivateKey(user._id, restoredKey);
      set({ needsKeyRestore: false, authUser: user, isLoading: false });
      toast.success("Encryption keys restored successfully!");
      return true;
    } catch (error) {
      console.error("❌ E2EE: Key restore failed:", error);
      toast.error("Failed to restore encryption keys. Check your password.");
      set({ isLoading: false });
      return false;
    }
  },

  checkAuth: async () => {
    try {
      const res = await axiosInstance.get("/auth/get-user");
      const user = res.data.data;
      set({ authUser: user });

      useSocketStore.getState().connectSocket(user._id);
      // checkAuth has no password — _setupCrypto will use local key or flag needsKeyRestore
      void get()._setupCrypto(user).catch((err) => {
        console.error("E2EE setup failed during checkAuth:", err?.message || err);
      });
    } catch (error) {
      set({ authUser: null });
      console.log(
        "Not authenticated:",
        error.response?.data?.message || error.message,
      );
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  signup: async (formData) => {
    set({ isLoading: true });
    try {
      const res = await axiosInstance.post("/auth/register", {
        ...formData,
        publicKey: null,
      });

      const { createdUser, accessToken, refreshToken } = res.data.data;

      if (accessToken) localStorage.setItem("accessToken", accessToken);
      if (refreshToken) localStorage.setItem("refreshToken", refreshToken);

      set({ authUser: createdUser });
      useSocketStore.getState().connectSocket(createdUser._id);
      // Pass password so _setupCrypto can generate keypair and upload encrypted backup
      void get()._setupCrypto(createdUser, formData.password).catch((err) => {
        console.error("E2EE setup failed after signup:", err?.message || err);
      });
      toast.success("Account created successfully!");
      return true;
    } catch (error) {
      const message = error.response?.data?.message || "Signup failed";
      toast.error(message);
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  login: async (formData) => {
    set({ isLoading: true });
    try {
      const res = await axiosInstance.post("/auth/login", formData);
      const { loggedInUser, accessToken, refreshToken } = res.data.data;

      if (accessToken) localStorage.setItem("accessToken", accessToken);
      if (refreshToken) localStorage.setItem("refreshToken", refreshToken);

      set({ authUser: loggedInUser });
      useSocketStore.getState().connectSocket(loggedInUser._id);
      toast.success("Welcome back!");

      // Pass password so _setupCrypto can restore key from server backup if needed
      void get()._setupCrypto(loggedInUser, formData.password).then((result) => {
        if (!result) {
          toast.warning(
            "Encryption setup had an issue. Reload if messages don't decrypt.",
            { duration: 6000 },
          );
        }
      }).catch((err) => {
        console.error("E2EE setup failed after login:", err?.message || err);
      });
      return true;
    } catch (error) {
      const message = error.response?.data?.message || "Login failed";
      toast.error(message);
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async (redirect = true) => {
    set({ isLoggingOut: true });
    try {
      await axiosInstance.post("/auth/logout").catch(() => {});
      useSocketStore.getState().disconnectSocket();
      useChatStore.getState().clearChat();
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      // NOTE: We do NOT delete the private key from IndexedDB on logout.
      // The user expects to be able to decrypt their history when they log
      // back in on the same device. Deleting the key would break that.
      // Explicit "clear this device" should be a separate UX action.
      set({ authUser: null, needsKeyRestore: false });
      if (redirect) {
        toast.success("Logged out successfully");
        window.location.href = "/login";
      } else {
        set({ isLoggingOut: false });
      }
    } catch (error) {
      if (redirect) toast.error("Logout failed");
      set({ isLoggingOut: false });
    }
  },

  updateProfile: async (data) => {
    set({ isLoading: true });
    try {
      const res = await axiosInstance.put("/user/profile", data);
      set({ authUser: res.data.data });
      toast.success("Profile updated successfully");
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update profile");
      return false;
    } finally {
      set({ isLoading: false });
    }
  },
  updateAvatar: async (file) => {
    set({ isLoading: true });
    try {
      // FormData (capital F — it's a browser built-in constructor)
      const formData = new FormData();
      // "avatar" must match the field name in upload.single("avatar") on the backend
      formData.append("avatar", file);

      // Do NOT set Content-Type manually here.
      // Axios detects FormData and lets the browser set the correct
      // multipart/form-data boundary automatically.
      const res = await axiosInstance.put("/user/avatar", formData);

      // Update the local authUser state so the UI reflects the new avatar immediately
      set({ authUser: res.data.data });
      toast.success("Avatar updated successfully!");
      return true;
    } catch (error) {
      const message =
        error.response?.data?.message || "Failed to update avatar";
      toast.error(message);
      return false;
    } finally {
      set({ isLoading: false });
    }
  },
  changePassword: async (oldPassword, newPassword) => {
    set({ isLoading: true });
    try {
      await axiosInstance.put("/auth/change-password", {
        oldPassword,
        newPassword,
      });
      toast.success("Password changed successfully!");
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to change password");
      return false;
    } finally {
      set({ isLoading: false });
    }
  },
  deleteAccount: async () => {
    set({ isLoading: true });
    try {
      await axiosInstance.delete("/user/account");
      useSocketStore.getState().disconnectSocket();
      useChatStore.getState().clearChat();
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      set({ authUser: null, needsKeyRestore: false });
      toast.success("Account deleted successfully");
      window.location.href = "/register";
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete account");
      return false;
    } finally {
      set({ isLoading: false });
    }
  },
}));

export default useAuthStore;
