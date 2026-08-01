import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "YT Growth Stack",
  description: "A voice-first, evidence-backed YouTube research agent.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className="font-sans"><body>{children}</body></html>;
}
