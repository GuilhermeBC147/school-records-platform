import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import { config } from "dotenv";
import { Pool } from "pg";
import { hashPassword } from "../../src/lib/password";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

const suffix = `${Date.now().toString(36)}${Math.random()
  .toString(36)
  .slice(2, 8)}`;
const password = "Browser-QC-Password-123!";
const adminEmail = `qc.admin.${suffix}@example.test`;
const teacherEmail = `qc.teacher.${suffix}@example.test`;
const managedAccountEmail = `qc.reception.${suffix}@example.test`;
const adminName = `Browser QC Admin ${suffix}`;
const teacherName = `Browser QC Teacher ${suffix}`;
const managedAccountName = `Browser QC Reception ${suffix}`;
const className = `Browser QC Class ${suffix}`;
const studentName = `Browser QC Student ${suffix}`;
const submittedLessonName = `Browser QC Submitted ${suffix}`;
const adminId = `qc_admin_${suffix}`;
const teacherId = `qc_teacher_${suffix}`;
const classId = `qc_class_${suffix}`;
const studentId = `qc_student_${suffix}`;

let pool: Pool | undefined;

async function login(page: Page, email: string) {
  await page.goto("/login?locale=PT_BR");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('form button[type="submit"]').click();
  await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
}

async function clearSession(page: Page) {
  await page.context().clearCookies();
  await page.goto("/login?locale=PT_BR");
}

async function cleanupFixtures() {
  if (!pool) {
    return;
  }

  await pool.query(
    `DELETE FROM "StudentRiskResolution"
     WHERE "classId" = $1 OR "studentId" = $2`,
    [classId, studentId],
  );
  await pool.query(
    `DELETE FROM "AttendanceRecord"
     WHERE "lessonId" IN (SELECT "id" FROM "Lesson" WHERE "classId" = $1)`,
    [classId],
  );
  await pool.query(
    `DELETE FROM "HomeworkRecord"
     WHERE "lessonId" IN (SELECT "id" FROM "Lesson" WHERE "classId" = $1)`,
    [classId],
  );
  await pool.query(`DELETE FROM "PartialEvaluationGrade" WHERE "classId" = $1`, [
    classId,
  ]);
  await pool.query(`DELETE FROM "TestGrade" WHERE "classId" = $1`, [classId]);
  await pool.query(`DELETE FROM "Enrollment" WHERE "classId" = $1`, [classId]);
  await pool.query(`DELETE FROM "Lesson" WHERE "classId" = $1`, [classId]);
  await pool.query(`DELETE FROM "Class" WHERE "id" = $1`, [classId]);
  await pool.query(`DELETE FROM "Student" WHERE "id" = $1`, [studentId]);
  await pool.query(
    `DELETE FROM "PasswordResetToken"
     WHERE "userId" IN (
       SELECT "id" FROM "User" WHERE "email" = ANY($1::text[])
     )`,
    [[adminEmail, teacherEmail, managedAccountEmail]],
  );
  await pool.query(`DELETE FROM "User" WHERE "email" = ANY($1::text[])`, [
    [managedAccountEmail, teacherEmail, adminEmail],
  ]);
}

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  assert.ok(process.env.DATABASE_URL, "DATABASE_URL is required for browser QC.");
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  await cleanupFixtures();

  const passwordHash = hashPassword(password);

  await pool.query(
    `INSERT INTO "User" (
       "id", "name", "email", "passwordHash", "role", "dateFormat",
       "locale", "theme", "isActive", "updatedAt"
     ) VALUES
       ($1, $2, $3, $4, 'ADMIN', 'DD_MM_YY', 'PT_BR', 'LIGHT', TRUE, NOW()),
       ($5, $6, $7, $4, 'TEACHER', 'DD_MM_YY', 'PT_BR', 'LIGHT', TRUE, NOW())`,
    [adminId, adminName, adminEmail, passwordHash, teacherId, teacherName, teacherEmail],
  );
  await pool.query(
    `INSERT INTO "Student" (
       "id", "fullName", "enrollmentIdentifier", "isActive", "updatedAt"
     ) VALUES ($1, $2, $3, TRUE, NOW())`,
    [studentId, studentName, `BROWSER-QC-${suffix}`],
  );
  await pool.query(
    `INSERT INTO "Class" (
       "id", "name", "classType", "book", "semester", "year", "startTime",
       "durationMinutes", "weekDays", "isActive", "teacherId", "updatedAt"
     ) VALUES (
       $1, $2, 'REGULAR', $3, 1, 2031, '09:00', 60,
       ARRAY['MONDAY']::"Weekday"[], TRUE, $4, NOW()
     )`,
    [classId, className, `Browser QC Book ${suffix}`, teacherId],
  );
  await pool.query(
    `INSERT INTO "Enrollment" (
       "id", "status", "classId", "studentId", "updatedAt"
     ) VALUES ($1, 'ACTIVE', $2, $3, NOW())`,
    [`qc_enrollment_${suffix}`, classId, studentId],
  );

  for (const [index, lessonDate] of [
    "2031-02-01T03:00:00.000Z",
    "2031-02-02T03:00:00.000Z",
    "2031-02-03T03:00:00.000Z",
  ].entries()) {
    const lessonId = `qc_lesson_${index}_${suffix}`;
    await pool.query(
      `INSERT INTO "Lesson" (
         "id", "name", "lessonDate", "status", "submittedAt", "classId",
         "submittedById", "taughtById", "updatedAt"
       ) VALUES ($1, $2, $3, 'SUBMITTED', $3, $4, $5, $5, NOW())`,
      [
        lessonId,
        `Browser QC History ${index + 1} ${suffix}`,
        new Date(lessonDate),
        classId,
        teacherId,
      ],
    );
    await pool.query(
      `INSERT INTO "AttendanceRecord" (
         "id", "status", "lessonId", "studentId", "updatedAt"
       ) VALUES ($1, 'ABSENT', $2, $3, NOW())`,
      [`qc_attendance_${index}_${suffix}`, lessonId, studentId],
    );
    await pool.query(
      `INSERT INTO "HomeworkRecord" (
         "id", "status", "lessonId", "studentId", "updatedAt"
       ) VALUES ($1, 'INCOMPLETE', $2, $3, NOW())`,
      [`qc_homework_${index}_${suffix}`, lessonId, studentId],
    );
  }
});

