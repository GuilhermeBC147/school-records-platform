import type {
  ClassType,
  ImportBatchType,
  ImportRowStatus,
  Prisma,
  Weekday,
} from "@/generated/prisma/client";
import {
  classTypeOptions,
  readDurationMinutes as readDurationInputMinutes,
  readTimeMinutes,
  weekdayOptions,
  type ClassTypeValue,
} from "@/lib/class-schedule";
import { prisma } from "@/lib/prisma";

type CsvRecord = {
  rowNumber: number;
  values: Record<string, string>;
};

type ImportRowDraft = {
  rowNumber: number;
  rawRow: Record<string, string>;
  normalizedRow: Record<string, unknown>;
  status: ImportRowStatus;
  errors: string[];
  warnings: string[];
};

type ImportCounts = {
  createdCount: number;
  skippedCount: number;
  duplicatedCount: number;
  failedCount: number;
};

const studentHeaders = ["full_name", "enrollment_identifier", "is_active"];
const classHeaders = [
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
];
const validWeekdays = new Set<string>(weekdayOptions.map((option) => option.value));

function csvCell(value: string | number | boolean | null | undefined) {
  const stringValue = String(value ?? "");
  return `"${stringValue.replaceAll('"', '""')}"`;
}

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function duplicateKey(value: string | null | undefined) {
  return normalizeText(value ?? "").toLocaleLowerCase();
}

function readAliasedValue(row: Record<string, string>, aliases: string[]) {
  for (const alias of aliases) {
    const value = row[duplicateKey(alias)];

    if (value !== undefined) {
      return value;
    }
  }

  return "";
}

function optionalText(value: string | null | undefined) {
  const normalized = normalizeText(value ?? "");
  return normalized || null;
}

function parseBoolean(value: string | undefined) {
  const normalized = duplicateKey(value);

  if (!normalized) {
    return true;
  }

  if (["true", "yes", "1"].includes(normalized)) {
    return true;
  }

  if (["false", "no", "0"].includes(normalized)) {
    return false;
  }

  return null;
}

function parsePositiveInteger(value: string | undefined) {
  const normalized = normalizeText(value ?? "");

  if (!/^\d+$/.test(normalized)) {
    return null;
  }

  return Number(normalized);
}

function parseDurationMinutes(value: string | undefined) {
  const normalized = normalizeText(value ?? "");

  if (!normalized) {
    return null;
  }

  return readDurationInputMinutes(normalized);
}

function parseClassType(value: string | undefined, name = "") {
  const normalized = normalizeText(value ?? "").toUpperCase();
  const normalizedName = normalizeText(name).toUpperCase();

  if (normalized === "PERSONAL" || normalizedName.startsWith("PERSONAL")) {
    return "PERSONAL";
  }

  if (normalized === "VIP" || normalizedName.includes(" VIP")) {
    return "VIP";
  }

  if (classTypeOptions.some((option) => option.value === normalized)) {
    return normalized as ClassTypeValue;
  }

  if (!normalized || normalized === "TURMAS" || normalized === "ON-LINE") {
    return "REGULAR";
  }

  return null;
}

function parseActiveStatus(value: string | undefined) {
  const normalized = duplicateKey(value);

  if (["ativo", "ativa", "aberta", "em formação", "em formacao"].includes(normalized)) {
    return true;
  }

  if (["inativo", "inativa", "encerrada", "encerrado"].includes(normalized)) {
    return false;
  }

  return parseBoolean(value);
}

function parseStartTime(value: string | undefined) {
  const normalized = normalizeText(value ?? "");

  if (!normalized) {
    return null;
  }

  return readTimeMinutes(normalized) === null ? undefined : normalized;
}

function parseEndTime(value: string | undefined) {
  return parseStartTime(value);
}

function parseTermFromText(value: string | undefined) {
  const match = normalizeText(value ?? "").match(/\b(20\d{2})\/0?([12])\b/);

  if (!match) {
    return { semester: null, year: null };
  }

  return {
    semester: Number(match[2]),
    year: Number(match[1]),
  };
}

