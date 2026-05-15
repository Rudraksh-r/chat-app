import { create } from 'zustand';
import axiosInstance from '../lib/axios';
import { toast } from 'sonner';
import useSocketStore from './socketStore';
import useChatStore from './chatStore';

const useAuthStore = create((set, get) => ({
  // State
  authUser: null,
  isLoading: false,
  isCheckingAuth: true,
  isUploadingAvatar: false,

  // Check if user is already logged in (called on app mount)
  checkAuth: async () => {
    try {
      const res = await axiosInstance.get('/auth/get-user');
      set({ authUser: res.data.data });
      // Connect socket after verifying auth
      useSocketStore.getState().connectSocket(res.data.data._id);
    } catch (error) {
      set({ authUser: null });
      console.log('Not authenticated:', error.response?.data?.message || error.message);
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  // Signup
  signup: async (formData) => {
    set({ isLoading: true });
    try {
      const res = await axiosInstance.post('/auth/register', formData);
      const { createdUser } = res.data.data;
      set({ authUser: createdUser });
      // Connect socket after signup
      useSocketStore.getState().connectSocket(createdUser._id);
      toast.success('Account created successfully!');
      return true;
    } catch (error) {
      const message = error.response?.data?.message || 'Signup failed';
      toast.error(message);
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  // Login
  login: async (formData) => {
    set({ isLoading: true });
    try {
      const res = await axiosInstance.post('/auth/login', formData);
      const { loggedInUser } = res.data.data;
      set({ authUser: loggedInUser });
      // Connect socket after login
      useSocketStore.getState().connectSocket(loggedInUser._id);
      toast.success('Welcome back!');
      return true;
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed';
      toast.error(message);
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  // Logout
  logout: async () => {
    try {
      // Disconnect socket and clear chat state
      useSocketStore.getState().disconnectSocket();
      useChatStore.getState().clearChat();
      set({ authUser: null });
      toast.success('Logged out successfully');
    } catch (error) {
      toast.error('Logout failed');
    }
  },

  // Update Profile
  updateProfile: async (data) => {
    set({ isLoading: true });
    try {
      const res = await axiosInstance.put('/user/profile', data);
      set({ authUser: res.data.data });
      toast.success('Profile updated successfully');
      return true;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update profile';
      toast.error(message);
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
      const message = error.response?.data?.message || "Failed to update avatar";
      toast.error(message);
      return false;
    } finally {
      set({ isLoading: false });
    }
  }

}));

export default useAuthStore;
