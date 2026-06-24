import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Integracao Sponte",
  description:
    "Teacher attendance and homework records with future Sponte API sync.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
