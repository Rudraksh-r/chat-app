import React, { useRef, useState } from "react";
import { useNavigate } from "react-router";
import { AnimatePresence, motion as Motion } from "framer-motion";
import {
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Lock,
  Mail,
  User,
  X,
  FileText,
  Globe,
  Link as LinkIcon,
} from "lucide-react";
import { FiGithub as Github, FiLinkedin as Linkedin, FiTwitter as Twitter, FiInstagram as Instagram } from "react-icons/fi";
import { Button, Input, Avatar } from "../components/ui/index";
import {
  GroupedList,
  GroupedListRow,
  GroupedListSeparator,
} from "../components/ui/grouped-list";
import { toast } from "sonner";
import useAuthStore from "../store/authStore";
import useProfileStore from "../store/profileStore";
import { getAvatarUrl } from "../lib/avatar";

const ABOUT_SUGGESTIONS = [
  "Building awesome web applications.",
  "Coffee, code and creativity.",
  "Always learning something new.",
  "Full‑stack developer in progress.",
  "Open to collaboration.",
];

export function Profile() {
  const navigate = useNavigate();
  const { authUser, logout, updateProfile, updateAvatar, changePassword, isLoading } =
    useAuthStore();
  const { updateProfileDetails, isLoadingProfile } = useProfileStore();

  const [fullName, setFullName] = useState(authUser?.fullName || "");
  const [username, setUsername] = useState(authUser?.username || "");
  const [email] = useState(authUser?.email || "");
  const [about, setAbout] = useState(authUser?.about || "");
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [editingField, setEditingField] = useState(null);
  const [editingValue, setEditingValue] = useState("");
  const fileInputRef = useRef(null);

  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [isSocialLinksOpen, setIsSocialLinksOpen] = useState(false);
  const [tempSocials, setTempSocials] = useState({
    github: authUser?.socialLinks?.github || "",
    linkedin: authUser?.socialLinks?.linkedin || "",
    twitter: authUser?.socialLinks?.twitter || "",
    instagram: authUser?.socialLinks?.instagram || "",
    website: authUser?.socialLinks?.website || "",
  });

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }

    setAvatarPreview(URL.createObjectURL(file));
    await updateAvatar(file);
  };

  const openEditor = (field) => {
    setEditingField(field);
    if (field === "fullName") setEditingValue(fullName);
    else if (field === "username") setEditingValue(username);
    else if (field === "about") setEditingValue(about);
  };

  const saveEditor = async () => {
    const nextValue = editingValue.trim();
    if (editingField === "about") {
      if (nextValue.length > 300) {
        toast.error("Bio cannot exceed 300 characters");
        return;
      }
      setAbout(nextValue);
      await updateProfileDetails({ about: nextValue });
    } else {
      const nextProfile = {
        fullName: editingField === "fullName" ? nextValue : fullName,
        username: editingField === "username" ? nextValue : username,
      };

      if (editingField === "fullName") setFullName(nextValue);
      if (editingField === "username") setUsername(nextValue);
      await updateProfile(nextProfile);
    }
    setEditingField(null);
  };

  const openSocialLinksModal = () => {
    setTempSocials({
      github: authUser?.socialLinks?.github || "",
      linkedin: authUser?.socialLinks?.linkedin || "",
      twitter: authUser?.socialLinks?.twitter || "",
      instagram: authUser?.socialLinks?.instagram || "",
      website: authUser?.socialLinks?.website || "",
    });
    setIsSocialLinksOpen(true);
  };

  const saveSocialLinks = async () => {
    const success = await updateProfileDetails({ socialLinks: tempSocials });
    if (success) {
      setIsSocialLinksOpen(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  if (!authUser) return null;

  const displayAvatar = avatarPreview || getAvatarUrl(authUser);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-4 pb-10 pt-4">
        <header className="relative flex min-h-12 items-center justify-center">
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-0 text-primary"
            onClick={() => navigate("/")}
          >
            <ChevronLeft className="size-6" />
          </Button>
          <h1 className="text-xl font-semibold leading-[25px]">
            Account Settings
          </h1>
        </header>

        <Motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-1 flex-col"
        >
          <div className="flex flex-col items-center pb-8 pt-6 text-center">
            <button
              type="button"
              className="relative rounded-full active:scale-[0.98]"
              onClick={() => fileInputRef.current?.click()}
            >
              <Avatar src={displayAvatar} size="2xl" />
              <span className="absolute bottom-1 right-1 flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground ring-4 ring-background">
                {isLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Camera className="size-4" />
                )}
              </span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
            <h2 className="mt-4 text-[22px] font-bold leading-7">
              {fullName || authUser.username}
            </h2>
            <p className="text-[15px] leading-5 text-label-secondary">
              @{username}
            </p>
          </div>

          <section className="space-y-6">
            <GroupedList>
              <GroupedListRow interactive onClick={() => openEditor("fullName")}>
                <div className="flex items-center gap-3">
                  <User className="size-5 text-label-secondary stroke-[1.75]" />
                  <span>Full Name</span>
                </div>
                <div className="flex min-w-0 items-center gap-2 text-label-secondary">
                  <span className="truncate text-[15px] leading-5">
                    {fullName}
                  </span>
                  <ChevronRight className="size-4 shrink-0" />
                </div>
              </GroupedListRow>
              <GroupedListSeparator className="ml-12" />
              <GroupedListRow interactive onClick={() => openEditor("username")}>
                <div className="flex items-center gap-3">
                  <User className="size-5 text-label-secondary stroke-[1.75]" />
                  <span>Username</span>
                </div>
                <div className="flex min-w-0 items-center gap-2 text-label-secondary">
                  <span className="truncate text-[15px] leading-5">
                    @{username}
                  </span>
                  <ChevronRight className="size-4 shrink-0" />
                </div>
              </GroupedListRow>
              <GroupedListSeparator className="ml-12" />
              <GroupedListRow>
                <div className="flex items-center gap-3">
                  <Mail className="size-5 text-label-secondary stroke-[1.75]" />
                  <span>Email</span>
                </div>
                <span className="min-w-0 truncate text-right text-[15px] leading-5 text-label-secondary">
                  {email}
                </span>
              </GroupedListRow>
            </GroupedList>

            <GroupedList>
              <GroupedListRow interactive onClick={() => openEditor("about")}>
                <div className="flex items-center gap-3">
                  <FileText className="size-5 text-label-secondary stroke-[1.75]" />
                  <span>About Bio</span>
                </div>
                <div className="flex min-w-0 items-center gap-2 text-label-secondary">
                  <span className="truncate text-[15px] leading-5 max-w-[200px]">
                    {about || "No bio set"}
                  </span>
                  <ChevronRight className="size-4 shrink-0" />
                </div>
              </GroupedListRow>
            </GroupedList>

            <GroupedList>
              <GroupedListRow interactive onClick={() => openSocialLinksModal()}>
                <div className="flex items-center gap-3">
                  <Globe className="size-5 text-label-secondary stroke-[1.75]" />
                  <span>Social Links</span>
                </div>
                <div className="flex min-w-0 items-center gap-2 text-label-secondary">
                  <span className="truncate text-[15px] leading-5">
                    Configure
                  </span>
                  <ChevronRight className="size-4 shrink-0" />
                </div>
              </GroupedListRow>
            </GroupedList>

            <GroupedList>
              <GroupedListRow interactive onClick={() => {
                setOldPassword("");
                setNewPassword("");
                setIsChangePasswordOpen(true);
              }}>
                <div className="flex items-center gap-3 text-primary">
                  <Lock className="size-5 stroke-[1.75]" />
                  <span>Change Password</span>
                </div>
                <ChevronRight className="size-4 shrink-0 text-label-secondary" />
              </GroupedListRow>
            </GroupedList>

            <GroupedList>
              <GroupedListRow
                interactive
                onClick={handleLogout}
                className="justify-center text-destructive"
              >
                Sign Out
              </GroupedListRow>
            </GroupedList>
          </section>
        </Motion.section>
      </div>

      <AnimatePresence>
        {editingField && (
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-3 sm:items-center"
            onClick={() => setEditingField(null)}
          >
            <Motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              className="glass-thick mb-3 w-full max-w-[420px] overflow-hidden rounded-t-[28px] sm:mb-0 sm:rounded-[28px]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto mt-2 h-1 w-9 rounded-full bg-label-tertiary/40" />
              <div className="hairline flex min-h-12 items-center justify-between px-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-primary"
                  onClick={() => setEditingField(null)}
                >
                  <X className="size-4" />
                  Cancel
                </Button>
                <h2 className="text-[17px] font-semibold leading-[22px]">
                  {editingField === "fullName" ? "Full Name" : editingField === "username" ? "Username" : "About Bio"}
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  className="font-semibold text-primary"
                  onClick={saveEditor}
                  disabled={isLoading || isLoadingProfile}
                >
                  {isLoading || isLoadingProfile ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Check className="size-4" />
                  )}
                  Save
                </Button>
              </div>
              <div className="p-5">
                {editingField === "about" ? (
                  <div className="space-y-4">
                    <textarea
                      autoFocus
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") setEditingField(null);
                      }}
                      rows={4}
                      className="w-full text-[15px] bg-input/50 text-foreground rounded-lg px-3 py-2 outline-none border border-border focus:border-primary transition-colors resize-none"
                      placeholder="Tell us about yourself..."
                    />
                    <div className="flex justify-between items-center text-xs text-label-secondary px-1">
                      <span>Limit bio to 300 characters</span>
                      <span className={editingValue.length > 300 ? "text-destructive font-semibold" : ""}>
                        {editingValue.length}/300
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-xs text-label-secondary font-medium pl-1">Bio Suggestions</p>
                      <div className="flex flex-wrap gap-2">
                        {ABOUT_SUGGESTIONS.map((suggestion) => (
                          <button
                            key={suggestion}
                            type="button"
                            onClick={() => setEditingValue(suggestion)}
                            className="text-xs px-2.5 py-1.5 rounded-full border border-border bg-card text-foreground hover:bg-secondary transition-all cursor-pointer text-left"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <Input
                    autoFocus
                    value={editingValue}
                    onChange={(e) => setEditingValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveEditor();
                      if (e.key === "Escape") setEditingField(null);
                    }}
                  />
                )}
              </div>
            </Motion.div>
          </Motion.div>
        )}

        {isChangePasswordOpen && (
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-3 sm:items-center"
            onClick={() => {
              setIsChangePasswordOpen(false);
              setOldPassword("");
              setNewPassword("");
            }}
          >
            <Motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              className="glass-thick mb-3 w-full max-w-[420px] overflow-hidden rounded-t-[28px] sm:mb-0 sm:rounded-[28px]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto mt-2 h-1 w-9 rounded-full bg-label-tertiary/40" />
              <div className="hairline flex min-h-12 items-center justify-between px-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-primary"
                  onClick={() => {
                    setIsChangePasswordOpen(false);
                    setOldPassword("");
                    setNewPassword("");
                  }}
                >
                  <X className="size-4" />
                  Cancel
                </Button>
                <h2 className="text-[17px] font-semibold leading-[22px]">
                  Change Password
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  className="font-semibold text-primary"
                  onClick={async () => {
                    if (!oldPassword || !newPassword) {
                      toast.error("Please fill in both fields");
                      return;
                    }
                    if (newPassword.length < 6) {
                      toast.error("New password must be at least 6 characters");
                      return;
                    }
                    const success = await changePassword(oldPassword, newPassword);
                    if (success) {
                      setIsChangePasswordOpen(false);
                      setOldPassword("");
                      setNewPassword("");
                    }
                  }}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Check className="size-4" />
                  )}
                  Save
                </Button>
              </div>
              <div className="p-5 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs text-label-secondary font-medium pl-1">Current Password</label>
                  <Input
                    type="password"
                    placeholder="Enter current password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-label-secondary font-medium pl-1">New Password</label>
                  <Input
                    type="password"
                    placeholder="Enter new password (min. 6 characters)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
              </div>
            </Motion.div>
          </Motion.div>
        )}

        {isSocialLinksOpen && (
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-3 sm:items-center"
            onClick={() => setIsSocialLinksOpen(false)}
          >
            <Motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              className="glass-thick mb-3 w-full max-w-[440px] overflow-hidden rounded-t-[28px] sm:mb-0 sm:rounded-[28px]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto mt-2 h-1 w-9 rounded-full bg-label-tertiary/40" />
              <div className="hairline flex min-h-12 items-center justify-between px-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-primary"
                  onClick={() => setIsSocialLinksOpen(false)}
                >
                  <X className="size-4" />
                  Cancel
                </Button>
                <h2 className="text-[17px] font-semibold leading-[22px]">
                  Social Links
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  className="font-semibold text-primary"
                  onClick={saveSocialLinks}
                  disabled={isLoadingProfile}
                >
                  {isLoadingProfile ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Check className="size-4" />
                  )}
                  Save
                </Button>
              </div>
              <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
                <div className="space-y-1">
                  <label className="text-xs text-label-secondary font-medium pl-1 flex items-center gap-1.5">
                    <Github className="size-3.5" /> GitHub
                  </label>
                  <Input
                    placeholder="https://github.com/username"
                    value={tempSocials.github}
                    onChange={(e) => setTempSocials({ ...tempSocials, github: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-label-secondary font-medium pl-1 flex items-center gap-1.5">
                    <Linkedin className="size-3.5" /> LinkedIn
                  </label>
                  <Input
                    placeholder="https://linkedin.com/in/username"
                    value={tempSocials.linkedin}
                    onChange={(e) => setTempSocials({ ...tempSocials, linkedin: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-label-secondary font-medium pl-1 flex items-center gap-1.5">
                    <Twitter className="size-3.5" /> Twitter / X
                  </label>
                  <Input
                    placeholder="https://x.com/username"
                    value={tempSocials.twitter}
                    onChange={(e) => setTempSocials({ ...tempSocials, twitter: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-label-secondary font-medium pl-1 flex items-center gap-1.5">
                    <Instagram className="size-3.5" /> Instagram
                  </label>
                  <Input
                    placeholder="https://instagram.com/username"
                    value={tempSocials.instagram}
                    onChange={(e) => setTempSocials({ ...tempSocials, instagram: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-label-secondary font-medium pl-1 flex items-center gap-1.5">
                    <LinkIcon className="size-3.5" /> Website
                  </label>
                  <Input
                    placeholder="https://yourwebsite.com"
                    value={tempSocials.website}
                    onChange={(e) => setTempSocials({ ...tempSocials, website: e.target.value })}
                  />
                </div>
              </div>
            </Motion.div>
          </Motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
