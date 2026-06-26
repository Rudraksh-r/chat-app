import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001/api";

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  // DO NOT set Content-Type here globally.
  // For JSON requests, Axios sets it automatically.
  // For FormData (file uploads), the browser sets it with the correct
  // multipart boundary — overriding it breaks the upload.
});


export default axiosInstance;

// Export API helper for "Delete for Everyone"
export const deleteMessageForEveryone = (messageId) =>
  axiosInstance.patch(`/message/${messageId}/delete-for-everyone`);

// Export API helper for "Delete for Me"
export const deleteMessageForMe = (messageId) =>
  axiosInstance.patch(`/message/${messageId}/delete`);
