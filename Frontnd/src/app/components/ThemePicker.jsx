import React from "react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import { X, Check } from "lucide-react";
import useThemeStore from "../store/themeStore";

export const CHAT_THEMES = {
  default: {
    name: "Default",
    bubbleColor: "var(--primary)",
    backgroundColor: "var(--background)",
    accentColor: "var(--primary)",
    wallpaper: "none",
    preview: "bg-[#007AFF]",
  },
  dark: {
    name: "Dark",
    bubbleColor: "#2C2C2E",
    backgroundColor: "#1C1C1E",
    accentColor: "#0A84FF",
    wallpaper: "none",
    preview: "bg-[#1C1C1E] border border-border/20",
  },
  forest: {
    name: "Forest",
    bubbleColor: "#2D5A27",
    backgroundColor: "#1B3B18",
    accentColor: "#4CAF50",
    wallpaper: "linear-gradient(135deg, #1B3B18 0%, #0D200C 100%)",
    preview: "bg-[#2D5A27]",
  },
  ocean: {
    name: "Ocean",
    bubbleColor: "#005F73",
    backgroundColor: "#0A192F",
    accentColor: "#00B4D8",
    wallpaper: "linear-gradient(135deg, #0A192F 0%, #023E8A 100%)",
    preview: "bg-[#005F73]",
  },
  purple: {
    name: "Purple",
    bubbleColor: "#6A0DAD",
    backgroundColor: "#1A0033",
    accentColor: "#A020F0",
    wallpaper: "linear-gradient(135deg, #1A0033 0%, #3B0066 100%)",
    preview: "bg-[#6A0DAD]",
  },
  sunset: {
    name: "Sunset",
    bubbleColor: "#D35400",
    backgroundColor: "#2E1A47",
    accentColor: "#E67E22",
    wallpaper: "linear-gradient(135deg, #2E1A47 0%, #B83B5E 50%, #F08A5D 100%)",
    preview: "bg-[#D35400]",
  },
  amoled: {
    name: "AMOLED",
    bubbleColor: "#121212",
    backgroundColor: "#000000",
    accentColor: "#FFFFFF",
    wallpaper: "none",
    preview: "bg-[#000000] border border-white/20",
  },
};

export default function ThemePicker({ chatId, onClose }) {
  const { chatThemes, setChatTheme } = useThemeStore();
  const currentTheme = chatThemes[chatId] || "default";

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
          className="glass-thick w-full max-w-[360px] overflow-hidden rounded-[28px] border border-border/40 shadow-2xl p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[17px] font-semibold text-foreground">
              Chat Wallpaper & Theme
            </h2>
            <button
              onClick={onClose}
              className="flex size-7 items-center justify-center rounded-full bg-secondary/60 text-foreground transition-all hover:bg-secondary hover:scale-105 cursor-pointer"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            {Object.entries(CHAT_THEMES).map(([themeKey, config]) => {
              const isActive = currentTheme === themeKey;
              return (
                <button
                  key={themeKey}
                  onClick={() => {
                    setChatTheme(chatId, themeKey);
                  }}
                  className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all hover:scale-[1.02] border ${
                    isActive
                      ? "border-primary bg-primary/10"
                      : "border-border/30 bg-secondary/35 hover:bg-secondary/60"
                  }`}
                >
                  <div className={`size-6 rounded-full shrink-0 flex items-center justify-center ${config.preview}`}>
                    {isActive && <Check className="size-3 text-white" />}
                  </div>
                  <span className="text-[14px] font-medium text-foreground">
                    {config.name}
                  </span>
                </button>
              );
            })}
          </div>
        </Motion.div>
      </Motion.div>
    </AnimatePresence>
  );
}
