"use client";

import { updateOwnLocaleAction } from "@/app/actions/accounts";
import { logoutAction } from "@/app/actions/auth";
import Link from "next/link";
import { accountLocaleOptions, type AccountLocale } from "@/lib/locale";
import { formatThemeAttribute, type AccountTheme } from "@/lib/theme";
import { getTranslations, type TranslationKey } from "@/lib/translations";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type AppRole = "ADMIN" | "TEACHER" | "RECEPTION";

type Shortcut = {
  href: string;
  labelKey: TranslationKey;
};

type ShortcutGroup = {
  labelKey: TranslationKey;
  shortcuts: readonly Shortcut[];
};

const adminPrimaryShortcuts: readonly Shortcut[] = [
  { href: "/dashboard", labelKey: "dashboard.home" },
  { href: "/admin/calendar", labelKey: "dashboard.calendar" },
  { href: "/admin/classes", labelKey: "dashboard.manageClasses" },
  { href: "/admin/students", labelKey: "dashboard.manageStudents" },
  { href: "/admin/records", labelKey: "dashboard.records" },
];

const adminShortcutGroups: readonly ShortcutGroup[] = [
  {
    labelKey: "dashboard.navManagement",
    shortcuts: [
      { href: "/admin/manage-accounts", labelKey: "dashboard.manageAccounts" },
      { href: "/admin/risk", labelKey: "dashboard.studentRisk" },
    ],
  },
  {
    labelKey: "dashboard.navWork",
    shortcuts: [
      { href: "/admin/work-summary", labelKey: "dashboard.workSummaries" },
      { href: "/admin/work-summary/new-activity", labelKey: "dashboard.addActivity" },
      { href: "/admin/work-summary/new-meeting", labelKey: "dashboard.createMeeting" },
    ],
  },
  {
    labelKey: "dashboard.navOperations",
    shortcuts: [
      { href: "/admin/substitutions", labelKey: "dashboard.reviewSubstitutions" },
      { href: "/reception", labelKey: "dashboard.receptionTools" },
    ],
  },
  {
    labelKey: "dashboard.account",
    shortcuts: [{ href: "/dashboard/account", labelKey: "dashboard.accountSettings" }],
  },
];

const shortcutsByRole = {
  ADMIN: adminPrimaryShortcuts,
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
} satisfies Record<AppRole, readonly Shortcut[]>;

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

type LocaleToggleProps = {
  label: string;
  locale: AccountLocale;
  redirectTo: string;
};

function LocaleToggle({ label, locale, redirectTo }: LocaleToggleProps) {
  return (
    <form action={updateOwnLocaleAction} className="topbar-locale-form">
      <input name="redirectTo" type="hidden" value={redirectTo} />
      <nav
        aria-label={label}
        className="public-locale-toggle topbar-locale-toggle"
      >
        {accountLocaleOptions.map((option) => {
          const active = locale === option.value;

          return (
            <button
              aria-current={active ? "page" : undefined}
              aria-label={option.label}
              aria-pressed={active}
              className="locale-toggle-link"
              name="locale"
              type="submit"
              value={option.value}
              key={option.value}
            >
              {option.value === "PT_BR" ? "PT-BR" : "EN"}
            </button>
          );
        })}
      </nav>
    </form>
  );
}

type ShortcutNavProps = {
  ariaLabel: string;
  locale: AccountLocale;
  pathname: string;
  shortcuts?: readonly Shortcut[];
};

type ShortcutGroupNavProps = {
  ariaLabel: string;
  groups: readonly ShortcutGroup[];
  locale: AccountLocale;
  pathname: string;
};

