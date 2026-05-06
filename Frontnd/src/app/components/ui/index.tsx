import React from "react";
import { cn } from "../../lib/utils";

// --- Button ---
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg" | "icon";
}
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-xl font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:pointer-events-none disabled:opacity-50",
          {
            "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm shadow-indigo-500/20": variant === "primary",
            "bg-slate-800 text-slate-100 hover:bg-slate-700 border border-slate-700": variant === "secondary",
            "hover:bg-slate-800 text-slate-300 hover:text-slate-100": variant === "ghost",
            "bg-red-500/10 text-red-500 hover:bg-red-500/20": variant === "danger",
            "h-9 px-4 text-sm": size === "sm",
            "h-10 px-4 py-2": size === "md",
            "h-11 px-8 text-lg": size === "lg",
            "h-10 w-10 p-0 rounded-full": size === "icon",
          },
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

// --- Input ---
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
}
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, icon, type, ...props }, ref) => {
    return (
      <div className="relative w-full">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
            {icon}
          </div>
        )}
        <input
          type={type}
          className={cn(
            "flex h-10 w-full rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-2 text-sm text-slate-100 ring-offset-slate-950 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 transition-all",
            icon && "pl-10",
            className
          )}
          ref={ref}
          {...props}
        />
      </div>
    );
  }
);
Input.displayName = "Input";

// --- Avatar ---
export const Avatar = ({ src, alt, status, size = "md" }: { src?: string, alt?: string, status?: "online" | "offline", size?: "sm" | "md" | "lg" | "xl" }) => {
  return (
    <div className="relative inline-block shrink-0">
      <img
        src={src || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80"}
        alt={alt}
        className={cn(
          "rounded-full object-cover bg-slate-800",
          {
            "w-8 h-8": size === "sm",
            "w-10 h-10": size === "md",
            "w-12 h-12": size === "lg",
            "w-16 h-16": size === "xl",
          }
        )}
      />
      {status && (
        <span
          className={cn(
            "absolute bottom-0 right-0 block rounded-full ring-2 ring-gray-900",
            status === "online" ? "bg-green-500" : "bg-slate-500",
            {
              "w-2.5 h-2.5": size === "sm",
              "w-3 h-3": size === "md",
              "w-3.5 h-3.5": size === "lg",
              "w-4 h-4": size === "xl",
            }
          )}
        />
      )}
    </div>
  );
};
