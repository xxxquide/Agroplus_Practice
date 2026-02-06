import * as React from "react";
import { cn } from "@/lib/utils";

export function IconRail({
  className,
  children
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <nav
      className={cn(
        "glass-card flex w-16 flex-col items-center gap-4 rounded-[26px] px-3 py-6",
        className
      )}
    >
      {children}
    </nav>
  );
}
