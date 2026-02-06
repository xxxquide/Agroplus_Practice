"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Modal({
  open,
  onClose,
  title,
  children,
  className
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Закрити"
      />
      <div
        className={cn(
          "relative w-full max-w-lg rounded-panel border border-white/50 bg-white/80 p-6 shadow-glass backdrop-blur-2xl",
          className
        )}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between gap-4">
          {title ? <h3 className="text-lg font-semibold">{title}</h3> : <span />}
          <button
            onClick={onClose}
            className="rounded-full p-2 text-ink/60 transition hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
            aria-label="Закрити"
          >
            <X size={18} />
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
