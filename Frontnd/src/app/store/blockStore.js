import { create } from "zustand";
import axiosInstance from "../lib/axios";
import { toast } from "sonner";
import useAuthStore from "./authStore";

const useBlockStore = create((set, get) => ({
  blockedUsers: [],
  isLoadingBlocks: false,

  getBlockedUsers: async () => {
    set({ isLoadingBlocks: true });
    try {
      const res = await axiosInstance.get("/user/blocked");
      const list = res.data.data;
      set({ blockedUsers: list });
      return list;
    } catch (error) {
      console.error("Failed to fetch blocked users:", error);
      return [];
    } finally {
      set({ isLoadingBlocks: false });
    }
  },

  blockUser: async (targetId) => {
    set({ isLoadingBlocks: true });
    try {
      await axiosInstance.post(`/user/block/${targetId}`);
      toast.success("User blocked successfully");

      // Update authUser in authStore
      const authUser = useAuthStore.getState().authUser;
      if (authUser) {
        const updatedBlocked = [...(authUser.blockedUsers || []), targetId];
        useAuthStore.setState({
          authUser: { ...authUser, blockedUsers: updatedBlocked }
        });
      }

      await get().getBlockedUsers();
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to block user");
      return false;
    } finally {
      set({ isLoadingBlocks: false });
    }
  },

  unblockUser: async (targetId) => {
    set({ isLoadingBlocks: true });
    try {
      await axiosInstance.post(`/user/unblock/${targetId}`);
      toast.success("User unblocked successfully");

      // Update authUser in authStore
      const authUser = useAuthStore.getState().authUser;
      if (authUser) {
        const updatedBlocked = (authUser.blockedUsers || []).filter(id => id !== targetId);
        useAuthStore.setState({
          authUser: { ...authUser, blockedUsers: updatedBlocked }
        });
      }

      await get().getBlockedUsers();
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to unblock user");
      return false;
    } finally {
      set({ isLoadingBlocks: false });
    }
  },
  
  isUserBlocked: (targetId) => {
    const authUser = useAuthStore.getState().authUser;
    if (!authUser || !authUser.blockedUsers) return false;
    return authUser.blockedUsers.some(id => id === targetId);
  }
}));

export default useBlockStore;
