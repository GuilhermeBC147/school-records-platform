export const accountLocaleOptions = [
  {
    label: "English",
    value: "EN",
  },
  {
    label: "Português Brasileiro",
    value: "PT_BR",
  },
] as const;

export type AccountLocale = (typeof accountLocaleOptions)[number]["value"];

export const defaultAccountLocale: AccountLocale = "PT_BR";
export const defaultUnauthenticatedLocale: AccountLocale = defaultAccountLocale;

export function normalizeAccountLocale(
  value: FormDataEntryValue | string | null | undefined,
): AccountLocale {
  return accountLocaleOptions.some((option) => option.value === value)
    ? (value as AccountLocale)
    : defaultAccountLocale;
}

export function formatHtmlLang(locale: AccountLocale) {
  return locale === "PT_BR" ? "pt-BR" : "en";
}
