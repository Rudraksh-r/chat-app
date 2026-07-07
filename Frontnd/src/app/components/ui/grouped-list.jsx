import React from "react";
import { cn } from "../../lib/utils";

export function GroupedList({ className, children, ...props }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl bg-card text-card-foreground",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function GroupedListRow({ className, children, interactive = false, ...props }) {
  const Comp = interactive ? "button" : "div";

  return (
    <Comp
      className={cn(
        "flex min-h-[52px] w-full items-center justify-between gap-3 px-4 py-3 text-left text-[17px] leading-[22px] transition-colors",
        interactive && "active:scale-[0.99] hover:bg-secondary/60",
        className,
      )}
      {...props}
    >
      {children}
    </Comp>
  );
}

export function GroupedListSeparator({ className }) {
  return <div className={cn("ml-4 h-px bg-border", className)} />;
}
