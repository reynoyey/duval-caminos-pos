import type { Metadata, Viewport } from "next";
import { Inter, Outfit } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });

export const metadata: Metadata = {
  title: "Duval Caminos Coffee — Specialty POS & Kitchen Display",
  description:
    "Point of Sale and Barista Order Management for Duval Caminos Coffee. Rapid order entry, beverage modifiers, live order tracking, and multi-sheet Excel reports.",
  icons: { icon: "/logo.jpg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#14100D",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${outfit.variable} font-sans bg-[#100D0B] text-stone-100`}>
        {children}
        <Toaster
          position="top-center"
          theme="dark"
          richColors
          toastOptions={{ style: { fontFamily: "var(--font-inter)" } }}
        />
      </body>
    </html>
  );
}
