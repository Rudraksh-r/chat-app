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
} from "lucide-react";
import { Button, Input, Avatar } from "../components/ui/index";
import {
  GroupedList,
  GroupedListRow,
  GroupedListSeparator,
} from "../components/ui/grouped-list";
import { toast } from "sonner";
import useAuthStore from "../store/authStore";
import { getAvatarUrl } from "../lib/avatar";

export function Profile() {
  const navigate = useNavigate();
  const { authUser, logout, updateProfile, updateAvatar, isLoading } =
    useAuthStore();

  const [fullName, setFullName] = useState(authUser?.fullName || "");
  const [username, setUsername] = useState(authUser?.username || "");
  const [email] = useState(authUser?.email || "");
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [editingField, setEditingField] = useState(null);
  const [editingValue, setEditingValue] = useState("");
  const fileInputRef = useRef(null);

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
    setEditingValue(field === "fullName" ? fullName : username);
  };

  const saveEditor = async () => {
    const nextValue = editingValue.trim();
    if (!nextValue || !editingField) return;

    const nextProfile = {
      fullName: editingField === "fullName" ? nextValue : fullName,
      username: editingField === "username" ? nextValue : username,
    };

    if (editingField === "fullName") setFullName(nextValue);
    if (editingField === "username") setUsername(nextValue);
    await updateProfile(nextProfile);
    setEditingField(null);
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

          <section className="space-y-8">
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
              <GroupedListRow className="text-label-tertiary">
                <div className="flex items-center gap-3">
                  <Lock className="size-5 stroke-[1.75]" />
                  <span>Change Password</span>
                </div>
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
                  {editingField === "fullName" ? "Full Name" : "Username"}
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  className="font-semibold text-primary"
                  onClick={saveEditor}
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
              <div className="p-5">
                <Input
                  autoFocus
                  value={editingValue}
                  onChange={(e) => setEditingValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveEditor();
                    if (e.key === "Escape") setEditingField(null);
                  }}
                />
              </div>
            </Motion.div>
          </Motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
