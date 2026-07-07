import React from "react";
import { Search } from "lucide-react";
import { cn } from "../../lib/utils";

export const SearchField = React.forwardRef(({ className, ...props }, ref) => (
  <div className={cn("relative w-full", className)}>
    <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-label-secondary stroke-[1.75]" />
    <input
      ref={ref}
      type="search"
      className="h-11 w-full rounded-full border-0 bg-secondary/70 pl-10 pr-4 text-[17px] leading-[22px] text-foreground outline-none transition-all placeholder:text-muted-foreground focus:bg-input focus:ring-2 focus:ring-primary/40"
      {...props}
    />
  </div>
));

SearchField.displayName = "SearchField";
