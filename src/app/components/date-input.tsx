"use client";

import {
  AccountDateFormat,
  formatIsoDateInput,
  parseDateInputToIso,
} from "@/lib/date-format";
import { useMemo, useState } from "react";

type DateInputProps = {
  calendarLabel: string;
  className?: string;
  dateFormat: AccountDateFormat;
  defaultValue?: string;
  hideFormatHint?: boolean;
  name: string;
  placeholderLabels?: Partial<Record<AccountDateFormat, string>>;
  required?: boolean;
};

const inputLabels: Record<AccountDateFormat, string> = {
  DD_MM_YY: "DD/MM/YY",
  MM_DD_YY: "MM/DD/YY",
  YYYY_MM_DD: "YYYY-MM-DD",
};

export function DateInput({
  calendarLabel,
  className,
  dateFormat,
  defaultValue = "",
  hideFormatHint = false,
  name,
  placeholderLabels,
  required = false,
}: DateInputProps) {
  const placeholder = placeholderLabels?.[dateFormat] ?? inputLabels[dateFormat];
  const initialDisplayValue = useMemo(
    () => formatIsoDateInput(defaultValue, dateFormat),
    [dateFormat, defaultValue],
  );
  const [displayValue, setDisplayValue] = useState(initialDisplayValue);
  const isoValue = parseDateInputToIso(displayValue, dateFormat);
  const hasInvalidValue = Boolean(displayValue.trim()) && !isoValue;
  const submittedIsoValue = hasInvalidValue ? "" : isoValue;

  return (
    <span className="date-input-group">
      <span className="date-input-row">
        <input
          aria-describedby={hideFormatHint ? undefined : `${name}-date-format`}
          autoComplete="off"
          className={className}
          inputMode="numeric"
          onChange={(event) => setDisplayValue(event.target.value)}
          pattern={
            dateFormat === "YYYY_MM_DD"
              ? "\\d{4}-\\d{1,2}-\\d{1,2}"
              : "\\d{1,2}/\\d{1,2}/(?:\\d{2}|\\d{4})"
          }
          placeholder={placeholder}
          required={required}
          title={placeholder}
          type="text"
          value={displayValue}
        />
        <input
          aria-label={calendarLabel}
          className="date-calendar-input"
          onChange={(event) =>
            setDisplayValue(formatIsoDateInput(event.target.value, dateFormat))
          }
          type="date"
          value={submittedIsoValue}
        />
      </span>
      <input name={name} type="hidden" value={submittedIsoValue} />
      {hideFormatHint ? null : (
        <small className="field-hint" id={`${name}-date-format`}>
          {placeholder}
        </small>
      )}
    </span>
  );
}
