export function formatEntityResultMessage(
  entityName: string,
  status: string | undefined,
) {
  if (status !== "created" && status !== "updated") {
    return null;
  }

  return `${entityName} ${status}.`;
}
