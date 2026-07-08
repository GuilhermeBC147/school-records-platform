"use client";

import { updateOwnLocaleAction } from "@/app/actions/accounts";
import { logoutAction } from "@/app/actions/auth";
import { accountLocaleOptions, type AccountLocale } from "@/lib/locale";
import { formatThemeAttribute, type AccountTheme } from "@/lib/theme";
import { getTranslations } from "@/lib/translations";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

type AppTopbarProps = {
  currentUser: {
    locale: AccountLocale;
    name: string;
    theme: AccountTheme;
  };
};

export function AppTopbar({ currentUser }: AppTopbarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = getTranslations(currentUser.locale);
  const queryString = searchParams.toString();
  const redirectTo = queryString ? `${pathname}?${queryString}` : pathname;

  useEffect(() => {
    document.body.dataset.theme = formatThemeAttribute(currentUser.theme);
  }, [currentUser.theme]);

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div className="brand">
          <strong>{t("app.name")}</strong>
          <span>{currentUser.name}</span>
        </div>
        <div className="topbar-actions">
          <form action={updateOwnLocaleAction} className="topbar-locale-form">
            <input name="redirectTo" type="hidden" value={redirectTo} />
            <label>
              <span>{t("account.language")}</span>
              <select defaultValue={currentUser.locale} name="locale">
                {accountLocaleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <button className="secondary-button" type="submit">
              {t("account.saveLanguage")}
            </button>
          </form>
          <form action={logoutAction}>
            <button className="secondary-button" type="submit">
              {t("label.signOut")}
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
