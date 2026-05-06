import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { motion } from "framer-motion";
import { User, Mail, Lock, Camera, ArrowLeft, Save, LogOut, Loader2 } from "lucide-react";
import { Button, Input, Avatar } from "../components/ui/index";
import { toast } from "sonner";
import useAuthStore from "../store/authStore";

export function Profile() {
  const navigate = useNavigate();
  const { authUser, logout, updateProfile, isLoading } = useAuthStore();
  
  const [fullName, setFullName] = useState(authUser?.fullName || "");
  const [username, setUsername] = useState(authUser?.username || "");
  const [email, setEmail] = useState(authUser?.email || "");
  const [password, setPassword] = useState("••••••••");

  useEffect(() => {
    if (authUser) {
      setFullName(authUser.fullName || "");
      setUsername(authUser.username || "");
      setEmail(authUser.email || "");
    }
  }, [authUser]);

  const handleSave = async (e) => {
    e.preventDefault();
    const success = await updateProfile({ fullName, username });
    if (success) {
      // Option to navigate back or just show toast (updateProfile already shows toast)
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  if (!authUser) return null;

  return (
    <div className="min-h-screen w-full bg-[#0F172A] flex justify-center p-4 py-8 sm:py-12">
      {/* Background decoration */}
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
            <div className="relative group cursor-pointer shrink-0">
              <Avatar src={authUser.avatar} size="xl" />
              <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity border-2 border-indigo-500">
                <Camera className="w-6 h-6 text-white mb-1" />
                <span className="text-[10px] font-medium text-white uppercase tracking-wider">Change</span>
              </div>
            </div>
            <div className="text-center sm:text-left space-y-1 mt-2 sm:mt-0">
              <h3 className="text-lg font-medium text-slate-200">Profile Picture</h3>
              <p className="text-sm text-slate-400 max-w-xs">Upload a new avatar. Larger image will be resized automatically.</p>
              <div className="pt-2 flex justify-center sm:justify-start gap-2">
                 <Button type="button" variant="secondary" size="sm" disabled>Upload new</Button>
                 <Button type="button" variant="ghost" size="sm" className="text-red-400 hover:text-red-300 hover:bg-red-500/10" disabled>Remove</Button>
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
              <Input 
                type="email" 
                value={email}
                icon={Mail} 
                disabled
              />
              <p className="text-xs text-slate-500 ml-1 mt-1">Email cannot be changed for security reasons.</p>
            </div>

            <div className="space-y-2 pt-4">
              <h3 className="text-lg font-medium text-slate-200 mb-2">Security</h3>
              <label className="text-sm font-medium text-slate-300 ml-1">Password</label>
              <div className="flex gap-3">
                <Input 
                  type="password" 
                  value={password}
                  icon={Lock} 
                  disabled
                />
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