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
