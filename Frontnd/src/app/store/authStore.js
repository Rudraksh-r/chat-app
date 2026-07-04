import { create } from "zustand";
import axiosInstance from "../lib/axios";
import { toast } from "sonner";
import useSocketStore from "./socketStore";
import useChatStore from "./chatStore";
import { generateKeyPair, exportPublicKey } from "../lib/crypto";
import { getPrivateKey, storePrivateKey } from "../lib/keyStorage";

const useAuthStore = create((set, get) => ({
  // State
  authUser: null,
  isLoading: false,
  isCheckingAuth: true,
  isUploadingAvatar: false,
  myPrivateKey: null,

  // ── Ensure keypair exists on this device ─────────────────────────────────
  // This runs in the background after auth so the main auth UX is never blocked.
  _setupCrypto: async (user) => {
    if (!user?._id) return false;

    try {
      const existingPrivateKey = await getPrivateKey(user._id);
      const hasServerPublicKey = Boolean(user.publicKey);

      if (existingPrivateKey && hasServerPublicKey) {
        console.log("✅ E2EE: Existing keypair found in IndexedDB");
        return true;
      }

      if (existingPrivateKey && !hasServerPublicKey) {
        console.warn(
          "⚠️ E2EE: Local private key found but server public key missing. Regenerating keypair.",
        );
      } else {
        console.log(
          "🔑 E2EE: No keypair found — generating new keypair for this device",
        );
      }

      const keyPair = await generateKeyPair();
      const publicKeyB64 = await exportPublicKey(keyPair.publicKey);

      await storePrivateKey(user._id, keyPair.privateKey);
      await axiosInstance.put("/user/public-key", {
        publicKey: publicKeyB64,
      });

      console.log("✅ E2EE: New keypair generated and public key uploaded");
      return true;
    } catch (error) {
      console.error("❌ E2EE: Key generation/setup failed:", error);
      return false;
    }
  },

  ensureKeyPair: async (userId, hasServerPublicKey = true) => {
    return get()._setupCrypto({
      _id: userId,
      publicKey: hasServerPublicKey ? "present" : null,
    });
  },

  checkAuth: async () => {
    try {
      const res = await axiosInstance.get("/auth/get-user");
      const user = res.data.data;
      set({ authUser: user });

      useSocketStore.getState().connectSocket(user._id);
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

      const { createdUser } = res.data.data;

      set({ authUser: createdUser });
      useSocketStore.getState().connectSocket(createdUser._id);
      void get()._setupCrypto(createdUser).catch((err) => {
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
      const { loggedInUser } = res.data.data;

      set({ authUser: loggedInUser });
      useSocketStore.getState().connectSocket(loggedInUser._id);
      toast.success("Welcome back!");

      void get()._setupCrypto(loggedInUser).then((result) => {
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

  logout: async () => {
    try {
      useSocketStore.getState().disconnectSocket();
      useChatStore.getState().clearChat();
      // NOTE: We do NOT delete the private key from IndexedDB on logout.
      // The user expects to be able to decrypt their history when they log
      // back in on the same device. Deleting the key would break that.
      // Explicit "clear this device" should be a separate UX action.
      set({ authUser: null });
      toast.success("Logged out successfully");
    } catch (error) {
      toast.error("Logout failed");
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
}));

export default useAuthStore;
