type TimeInputProps = {
  defaultValue?: string;
  name: string;
  required?: boolean;
};

export function TimeInput({
  defaultValue,
  name,
  required = false,
}: TimeInputProps) {
  return (
    <input
      autoComplete="off"
      defaultValue={defaultValue}
      inputMode="numeric"
      maxLength={5}
      name={name}
      pattern="(?:[01]\d|2[0-3]):[0-5]\d"
      placeholder="HH:MM"
      required={required}
      title="Use 24-hour time, for example 14:30."
      type="text"
    />
  );
}
