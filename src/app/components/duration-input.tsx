import { formatDuration } from "@/lib/class-schedule";

type DurationInputProps = {
  maxMinutes?: number;
  name: string;
  required?: boolean;
  valueMinutes?: number | null;
};

export function DurationInput({
  maxMinutes = 720,
  name,
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
      placeholder="HH:MM"
      required={required}
      title={`Use hours and minutes, for example 01:30. Maximum ${formatDuration(
        maxMinutes,
      )}.`}
      type="text"
    />
  );
}
