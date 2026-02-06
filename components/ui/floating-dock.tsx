import * as React from "react";
import { cn } from "@/lib/utils";

export function FloatingDock({
  className,
  children
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "glass-card flex flex-wrap items-center justify-center gap-2 rounded-full px-3 py-2 shadow-glass",
        className
      )}
    >
      {children}
    </div>
  );
}
