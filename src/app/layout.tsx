import type { Metadata } from "next";
import {
  defaultUnauthenticatedLocale,
  formatHtmlLang,
} from "@/lib/locale";
import { getCurrentUser } from "@/lib/session";
import { defaultAccountTheme, formatThemeAttribute } from "@/lib/theme";
import { translate } from "@/lib/translations";
import "./globals.css";

export const metadata: Metadata = {
  title: translate(defaultUnauthenticatedLocale, "app.name"),
  description: translate(defaultUnauthenticatedLocale, "app.description"),
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const currentUser = await getCurrentUser();
  const theme = currentUser?.theme ?? defaultAccountTheme;
  const locale = currentUser?.locale ?? defaultUnauthenticatedLocale;

  return (
    <html lang={formatHtmlLang(locale)}>
      <body data-theme={formatThemeAttribute(theme)} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
