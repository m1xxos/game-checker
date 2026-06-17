import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/AppShell";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Game Checker — will it run on your console?",
  description:
    "Pick games and instantly see whether they'll run on your Android handheld, powered by community compatibility data from EmuReady and GameNative.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${nunito.variable} h-full antialiased`}>
      <body className="min-h-full">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
