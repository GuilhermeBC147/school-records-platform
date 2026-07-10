"use client";

import { updateOwnLocaleAction } from "@/app/actions/accounts";
import { logoutAction } from "@/app/actions/auth";
import Link from "next/link";
import { accountLocaleOptions, type AccountLocale } from "@/lib/locale";
import { formatThemeAttribute, type AccountTheme } from "@/lib/theme";
import { getTranslations, type TranslationKey } from "@/lib/translations";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

type AppRole = "ADMIN" | "TEACHER" | "RECEPTION";

type Shortcut = {
  href: string;
  labelKey: TranslationKey;
};

const shortcutsByRole: Record<AppRole, readonly Shortcut[]> = {
  ADMIN: [
    { href: "/dashboard", labelKey: "dashboard.home" },
    { href: "/admin/calendar", labelKey: "dashboard.calendar" },
    { href: "/admin/manage-accounts", labelKey: "dashboard.manageAccounts" },
    { href: "/admin/classes", labelKey: "dashboard.manageClasses" },
    { href: "/admin/students", labelKey: "dashboard.manageStudents" },
    { href: "/admin/records", labelKey: "dashboard.records" },
    { href: "/admin/risk", labelKey: "dashboard.studentRisk" },
    { href: "/admin/work-summary", labelKey: "dashboard.workSummaries" },
  ],
  TEACHER: [
    { href: "/dashboard", labelKey: "dashboard.home" },
    { href: "/dashboard/calendar", labelKey: "dashboard.calendar" },
    { href: "/dashboard/work", labelKey: "dashboard.monthlySummary" },
    { href: "/dashboard/bonus-classes", labelKey: "dashboard.bonusClasses" },
    { href: "/dashboard/substitutions/new", labelKey: "dashboard.substituteLesson" },
    { href: "/dashboard/account", labelKey: "dashboard.accountSettings" },
  ],
  RECEPTION: [
    { href: "/reception", labelKey: "dashboard.home" },
    { href: "/reception/bonus-classes", labelKey: "dashboard.bonusClasses" },
    { href: "/reception/calendar", labelKey: "dashboard.calendar" },
    { href: "/reception/students", labelKey: "dashboard.students" },
    { href: "/reception/classes", labelKey: "dashboard.classes" },
  ],
};

type AppTopbarProps = {
  currentUser: {
    locale: AccountLocale;
    name: string;
    role: AppRole;
    theme: AccountTheme;
  };
};

function isShortcutActive(pathname: string, href: string) {
  if (href === "/dashboard" || href === "/reception") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppTopbar({ currentUser }: AppTopbarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = getTranslations(currentUser.locale);
  const queryString = searchParams.toString();
  const redirectTo = queryString ? `${pathname}?${queryString}` : pathname;
  const homeHref = currentUser.role === "RECEPTION" ? "/reception" : "/dashboard";

  useEffect(() => {
    document.body.dataset.theme = formatThemeAttribute(currentUser.theme);
  }, [currentUser.theme]);

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div className="topbar-main">
          <Link aria-label={t("app.name")} className="brand" href={homeHref}>
            <span aria-hidden="true" className="brand-mark">
              SR
            </span>
            <span className="brand-copy">
              <strong>{t("app.name")}</strong>
              <span>{currentUser.name}</span>
            </span>
          </Link>
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
        <nav aria-label={t("navigation.primary")} className="shortcut-nav">
          {shortcutsByRole[currentUser.role].map((shortcut) => {
            const active = isShortcutActive(pathname, shortcut.href);

            return (
              <Link
                aria-current={active ? "page" : undefined}
                className={`shortcut-link${active ? " is-active" : ""}`}
                href={shortcut.href}
                key={shortcut.href}
              >
                {t(shortcut.labelKey)}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
