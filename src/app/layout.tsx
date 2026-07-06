import type { Metadata } from "next";
import {
  defaultUnauthenticatedLocale,
  formatHtmlLang,
} from "@/lib/locale";
import { translate } from "@/lib/translations";
import "./globals.css";

export const metadata: Metadata = {
  title: translate(defaultUnauthenticatedLocale, "app.name"),
  description: translate(defaultUnauthenticatedLocale, "app.description"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang={formatHtmlLang(defaultUnauthenticatedLocale)}>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