const portugueseWeekdayMap: Record<string, Weekday> = {
  DOM: "SUNDAY",
  QUA: "WEDNESDAY",
  QUI: "THURSDAY",
  SAB: "SATURDAY",
  SEG: "MONDAY",
  SEX: "FRIDAY",
  TER: "TUESDAY",
};

function parsePortugueseSchedule(value: string | undefined) {
  const schedule = normalizeText(value ?? "");
  const matches = Array.from(
    schedule.matchAll(/([A-Za-zÀ-ÿ.]+(?:-[A-Za-zÀ-ÿ.]+)?)\((\d{2}:\d{2})\/(\d{2}:\d{2})\)/g),
  );
  const weekDays = new Set<Weekday>();
  let startTime: string | null = null;
  let earliestStart: number | null = null;
  let latestEnd: number | null = null;
  const invalidWeekdays: string[] = [];

  for (const match of matches) {
    const dayTokens = match[1]
      .split("-")
      .map((day) => day.replaceAll(".", "").slice(0, 3).toUpperCase())
      .filter(Boolean);
    const startMinutes = readTimeMinutes(match[2]);
    const endMinutes = readTimeMinutes(match[3]);

    for (const dayToken of dayTokens) {
      const weekday = portugueseWeekdayMap[dayToken];

      if (weekday) {
        weekDays.add(weekday);
      } else {
        invalidWeekdays.push(dayToken);
      }
    }

    if (startMinutes !== null && endMinutes !== null) {
      if (earliestStart === null || startMinutes < earliestStart) {
        earliestStart = startMinutes;
        startTime = match[2];
      }

      if (latestEnd === null || endMinutes > latestEnd) {
        latestEnd = endMinutes;
      }
    }
  }

  return {
    durationMinutes:
      earliestStart !== null && latestEnd !== null ? latestEnd - earliestStart : null,
    invalidWeekdays,
    startTime,
    weekDays: Array.from(weekDays),
  };
}

function parseTimeRange(value: string | undefined) {
  const text = normalizeText(value ?? "");
  const match = text.match(/\b(\d{1,2}:\d{2})\s*(?:-|\/|a|as|às)\s*(\d{1,2}(?::\d{2})?)\b/i);

  if (!match) {
    return { durationMinutes: null, endTime: null, startTime: null };
  }

  const startTime = parseStartTime(match[1]);
  const endToken = match[2].includes(":") ? match[2] : `${match[2]}:00`;
  const endTime = parseEndTime(endToken.padStart(5, "0"));

  if (!startTime || !endTime) {
    return { durationMinutes: null, endTime: endTime ?? null, startTime: startTime ?? null };
  }

  const startMinutes = readTimeMinutes(startTime);
  const endMinutes = readTimeMinutes(endTime);

  if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) {
    return { durationMinutes: null, endTime, startTime };
  }

  return {
    durationMinutes: endMinutes - startMinutes,
    endTime,
    startTime,
  };
}

function splitCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const next = line[index + 1];

    if (character === '"' && inQuotes && next === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (character === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (character === "," && !inQuotes) {
      cells.push(current);
      current = "";
      continue;
    }

    current += character;
  }

  cells.push(current);

  return cells.map((cell) => cell.trim());
}

export function parseCsv(text: string): CsvRecord[] {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line, index) => ({ line, rowNumber: index + 1 }))
    .filter(({ line }) => line.trim().length > 0);

  if (lines.length === 0) {
    return [];
  }

  const headers = splitCsvLine(lines[0].line).map((header) => duplicateKey(header));

  return lines.slice(1).flatMap(({ line, rowNumber }) => {
    const cells = splitCsvLine(line);
    const values = Object.fromEntries(
      headers.map((header, cellIndex) => [header, cells[cellIndex] ?? ""]),
    );

    if (Object.values(values).every((value) => value.trim() === "")) {
      return [];
    }

    return {
      rowNumber,
      values,
    };
  });
}

export function buildStudentTemplateCsv() {
  return [
    studentHeaders,
    ["Maria Silva", "S-1001", "true"],
  ]
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n");
}

export function buildClassTemplateCsv() {
  return [
    classHeaders,
    [
      "Evening English A2",
      "teacher@example.com",
      "REGULAR",
      "18:00",
      "60",
      "MONDAY;WEDNESDAY",
      "Book 2",
      "1",
      "2026",
      "true",
    ],
  ]
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n");
}

