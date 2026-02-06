import * as React from "react";
import { cn } from "@/lib/utils";

export function KPIChip({
  label,
  value,
  className
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "glass-card flex flex-col gap-1 rounded-full px-4 py-2 text-xs text-ink/70",
        className
      )}
    >
      <span>{label}</span>
      <span className="text-base font-semibold text-ink">{value}</span>
    </div>
  );
}
