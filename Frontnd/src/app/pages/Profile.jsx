import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import { motion } from "framer-motion";
import { User, Mail, Lock, Camera, ArrowLeft, Save, LogOut, Loader2 } from "lucide-react";
import { Button, Input } from "../components/ui/index";
import { toast } from "sonner";
import useAuthStore from "../store/authStore";
import { getAvatarUrl } from "../lib/avatar";

export function Profile() {
  const navigate = useNavigate();
  const { authUser, logout, updateProfile, uploadAvatar, isLoading, isUploadingAvatar } = useAuthStore();

  const [fullName, setFullName] = useState(authUser?.fullName || "");
  const [username, setUsername] = useState(authUser?.username || "");
  const [email] = useState(authUser?.email || "");
  const [password, setPassword] = useState("••••••••");
  // Local preview URL — shows the new image immediately before
  // the upload finishes, making the UI feel instant.
  const [avatarPreview, setAvatarPreview] = useState(null);

  // Hidden file input — we trigger it programmatically when the
  // user clicks the avatar overlay. This gives us full control
  // over the visual design without using a default file input.
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (authUser) {
      setFullName(authUser.fullName || "");
      setUsername(authUser.username || "");
    }
  }, [authUser]);

  const handleAvatarClick = () => {
    // Programmatically click the hidden file input.
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type on the frontend too.
    // The backend validates as well — this is just for a better UX
    // (instant feedback without a network round trip).
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size on the frontend (5MB limit mirrors backend).
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be smaller than 5MB");
      return;
    }

    // Create a local object URL for instant preview.
    // URL.createObjectURL() creates a temporary URL pointing to the
    // file in memory — the image renders immediately with zero latency.
    const previewUrl = URL.createObjectURL(file);
    setAvatarPreview(previewUrl);

    // Upload in the background while the preview is already showing.
    await uploadAvatar(file);

    // Clean up the temporary object URL to prevent memory leaks.
    // Once the upload is done, authUser.avatar.url will have the
    // real Cloudinary URL, so the preview is no longer needed.
    URL.revokeObjectURL(previewUrl);
    setAvatarPreview(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    await updateProfile({ fullName, username });
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  if (!authUser) return null;

  // Display priority: local preview > Cloudinary URL > default avatar
  const displayAvatar = avatarPreview || getAvatarUrl(authUser);

  return (
    <div className="min-h-screen w-full bg-[#0F172A] flex justify-center p-4 py-8 sm:py-12">
      <div className="fixed top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl bg-[#111827] rounded-3xl shadow-2xl shadow-indigo-500/5 border border-slate-800/50 z-10 flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800/60 bg-[#111827]/80 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-full" onClick={() => navigate("/")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-semibold text-slate-100">Account Settings</h1>
          </div>
          <Button variant="ghost" className="text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>

        <form onSubmit={handleSave} className="p-6 sm:p-8 flex-1 overflow-y-auto">

          {/* Avatar Section */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-10">
            <div
              className="relative group cursor-pointer shrink-0"
              onClick={handleAvatarClick}
            >
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />

              <img
                src={displayAvatar}
                alt="Profile avatar"
                className="w-20 h-20 rounded-full object-cover border-2 border-slate-700"
              />

              {/* Upload overlay — shows on hover or while uploading */}
              <div className={`absolute inset-0 bg-black/60 rounded-full flex flex-col items-center justify-center transition-opacity border-2 border-indigo-500
                ${isUploadingAvatar ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
              >
                {isUploadingAvatar ? (
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                ) : (
                  <>
                    <Camera className="w-6 h-6 text-white mb-1" />
                    <span className="text-[10px] font-medium text-white uppercase tracking-wider">Change</span>
                  </>
                )}
              </div>
            </div>

            <div className="text-center sm:text-left space-y-1 mt-2 sm:mt-0">
              <h3 className="text-lg font-medium text-slate-200">Profile Picture</h3>
              <p className="text-sm text-slate-400 max-w-xs">
                Click your avatar to upload a new photo. JPG, PNG or WebP, max 5MB.
              </p>
              <div className="pt-2 flex justify-center sm:justify-start gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleAvatarClick}
                  disabled={isUploadingAvatar}
                >
                  {isUploadingAvatar ? (
                    <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Uploading...</>
                  ) : (
                    "Upload new"
                  )}
                </Button>
              </div>
            </div>
          </div>

          <div className="w-full h-px bg-slate-800/60 mb-10" />

          {/* Personal Information */}
          <div className="space-y-6 max-w-lg">
            <h3 className="text-lg font-medium text-slate-200 mb-4">Personal Information</h3>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 ml-1">Full Name</label>
              <Input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                icon={User}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 ml-1">Username</label>
              <Input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                icon={User}
                required
              />
              <p className="text-xs text-slate-500 ml-1 mt-1">This is your public display name.</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 ml-1">Email Address</label>
              <Input type="email" value={email} icon={Mail} disabled />
              <p className="text-xs text-slate-500 ml-1 mt-1">Email cannot be changed for security reasons.</p>
            </div>

            <div className="space-y-2 pt-4">
              <h3 className="text-lg font-medium text-slate-200 mb-2">Security</h3>
              <label className="text-sm font-medium text-slate-300 ml-1">Password</label>
              <div className="flex gap-3">
                <Input type="password" value="••••••••" icon={Lock} disabled />
                <Button type="button" variant="secondary" className="shrink-0" disabled>Change</Button>
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="p-6 border-t border-slate-800/60 bg-[#111827] flex justify-end gap-3 mt-auto">
          <Button type="button" variant="ghost" onClick={() => navigate("/")} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" onClick={handleSave} className="shadow-lg shadow-indigo-500/20" disabled={isLoading}>
            {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}