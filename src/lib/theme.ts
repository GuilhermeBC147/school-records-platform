export const accountThemeOptions = [
  {
    labelKey: "account.lightMode",
    value: "LIGHT",
  },
  {
    labelKey: "account.darkMode",
    value: "DARK",
  },
] as const;

export type AccountTheme = (typeof accountThemeOptions)[number]["value"];

export const defaultAccountTheme: AccountTheme = "LIGHT";

export function normalizeAccountTheme(
  value: FormDataEntryValue | string | null | undefined,
): AccountTheme {
  return accountThemeOptions.some((option) => option.value === value)
    ? (value as AccountTheme)
    : defaultAccountTheme;
}

export function formatThemeAttribute(theme: AccountTheme) {
  return theme === "DARK" ? "dark" : "light";
}
