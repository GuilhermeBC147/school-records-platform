import type { AccountLocale } from "@/lib/locale";
import { defaultUnauthenticatedLocale } from "@/lib/locale";
import { translate } from "@/lib/translations";

export const letterGradeOptions = [
  { label: "D-", value: "D_MINUS" },
  { label: "D", value: "D" },
  { label: "D+", value: "D_PLUS" },
  { label: "C-", value: "C_MINUS" },
  { label: "C", value: "C" },
  { label: "C+", value: "C_PLUS" },
  { label: "B-", value: "B_MINUS" },
  { label: "B", value: "B" },
  { label: "B+", value: "B_PLUS" },
  { label: "A-", value: "A_MINUS" },
  { label: "A", value: "A" },
] as const;

export const partialEvaluationPeriods = [
  { label: "7th class", value: "CLASS_7" },
  { label: "23rd class", value: "CLASS_23" },
] as const;

export const testPeriods = [
  { label: "Mid-term", value: "MID_TERM" },
  { label: "Final", value: "FINAL" },
] as const;

export type LetterGradeValue = (typeof letterGradeOptions)[number]["value"];
export type PartialEvaluationPeriodValue =
  (typeof partialEvaluationPeriods)[number]["value"];
export type TestPeriodValue = (typeof testPeriods)[number]["value"];

export function formatGradeLabel(value: string) {
  return (
    letterGradeOptions.find((option) => option.value === value)?.label ?? value
  );
}

export function formatPartialEvaluationPeriodLabel(
  value: string,
  locale: AccountLocale = defaultUnauthenticatedLocale,
) {
  switch (value) {
    case "CLASS_7":
      return locale === "PT_BR" ? "7ª aula" : "7th class";
    case "CLASS_23":
      return locale === "PT_BR" ? "23ª aula" : "23rd class";
    default:
      return value;
  }
}

export function formatTestPeriodLabel(
  value: string,
  locale: AccountLocale = defaultUnauthenticatedLocale,
) {
  switch (value) {
    case "MID_TERM":
      return translate(locale, "label.gradeMidTerm");
    case "FINAL":
      return translate(locale, "label.gradeFinal");
    default:
      return value;
  }
}
