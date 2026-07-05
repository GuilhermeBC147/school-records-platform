"use client";

import {
  AccountDateFormat,
  formatIsoDateInput,
  parseDateInputToIso,
} from "@/lib/date-format";
import { useMemo, useState } from "react";

type DateFilterInputProps = {
  dateFormat: AccountDateFormat;
  defaultValue?: string;
  name: string;
  required?: boolean;
};

const inputLabels: Record<AccountDateFormat, string> = {
  DD_MM_YY: "DD/MM/YY",
  MM_DD_YY: "MM/DD/YY",
  YYYY_MM_DD: "YYYY-MM-DD",
};

export function DateFilterInput({
  dateFormat,
  defaultValue = "",
  name,
  required = false,
}: DateFilterInputProps) {
  const initialDisplayValue = useMemo(
    () => formatIsoDateInput(defaultValue, dateFormat),
    [dateFormat, defaultValue],
  );
  const [displayValue, setDisplayValue] = useState(initialDisplayValue);
  const isoValue = parseDateInputToIso(displayValue, dateFormat);
  const hasInvalidValue = Boolean(displayValue.trim()) && !isoValue;

  return (
    <>
      <input
        aria-describedby={`${name}-date-format`}
        autoComplete="off"
        inputMode="numeric"
        onChange={(event) => setDisplayValue(event.target.value)}
        pattern={
          dateFormat === "YYYY_MM_DD"
            ? "\\d{4}-\\d{1,2}-\\d{1,2}"
            : "\\d{1,2}/\\d{1,2}/(?:\\d{2}|\\d{4})"
        }
        placeholder={inputLabels[dateFormat]}
        required={required}
        title={`Use ${inputLabels[dateFormat]}.`}
        type="text"
        value={displayValue}
      />
      <input name={name} type="hidden" value={hasInvalidValue ? "" : isoValue} />
      <small className="field-hint" id={`${name}-date-format`}>
        {inputLabels[dateFormat]}
      </small>
    </>
  );
}
