"use server";

import { redirect } from "next/navigation";
import {
  confirmClassImport,
  confirmStudentImport,
  previewClassImport,
  previewStudentImport,
  updateClassImportRow,
  updateStudentImportRow,
} from "@/lib/imports";
import { getCurrentUser } from "@/lib/session";

async function requireAdmin() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (currentUser.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return currentUser;
}

async function readCsvFile(formData: FormData) {
  const file = formData.get("csvFile");

  if (!(file instanceof File) || file.size === 0) {
    return null;
  }

  return {
    content: await file.text(),
    filename: file.name || null,
  };
}

function readBatchId(formData: FormData) {
  return String(formData.get("batchId") ?? "").trim();
}

export async function previewStudentImportAction(formData: FormData) {
  const currentUser = await requireAdmin();
  const file = await readCsvFile(formData);

  if (!file) {
    redirect("/admin/students/import?error=missing-file");
  }

  const batch = await previewStudentImport({
    content: file.content,
    createdById: currentUser.id,
    sourceFilename: file.filename,
  });

  redirect(`/admin/students/import?batchId=${batch.id}`);
}

export async function confirmStudentImportAction(formData: FormData) {
  await requireAdmin();

  const batchId = readBatchId(formData);
  const acceptedRowIds = formData
    .getAll("acceptedRowIds")
    .map((rowId) => String(rowId).trim())
    .filter(Boolean);

  if (!batchId) {
    redirect("/admin/students/import?error=invalid-batch");
  }

  if (acceptedRowIds.length === 0) {
    redirect(`/admin/students/import?batchId=${batchId}&error=no-accepted`);
  }

  if (!(await confirmStudentImport({ acceptedRowIds, batchId }))) {
    redirect("/admin/students/import?error=invalid-batch");
  }

  redirect(`/admin/students/import?batchId=${batchId}&status=confirmed`);
}

export async function updateStudentImportRowAction(formData: FormData) {
  await requireAdmin();

  const batchId = readBatchId(formData);
  const rowId = String(formData.get("rowId") ?? "").trim();
  const values = {
    enrollmentIdentifier: formData.get("enrollmentIdentifier"),
    fullName: formData.get("fullName"),
    isActive: formData.get("isActive"),
  };

  const updatedRow =
    batchId && rowId ? await updateStudentImportRow({ batchId, rowId, values }) : null;

  if (!updatedRow) {
    redirect("/admin/students/import?error=invalid-batch");
  }

  if (updatedRow.status === "VALID") {
    redirect(`/admin/students/import?batchId=${batchId}&show=ready&acceptedRowId=${rowId}`);
  }

  redirect(`/admin/students/import?batchId=${batchId}`);
}

export async function previewClassImportAction(formData: FormData) {
  const currentUser = await requireAdmin();
  const file = await readCsvFile(formData);

  if (!file) {
    redirect("/admin/classes/import?error=missing-file");
  }

  const batch = await previewClassImport({
    content: file.content,
    createdById: currentUser.id,
    sourceFilename: file.filename,
  });

  redirect(`/admin/classes/import?batchId=${batch.id}`);
}

export async function confirmClassImportAction(formData: FormData) {
  await requireAdmin();

  const batchId = readBatchId(formData);
  const acceptedRowIds = formData
    .getAll("acceptedRowIds")
    .map((rowId) => String(rowId).trim())
    .filter(Boolean);

  if (!batchId) {
    redirect("/admin/classes/import?error=invalid-batch");
  }

  if (acceptedRowIds.length === 0) {
    redirect(`/admin/classes/import?batchId=${batchId}&error=no-accepted`);
  }

  if (!(await confirmClassImport({ acceptedRowIds, batchId }))) {
    redirect("/admin/classes/import?error=invalid-batch");
  }

  redirect(`/admin/classes/import?batchId=${batchId}&status=confirmed`);
}

export async function updateClassImportRowAction(formData: FormData) {
  await requireAdmin();

  const batchId = readBatchId(formData);
  const rowId = String(formData.get("rowId") ?? "").trim();
  const values = {
    book: formData.get("book"),
    classType: formData.get("classType"),
    durationMinutes: formData.get("durationMinutes"),
    isActive: formData.get("isActive"),
    name: formData.get("name"),
    semester: formData.get("semester"),
    startTime: formData.get("startTime"),
    teacherId: formData.get("teacherId"),
    weekDays: formData.getAll("weekDays"),
    year: formData.get("year"),
  };

  const updatedRow =
    batchId && rowId ? await updateClassImportRow({ batchId, rowId, values }) : null;

  if (!updatedRow) {
    redirect("/admin/classes/import?error=invalid-batch");
  }

  if (updatedRow.status === "VALID") {
    redirect(`/admin/classes/import?batchId=${batchId}&show=ready&acceptedRowId=${rowId}`);
  }

  redirect(`/admin/classes/import?batchId=${batchId}`);
}
