import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

// Geist Sans carries the whole UI (headings, labels, body); Geist Mono is
// reserved for opaque QR tokens (cpy_…, brw_…), IDs, and tabular data.
const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SJA-LMS",
  description: "St. Joseph's Academy — Library Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(
        "h-full antialiased",
        geistSans.variable,
        geistMono.variable,
        "font-sans",
      )}
    >
      <body className="min-h-full flex flex-col">
        {/* Layout wrapper only — each route owns its own <main> landmark
            (the auth pages render one; the app shell's SidebarInset is one). */}
        <div className="flex min-h-full flex-1 flex-col">
          <TooltipProvider>{children}</TooltipProvider>
        </div>
        <Toaster />
      </body>
    </html>
  );
}
