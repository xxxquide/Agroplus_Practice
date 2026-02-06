import * as React from "react";
import { cn } from "@/lib/utils";

export const GlassPanel = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("glass-panel rounded-panel", className)}
    {...props}
  />
));
GlassPanel.displayName = "GlassPanel";

export const GlassCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("glass-card rounded-card", className)} {...props} />
));
GlassCard.displayName = "GlassCard";
