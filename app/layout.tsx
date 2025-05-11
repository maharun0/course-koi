import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
// import Navbar from "@/components/navbar"
// import Footer from "@/components/footer"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Fake RDS",
  description: "a fake rds",
  icons: {
    icon: "/favicon.ico",
    // apple: "/apple-touch-icon.png", // For Apple devices
    // shortcut: "/favicon-16x16.png", // For browser shortcuts
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" data-arp="" suppressHydrationWarning>
      <body className={inter?.className ?? ""}>
        {/* <Navbar /> */}
        <main>{children}</main>
        {/* <Footer /> */}
      </body>
    </html>
  )
}