import React, { useEffect, useState } from "react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import {
  X,
  MessageSquare,
  Info,
  ShieldAlert,
  Globe,
  Loader2,
} from "lucide-react";
import { FiGithub as Github, FiLinkedin as Linkedin, FiTwitter as Twitter, FiInstagram as Instagram } from "react-icons/fi";
import { Button, Avatar } from "./ui/index";
import useProfileStore from "../store/profileStore";
import useBlockStore from "../store/blockStore";
import useChatStore from "../store/chatStore";
import { getAvatarUrl } from "../lib/avatar";

export default function ProfileModal({ userId, onClose, onOpenInfo }) {
  const [profile, setProfile] = useState(null);
  const { getUserProfile, isLoadingProfile } = useProfileStore();
  const { blockUser, unblockUser, isUserBlocked, isLoadingBlocks } = useBlockStore();
  const { createConversation } = useChatStore();

  useEffect(() => {
    if (userId) {
      getUserProfile(userId).then(setProfile);
    }
  }, [userId, getUserProfile]);

  if (!userId) return null;

  const isBlocked = isUserBlocked(userId);

  const handleBlockToggle = async () => {
    if (isBlocked) {
      await unblockUser(userId);
    } else {
      await blockUser(userId);
    }
    // Refresh local profile state
    const p = await getUserProfile(userId);
    setProfile(p);
  };

  const handleOpenChat = async () => {
    if (profile) {
      // In chatStore, createConversation takes the receiverId to open/create a convo
      await createConversation(profile._id);
      onClose();
    }
  };

  const socialLinks = profile?.socialLinks || {};
  const hasSocials = Object.values(socialLinks).some((link) => !!link);

  return (
    <AnimatePresence>
      <Motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
        onClick={onClose}
      >
        <Motion.div
          initial={{ scale: 0.95, y: 15, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.95, y: 15, opacity: 0 }}
          className="glass-thick w-full max-w-[360px] overflow-hidden rounded-[28px] border border-border/40 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header Cover Banner */}
          <div className="relative h-24 bg-gradient-to-tr from-primary/30 to-accent/20">
            <button
              onClick={onClose}
              className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-full bg-black/25 text-white backdrop-blur-md transition-all hover:bg-black/40 hover:scale-105"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="relative px-6 pb-6 pt-1">
            {/* Avatar positioned floating over banner */}
            <div className="absolute -top-12 left-6">
              <Avatar
                src={profile ? getAvatarUrl(profile) : ""}
                size="xl"
                className="border-4 border-card shadow-lg"
              />
            </div>

            <div className="mt-14 space-y-4">
              {isLoadingProfile && !profile ? (
                <div className="flex h-28 items-center justify-center text-label-secondary">
                  <Loader2 className="size-6 animate-spin text-primary" />
                </div>
              ) : (
                <>
                  {/* User Details */}
                  <div>
                    <h2 className="text-xl font-bold leading-7 text-foreground">
                      {profile?.fullName || "User"}
                    </h2>
                    <p className="text-sm text-label-secondary font-medium">
                      @{profile?.username || "username"}
                    </p>
                  </div>

                  {/* Biography */}
                  <div className="text-[15px] leading-5 text-label-secondary min-h-[40px] break-words">
                    {profile?.about || "No bio available."}
                  </div>

                  {/* Social media Links */}
                  {hasSocials && (
                    <div className="flex gap-3.5 text-label-secondary pt-1">
                      {socialLinks.github && (
                        <a
                          href={socialLinks.github}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-primary transition-colors hover:scale-105"
                        >
                          <Github className="size-5" />
                        </a>
                      )}
                      {socialLinks.linkedin && (
                        <a
                          href={socialLinks.linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-primary transition-colors hover:scale-105"
                        >
                          <Linkedin className="size-5" />
                        </a>
                      )}
                      {socialLinks.twitter && (
                        <a
                          href={socialLinks.twitter}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-primary transition-colors hover:scale-105"
                        >
                          <Twitter className="size-5" />
                        </a>
                      )}
                      {socialLinks.instagram && (
                        <a
                          href={socialLinks.instagram}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-primary transition-colors hover:scale-105"
                        >
                          <Instagram className="size-5" />
                        </a>
                      )}
                      {socialLinks.website && (
                        <a
                          href={socialLinks.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-primary transition-colors hover:scale-105"
                        >
                          <Globe className="size-5" />
                        </a>
                      )}
                    </div>
                  )}

                  {/* Actions buttons panel */}
                  <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border/20">
                    <Button
                      variant="secondary"
                      className="flex flex-col h-14 items-center justify-center gap-1 text-[11px] rounded-xl cursor-pointer hover:bg-secondary/80"
                      onClick={handleOpenChat}
                    >
                      <MessageSquare className="size-4 text-primary" />
                      <span>Message</span>
                    </Button>

                    <Button
                      variant="secondary"
                      className="flex flex-col h-14 items-center justify-center gap-1 text-[11px] rounded-xl cursor-pointer hover:bg-secondary/80"
                      onClick={() => {
                        onOpenInfo(profile);
                        onClose();
                      }}
                    >
                      <Info className="size-4 text-primary" />
                      <span>Info</span>
                    </Button>

                    <Button
                      variant="secondary"
                      className={`flex flex-col h-14 items-center justify-center gap-1 text-[11px] rounded-xl cursor-pointer ${
                        isBlocked 
                          ? "text-success hover:bg-success/15 hover:text-success" 
                          : "text-destructive hover:bg-destructive/15 hover:text-destructive"
                      }`}
                      onClick={handleBlockToggle}
                      disabled={isLoadingBlocks}
                    >
                      {isLoadingBlocks ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <ShieldAlert className="size-4" />
                      )}
                      <span>{isBlocked ? "Unblock" : "Block"}</span>
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </Motion.div>
      </Motion.div>
    </AnimatePresence>
  );
}
