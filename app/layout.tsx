import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Shellbook Lab",
  description: "Local-first Shellbook agent operations dashboard.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
