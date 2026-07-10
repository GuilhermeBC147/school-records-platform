"use client";

import { logoutAction } from "@/app/actions/auth";
import Link from "next/link";
import { type AccountLocale } from "@/lib/locale";
import { formatThemeAttribute, type AccountTheme } from "@/lib/theme";
import { getTranslations, type TranslationKey } from "@/lib/translations";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

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
    { href: "/admin/work-summary/new-activity", labelKey: "dashboard.addActivity" },
    { href: "/admin/work-summary/new-meeting", labelKey: "dashboard.createMeeting" },
    { href: "/admin/substitutions", labelKey: "dashboard.reviewSubstitutions" },
    { href: "/reception", labelKey: "dashboard.receptionTools" },
    { href: "/dashboard/account", labelKey: "dashboard.accountSettings" },
  ],
  TEACHER: [
    { href: "/dashboard", labelKey: "dashboard.home" },
    { href: "/dashboard/calendar", labelKey: "dashboard.calendar" },
    { href: "/dashboard/work", labelKey: "dashboard.monthlySummary" },
    { href: "/dashboard/work/new", labelKey: "dashboard.addActivity" },
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
    { href: "/dashboard/account", labelKey: "dashboard.accountSettings" },
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
  const t = getTranslations(currentUser.locale);
  const homeHref = currentUser.role === "RECEPTION" ? "/reception" : "/dashboard";
  const shortcutNavRef = useRef<HTMLElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    document.body.dataset.theme = formatThemeAttribute(currentUser.theme);
  }, [currentUser.theme]);

  useEffect(() => {
    const nav = shortcutNavRef.current;

    if (!nav) {
      return;
    }

    const updateScrollState = () => {
      const maxScrollLeft = nav.scrollWidth - nav.clientWidth;

      setCanScrollLeft(nav.scrollLeft > 1);
      setCanScrollRight(maxScrollLeft - nav.scrollLeft > 1);
    };

    updateScrollState();
    nav.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);

    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(updateScrollState);

    resizeObserver?.observe(nav);

    return () => {
      nav.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
      resizeObserver?.disconnect();
    };
  }, [currentUser.role]);

  useEffect(() => {
    const activeShortcut = shortcutNavRef.current?.querySelector<HTMLElement>(
      '[aria-current="page"]',
    );

    activeShortcut?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [pathname]);

  const shortcutNavClassName = [
    "shortcut-nav-shell",
    canScrollLeft ? "has-left-overflow" : "",
    canScrollRight ? "has-right-overflow" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const shortcuts = shortcutsByRole[currentUser.role];
  const activeShortcutHref = shortcuts
    .filter((shortcut) => isShortcutActive(pathname, shortcut.href))
    .sort((left, right) => right.href.length - left.href.length)[0]?.href;

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
            <form action={logoutAction}>
              <button className="secondary-button" type="submit">
                {t("label.signOut")}
              </button>
            </form>
          </div>
        </div>
        <div className={shortcutNavClassName}>
          <nav
            aria-label={t("navigation.primary")}
            className="shortcut-nav"
            ref={shortcutNavRef}
          >
            {shortcuts.map((shortcut) => {
              const active = shortcut.href === activeShortcutHref;

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
          {canScrollLeft ? (
            <span aria-hidden="true" className="shortcut-scroll-hint shortcut-scroll-hint-left">
              ‹
            </span>
          ) : null}
          {canScrollRight ? (
            <span aria-hidden="true" className="shortcut-scroll-hint shortcut-scroll-hint-right">
              ›
            </span>
          ) : null}
        </div>
      </div>
    </header>
  );
}
