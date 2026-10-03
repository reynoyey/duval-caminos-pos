import * as React from "react";
import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-10 w-full min-w-0 rounded-lg border border-input bg-background/60 px-3 py-1 text-sm text-foreground shadow-xs transition-[color,box-shadow,border] outline-none placeholder:text-muted-foreground/70",
        "focus-visible:border-primary/70 focus-visible:ring-[3px] focus-visible:ring-primary/20",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-16 w-full rounded-lg border border-input bg-background/60 px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow,border] placeholder:text-muted-foreground/70",
        "focus-visible:border-primary/70 focus-visible:ring-[3px] focus-visible:ring-primary/20",
        className,
      )}
      {...props}
    />
  );
}

export { Input, Textarea };
