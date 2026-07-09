import React from "react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import {
  X,
  Mail,
  User,
  FileText,
  Globe,
} from "lucide-react";
import { FiGithub as Github, FiLinkedin as Linkedin, FiTwitter as Twitter, FiInstagram as Instagram } from "react-icons/fi";
import { Button, Avatar } from "./ui/index";
import { getAvatarUrl } from "../lib/avatar";

export default function UserInfoModal({ profile, onClose }) {
  if (!profile) return null;

  const socialLinks = profile.socialLinks || {};

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
          className="glass-thick w-full max-w-[440px] overflow-hidden rounded-[28px] border border-border/40 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header Cover Banner */}
          <div className="relative h-32 bg-gradient-to-tr from-primary/30 to-accent/20 flex items-center justify-center">
            <button
              onClick={onClose}
              className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-full bg-black/25 text-white backdrop-blur-md transition-all hover:bg-black/40 hover:scale-105"
            >
              <X className="size-4" />
            </button>
            <h2 className="text-[17px] font-semibold text-white drop-shadow-md">
              User Profile
            </h2>
          </div>

          <div className="relative px-6 pb-8 pt-1">
            {/* Avatar floating */}
            <div className="absolute -top-12 left-6">
              <Avatar
                src={getAvatarUrl(profile)}
                size="2xl"
                className="border-4 border-card shadow-lg"
              />
            </div>

            <div className="mt-16 space-y-6">
              {/* Profile details titles */}
              <div>
                <h3 className="text-2xl font-bold leading-7 text-foreground">
                  {profile.fullName}
                </h3>
                <p className="text-[15px] text-label-secondary font-medium mt-0.5">
                  @{profile.username}
                </p>
              </div>

              {/* Bio & email parameters */}
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Mail className="size-5 text-label-secondary stroke-[1.75] mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="text-[11px] text-label-tertiary font-semibold uppercase tracking-wider">Email Address</p>
                    <p className="text-[15px] text-foreground font-medium">{profile.email}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <FileText className="size-5 text-label-secondary stroke-[1.75] mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="text-[11px] text-label-tertiary font-semibold uppercase tracking-wider">About Bio</p>
                    <p className="text-[15px] text-foreground font-medium leading-5 break-words">
                      {profile.about || "No biography provided yet."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Social links grid section */}
              <div className="space-y-3 pt-4 border-t border-border/20">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-label-tertiary">
                  Social Channels
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  {socialLinks.github && (
                    <a
                      href={socialLinks.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-2 bg-secondary/40 rounded-xl hover:bg-secondary/75 hover:scale-[1.02] transition-all text-sm font-medium text-foreground cursor-pointer"
                    >
                      <Github className="size-4 text-label-secondary" />
                      <span>GitHub</span>
                    </a>
                  )}
                  {socialLinks.linkedin && (
                    <a
                      href={socialLinks.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-2 bg-secondary/40 rounded-xl hover:bg-secondary/75 hover:scale-[1.02] transition-all text-sm font-medium text-foreground cursor-pointer"
                    >
                      <Linkedin className="size-4 text-label-secondary" />
                      <span>LinkedIn</span>
                    </a>
                  )}
                  {socialLinks.twitter && (
                    <a
                      href={socialLinks.twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-2 bg-secondary/40 rounded-xl hover:bg-secondary/75 hover:scale-[1.02] transition-all text-sm font-medium text-foreground cursor-pointer"
                    >
                      <Twitter className="size-4 text-label-secondary" />
                      <span>Twitter / X</span>
                    </a>
                  )}
                  {socialLinks.instagram && (
                    <a
                      href={socialLinks.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-2 bg-secondary/40 rounded-xl hover:bg-secondary/75 hover:scale-[1.02] transition-all text-sm font-medium text-foreground cursor-pointer"
                    >
                      <Instagram className="size-4 text-label-secondary" />
                      <span>Instagram</span>
                    </a>
                  )}
                  {socialLinks.website && (
                    <a
                      href={socialLinks.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-2 bg-secondary/40 rounded-xl hover:bg-secondary/75 hover:scale-[1.02] transition-all text-sm font-medium text-foreground cursor-pointer col-span-2 justify-center"
                    >
                      <Globe className="size-4 text-label-secondary" />
                      <span>Website</span>
                    </a>
                  )}
                  {!Object.values(socialLinks).some(Boolean) && (
                    <p className="text-xs italic text-label-tertiary col-span-2">No social channels configured.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Motion.div>
      </Motion.div>
    </AnimatePresence>
  );
}
