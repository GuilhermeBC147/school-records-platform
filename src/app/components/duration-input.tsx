import { formatDuration } from "@/lib/class-schedule";

type DurationInputProps = {
  maxMinutes?: number;
  name: string;
  placeholder?: string;
  required?: boolean;
  valueMinutes?: number | null;
};

export function DurationInput({
  maxMinutes = 720,
  name,
  placeholder = "HH:MM",
  required = false,
  valueMinutes,
}: DurationInputProps) {
  return (
    <input
      autoComplete="off"
      defaultValue={valueMinutes ? formatDuration(valueMinutes) : ""}
      inputMode="numeric"
      maxLength={5}
      name={name}
      pattern="\d{1,2}:[0-5]\d"
      placeholder={placeholder}
      required={required}
      title={placeholder}
      type="text"
    />
  );
}
