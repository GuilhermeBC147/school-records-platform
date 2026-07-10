import Link from "next/link";
import {
  accountLocaleOptions,
  normalizeAccountLocale,
  type AccountLocale,
} from "@/lib/locale";
import { getTranslations } from "@/lib/translations";

type HomeProps = {
  searchParams: Promise<{
    locale?: string;
  }>;
};

function localeShortLabel(locale: AccountLocale) {
  return locale === "PT_BR" ? "PT-BR" : "EN";
}

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const locale = normalizeAccountLocale(params.locale);
  const t = getTranslations(locale);
  const loginHref = `/login?locale=${locale}`;

  return (
    <main className="public-page">
      <header className="public-topbar">
        <div className="public-topbar-inner">
          <Link className="public-brand" href="/" aria-label={t("app.name")}>
            <span aria-hidden="true" className="brand-mark">
              SR
            </span>
            <span className="public-brand-copy">
              <strong>{t("app.name")}</strong>
              <small>{t("landing.brandTagline")}</small>
            </span>
          </Link>
          <div className="public-topbar-actions">
            <nav
              aria-label={t("account.language")}
              className="public-locale-toggle"
            >
              {accountLocaleOptions.map((option) => (
                <Link
                  aria-current={locale === option.value ? "page" : undefined}
                  aria-label={option.label}
                  className="locale-toggle-link"
                  href={`/?locale=${option.value}`}
                  key={option.value}
                >
                  {localeShortLabel(option.value)}
                </Link>
              ))}
            </nav>
            <Link className="primary-link" href={loginHref}>
              {t("landing.signIn")}
            </Link>
          </div>
        </div>
      </header>

      <div className="main public-main">
        <section className="public-hero" aria-labelledby="landing-title">
          <div className="public-hero-copy">
            <p className="eyebrow">{t("landing.eyebrow")}</p>
            <h1 id="landing-title">{t("landing.title")}</h1>
            <p className="lede">{t("landing.copy")}</p>
            <div className="action-row">
              <Link className="primary-link" href={loginHref}>
                {t("landing.signIn")}
              </Link>
              <Link className="secondary-link" href="#features">
                {t("landing.explore")}
              </Link>
            </div>
            <p className="public-note">{t("landing.note")}</p>
          </div>

          <div className="public-hero-art" aria-hidden="true">
            <div className="hero-window">
              <div className="hero-window-top">
                <span className="hero-window-dots">
                  <i />
                  <i />
                  <i />
                </span>
                <span className="hero-window-status">{t("landing.previewReady")}</span>
              </div>
              <div className="hero-window-heading">
                <span>{t("landing.previewTitle")}</span>
                <strong>+12%</strong>
              </div>
              <div className="hero-window-metrics">
                <div>
                  <strong>18</strong>
                  <span>{t("landing.previewClasses")}</span>
                </div>
                <div>
                  <strong>246</strong>
                  <span>{t("landing.previewStudents")}</span>
                </div>
              </div>
              <div className="hero-window-bars">
                <span />
                <span />
                <span />
                <span />
                <span />
              </div>
              <p className="hero-window-caption">{t("landing.previewRecords")}</p>
            </div>
          </div>
        </section>

        <section className="public-section" id="features" aria-labelledby="features-title">
          <div className="public-section-heading">
            <p className="eyebrow">{t("landing.featuresEyebrow")}</p>
            <h2 id="features-title">{t("landing.featuresTitle")}</h2>
          </div>
          <div className="public-feature-grid">
            <article className="public-feature-card">
              <span className="public-feature-index">01</span>
              <h3>{t("landing.featureRecords")}</h3>
              <p>{t("landing.featureRecordsCopy")}</p>
            </article>
            <article className="public-feature-card">
              <span className="public-feature-index">02</span>
              <h3>{t("landing.featureStudents")}</h3>
              <p>{t("landing.featureStudentsCopy")}</p>
            </article>
            <article className="public-feature-card">
              <span className="public-feature-index">03</span>
              <h3>{t("landing.featureOperations")}</h3>
              <p>{t("landing.featureOperationsCopy")}</p>
            </article>
          </div>
        </section>

        <section className="public-team" aria-labelledby="team-title">
          <div className="public-section-heading">
            <p className="eyebrow">{t("landing.rolesEyebrow")}</p>
            <h2 id="team-title">{t("landing.rolesTitle")}</h2>
          </div>
          <div className="public-role-list">
            <article className="public-role-item">
              <strong>{t("landing.teacherRole")}</strong>
              <span>{t("landing.teacherRoleCopy")}</span>
            </article>
            <article className="public-role-item">
              <strong>{t("landing.adminRole")}</strong>
              <span>{t("landing.adminRoleCopy")}</span>
            </article>
            <article className="public-role-item">
              <strong>{t("landing.receptionRole")}</strong>
              <span>{t("landing.receptionRoleCopy")}</span>
            </article>
          </div>
        </section>

        <footer className="public-footer">{t("landing.footer")}</footer>
      </div>
    </main>
  );
}
