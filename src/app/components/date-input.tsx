"use client";

import {
  AccountDateFormat,
  formatIsoDateInput,
  parseDateInputToIso,
} from "@/lib/date-format";

type DateInputProps = {
  className?: string;
  dateFormat: AccountDateFormat;
  defaultValue?: string;
  name: string;
  required?: boolean;
};

export function DateInput({
  className,
  dateFormat,
  defaultValue = "",
  name,
  required = false,
}: DateInputProps) {
  const submittedIsoValue = parseDateInputToIso(
    formatIsoDateInput(defaultValue, dateFormat),
    dateFormat,
  );

  return (
    <span className="date-input-group">
      <input
        aria-describedby={`${name}-date-format`}
        className={className}
        defaultValue={submittedIsoValue}
        name={name}
        type="date"
        required={required}
      />
      <small className="field-hint" id={`${name}-date-format`}>
        Calendar date
      </small>
    </span>
  );
}
