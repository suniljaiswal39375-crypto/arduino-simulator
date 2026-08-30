import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VoltCraft AI — Arduino & Circuit Simulator",
  description:
    "Design, wire, simulate, and debug Arduino circuits in the browser. Konva canvas, Monaco IDE, AVR-inspired firmware engine, and an AI copilot.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full dark">
      <body className="h-full overflow-hidden antialiased">{children}</body>
    </html>
  );
}
