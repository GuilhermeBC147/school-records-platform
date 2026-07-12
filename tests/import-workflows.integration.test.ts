import assert from "node:assert/strict";
import test from "node:test";
import { config } from "dotenv";

config({ path: ".env.local" });
config();

let importFunctions: typeof import("@/lib/imports");
let prisma: typeof import("@/lib/prisma")["prisma"];

test.before(async () => {
  importFunctions = await import("@/lib/imports");
  ({ prisma } = await import("@/lib/prisma"));
});

function csv(rows: string[][]) {
  return rows
    .map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(","))
    .join("\r\n");
}

function uniqueSuffix() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function importActors() {
  const [admin, teacher] = await Promise.all([
    prisma.user.findFirst({ where: { isActive: true, role: "ADMIN" }, select: { id: true } }),
    prisma.user.findFirst({
      where: { isActive: true, role: "TEACHER" },
      select: { email: true, id: true },
    }),
  ]);

  assert.ok(admin, "An active admin is required for import integration tests.");
  assert.ok(teacher, "An active teacher is required for class import integration tests.");

  return { admin, teacher };
}

test("student import persists only an accepted valid row from a mixed CSV", async () => {
  const { admin } = await importActors();
  const suffix = uniqueSuffix();
  const validName = `QC Valid Student ${suffix}`;
  const validIdentifier = `QC-S-${suffix}`;
  const duplicateName = `QC Duplicate Student ${suffix}`;
  const duplicateIdentifier = `QC-D-${suffix}`;
  let batchId: string | null = null;

  try {
    await prisma.student.create({
      data: {
        enrollmentIdentifier: duplicateIdentifier,
        fullName: duplicateName,
        isActive: true,
      },
    });

    const preview = await importFunctions.previewStudentImport({
      content: csv([
        ["full_name", "enrollment_identifier", "is_active"],
        [validName, validIdentifier, "true"],
        ["", `QC-I-${suffix}`, "sometimes"],
        [duplicateName, duplicateIdentifier, "true"],
      ]),
      createdById: admin.id,
      sourceFilename: `student-qc-${suffix}.csv`,
    });
    batchId = preview.id;

    const draft = await prisma.importBatch.findUniqueOrThrow({
      where: { id: preview.id },
      include: { rows: { orderBy: { rowNumber: "asc" } } },
    });

    assert.equal(draft.type, "STUDENT");
    assert.equal(draft.status, "DRAFT");
    assert.deepEqual(
      draft.rows.map((row) => row.status),
      ["VALID", "FAILED", "DUPLICATE"],
    );
    assert.equal(draft.failedCount, 1);
    assert.equal(draft.duplicatedCount, 1);

    const acceptedRow = draft.rows.find((row) => row.status === "VALID");
    assert.ok(acceptedRow);
    assert.ok(
      await importFunctions.confirmStudentImport({
        acceptedRowIds: [acceptedRow.id],
        batchId: draft.id,
      }),
    );

    const confirmed = await prisma.importBatch.findUniqueOrThrow({ where: { id: draft.id } });
    assert.equal(confirmed.status, "CONFIRMED");
    assert.equal(confirmed.createdCount, 1);
    assert.equal(confirmed.skippedCount, 2);
    assert.equal(confirmed.failedCount, 1);
    assert.equal(confirmed.duplicatedCount, 1);
    assert.equal(await prisma.student.count({ where: { fullName: validName } }), 1);
    assert.equal(await prisma.student.count({ where: { fullName: duplicateName } }), 1);
  } finally {
    await prisma.student.deleteMany({ where: { fullName: { in: [validName, duplicateName] } } });
    if (batchId) {
      await prisma.importBatch.deleteMany({ where: { id: batchId } });
    }
  }
});

test("class import persists only an accepted valid row from a mixed CSV", async () => {
  const { admin, teacher } = await importActors();
  const suffix = uniqueSuffix();
  const validName = `QC Valid Class ${suffix}`;
  const duplicateName = `QC Duplicate Class ${suffix}`;
  const book = `QC Book ${suffix}`;
  let batchId: string | null = null;

  try {
    await prisma.class.create({
      data: {
        book,
        classType: "REGULAR",
        durationMinutes: 60,
        isActive: true,
        name: duplicateName,
        semester: 1,
        startTime: "10:00",
        teacherId: teacher.id,
        weekDays: ["MONDAY"],
        year: 2026,
      },
    });

    const preview = await importFunctions.previewClassImport({
      content: csv([
        [
          "name",
          "teacher_email",
          "class_type",
          "start_time",
          "duration_minutes",
          "week_days",
          "book",
          "semester",
          "year",
          "is_active",
        ],
        [validName, teacher.email, "REGULAR", "09:00", "60", "TUESDAY;THURSDAY", book, "2", "2026", "true"],
        [`QC Invalid Class ${suffix}`, "missing@example.com", "REGULAR", "25:00", "0", "FUNDAY", book, "3", "1999", "true"],
        [duplicateName, teacher.email, "REGULAR", "10:00", "60", "MONDAY", book, "1", "2026", "true"],
      ]),
      createdById: admin.id,
      sourceFilename: `class-qc-${suffix}.csv`,
    });
    batchId = preview.id;

    const draft = await prisma.importBatch.findUniqueOrThrow({
      where: { id: preview.id },
      include: { rows: { orderBy: { rowNumber: "asc" } } },
    });

    assert.equal(draft.type, "CLASS");
    assert.equal(draft.status, "DRAFT");
    assert.deepEqual(
      draft.rows.map((row) => row.status),
      ["VALID", "FAILED", "DUPLICATE"],
    );
    assert.equal(draft.failedCount, 1);
    assert.equal(draft.duplicatedCount, 1);

    const acceptedRow = draft.rows.find((row) => row.status === "VALID");
    assert.ok(acceptedRow);
    assert.ok(
      await importFunctions.confirmClassImport({
        acceptedRowIds: [acceptedRow.id],
        batchId: draft.id,
      }),
    );

    const confirmed = await prisma.importBatch.findUniqueOrThrow({ where: { id: draft.id } });
    assert.equal(confirmed.status, "CONFIRMED");
    assert.equal(confirmed.createdCount, 1);
    assert.equal(confirmed.skippedCount, 2);
    assert.equal(confirmed.failedCount, 1);
    assert.equal(confirmed.duplicatedCount, 1);
    assert.equal(await prisma.class.count({ where: { name: validName } }), 1);
    assert.equal(await prisma.class.count({ where: { name: duplicateName } }), 1);
  } finally {
    await prisma.class.deleteMany({ where: { name: { in: [validName, duplicateName] } } });
    if (batchId) {
      await prisma.importBatch.deleteMany({ where: { id: batchId } });
    }
  }
});

test.after(async () => {
  await prisma.$disconnect();
});