function ShortcutNav({
  ariaLabel,
  locale,
  pathname,
  shortcuts,
}: ShortcutNavProps) {
  const t = getTranslations(locale);
  const shortcutNavRef = useRef<HTMLElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

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
  }, [locale]);

  useEffect(() => {
    const activeShortcut = shortcutNavRef.current?.querySelector<HTMLElement>(
      '[aria-current="page"]',
    );

    activeShortcut?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [locale, pathname]);

  const shortcutNavClassName = [
    "shortcut-nav-shell",
    canScrollLeft ? "has-left-overflow" : "",
    canScrollRight ? "has-right-overflow" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const visibleShortcuts = shortcuts ?? [];
  const activeShortcutHref = visibleShortcuts
    .filter((shortcut) => isShortcutActive(pathname, shortcut.href))
    .sort((left, right) => right.href.length - left.href.length)[0]?.href;

  const renderShortcut = (shortcut: Shortcut) => {
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
  };

  return (
    <div className={shortcutNavClassName}>
      <nav aria-label={ariaLabel} className="shortcut-nav" ref={shortcutNavRef}>
        {shortcuts?.map(renderShortcut)}
      </nav>
      {canScrollLeft ? (
        <span aria-hidden="true" className="shortcut-scroll-hint shortcut-scroll-hint-left">
          {"\u2039"}
        </span>
      ) : null}
      {canScrollRight ? (
        <span aria-hidden="true" className="shortcut-scroll-hint shortcut-scroll-hint-right">
          {"\u203A"}
        </span>
      ) : null}
    </div>
  );
}

function ShortcutGroupNav({
  ariaLabel,
  groups,
  locale,
  pathname,
}: ShortcutGroupNavProps) {
  const t = getTranslations(locale);
  const groupNavRef = useRef<HTMLElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const visibleShortcuts = groups.flatMap((group) => group.shortcuts);
  const activeShortcutHref = visibleShortcuts
    .filter((shortcut) => isShortcutActive(pathname, shortcut.href))
    .sort((left, right) => right.href.length - left.href.length)[0]?.href;
  const activeGroupKey = groups.find((group) =>
    group.shortcuts.some((shortcut) => shortcut.href === activeShortcutHref),
  )?.labelKey;
  const [openGroupKey, setOpenGroupKey] = useState<TranslationKey | null>(
    activeGroupKey ?? null,
  );

  useEffect(() => {
    setOpenGroupKey(activeGroupKey ?? null);
  }, [activeGroupKey]);

  useEffect(() => {
    const nav = groupNavRef.current;

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
  }, [locale, openGroupKey]);

  useEffect(() => {
    const activeShortcut = groupNavRef.current?.querySelector<HTMLElement>(
      '[aria-current="page"]',
    );

    activeShortcut?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [locale, openGroupKey, pathname]);

  const renderShortcut = (shortcut: Shortcut) => {
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
  };

  const toggleGroup = (groupKey: TranslationKey) => {
    setOpenGroupKey((currentGroupKey) =>
      currentGroupKey === groupKey ? null : groupKey,
    );
  };

  const shortcutNavClassName = [
    "shortcut-nav-shell",
    canScrollLeft ? "has-left-overflow" : "",
    canScrollRight ? "has-right-overflow" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={shortcutNavClassName}>
      <nav aria-label={ariaLabel} className="admin-group-nav" ref={groupNavRef}>
        {groups.map((group) => {
          const active = group.labelKey === activeGroupKey;

          return (
            <details
              className={`shortcut-group${active ? " has-active" : ""}`}
              key={group.labelKey}
              open={openGroupKey === group.labelKey}
            >
              <summary
                className="shortcut-group-trigger"
                onClick={(event) => {
                  event.preventDefault();
                  toggleGroup(group.labelKey);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    toggleGroup(group.labelKey);
                  }
                }}
              >
                <span>{t(group.labelKey)}</span>
              </summary>
              <div className="shortcut-group-links">
                {group.shortcuts.map(renderShortcut)}
              </div>
            </details>
          );
        })}
      </nav>
      {canScrollLeft ? (
        <span aria-hidden="true" className="shortcut-scroll-hint shortcut-scroll-hint-left">
          {"\u2039"}
        </span>
      ) : null}
      {canScrollRight ? (
        <span aria-hidden="true" className="shortcut-scroll-hint shortcut-scroll-hint-right">
          {"\u203A"}
        </span>
      ) : null}
    </div>
  );
}

export function AppTopbar({ currentUser }: AppTopbarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = getTranslations(currentUser.locale);
  const homeHref = currentUser.role === "RECEPTION" ? "/reception" : "/dashboard";
  const queryString = searchParams.toString();
  const redirectTo = queryString ? `${pathname}?${queryString}` : pathname;

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
            <LocaleToggle
              label={t("account.language")}
              locale={currentUser.locale}
              redirectTo={redirectTo}
            />
            <form action={logoutAction}>
              <button className="secondary-button" type="submit">
                {t("label.signOut")}
              </button>
            </form>
          </div>
        </div>
        {currentUser.role === "ADMIN" ? (
          <div className="admin-shortcut-stack">
            <ShortcutNav
              ariaLabel={t("navigation.primary")}
              locale={currentUser.locale}
              pathname={pathname}
              shortcuts={adminPrimaryShortcuts}
            />
            <ShortcutGroupNav
              ariaLabel={t("dashboard.adminTools")}
              groups={adminShortcutGroups}
              locale={currentUser.locale}
              pathname={pathname}
            />
          </div>
        ) : (
          <ShortcutNav
            ariaLabel={t("navigation.primary")}
            locale={currentUser.locale}
            pathname={pathname}
            shortcuts={shortcutsByRole[currentUser.role]}
          />
        )}
      </div>
    </header>
  );
}
