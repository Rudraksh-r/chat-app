import { create } from "zustand";
import axiosInstance from "../lib/axios";
import { toast } from "sonner";
import useAuthStore from "./authStore";

const useProfileStore = create((set, get) => ({
  isLoadingProfile: false,
  userProfiles: {}, // cache of profiles: { userId: profileData }

  getUserProfile: async (userId) => {
    if (get().userProfiles[userId]) {
      return get().userProfiles[userId];
    }

    set({ isLoadingProfile: true });
    try {
      const res = await axiosInstance.get(`/user/${userId}/profile`);
      const profile = res.data.data;
      set((state) => ({
        userProfiles: { ...state.userProfiles, [userId]: profile },
      }));
      return profile;
    } catch (error) {
      console.error("Failed to fetch user profile:", error);
      return null;
    } finally {
      set({ isLoadingProfile: false });
    }
  },

  updateProfileDetails: async (data) => {
    set({ isLoadingProfile: true });
    try {
      const res = await axiosInstance.patch("/user/profile", data);
      const updatedUser = res.data.data;
      
      // Sync authStore state immediately
      useAuthStore.setState({ authUser: updatedUser });
      
      // Update cache
      set((state) => ({
        userProfiles: { ...state.userProfiles, [updatedUser._id]: updatedUser },
      }));
      toast.success("Profile updated successfully");
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update profile details");
      return false;
    } finally {
      set({ isLoadingProfile: false });
    }
  },
}));

export default useProfileStore;
