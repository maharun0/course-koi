import type React from "react";
import type { Metadata } from "next";
import { Inter, IBM_Plex_Mono, Orbitron } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-plex-mono" });
// DESIGN.md specifies "Asimovian" for the wordmark, which next/font/google
// doesn't carry in this Next.js version. Orbitron is the closest available
// substitute in the same geometric/display category, used the same way:
// wordmark only, never headings or body copy.
const displayFont = Orbitron({ subsets: ["latin"], weight: "400", variable: "--font-asimovian" });

export const metadata: Metadata = {
  title: "Course Koi?",
  description: "An easy way to find courses.",
  icons: {
    icon: "/favicon.ico",
    // apple: "/apple-touch-icon.png", // For Apple devices
    // shortcut: "/favicon-16x16.png", // For browser shortcuts
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-arp="" suppressHydrationWarning className={`${inter.variable} ${plexMono.variable} ${displayFont.variable}`}>
      <body>
        {/* The main content here */}
        <main>{children}</main>
      </body>
    </html>
  );
}
