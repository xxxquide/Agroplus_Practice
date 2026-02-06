import type { ComponentProps } from "react";
import { Toaster as SonnerToaster } from "sonner";

export function Toaster(props: ComponentProps<typeof SonnerToaster>) {
  return (
    <SonnerToaster
      toastOptions={{
        className: "rounded-card bg-white/90 text-ink shadow-glass border border-white/50"
      }}
      {...props}
    />
  );
}
