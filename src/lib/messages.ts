import type { AccountLocale } from "@/lib/locale";
import { defaultUnauthenticatedLocale } from "@/lib/locale";
import { translate } from "@/lib/translations";

export function formatEntityResultMessage(
  entityName: string,
  status: string | undefined,
  locale?: AccountLocale,
) {
  if (status !== "created" && status !== "updated") {
    return null;
  }

  if (locale && entityName === "Account") {
    const entity = translate(locale, "entity.account");
    const message = translate(
      locale,
      status === "created" ? "message.entityCreated" : "message.entityUpdated",
    );

    return message.replace("{entity}", entity);
  }

  if (locale && entityName === "Student") {
    return translate(
      locale,
      status === "created" ? "message.studentCreated" : "message.studentUpdated",
    );
  }

  if (locale && entityName === "Class") {
    return translate(
      locale,
      status === "created" ? "message.classCreated" : "message.classUpdated",
    );
  }

  return `${entityName} ${status}.`;
}

export function formatTeacherWorkErrorMessage(
  error: string | undefined,
  locale: AccountLocale = defaultUnauthenticatedLocale,
) {
  switch (error) {
    case "invalid":
      return translate(locale, "message.teacherWorkInvalid");
    case "students":
      return translate(locale, "message.teacherWorkStudents");
    case "teacher":
      return translate(locale, "message.teacherWorkTeacher");
    case "teachers":
      return translate(locale, "message.teacherWorkTeachers");
    default:
      return null;
  }
}
