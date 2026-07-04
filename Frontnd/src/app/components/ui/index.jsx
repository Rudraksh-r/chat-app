import React from 'react';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

export const Button = React.forwardRef(({ className, variant = 'primary', size = 'default', isLoading, children, ...props }, ref) => {
  return (
    <button
      ref={ref}
      disabled={isLoading || props.disabled}
      className={cn(
        "inline-flex items-center justify-center rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50",
        {
          "bg-primary text-primary-foreground hover:opacity-90 shadow-sm shadow-primary/20": variant === 'primary',
          "bg-secondary text-secondary-foreground hover:opacity-90 border border-border": variant === 'secondary',
          "hover:bg-secondary/40 text-foreground": variant === 'ghost',
          "bg-destructive/10 text-destructive hover:bg-destructive/20": variant === 'danger',
          "h-10 px-4 py-2": size === 'default',
          "h-9 rounded-md px-3": size === 'sm',
          "h-11 rounded-lg px-8": size === 'lg',
          "h-10 w-10": size === 'icon',
        },
        className
      )}
      {...props}
    >
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
});
Button.displayName = "Button";

export const Input = React.forwardRef(({ className, type, icon: Icon, ...props }, ref) => {
  return (
    <div className="relative">
      {Icon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          {typeof Icon === 'function' || (typeof Icon === 'object' && Icon.$$typeof) ? (
            React.isValidElement(Icon) ? Icon : <Icon size={18} />
          ) : Icon}
        </div>
      )}
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-50",
          Icon && "pl-10",
          className
        )}
        ref={ref}
        {...props}
      />
    </div>
  );
});
Input.displayName = "Input";

export const Avatar = ({ src, alt, size = 'default', status, className }) => {
  return (
    <div className={cn("relative inline-block", className)}>
      <img
        src={src || "https://i.pravatar.cc/150"}
        alt={alt || "Avatar"}
        className={cn(
          "rounded-full object-cover bg-secondary border border-border",
          {
            "w-8 h-8": size === 'sm',
            "w-10 h-10": size === 'default',
            "w-12 h-12": size === 'lg',
            "w-16 h-16": size === 'xl',
          }
        )}
      />
      {status && (
        <span className={cn(
          "absolute bottom-0 right-0 block rounded-full ring-2 ring-background",
          {
            "w-2.5 h-2.5": size === 'sm',
            "w-3 h-3": size === 'default',
            "w-3.5 h-3.5": size === 'lg' || size === 'xl',
            "bg-green-500": status === 'online',
            "bg-slate-500": status === 'offline',
          }
        )} />
      )}
    </div>
  );
};
