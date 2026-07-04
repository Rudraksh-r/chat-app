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
          "inline-flex items-center justify-center rounded-xl font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50",
          {
            "bg-primary text-primary-foreground hover:opacity-90 shadow-sm shadow-primary/20": variant === "primary",
            "bg-secondary text-secondary-foreground hover:opacity-90 border border-border": variant === "secondary",
            "hover:bg-secondary/40 text-foreground": variant === "ghost",
            "bg-destructive/10 text-destructive hover:bg-destructive/20": variant === "danger",
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
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {icon}
          </div>
        )}
        <input
          type={type}
          className={cn(
            "flex h-10 w-full rounded-xl border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 transition-all",
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
          "rounded-full object-cover bg-secondary border border-border",
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
            "absolute bottom-0 right-0 block rounded-full ring-2 ring-background",
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
