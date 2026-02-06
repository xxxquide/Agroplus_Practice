import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import "./globals.css";
import "maplibre-gl/dist/maplibre-gl.css";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import { Toaster } from "@/components/ui/sonner";
import { PresencePing } from "@/components/presence-ping";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter"
});

export const metadata: Metadata = {
  title: "АГРОПЛЮС — Внутрішній портал",
  description: "Внутрішній ERP портал для агропідприємства"
};

export default function RootLayout({
  children
}: {
  children: ReactNode;
}) {
  return (
    <html lang="uk" className={inter.variable}>
      <body className="min-h-screen bg-base font-sans text-ink antialiased">
        {children}
        <PresencePing />
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
