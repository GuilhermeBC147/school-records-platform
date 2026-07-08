type TimeInputProps = {
  defaultValue?: string;
  name: string;
  placeholder?: string;
  required?: boolean;
};

export function TimeInput({
  defaultValue,
  name,
  placeholder = "HH:MM",
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
      placeholder={placeholder}
      required={required}
      title={placeholder}
      type="text"
    />
  );
}
