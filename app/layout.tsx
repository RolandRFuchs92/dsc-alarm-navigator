import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Barlow, Barlow_Condensed, Share_Tech_Mono } from "next/font/google";

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

export default function RootLayout({ children }: { children: ReactNode }) {
  const fonts = `${barlow.variable} ${barlowCondensed.variable} ${shareTechMono.variable}`;
  return (
    <html lang="en" className={fonts}>
      <body>{children}</body>
    </html>
  );
}
