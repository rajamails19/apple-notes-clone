import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "Notes & Folders App",
  description: "A focused notes and folders app for organizing ideas.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Allow pinch-to-zoom on mobile (needed for image zoom + natural scroll)
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" style={{ height: '100%' }}>
      <body style={{ height: '100%', margin: 0, overflow: 'clip' } as React.CSSProperties}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
