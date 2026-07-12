import Link from "next/link";
import { redirect } from "next/navigation";
import { Fragment } from "react";
import {
  confirmClassImportAction,
  previewClassImportAction,
  updateClassImportRowAction,
} from "@/app/actions/imports";
import { AppTopbar } from "@/app/components/app-topbar";
import {
  classTypeOptions,
  formatDuration,
  weekdayOptions,
} from "@/lib/class-schedule";
import { formatShortDateTime } from "@/lib/date-format";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getTranslations, type TranslationKey } from "@/lib/translations";

export const dynamic = "force-dynamic";

type ClassImportPageProps = {
  searchParams: Promise<{
    acceptedRowId?: string;
    batchId?: string;
    error?: string;
    show?: string;
    status?: string;
  }>;
};

type ClassImportViewMode = "failed" | "ready" | "duplicates" | "all";

function formatRowStatus(status: string, t: ReturnType<typeof getTranslations>) {
  switch (status) {
    case "VALID":
      return t("imports.valid");
    case "FAILED":
      return t("imports.failed");
    case "DUPLICATE":
      return t("imports.duplicate");
    case "CREATED":
      return t("imports.created");
    case "SKIPPED":
      return t("imports.skipped");
    default:
      return status;
  }
}

function formatImportMessage(message: string, t: ReturnType<typeof getTranslations>) {
  const staticMessages: Record<string, TranslationKey> = {
    "A class with this name/book/semester/year/teacher combination already exists.":
      "imports.validation.classAlreadyExists",
    "A duplicate class was found before confirmation.":
      "imports.validation.duplicateClassBeforeConfirmation",
    "Duplicate class name/book/semester/year/teacher combination in this file.":
      "imports.validation.duplicateClassInFile",
    "Stored import row is invalid.": "imports.validation.storedRowInvalid",
    "class_type must be REGULAR, VIP, PERSONAL, or blank.":
      "imports.validation.classTypeInvalid",
    "duration_minutes must be an integer from 1 to 600.":
      "imports.validation.durationInvalid",
    "is_active must be true, false, yes, no, 1, 0, or blank.":
      "imports.validation.activeInvalid",
    "name is required.": "imports.validation.nameRequired",
    "semester must be 1, 2, or blank.": "imports.validation.semesterInvalid",
    "start_time must use HH:MM or be blank.": "imports.validation.startTimeInvalid",
    "teacher_email or Professor is required.": "imports.validation.teacherRequired",
    "teacher_email or Professor must match an active teacher account.":
      "imports.validation.teacherNotFound",
    "week_days must include at least one valid weekday.":
      "imports.validation.weekdaysRequired",
    "year must be from 2000 to 2100 or blank.": "imports.validation.yearInvalid",
  };
  const invalidWeekdaysPrefix = "week_days contains invalid values: ";

  if (message.startsWith(invalidWeekdaysPrefix)) {
    const values = message.slice(invalidWeekdaysPrefix.length).replace(/\.$/, "");

    return `${t("imports.validation.invalidWeekdays")}: ${values}.`;
  }

  const translationKey = staticMessages[message];

  return translationKey ? t(translationKey) : message;
}

function formatImportMessages(
  messages: string[],
  t: ReturnType<typeof getTranslations>,
) {
  return messages.map((message) => formatImportMessage(message, t)).join("; ") || "-";
}

function getViewMode(show: string | undefined): ClassImportViewMode {
  if (show === "ready" || show === "duplicates" || show === "all") {
    return show;
  }

  return "failed";
}

function buildBatchHref(batchId: string, viewMode: ClassImportViewMode) {
  const showParam = viewMode === "failed" ? "" : `&show=${viewMode}`;

  return `/admin/classes/import?batchId=${batchId}${showParam}`;
}