function toCsv(rows: Array<Array<string | number | boolean | null | undefined>>) {
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}

export function buildImportErrorReportCsv(
  type: ImportBatchType,
  rows: Array<{
    rawRow: unknown;
    rowNumber: number;
    errors: string[];
    warnings: string[];
  }>,
) {
  const headers = type === "STUDENT" ? studentHeaders : classHeaders;
  const reportRows = [
    ["row_number", ...headers, "errors", "warnings"],
    ...rows.map((row) => {
      const rawRow = row.rawRow as Record<string, string>;

      return [
        row.rowNumber,
        ...headers.map((header) => rawRow[header] ?? ""),
        row.errors.join("; "),
        row.warnings.join("; "),
      ];
    }),
  ];

  return toCsv(reportRows);
}

async function createPreviewBatch({
  createdById,
  rows,
  sourceFilename,
  type,
}: {
  createdById: string;
  rows: ImportRowDraft[];
  sourceFilename: string | null;
  type: ImportBatchType;
}) {
  const failedCount = rows.filter((row) => row.status === "FAILED").length;
  const duplicatedCount = rows.filter((row) => row.status === "DUPLICATE").length;

  return prisma.importBatch.create({
    data: {
      createdById,
      duplicatedCount,
      failedCount,
      sourceFilename,
      type,
      rows: {
        create: rows.map((row) => ({
          errors: row.errors,
          normalizedRow: row.normalizedRow as Prisma.InputJsonValue,
          rawRow: row.rawRow,
          rowNumber: row.rowNumber,
          status: row.status,
          warnings: row.warnings,
        })),
      },
    },
    select: { id: true },
  });
}

export async function previewStudentImport({
  content,
  createdById,
  sourceFilename,
}: {
  content: string;
  createdById: string;
  sourceFilename: string | null;
}) {
  const records = parseCsv(content);
  const existingStudents = await prisma.student.findMany({
    select: {
      enrollmentIdentifier: true,
      fullName: true,
    },
  });
  const existingNames = new Set(existingStudents.map((student) => duplicateKey(student.fullName)));
  const existingIdentifiers = new Set(
    existingStudents
      .map((student) => duplicateKey(student.enrollmentIdentifier))
      .filter(Boolean),
  );
  const fileNames = new Map<string, number>();
  const fileIdentifiers = new Map<string, number>();

  for (const record of records) {
    const fullNameKey = duplicateKey(
      readAliasedValue(record.values, ["full_name", "nome"]),
    );
    const identifierKey = duplicateKey(
      readAliasedValue(record.values, ["enrollment_identifier"]),
    );

    if (fullNameKey) {
      fileNames.set(fullNameKey, (fileNames.get(fullNameKey) ?? 0) + 1);
    }

    if (identifierKey) {
      fileIdentifiers.set(identifierKey, (fileIdentifiers.get(identifierKey) ?? 0) + 1);
    }
  }

  const rows = records.map((record): ImportRowDraft => {
    const fullName = normalizeText(
      readAliasedValue(record.values, ["full_name", "nome"]),
    );
    const enrollmentIdentifier = optionalText(
      readAliasedValue(record.values, ["enrollment_identifier"]),
    );
    const isActive = parseActiveStatus(
      readAliasedValue(record.values, ["is_active", "situação", "situacao"]),
    );
    const errors: string[] = [];
    const warnings: string[] = [];
    const fullNameKey = duplicateKey(fullName);
    const identifierKey = duplicateKey(enrollmentIdentifier);

    if (!fullName) {
      errors.push("full_name is required.");
    }

    if (isActive === null) {
      errors.push("is_active must be true, false, yes, no, 1, 0, or blank.");
    }

    if (fullNameKey && (fileNames.get(fullNameKey) ?? 0) > 1) {
      warnings.push("Duplicate full_name in this file.");
    }

    if (fullNameKey && existingNames.has(fullNameKey)) {
      warnings.push("A student with this full_name already exists.");
    }

    if (identifierKey && (fileIdentifiers.get(identifierKey) ?? 0) > 1) {
      warnings.push("Duplicate enrollment_identifier in this file.");
    }

    if (identifierKey && existingIdentifiers.has(identifierKey)) {
      warnings.push("A student with this enrollment_identifier already exists.");
    }

    return {
      errors,
      normalizedRow: {
        enrollmentIdentifier,
        fullName,
        isActive: isActive ?? true,
      },
      rawRow: record.values,
      rowNumber: record.rowNumber,
      status: errors.length > 0 ? "FAILED" : warnings.length > 0 ? "DUPLICATE" : "VALID",
      warnings,
    };
  });

  return createPreviewBatch({
    createdById,
    rows,
    sourceFilename,
    type: "STUDENT",
  });
}

