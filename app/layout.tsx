import type { Metadata } from "next";
import type { ReactNode } from "react";
import { headers } from "next/headers";
import { Barlow, Barlow_Condensed, Share_Tech_Mono } from "next/font/google";
import "./globals.css";

const barlow = Barlow({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-barlow",
});
const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-barlow-condensed",
});
const shareTechMono = Share_Tech_Mono({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-share-tech-mono",
});

export const metadata: Metadata = {
  title: "DSC Alarm Navigator",
  description: "Menu maps and programming guides for DSC alarm panels",
};

// Reading the request makes every page render per request, so each one gets the nonce that
// proxy.ts put in the CSP header (a page prerendered at build time would carry no nonce).
export default async function RootLayout({ children }: { children: ReactNode }) {
  await headers();
  const fonts = `${barlow.variable} ${barlowCondensed.variable} ${shareTechMono.variable}`;
  return (
    <html lang="en" className={fonts}>
      <body>{children}</body>
    </html>
  );
}