export default async function ClassImportPage({
  searchParams,
}: ClassImportPageProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (currentUser.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const t = getTranslations(currentUser.locale);
  const viewMode = getViewMode(params.show);
  const acceptedRowId = params.acceptedRowId?.trim() ?? "";
  const [batch, recentBatches, activeTeachers] = await Promise.all([
    params.batchId
      ? prisma.importBatch.findFirst({
          where: { id: params.batchId, type: "CLASS" },
          include: { rows: { orderBy: { rowNumber: "asc" } } },
        })
      : null,
    prisma.importBatch.findMany({
      where: { type: "CLASS" },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        createdAt: true,
        createdCount: true,
        duplicatedCount: true,
        failedCount: true,
        skippedCount: true,
        sourceFilename: true,
        status: true,
        createdBy: { select: { name: true } },
      },
    }),
    prisma.user.findMany({
      where: { isActive: true, role: "TEACHER" },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  const validRows = batch?.rows.filter((row) => row.status === "VALID").length ?? 0;
  const failedRows = batch?.rows.filter((row) => row.status === "FAILED").length ?? 0;
  const duplicateRows =
    batch?.rows.filter((row) => row.status === "DUPLICATE").length ?? 0;
  const visibleRows =
    batch?.rows.filter((row) => {
      if (viewMode === "all") {
        return true;
      }

      if (viewMode === "ready") {
        return row.status === "VALID" || row.status === "CREATED";
      }

      if (viewMode === "duplicates") {
        return row.status === "DUPLICATE";
      }

      return row.status === "FAILED";
    }) ?? [];
  const viewModeCopy = {
    all: t("imports.viewingAllRows"),
    duplicates: t("imports.viewingDuplicateRows"),
    failed: t("imports.viewingFailedRows"),
    ready: t("imports.viewingReadyRows"),
  }[viewMode];
  const blockedRows =
    batch?.rows.filter((row) => row.status === "FAILED" || row.status === "DUPLICATE")
      .length ?? 0;

  return (
    <main className="app-shell">
      <AppTopbar currentUser={currentUser} />

      <div className="main data-page">
        <section className="intro" aria-labelledby="class-import-title">
          <Link className="text-link" href="/admin/classes">
            {t("adminClasses.backToClasses")}
          </Link>
          <p className="eyebrow">{t("adminClasses.adminSetup")}</p>
          <h1 id="class-import-title">{t("imports.classImportTitle")}</h1>
          <p className="lede">{t("imports.classImportCopy")}</p>
          <div className="action-row">
            <Link className="secondary-link" href="/admin/classes/import/template">
              {t("imports.downloadTemplate")}
            </Link>
          </div>
        </section>

        {params.error === "missing-file" ? (
          <p className="form-error">{t("imports.missingFile")}</p>
        ) : null}
        {params.error === "invalid-batch" ? (
          <p className="form-error">{t("imports.invalidBatch")}</p>
        ) : null}
        {params.error === "no-accepted" ? (
          <p className="form-error">{t("imports.noAcceptedRows")}</p>
        ) : null}
        {params.status === "confirmed" ? (
          <p className="form-success">{t("imports.confirmed")}</p>
        ) : null}

        <section className="panel" aria-labelledby="class-import-upload-title">
          <h2 id="class-import-upload-title">{t("imports.uploadCsv")}</h2>
          <p className="muted-copy">{t("imports.classColumns")}</p>
          <form action={previewClassImportAction} className="admin-form">
            <label>
              <span>{t("imports.csvFile")}</span>
              <input accept=".csv,text/csv" name="csvFile" required type="file" />
            </label>
            <button className="primary-button" type="submit">
              {t("imports.previewImport")}
            </button>
          </form>
        </section>

        {batch ? (
          <section className="panel data-panel" aria-labelledby="class-import-preview-title">
            <div className="section-heading-row">
              <div>
                <h2 id="class-import-preview-title">{t("imports.importPreview")}</h2>
                <p className="muted-copy">
                  {batch.sourceFilename ?? t("imports.unnamedFile")} |{" "}
                  {formatRowStatus(batch.status, t)}
                </p>
              </div>
              <div className="action-row">
                {blockedRows > 0 ? (
                  <Link
                    className="secondary-link"
                    href={`/admin/classes/import/error-report?batchId=${batch.id}`}
                  >
                    {t("imports.downloadErrorReport")}
                  </Link>
                ) : null}
                {batch.status === "DRAFT" &&
                validRows > 0 &&
                (viewMode === "ready" || viewMode === "all") ? (
                  <form action={confirmClassImportAction} id="confirm-class-import-form">
                    <input name="batchId" type="hidden" value={batch.id} />
                    <button className="primary-button" type="submit">
                      {t("imports.acceptSelectedRows")}
                    </button>
                  </form>
                ) : null}
              </div>
            </div>

            <div className="metric-grid" aria-label={t("imports.summaryCounts")}>
              <article className="metric">
                <span>{batch.createdCount}</span>
                <strong>{t("imports.created")}</strong>
              </article>
              <article className="metric">
                <span>{batch.skippedCount}</span>
                <strong>{t("imports.skipped")}</strong>
              </article>
              <article className="metric">
                <span>{batch.duplicatedCount}</span>
                <strong>{t("imports.duplicate")}</strong>
              </article>
              <article className="metric">
                <span>{batch.failedCount}</span>
                <strong>{t("imports.failed")}</strong>
              </article>
            </div>

            <div className="import-review-toolbar" aria-label={viewModeCopy}>
              <p className="muted-copy">{viewModeCopy}</p>
              <div className="table-actions">
                <Link
                  className={viewMode === "failed" ? "primary-link compact-card-link" : "secondary-link compact-card-link"}
                  href={buildBatchHref(batch.id, "failed")}
                >
                  {t("imports.failed")} ({failedRows})
                </Link>
                <Link
                  className={viewMode === "ready" ? "primary-link compact-card-link" : "secondary-link compact-card-link"}
                  href={buildBatchHref(batch.id, "ready")}
                >
                  {t("imports.readyRows")} ({validRows})
                </Link>
                <Link
                  className={viewMode === "duplicates" ? "primary-link compact-card-link" : "secondary-link compact-card-link"}
                  href={buildBatchHref(batch.id, "duplicates")}
                >
                  {t("imports.duplicate")} ({duplicateRows})
                </Link>
                <Link
                  className={viewMode === "all" ? "primary-link compact-card-link" : "secondary-link compact-card-link"}
                  href={buildBatchHref(batch.id, "all")}
                >
                  {t("imports.allRows")} ({batch.rows.length})
                </Link>
              </div>
            </div>

            <div className="table-wrap">
              <table className="class-import-table">
                <colgroup>
                  <col className="import-accept-column" />
                  <col className="import-row-number-column" />
                  <col className="import-status-column" />
                  <col className="import-name-column" />
                  <col className="import-teacher-column" />
                  <col className="import-type-column" />
                  <col className="import-time-column" />
                  <col className="import-book-column" />
                  <col className="import-term-column" />
                  <col className="import-message-column" />
                  <col className="import-message-column" />
                </colgroup>
                <thead>
                  <tr>
                    <th className="import-center-cell">{t("imports.acceptForImport")}</th>
                    <th className="import-center-cell">{t("imports.row")}</th>
                    <th>{t("imports.status")}</th>
                    <th>{t("label.name")}</th>
                    <th>{t("label.teacher")}</th>
                    <th>{t("adminClasses.classType")}</th>
                    <th>{t("label.startTime")}</th>
                    <th>{t("adminClasses.book")}</th>
                    <th>{t("label.term")}</th>
                    <th>{t("imports.errors")}</th>
                    <th>{t("imports.warnings")}</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((row) => {
                    const normalizedRow = row.normalizedRow as Record<
                      string,
                      boolean | number | string | string[] | null
                    >;
                    const selectedWeekdays = Array.isArray(normalizedRow.weekDays)
                      ? normalizedRow.weekDays.map(String)
                      : [];

                    return (
                      <Fragment key={row.id}>
                        <tr className={`import-row import-row-${row.status.toLowerCase()}`}>
                          <td className="import-accept-cell">
                            {batch.status === "DRAFT" && row.status === "VALID" ? (
                              <input
                                aria-label={`${t("imports.acceptForImport")} ${normalizedRow.name ?? ""}`}
                                defaultChecked={row.id === acceptedRowId}
                                form="confirm-class-import-form"
                                name="acceptedRowIds"
                                type="checkbox"
                                value={row.id}
                              />
                            ) : (
                              "-"
                            )}
                          </td>
                          <td className="import-center-cell">{row.rowNumber}</td>
                          <td>
                            <span className={`import-status import-status-${row.status.toLowerCase()}`}>
                              {formatRowStatus(row.status, t)}
                            </span>
                          </td>
                          <td className="import-class-name">{normalizedRow.name ?? ""}</td>
                          <td>
                            {normalizedRow.teacherEmail ??
                              normalizedRow.teacherName ??
                              ""}
                          </td>
                          <td className="import-nowrap-cell">{normalizedRow.classType ?? "REGULAR"}</td>
                          <td className="import-nowrap-cell">
                            {normalizedRow.startTime
                              ? `${normalizedRow.startTime} | ${formatDuration(
                                  Number(normalizedRow.durationMinutes ?? 0),
                                )}`
                              : "-"}
                          </td>
                          <td>{normalizedRow.book ?? "-"}</td>
                          <td className="import-nowrap-cell">
                            {normalizedRow.year || normalizedRow.semester
                              ? `${normalizedRow.year ?? "-"} / ${normalizedRow.semester ?? "-"}`
                              : "-"}
                          </td>
                          <td className="import-message-cell">
                            {formatImportMessages(row.errors, t)}
                          </td>
                          <td className="import-message-cell">
                            {formatImportMessages(row.warnings, t)}
                          </td>
                        </tr>
                        {batch.status === "DRAFT" &&
                        (row.status === "FAILED" || row.status === "VALID") ? (
                          <tr className="import-row-edit" key={`${row.id}:edit`}>
                            <td colSpan={11}>
                              <details className="import-row-details">
                                <summary>{t("imports.editRow")}</summary>
                                <form
                                  action={updateClassImportRowAction}
                                  className="class-import-edit-form"
                                >
                                  <input name="batchId" type="hidden" value={batch.id} />
                                  <input name="rowId" type="hidden" value={row.id} />
                                  <div className="class-import-edit-fields">
                                    <label className="wide-import-field">
                                      <span>{t("label.name")}</span>
                                      <input
                                        name="name"
                                        required
                                        type="text"
                                        defaultValue={String(normalizedRow.name ?? "")}
                                      />
                                    </label>
                                    <label>
                                      <span>{t("label.teacher")}</span>
                                      <select
                                        name="teacherId"
                                        required
                                        defaultValue={String(normalizedRow.teacherId ?? "")}
                                      >
                                        <option value="">{t("label.chooseTeacher")}</option>
                                        {activeTeachers.map((teacher) => (
                                          <option key={teacher.id} value={teacher.id}>
                                            {teacher.name}
                                          </option>
                                        ))}
                                      </select>
                                    </label>
                                    <label>
                                      <span>{t("adminClasses.classType")}</span>
                                      <select
                                        name="classType"
                                        required
                                        defaultValue={String(normalizedRow.classType ?? "REGULAR")}
                                      >
                                        {classTypeOptions.map((option) => (
                                          <option key={option.value} value={option.value}>
                                            {t(option.translationKey)}
                                          </option>
                                        ))}
                                      </select>
                                    </label>
                                    <label>
                                      <span>{t("label.startTime")}</span>
                                      <input
                                        autoComplete="off"
                                        defaultValue={String(normalizedRow.startTime ?? "")}
                                        inputMode="numeric"
                                        maxLength={5}
                                        name="startTime"
                                        pattern="(?:[01]\d|2[0-3]):[0-5]\d"
                                        placeholder="HH:MM"
                                        type="text"
                                      />
                                    </label>
                                    <label>
                                      <span>{t("label.duration")}</span>
                                      <input
                                        autoComplete="off"
                                        defaultValue={
                                          normalizedRow.durationMinutes
                                            ? formatDuration(Number(normalizedRow.durationMinutes))
                                            : ""
                                        }
                                        inputMode="numeric"
                                        maxLength={5}
                                        name="durationMinutes"
                                        pattern="\d{1,2}:[0-5]\d|\d+"
                                        placeholder="HH:MM"
                                        required
                                        type="text"
                                      />
                                    </label>
                                    <label>
                                      <span>{t("adminClasses.book")}</span>
                                      <input
                                        name="book"
                                        type="text"
                                        defaultValue={String(normalizedRow.book ?? "")}
                                      />
                                    </label>
                                    <label>
                                      <span>{t("dashboard.semester")}</span>
                                      <input
                                        max={2}
                                        min={1}
                                        name="semester"
                                        type="number"
                                        defaultValue={String(normalizedRow.semester ?? "")}
                                      />
                                    </label>
                                    <label>
                                      <span>{t("adminClasses.year")}</span>
                                      <input
                                        max={2100}
                                        min={2000}
                                        name="year"
                                        type="number"
                                        defaultValue={String(normalizedRow.year ?? "")}
                                      />
                                    </label>
                                    <fieldset className="wide-import-field">
                                      <legend>{t("adminClasses.days")}</legend>
                                      <div className="checkbox-grid compact-import-weekdays">
                                        {weekdayOptions.map((option) => (
                                          <label className="checkbox-label" key={option.value}>
                                            <input
                                              defaultChecked={selectedWeekdays.includes(option.value)}
                                              name="weekDays"
                                              type="checkbox"
                                              value={option.value}
                                            />
                                            <span>{option.shortLabel}</span>
                                          </label>
                                        ))}
                                      </div>
                                    </fieldset>
                                    <label className="checkbox-label">
                                      <input
                                        defaultChecked={normalizedRow.isActive !== false}
                                        name="isActive"
                                        type="checkbox"
                                      />
                                      <span>{t("label.active")}</span>
                                    </label>
                                  </div>
                                  <div className="class-import-edit-actions">
                                    <button className="secondary-link" type="submit">
                                      {t("imports.saveRow")}
                                    </button>
                                  </div>
                                </form>
                              </details>
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })}
                  {visibleRows.length === 0 ? (
                    <tr>
                      <td colSpan={11}>{t("imports.noRowsForView")}</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        <section className="panel data-panel" aria-labelledby="class-import-history-title">
          <h2 id="class-import-history-title">{t("imports.recentImports")}</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t("label.date")}</th>
                  <th>{t("imports.csvFile")}</th>
                  <th>{t("label.createdBy")}</th>
                  <th>{t("imports.created")}</th>
                  <th>{t("imports.skipped")}</th>
                  <th>{t("imports.duplicate")}</th>
                  <th>{t("imports.failed")}</th>
                  <th>{t("label.action")}</th>
                </tr>
              </thead>
              <tbody>
                {recentBatches.map((importBatch) => (
                  <tr key={importBatch.id}>
                    <td>
                      {formatShortDateTime(
                        importBatch.createdAt,
                        currentUser.dateFormat,
                      )}
                    </td>
                    <td>{importBatch.sourceFilename ?? t("imports.unnamedFile")}</td>
                    <td>{importBatch.createdBy.name}</td>
                    <td>{importBatch.createdCount}</td>
                    <td>{importBatch.skippedCount}</td>
                    <td>{importBatch.duplicatedCount}</td>
                    <td>{importBatch.failedCount}</td>
                    <td>
                      <Link
                        className="text-link"
                        href={`/admin/classes/import?batchId=${importBatch.id}`}
                      >
                        {t("label.view")}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
