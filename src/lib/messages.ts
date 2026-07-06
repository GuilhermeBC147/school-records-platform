export function formatEntityResultMessage(
  entityName: string,
  status: string | undefined,
) {
  if (status !== "created" && status !== "updated") {
    return null;
  }

  return `${entityName} ${status}.`;
}

export function formatTeacherWorkErrorMessage(error: string | undefined) {
  switch (error) {
    case "invalid":
      return "Check the required work details and try again.";
    case "students":
      return "Choose only active students for this activity.";
    case "teacher":
      return "Choose an active teacher for this activity.";
    case "teachers":
      return "Choose at least one active teacher for this meeting.";
    default:
      return null;
  }
}
