import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

function Label({ className, ...props }: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      className={cn("text-xs font-semibold tracking-wide text-muted-foreground uppercase", className)}
      {...props}
    />
  );
}

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase",
  {
    variants: {
      variant: {
        default: "bg-primary/15 text-primary ring-1 ring-primary/30",
        secondary: "bg-secondary text-secondary-foreground",
        success: "bg-success/15 text-success ring-1 ring-success/30",
        destructive: "bg-destructive/15 text-destructive ring-1 ring-destructive/30",
        outline: "ring-1 ring-border text-muted-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

function Badge({ className, variant, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Label, Badge, badgeVariants };
