import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { RayBot } from "@/components/chat/raybot";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SDLC Central Hub",
  description: "Enterprise SDLC governance dashboard for tracking initiatives, development, and deployments across all workstreams.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} antialiased`}
      >
        {children}
        <RayBot />
      </body>
    </html>
  );
}
