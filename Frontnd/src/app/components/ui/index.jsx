import React from 'react';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

export const Button = React.forwardRef(({ className, variant = 'primary', size = 'default', isLoading, children, ...props }, ref) => {
  return (
    <button
      ref={ref}
      disabled={isLoading || props.disabled}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-2xl text-[15px] font-[590] transition-[transform,filter,opacity,background-color] duration-[160ms] ease-[var(--ease-out)] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0 [&_svg]:stroke-[1.75]",
        {
          "bg-primary text-primary-foreground hover:bg-primary/90": variant === 'primary',
          "bg-secondary text-secondary-foreground hover:bg-secondary/80": variant === 'secondary',
          "text-foreground hover:bg-secondary/60": variant === 'ghost',
          "bg-destructive/10 text-destructive hover:bg-destructive/15": variant === 'danger',
          "min-h-11 px-4 py-2.5": size === 'default',
          "min-h-11 rounded-xl px-3 text-[15px]": size === 'sm',
          "min-h-12 px-8 text-[17px]": size === 'lg',
          "h-11 w-11 rounded-full p-0": size === 'icon',
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
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-label-secondary [&_svg]:stroke-[1.75]">
          {typeof Icon === 'function' || (typeof Icon === 'object' && Icon.$$typeof) ? (
            React.isValidElement(Icon) ? Icon : <Icon size={18} />
          ) : Icon}
        </div>
      )}
      <input
        type={type}
        className={cn(
          "flex min-h-11 w-full rounded-2xl border-0 bg-input-background px-4 py-3 text-[17px] leading-[22px] text-foreground transition-[transform,filter,opacity,background-color,border-color,box-shadow] duration-[160ms] ease-[var(--ease-out)] file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:bg-input focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-50",
          Icon && "pl-11",
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
          "rounded-full object-cover bg-secondary",
          {
            "w-8 h-8": size === 'sm',
            "w-10 h-10": size === 'default',
            "w-12 h-12": size === 'lg',
            "w-16 h-16": size === 'xl',
            "w-24 h-24": size === '2xl',
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
            "bg-success": status === 'online',
            "bg-slate-500": status === 'offline',
          }
        )} />
      )}
    </div>
  );
};
