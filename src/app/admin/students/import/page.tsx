import Link from "next/link";
import { redirect } from "next/navigation";
import { Fragment } from "react";
import {
  confirmStudentImportAction,
  previewStudentImportAction,
  updateStudentImportRowAction,
} from "@/app/actions/imports";
import { AppTopbar } from "@/app/components/app-topbar";
import { formatShortDateTime } from "@/lib/date-format";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getTranslations, type TranslationKey } from "@/lib/translations";

export const dynamic = "force-dynamic";

type StudentImportPageProps = {
  searchParams: Promise<{
    acceptedRowId?: string;
    batchId?: string;
    error?: string;
    show?: string;
    status?: string;
  }>;
};

type StudentImportViewMode = "failed" | "ready" | "duplicates" | "all";

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
    "A duplicate student was found before confirmation.":
      "imports.validation.duplicateStudentBeforeConfirmation",
    "A student with this enrollment_identifier already exists.":
      "imports.validation.studentIdentifierAlreadyExists",
    "A student with this full_name already exists.":
      "imports.validation.studentNameAlreadyExists",
    "Duplicate enrollment_identifier in this file.":
      "imports.validation.duplicateStudentIdentifierInFile",
    "Duplicate full_name in this file.": "imports.validation.duplicateStudentNameInFile",
    "Stored import row is invalid.": "imports.validation.storedRowInvalid",
    "full_name is required.": "imports.validation.fullNameRequired",
    "is_active must be true, false, yes, no, 1, 0, or blank.":
      "imports.validation.activeInvalid",
  };
  const translationKey = staticMessages[message];

  return translationKey ? t(translationKey) : message;
}

function formatImportMessages(
  messages: string[],
  t: ReturnType<typeof getTranslations>,
) {
  return messages.map((message) => formatImportMessage(message, t)).join("; ") || "-";
}

function getViewMode(show: string | undefined): StudentImportViewMode {
  if (show === "ready" || show === "duplicates" || show === "all") {
    return show;
  }

  return "failed";
}

function buildBatchHref(batchId: string, viewMode: StudentImportViewMode) {
  const showParam = viewMode === "failed" ? "" : `&show=${viewMode}`;

  return `/admin/students/import?batchId=${batchId}${showParam}`;
}

export default async function StudentImportPage({
  searchParams,
}: StudentImportPageProps) {
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
  const [batch, recentBatches] = await Promise.all([
    params.batchId
      ? prisma.importBatch.findFirst({
          where: { id: params.batchId, type: "STUDENT" },
          include: { rows: { orderBy: { rowNumber: "asc" } } },
        })
      : null,
    prisma.importBatch.findMany({
      where: { type: "STUDENT" },
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
        <section className="intro" aria-labelledby="student-import-title">
          <Link className="text-link" href="/admin/students">
            {t("adminStudents.backToStudents")}
          </Link>
          <p className="eyebrow">{t("adminStudents.adminSetup")}</p>
          <h1 id="student-import-title">{t("imports.studentImportTitle")}</h1>
          <p className="lede">{t("imports.studentImportCopy")}</p>
          <div className="action-row">
            <Link className="secondary-link" href="/admin/students/import/template">
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
          <p className="form-error">{t("imports.noAcceptedStudentRows")}</p>
        ) : null}
        {params.status === "confirmed" ? (
          <p className="form-success">{t("imports.confirmed")}</p>
        ) : null}

        <section className="panel" aria-labelledby="student-import-upload-title">
          <h2 id="student-import-upload-title">{t("imports.uploadCsv")}</h2>
          <p className="muted-copy">{t("imports.studentColumns")}</p>
          <form action={previewStudentImportAction} className="admin-form">
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
          <section className="panel data-panel" aria-labelledby="student-import-preview-title">
            <div className="section-heading-row">
              <div>
                <h2 id="student-import-preview-title">{t("imports.importPreview")}</h2>
                <p className="muted-copy">
                  {batch.sourceFilename ?? t("imports.unnamedFile")} |{" "}
                  {formatRowStatus(batch.status, t)}
                </p>
              </div>
              <div className="action-row">
                {blockedRows > 0 ? (
                  <Link
                    className="secondary-link"
                    href={`/admin/students/import/error-report?batchId=${batch.id}`}
                  >
                    {t("imports.downloadErrorReport")}
                  </Link>
                ) : null}
                {batch.status === "DRAFT" &&
                validRows > 0 &&
                (viewMode === "ready" || viewMode === "all") ? (
                  <form action={confirmStudentImportAction} id="confirm-student-import-form">
                    <input name="batchId" type="hidden" value={batch.id} />
                    <button className="primary-button" type="submit">
                      {t("imports.acceptSelectedStudents")}
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
              <table className="student-import-table">
                <colgroup>
                  <col className="import-accept-column" />
                  <col className="import-row-number-column" />
                  <col className="import-status-column" />
                  <col className="student-import-name-column" />
                  <col className="student-import-identifier-column" />
                  <col className="import-message-column" />
                  <col className="import-message-column" />
                </colgroup>
                <thead>
                  <tr>
                    <th className="import-center-cell">{t("imports.acceptForImport")}</th>
                    <th className="import-center-cell">{t("imports.row")}</th>
                    <th>{t("imports.status")}</th>
                    <th>{t("adminStudents.fullName")}</th>
                    <th>{t("adminStudents.enrollmentIdentifier")}</th>
                    <th>{t("imports.errors")}</th>
                    <th>{t("imports.warnings")}</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((row) => {
                    const normalizedRow = row.normalizedRow as Record<
                      string,
                      boolean | string | null
                    >;

                    return (
                      <Fragment key={row.id}>
                        <tr className={`import-row import-row-${row.status.toLowerCase()}`}>
                          <td className="import-accept-cell">
                            {batch.status === "DRAFT" && row.status === "VALID" ? (
                              <input
                                aria-label={`${t("imports.acceptForImport")} ${normalizedRow.fullName ?? ""}`}
                                defaultChecked={row.id === acceptedRowId}
                                form="confirm-student-import-form"
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
                          <td className="import-class-name">{normalizedRow.fullName ?? ""}</td>
                          <td>{normalizedRow.enrollmentIdentifier ?? "-"}</td>
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
                            <td colSpan={7}>
                              <details className="import-row-details">
                                <summary>{t("imports.editRow")}</summary>
                                <form
                                  action={updateStudentImportRowAction}
                                  className="student-import-edit-form"
                                >
                                  <input name="batchId" type="hidden" value={batch.id} />
                                  <input name="rowId" type="hidden" value={row.id} />
                                  <div className="student-import-edit-fields">
                                    <label>
                                      <span>{t("adminStudents.fullName")}</span>
                                      <input
                                        defaultValue={String(normalizedRow.fullName ?? "")}
                                        name="fullName"
                                        required
                                        type="text"
                                      />
                                    </label>
                                    <label>
                                      <span>{t("adminStudents.enrollmentIdentifier")}</span>
                                      <input
                                        defaultValue={String(
                                          normalizedRow.enrollmentIdentifier ?? "",
                                        )}
                                        name="enrollmentIdentifier"
                                        type="text"
                                      />
                                    </label>
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
                      <td colSpan={7}>{t("imports.noRowsForView")}</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        <section className="panel data-panel" aria-labelledby="student-import-history-title">
          <h2 id="student-import-history-title">{t("imports.recentImports")}</h2>
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
                        href={`/admin/students/import?batchId=${importBatch.id}`}
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