test.afterAll(async () => {
  await cleanupFixtures();
  await pool?.end();
});

test("critical teacher, grading, account, and admin review workflows persist correctly", async ({
  page,
}) => {
  assert.ok(pool);
  const database = pool;
  const browserErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      browserErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => browserErrors.push(error.message));

  await login(page, teacherEmail);
  await page.goto(`/dashboard/classes/${classId}/record`);
  await page.locator('input[name="lessonName"]').fill(submittedLessonName);
  await page
    .locator('.date-input-group input[type="text"]')
    .fill("04/02/31");
  await page.locator('textarea[name="notes"]').fill("Browser PostgreSQL evidence");

  const studentRow = page.locator(".student-record-row").filter({ hasText: studentName });
  await expect(studentRow).toBeVisible();
  await studentRow.locator('input[name^="attendance:"]').uncheck();
  await studentRow.locator('input[name^="homework:"]').uncheck();
  await page.locator(".record-form button.primary-button").click();
  await expect(page).toHaveURL(`/dashboard/classes/${classId}`);

  const lessonResult = await pool.query(
    `SELECT "id", "status", "submittedById", "taughtById", "lessonDate"
     FROM "Lesson" WHERE "classId" = $1 AND "name" = $2`,
    [classId, submittedLessonName],
  );
  assert.equal(lessonResult.rowCount, 1);
  const submittedLesson = lessonResult.rows[0];
  assert.equal(submittedLesson.status, "SUBMITTED");
  assert.equal(submittedLesson.submittedById, teacherId);
  assert.equal(submittedLesson.taughtById, teacherId);
  const storedLessonDate = new Date(submittedLesson.lessonDate);
  assert.deepEqual(
    [
      storedLessonDate.getFullYear(),
      storedLessonDate.getMonth() + 1,
      storedLessonDate.getDate(),
    ],
    [2031, 2, 4],
  );

  const recordStatuses = await pool.query(
    `SELECT attendance."status" AS "attendance", homework."status" AS "homework"
     FROM "AttendanceRecord" attendance
     INNER JOIN "HomeworkRecord" homework
       ON homework."lessonId" = attendance."lessonId"
      AND homework."studentId" = attendance."studentId"
     WHERE attendance."lessonId" = $1 AND attendance."studentId" = $2`,
    [submittedLesson.id, studentId],
  );
  assert.deepEqual(recordStatuses.rows, [
    { attendance: "ABSENT", homework: "INCOMPLETE" },
  ]);

  await page
    .locator(`select[name="partial:${studentId}:CLASS_7"]`)
    .selectOption("B");
  await page
    .locator(`select[name="oral:${studentId}:MID_TERM"]`)
    .selectOption("C");
  await page
    .locator(`input[name="composition:${studentId}:MID_TERM"]`)
    .fill("1");
  await page.locator(`input[name="written:${studentId}:MID_TERM"]`).fill("5");
  await page.locator(".grade-form button.primary-button").click();
  await expect(page).toHaveURL(`/dashboard/classes/${classId}?grades=saved`);

  const partialGrade = await pool.query(
    `SELECT "grade" FROM "PartialEvaluationGrade"
     WHERE "classId" = $1 AND "studentId" = $2 AND "period" = 'CLASS_7'`,
    [classId, studentId],
  );
  assert.deepEqual(partialGrade.rows, [{ grade: "B" }]);
  const midTerm = await pool.query(
    `SELECT "oralGrade", "compositionScore", "writtenTestScore"
     FROM "TestGrade"
     WHERE "classId" = $1 AND "studentId" = $2 AND "period" = 'MID_TERM'`,
    [classId, studentId],
  );
  assert.equal(midTerm.rows[0].oralGrade, "C");
  assert.equal(Number(midTerm.rows[0].compositionScore), 1);
  assert.equal(Number(midTerm.rows[0].writtenTestScore), 5);

  await clearSession(page);
  await login(page, adminEmail);
  await page.goto(`/admin/records?classId=${classId}&studentId=${studentId}`);
  await expect(
    page.locator("article.record-review").filter({ hasText: submittedLessonName }),
  ).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.locator('a[href^="/admin/records/export"]').click();
  const download = await downloadPromise;
  const downloadPath = await download.path();
  assert.ok(downloadPath, "The submitted-record export should download a CSV file.");
  const exportedCsv = await readFile(downloadPath, "utf8");
  assert.match(exportedCsv, new RegExp(submittedLessonName));
  assert.match(exportedCsv, new RegExp(studentName));

  const thresholdCounts = await pool.query(
    `SELECT
       COUNT(*) FILTER (WHERE attendance."status" = 'ABSENT')::int AS "absences",
       COUNT(*) FILTER (WHERE homework."status" = 'INCOMPLETE')::int AS "incompleteHomework"
     FROM "Lesson" lesson
     INNER JOIN "AttendanceRecord" attendance ON attendance."lessonId" = lesson."id"
     INNER JOIN "HomeworkRecord" homework
       ON homework."lessonId" = lesson."id"
      AND homework."studentId" = attendance."studentId"
     WHERE lesson."classId" = $1 AND attendance."studentId" = $2`,
    [classId, studentId],
  );
  assert.deepEqual(thresholdCounts.rows, [{ absences: 4, incompleteHomework: 4 }]);

  await page.goto(`/admin/risk?classId=${classId}&resolutionStatus=unresolved`);
  let riskRow = page.locator("tbody tr").filter({ hasText: studentName });
  await expect(riskRow).toBeVisible();
  await riskRow
    .locator('form:has(input[name="resolvedThroughDate"]) button')
    .click();
  await expect
    .poll(async () =>
      Number(
        (
          await database.query(
            `SELECT COUNT(*)::int AS "count" FROM "StudentRiskResolution"
             WHERE "classId" = $1 AND "studentId" = $2`,
            [classId, studentId],
          )
        ).rows[0].count,
      ),
    )
    .toBe(1);
  await expect(page.locator("tbody tr").filter({ hasText: studentName })).toHaveCount(0);

  await page.goto(`/admin/risk?classId=${classId}&resolutionStatus=resolved`);
  riskRow = page.locator("tbody tr").filter({ hasText: studentName });
  await expect(riskRow).toBeVisible();
  await riskRow.locator("form button").click();
  await expect
    .poll(async () =>
      Number(
        (
          await database.query(
            `SELECT COUNT(*)::int AS "count" FROM "StudentRiskResolution"
             WHERE "classId" = $1 AND "studentId" = $2`,
            [classId, studentId],
          )
        ).rows[0].count,
      ),
    )
    .toBe(0);

  await page.goto("/admin/manage-accounts/new");
  await page.locator('input[name="name"]').fill(managedAccountName);
  await page.locator('input[name="email"]').fill(managedAccountEmail);
  await page.locator('select[name="role"]').selectOption("RECEPTION");
  await page.locator('input[name="password"]').fill(password);
  await page.locator(".admin-form button.primary-button").click();
  await expect(page).toHaveURL("/admin/manage-accounts?status=created");

  let managedAccount = await pool.query(
    `SELECT "role", "isActive" FROM "User" WHERE "email" = $1`,
    [managedAccountEmail],
  );
  assert.deepEqual(managedAccount.rows, [{ role: "RECEPTION", isActive: true }]);

  const accountRow = page.locator("tbody tr").filter({ hasText: managedAccountEmail });
  await accountRow.getByRole("link").click();
  await page.locator('input[name="isActive"]').uncheck();
  await page.locator(".admin-form button.primary-button").click();
  await expect(page).toHaveURL("/admin/manage-accounts?status=updated");

  managedAccount = await pool.query(
    `SELECT "role", "isActive" FROM "User" WHERE "email" = $1`,
    [managedAccountEmail],
  );
  assert.deepEqual(managedAccount.rows, [{ role: "RECEPTION", isActive: false }]);

  await clearSession(page);
  await page.locator('input[name="email"]').fill(managedAccountEmail);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('form button[type="submit"]').click();
  await expect(page).toHaveURL(/\/login\?locale=PT_BR&error=invalid/);

  assert.deepEqual(browserErrors, []);
});
