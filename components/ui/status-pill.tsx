import * as React from "react";
import { cn } from "@/lib/utils";

export function StatusPill({
  label,
  tone = "neutral",
  className
}: {
  label: string;
  tone?: "neutral" | "success" | "warning" | "danger";
  className?: string;
}) {
  const tones = {
    neutral: "bg-white/60 text-ink/70",
    success: "bg-[#D1FAE5]/70 text-[#065F46]",
    warning: "bg-[#FDE68A]/80 text-[#92400E]",
    danger: "bg-[#FECACA]/80 text-[#7F1D1D]"
  };

  return (
    <span
      className={cn(
        "rounded-full px-3 py-1 text-xs font-medium",
        tones[tone],
        className
      )}
    >
      {label}
    </span>
  );
}