function parseWeekdays(value: string | undefined) {
  const weekDays = Array.from(
    new Set(
      normalizeText(value ?? "")
        .split(";")
        .map((item) => item.trim().toUpperCase())
        .filter(Boolean),
    ),
  );
  const invalidWeekdays = weekDays.filter((weekday) => !validWeekdays.has(weekday));

  return {
    invalidWeekdays,
    weekDays: weekDays.filter((weekday): weekday is Weekday =>
      validWeekdays.has(weekday),
    ),
  };
}

function classDuplicateKey(row: {
  book: string | null;
  name: string;
  semester: number | null;
  teacherId: string | null;
  year: number | null;
}) {
  return [
    duplicateKey(row.name),
    duplicateKey(row.book),
    String(row.semester ?? ""),
    String(row.year ?? ""),
    row.teacherId ?? "",
  ].join("|");
}

export async function previewClassImport({
  content,
  createdById,
  sourceFilename,
}: {
  content: string;
  createdById: string;
  sourceFilename: string | null;
}) {
  const records = parseCsv(content);
  const [teachers, existingClasses] = await Promise.all([
    prisma.user.findMany({
      where: { isActive: true, role: "TEACHER" },
      select: { email: true, id: true, name: true },
    }),
    prisma.class.findMany({
      select: {
        book: true,
        name: true,
        semester: true,
        teacherId: true,
        year: true,
      },
    }),
  ]);
  const teachersByEmail = new Map(
    teachers.map((teacher) => [duplicateKey(teacher.email), teacher.id]),
  );
  const teachersByName = new Map(
    teachers.map((teacher) => [duplicateKey(teacher.name), teacher.id]),
  );
  const existingClassKeys = new Set(existingClasses.map(classDuplicateKey));
  const normalizedRecords = records.map((record) => {
    const name = normalizeText(readAliasedValue(record.values, ["name", "nome"]));
    const teacherEmail = normalizeText(
      readAliasedValue(record.values, ["teacher_email"]),
    );
    const teacherName = normalizeText(
      readAliasedValue(record.values, ["teacher_name", "professor"]),
    );
    const teacherId =
      teachersByEmail.get(duplicateKey(teacherEmail)) ??
      teachersByName.get(duplicateKey(teacherName)) ??
      null;
    const classType = parseClassType(
      readAliasedValue(record.values, ["class_type", "modalidade"]),
      name,
    );
    const portugueseSchedule = parsePortugueseSchedule(
      readAliasedValue(record.values, ["horario", "horário"]),
    );
    const nameTimeRange = parseTimeRange(name);
    const explicitStartTime = readAliasedValue(record.values, ["start_time"]);
    const parsedStartTime = parseStartTime(explicitStartTime);
    const startTime = parsedStartTime ?? portugueseSchedule.startTime ?? nameTimeRange.startTime;
    const durationMinutes =
      parseDurationMinutes(readAliasedValue(record.values, ["duration_minutes"])) ??
      portugueseSchedule.durationMinutes ??
      nameTimeRange.durationMinutes;
    const parsedWeekdays = parseWeekdays(
      readAliasedValue(record.values, ["week_days"]),
    );
    const weekDays =
      parsedWeekdays.weekDays.length > 0
        ? parsedWeekdays.weekDays
        : portugueseSchedule.weekDays;
    const invalidWeekdays = [
      ...parsedWeekdays.invalidWeekdays,
      ...portugueseSchedule.invalidWeekdays,
    ];
    const book = optionalText(readAliasedValue(record.values, ["book", "estagio"]));
    const termFromName = parseTermFromText(name);
    const semester =
      parsePositiveInteger(readAliasedValue(record.values, ["semester"])) ??
      termFromName.semester;
    const year =
      parsePositiveInteger(readAliasedValue(record.values, ["year"])) ??
      termFromName.year;
    const isActive = parseActiveStatus(
      readAliasedValue(record.values, [
        "is_active",
        "situacaoturma",
        "situação turma",
        "situacao turma",
      ]),
    );

    return {
      book,
      classType,
      durationMinutes,
      invalidWeekdays,
      isActive,
      name,
      rawRow: record.values,
      rowNumber: record.rowNumber,
      semester,
      startTime,
      startTimeInvalid: explicitStartTime.trim() !== "" && parsedStartTime === undefined,
      teacherEmail,
      teacherName,
      teacherId,
      weekDays,
      year,
    };
  });
  const fileClassKeys = new Map<string, number>();

  for (const record of normalizedRecords) {
    if (record.name && record.teacherId) {
      const key = classDuplicateKey(record);
      fileClassKeys.set(key, (fileClassKeys.get(key) ?? 0) + 1);
    }
  }

  const rows = normalizedRecords.map((record): ImportRowDraft => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const key = classDuplicateKey(record);

    if (!record.name) {
      errors.push("name is required.");
    }

    if (!record.teacherEmail && !record.teacherName) {
      errors.push("teacher_email or Professor is required.");
    } else if (!record.teacherId) {
      errors.push("teacher_email or Professor must match an active teacher account.");
    }

    if (!record.classType) {
      errors.push("class_type must be REGULAR, VIP, PERSONAL, or blank.");
    }

    if (record.startTimeInvalid) {
      errors.push("start_time must use HH:MM or be blank.");
    }

    if (record.durationMinutes === null || record.durationMinutes < 1 || record.durationMinutes > 600) {
      errors.push("duration_minutes must be an integer from 1 to 600.");
    }

    if (record.weekDays.length === 0) {
      errors.push("week_days must include at least one valid weekday.");
    }

    if (record.invalidWeekdays.length > 0) {
      errors.push(`week_days contains invalid values: ${record.invalidWeekdays.join("; ")}.`);
    }

    if (record.semester !== null && ![1, 2].includes(record.semester)) {
      errors.push("semester must be 1, 2, or blank.");
    }

    if (record.year !== null && (record.year < 2000 || record.year > 2100)) {
      errors.push("year must be from 2000 to 2100 or blank.");
    }

    if (record.isActive === null) {
      errors.push("is_active must be true, false, yes, no, 1, 0, or blank.");
    }

    if (record.name && record.teacherId && (fileClassKeys.get(key) ?? 0) > 1) {
      warnings.push("Duplicate class name/book/semester/year/teacher combination in this file.");
    }

    if (record.name && record.teacherId && existingClassKeys.has(key)) {
      warnings.push("A class with this name/book/semester/year/teacher combination already exists.");
    }

    return {
      errors,
      normalizedRow: {
        book: record.book,
        classType: record.classType ?? "REGULAR",
        durationMinutes: record.durationMinutes,
        isActive: record.isActive ?? true,
        name: record.name,
        semester: record.semester,
        startTime: record.startTime ?? null,
        teacherEmail: record.teacherEmail,
        teacherName: record.teacherName,
        teacherId: record.teacherId,
        weekDays: record.weekDays,
        year: record.year,
      },
      rawRow: record.rawRow,
      rowNumber: record.rowNumber,
      status: errors.length > 0 ? "FAILED" : warnings.length > 0 ? "DUPLICATE" : "VALID",
      warnings,
    };
  });

  return createPreviewBatch({
    createdById,
    rows,
    sourceFilename,
    type: "CLASS",
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function confirmStudentImport({
  acceptedRowIds,
  batchId,
}: {
  acceptedRowIds: string[];
  batchId: string;
}) {
  const batch = await prisma.importBatch.findUnique({
    where: { id: batchId },
    include: { rows: { orderBy: { rowNumber: "asc" } } },
  });

  if (!batch || batch.type !== "STUDENT" || batch.status !== "DRAFT") {
    return null;
  }

  if (
    acceptedRowIds.length === 0 ||
    acceptedRowIds.some(
      (rowId) => !batch.rows.some((row) => row.id === rowId && row.status === "VALID"),
    )
  ) {
    return null;
  }

  const acceptedRowIdSet = new Set(acceptedRowIds);
  let createdCount = 0;
  let duplicatedCount = batch.rows.filter((row) => row.status === "DUPLICATE").length;
  const failedCount = batch.rows.filter((row) => row.status === "FAILED").length;

  for (const row of batch.rows.filter(
    (item) => item.status === "VALID" && acceptedRowIdSet.has(item.id),
  )) {
    const normalizedRow = row.normalizedRow;

    if (!isRecord(normalizedRow)) {
      await prisma.importRow.update({
        where: { id: row.id },
        data: { errors: ["Stored import row is invalid."], status: "FAILED" },
      });
      continue;
    }

    const fullName = String(normalizedRow.fullName ?? "").trim();
    const enrollmentIdentifier = optionalText(String(normalizedRow.enrollmentIdentifier ?? ""));
    const existing = await prisma.student.findFirst({
      where: {
        OR: [
          { fullName: { equals: fullName, mode: "insensitive" } },
          ...(enrollmentIdentifier ? [{ enrollmentIdentifier }] : []),
        ],
      },
      select: { id: true },
    });

    if (existing) {
      duplicatedCount += 1;
      await prisma.importRow.update({
        where: { id: row.id },
        data: {
          status: "DUPLICATE",
          warnings: [...row.warnings, "A duplicate student was found before confirmation."],
        },
      });
      continue;
    }

    const student = await prisma.student.create({
      data: {
        enrollmentIdentifier,
        fullName,
        isActive: Boolean(normalizedRow.isActive),
      },
      select: { id: true },
    });
    createdCount += 1;

    await prisma.importRow.update({
      where: { id: row.id },
      data: {
        createdRecordId: student.id,
        status: "CREATED",
      },
    });
  }

  const skippedCount = batch.rows.length - createdCount;

  return prisma.importBatch.update({
    where: { id: batch.id },
    data: {
      createdCount,
      duplicatedCount,
      failedCount,
      skippedCount,
      status: "CONFIRMED",
    },
    select: { id: true },
  });
}

export async function updateStudentImportRow({
  batchId,
  rowId,
  values,
}: {
  batchId: string;
  rowId: string;
  values: Record<string, unknown>;
}) {
  const batch = await prisma.importBatch.findFirst({
    where: { id: batchId, status: "DRAFT", type: "STUDENT" },
    select: { id: true },
  });

  if (!batch) {
    return null;
  }

  const existingRow = await prisma.importRow.findFirst({
    where: { id: rowId, importBatchId: batch.id, status: { in: ["FAILED", "VALID"] } },
    select: { id: true, normalizedRow: true, status: true, warnings: true },
  });

  if (!existingRow || !isRecord(existingRow.normalizedRow)) {
    return null;
  }

  const existingNormalizedRow = existingRow.normalizedRow;
  const fullName = normalizeText(String(values.fullName ?? existingNormalizedRow.fullName ?? ""));
  const enrollmentIdentifier = optionalText(String(values.enrollmentIdentifier ?? ""));
  const isActive = values.isActive === "on";
  const errors: string[] = [];

  if (!fullName) {
    errors.push("full_name is required.");
  }

  const normalizedRow = {
    enrollmentIdentifier,
    fullName,
    isActive,
  };

  const updatedRow = await prisma.importRow.update({
    where: { id: existingRow.id },
    data: {
      errors,
      normalizedRow: normalizedRow as Prisma.InputJsonValue,
      status: errors.length > 0 ? "FAILED" : "VALID",
      warnings: errors.length > 0 ? existingRow.warnings : [],
    },
    select: { id: true, status: true },
  });
  const rows = await prisma.importRow.findMany({
    where: { importBatchId: batch.id },
    select: { status: true },
  });

  await prisma.importBatch.update({
    where: { id: batch.id },
    data: {
      duplicatedCount: rows.filter((row) => row.status === "DUPLICATE").length,
      failedCount: rows.filter((row) => row.status === "FAILED").length,
    },
  });

  return updatedRow;
}

export async function confirmClassImport({
  acceptedRowIds,
  batchId,
}: {
  acceptedRowIds: string[];
  batchId: string;
}) {
  const batch = await prisma.importBatch.findUnique({
    where: { id: batchId },
    include: { rows: { orderBy: { rowNumber: "asc" } } },
  });

  if (
    !batch ||
    batch.type !== "CLASS" ||
    batch.status !== "DRAFT" ||
    acceptedRowIds.length === 0
  ) {
    return null;
  }

  const acceptedRowIdSet = new Set(acceptedRowIds);
  let createdCount = 0;
  let duplicatedCount = batch.rows.filter((row) => row.status === "DUPLICATE").length;
  const failedCount = batch.rows.filter((row) => row.status === "FAILED").length;

  for (const row of batch.rows.filter(
    (item) => item.status === "VALID" && acceptedRowIdSet.has(item.id),
  )) {
    const normalizedRow = row.normalizedRow;

    if (!isRecord(normalizedRow)) {
      await prisma.importRow.update({
        where: { id: row.id },
        data: { errors: ["Stored import row is invalid."], status: "FAILED" },
      });
      continue;
    }

    const duplicate = await prisma.class.findFirst({
      where: {
        book: normalizedRow.book === null ? null : String(normalizedRow.book),
        name: { equals: String(normalizedRow.name ?? ""), mode: "insensitive" },
        semester: normalizedRow.semester === null ? null : Number(normalizedRow.semester),
        teacherId: String(normalizedRow.teacherId ?? ""),
        year: normalizedRow.year === null ? null : Number(normalizedRow.year),
      },
      select: { id: true },
    });

    if (duplicate) {
      duplicatedCount += 1;
      await prisma.importRow.update({
        where: { id: row.id },
        data: {
          status: "DUPLICATE",
          warnings: [...row.warnings, "A duplicate class was found before confirmation."],
        },
      });
      continue;
    }

    const schoolClass = await prisma.class.create({
      data: {
        book: normalizedRow.book === null ? null : String(normalizedRow.book),
        classType: String(normalizedRow.classType ?? "REGULAR") as ClassType,
        durationMinutes: Number(normalizedRow.durationMinutes),
        isActive: Boolean(normalizedRow.isActive),
        name: String(normalizedRow.name ?? ""),
        semester: normalizedRow.semester === null ? null : Number(normalizedRow.semester),
        startTime: normalizedRow.startTime === null ? null : String(normalizedRow.startTime),
        teacherId: String(normalizedRow.teacherId ?? ""),
        weekDays: normalizedRow.weekDays as Weekday[],
        year: normalizedRow.year === null ? null : Number(normalizedRow.year),
      },
      select: { id: true },
    });
    createdCount += 1;

    await prisma.importRow.update({
      where: { id: row.id },
      data: {
        createdRecordId: schoolClass.id,
        status: "CREATED",
      },
    });
  }

  const skippedCount = batch.rows.length - createdCount;

  return prisma.importBatch.update({
    where: { id: batch.id },
    data: {
      createdCount,
      duplicatedCount,
      failedCount,
      skippedCount,
      status: "CONFIRMED",
    },
    select: { id: true },
  });
}

function readManualWeekdays(values: Record<string, unknown>) {
  const rawWeekdays = values.weekDays;

  if (!Array.isArray(rawWeekdays)) {
    return [];
  }

  return Array.from(
    new Set(
      rawWeekdays
        .map((weekday) => String(weekday).trim().toUpperCase())
        .filter((weekday): weekday is Weekday => validWeekdays.has(weekday)),
    ),
  );
}

function readManualTermNumber(value: unknown) {
  const normalized = normalizeText(String(value ?? ""));

  if (!normalized) {
    return null;
  }

  if (!/^\d+$/.test(normalized)) {
    return undefined;
  }

  return Number(normalized);
}

export async function updateClassImportRow({
  batchId,
  rowId,
  values,
}: {
  batchId: string;
  rowId: string;
  values: Record<string, unknown>;
}) {
  const batch = await prisma.importBatch.findFirst({
    where: { id: batchId, status: "DRAFT", type: "CLASS" },
    select: { id: true },
  });

  if (!batch) {
    return null;
  }

  const existingRow = await prisma.importRow.findFirst({
    where: { id: rowId, importBatchId: batch.id, status: { in: ["FAILED", "VALID"] } },
    select: { id: true, normalizedRow: true, status: true, warnings: true },
  });

  if (!existingRow || !isRecord(existingRow.normalizedRow)) {
    return null;
  }

  const existingNormalizedRow = existingRow.normalizedRow;
  const teacherId = normalizeText(String(values.teacherId ?? ""));
  const teacher = teacherId
    ? await prisma.user.findFirst({
        where: { id: teacherId, isActive: true, role: "TEACHER" },
        select: { email: true, id: true, name: true },
      })
    : null;
  const name = normalizeText(String(values.name ?? existingNormalizedRow.name ?? ""));
  const classType = parseClassType(String(values.classType ?? ""), name);
  const rawStartTime = normalizeText(String(values.startTime ?? ""));
  const startTime = rawStartTime ? parseStartTime(rawStartTime) : null;
  const durationMinutes = parseDurationMinutes(String(values.durationMinutes ?? ""));
  const weekDays = readManualWeekdays(values);
  const semester = readManualTermNumber(values.semester);
  const year = readManualTermNumber(values.year);
  const errors: string[] = [];

  if (!name) {
    errors.push("name is required.");
  }

  if (!teacher) {
    errors.push("teacher_email or Professor must match an active teacher account.");
  }

  if (!classType) {
    errors.push("class_type must be REGULAR, VIP, PERSONAL, or blank.");
  }

  if (rawStartTime && startTime === undefined) {
    errors.push("start_time must use HH:MM or be blank.");
  }

  if (durationMinutes === null || durationMinutes < 1 || durationMinutes > 600) {
    errors.push("duration_minutes must be an integer from 1 to 600.");
  }

  if (weekDays.length === 0) {
    errors.push("week_days must include at least one valid weekday.");
  }

  if (semester === undefined || (semester !== null && ![1, 2].includes(semester))) {
    errors.push("semester must be 1, 2, or blank.");
  }

  if (year === undefined || (year !== null && (year < 2000 || year > 2100))) {
    errors.push("year must be from 2000 to 2100 or blank.");
  }

  const normalizedRow = {
    book: optionalText(String(values.book ?? "")),
    classType: classType ?? "REGULAR",
    durationMinutes,
    isActive: values.isActive === "on",
    name,
    semester: semester ?? null,
    startTime: startTime ?? null,
    teacherEmail: teacher?.email ?? "",
    teacherId: teacher?.id ?? null,
    teacherName: teacher?.name ?? "",
    weekDays,
    year: year ?? null,
  };

  const updatedRow = await prisma.importRow.update({
    where: { id: existingRow.id },
    data: {
      errors,
      normalizedRow: normalizedRow as Prisma.InputJsonValue,
      status: errors.length > 0 ? "FAILED" : "VALID",
      warnings: errors.length > 0 ? existingRow.warnings : [],
    },
    select: { id: true, status: true },
  });
  const rows = await prisma.importRow.findMany({
    where: { importBatchId: batch.id },
    select: { status: true },
  });

  await prisma.importBatch.update({
    where: { id: batch.id },
    data: {
      duplicatedCount: rows.filter((row) => row.status === "DUPLICATE").length,
      failedCount: rows.filter((row) => row.status === "FAILED").length,
    },
  });

  return updatedRow;
}

export function summarizeRows(rows: Array<{ status: ImportRowStatus }>): ImportCounts {
  const createdCount = rows.filter((row) => row.status === "CREATED").length;
  const duplicatedCount = rows.filter((row) => row.status === "DUPLICATE").length;
  const failedCount = rows.filter((row) => row.status === "FAILED").length;

  return {
    createdCount,
    duplicatedCount,
    failedCount,
    skippedCount: rows.length - createdCount,
  };
}
