import assert from "node:assert/strict";
import test from "node:test";
import { config } from "dotenv";

config({ path: ".env.local" });
config();

let bonusClassFunctions: typeof import("@/lib/bonus-classes");
let prisma: typeof import("@/lib/prisma")["prisma"];

test.before(async () => {
  bonusClassFunctions = await import("@/lib/bonus-classes");
  ({ prisma } = await import("@/lib/prisma"));
});

function uniqueSuffix() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

test("PostgreSQL conflict checks distinguish hard bonus overlaps from recurring warnings", async () => {
  const [admin, teachers] = await Promise.all([
    prisma.user.findFirst({ where: { isActive: true, role: "ADMIN" }, select: { id: true } }),
    prisma.user.findMany({
      where: { isActive: true, role: "TEACHER" },
      orderBy: { id: "asc" },
      take: 2,
      select: { id: true },
    }),
  ]);

  assert.ok(admin, "An active admin is required for bonus scheduling integration tests.");
  assert.ok(teachers[0], "An active teacher is required for bonus scheduling integration tests.");

  const suffix = uniqueSuffix();
  const teacher = teachers[0];
  const otherTeacher = teachers[1];
  const bonusSubjectPrefix = `Bonus overlap QC ${suffix}`;
  const monday = new Date("2030-01-07T00:00:00.000Z");
  const tuesday = new Date("2030-01-08T00:00:00.000Z");
  const wednesday = new Date("2030-01-09T00:00:00.000Z");
  let studentId: string | null = null;

  try {
    const student = await prisma.student.create({
      data: { fullName: `Bonus overlap QC ${suffix}`, isActive: true },
      select: { id: true },
    });
    studentId = student.id;

    await prisma.class.createMany({
      data: [
        {
          classType: "REGULAR",
          durationMinutes: 60,
          isActive: true,
          name: `Monday regular ${suffix}`,
          startTime: "09:00",
          teacherId: teacher.id,
          weekDays: ["MONDAY"],
        },
        {
          classType: "VIP",
          durationMinutes: 45,
          isActive: true,
          name: `Tuesday VIP ${suffix}`,
          startTime: "14:00",
          teacherId: teacher.id,
          weekDays: ["TUESDAY"],
        },
        {
          classType: "PERSONAL",
          durationMinutes: 30,
          isActive: true,
          name: `Wednesday personal ${suffix}`,
          startTime: "16:00",
          teacherId: teacher.id,
          weekDays: ["WEDNESDAY"],
        },
        {
          classType: "REGULAR",
          durationMinutes: 60,
          isActive: true,
          name: `Missing schedule ${suffix}`,
          startTime: null,
          teacherId: teacher.id,
          weekDays: ["MONDAY"],
        },
        {
          classType: "REGULAR",
          durationMinutes: 60,
          isActive: true,
          name: `Malformed schedule ${suffix}`,
          startTime: "not-a-time",
          teacherId: teacher.id,
          weekDays: ["MONDAY"],
        },
        {
          classType: "REGULAR",
          durationMinutes: 60,
          isActive: false,
          name: `Inactive schedule ${suffix}`,
          startTime: "11:00",
          teacherId: teacher.id,
          weekDays: ["MONDAY"],
        },
        ...(otherTeacher
          ? [
              {
                classType: "REGULAR" as const,
                durationMinutes: 60,
                isActive: true,
                name: `Other teacher ${suffix}`,
                startTime: "12:00",
                teacherId: otherTeacher.id,
                weekDays: ["MONDAY" as const],
              },
            ]
          : []),
      ],
    });

    const recurringOverlap = bonusClassFunctions.hasTeacherRecurringClassOverlap;
    assert.equal(
      await recurringOverlap({
        durationMinutes: 30,
        scheduledDate: monday,
        startTime: "09:30",
        teacherId: teacher.id,
      }),
      true,
      "Partial overlaps with regular classes should warn.",
    );
    assert.equal(
      await recurringOverlap({
        durationMinutes: 30,
        scheduledDate: monday,
        startTime: "10:00",
        teacherId: teacher.id,
      }),
      false,
      "Events touching only at an endpoint should not warn.",
    );
    assert.equal(
      await recurringOverlap({
        durationMinutes: 30,
        scheduledDate: tuesday,
        startTime: "09:30",
        teacherId: teacher.id,
      }),
      false,
      "The same clock time on a different weekday should not warn.",
    );
    assert.equal(
      await recurringOverlap({
        durationMinutes: 30,
        scheduledDate: tuesday,
        startTime: "14:15",
        teacherId: teacher.id,
      }),
      true,
      "Recurring VIP classes should warn.",
    );
    assert.equal(
      await recurringOverlap({
        durationMinutes: 30,
        scheduledDate: wednesday,
        startTime: "16:00",
        teacherId: teacher.id,
      }),
      true,
      "Recurring personal classes should warn.",
    );
    assert.equal(
      await recurringOverlap({
        durationMinutes: 30,
        scheduledDate: monday,
        startTime: "11:15",
        teacherId: teacher.id,
      }),
      false,
      "Inactive and unusable recurring schedules should not warn.",
    );

    const existingBonus = await prisma.bonusClass.create({
      data: {
        createdById: admin.id,
        durationMinutes: 60,
        scheduledDate: monday,
        startTime: "18:00",
        studentId: student.id,
        subject: bonusSubjectPrefix,
        teacherId: teacher.id,
      },
      select: { id: true },
    });

    assert.equal(
      await bonusClassFunctions.hasTeacherBonusClassOverlap({
        durationMinutes: 30,
        scheduledDate: monday,
        startTime: "18:30",
        teacherId: teacher.id,
      }),
      true,
      "Create must hard-block a partial bonus-versus-bonus overlap.",
    );
    assert.equal(
      await bonusClassFunctions.hasTeacherBonusClassOverlap({
        durationMinutes: 30,
        scheduledDate: monday,
        startTime: "19:00",
        teacherId: teacher.id,
      }),
      false,
      "Adjacent bonus classes should remain allowed.",
    );
    assert.equal(
      await bonusClassFunctions.hasTeacherBonusClassOverlap({
        bonusClassId: existingBonus.id,
        durationMinutes: 60,
        scheduledDate: monday,
        startTime: "18:00",
        teacherId: teacher.id,
      }),
      false,
      "Update must exclude the edited bonus class from its own conflict query.",
    );

    const recurringCreateData = {
      durationMinutes: 30,
      notes: "Preserved warning notes",
      scheduledDate: monday,
      startTime: "09:30",
      studentId: student.id,
      subject: `${bonusSubjectPrefix} create confirmed`,
      teacherId: teacher.id,
    };
    const createWarning = await bonusClassFunctions.createBonusClassWithConflictCheck({
      confirmRegularClassOverlap: false,
      createdById: admin.id,
      data: recurringCreateData,
    });

    assert.deepEqual(createWarning, { status: "RECURRING_OVERLAP" });
    assert.equal(
      await prisma.bonusClass.count({ where: { subject: recurringCreateData.subject } }),
      0,
      "An unconfirmed recurring overlap must not create a bonus class.",
    );

    const confirmedCreate = await bonusClassFunctions.createBonusClassWithConflictCheck({
      confirmRegularClassOverlap: true,
      createdById: admin.id,
      data: recurringCreateData,
    });

    assert.equal(confirmedCreate.status, "SAVED");
    assert.equal(
      await prisma.bonusClass.count({ where: { subject: recurringCreateData.subject } }),
      1,
      "Explicit confirmation should permit a recurring-overlap create.",
    );

    const hardBlockedCreate = await bonusClassFunctions.createBonusClassWithConflictCheck({
      confirmRegularClassOverlap: true,
      createdById: admin.id,
      data: {
        ...recurringCreateData,
        startTime: "09:45",
        subject: `${bonusSubjectPrefix} hard blocked`,
      },
    });

    assert.deepEqual(hardBlockedCreate, { status: "BONUS_OVERLAP" });
    assert.equal(
      await prisma.bonusClass.count({
        where: { subject: `${bonusSubjectPrefix} hard blocked` },
      }),
      0,
      "Confirmation must never bypass a bonus-versus-bonus hard conflict.",
    );

    if (confirmedCreate.status === "SAVED") {
      await prisma.bonusClass.delete({ where: { id: confirmedCreate.bonusClassId } });
    }

    const editBonusClass = await prisma.bonusClass.create({
      data: {
        createdById: admin.id,
        durationMinutes: 30,
        scheduledDate: monday,
        startTime: "13:00",
        studentId: student.id,
        subject: `${bonusSubjectPrefix} update confirmed`,
        teacherId: teacher.id,
      },
      select: { id: true },
    });
    const unchangedUpdateData = {
      durationMinutes: 30,
      notes: null,
      scheduledDate: monday,
      startTime: "13:00",
      studentId: student.id,
      subject: `${bonusSubjectPrefix} update confirmed`,
      teacherId: teacher.id,
    };
    const selfExcludedUpdate = await bonusClassFunctions.updateBonusClassWithConflictCheck({
      bonusClassId: editBonusClass.id,
      confirmRegularClassOverlap: false,
      data: unchangedUpdateData,
    });

    assert.equal(selfExcludedUpdate.status, "SAVED");

    const recurringUpdateData = {
      ...unchangedUpdateData,
      notes: "Updated after explicit confirmation",
      startTime: "09:15",
    };
    const updateWarning = await bonusClassFunctions.updateBonusClassWithConflictCheck({
      bonusClassId: editBonusClass.id,
      confirmRegularClassOverlap: false,
      data: recurringUpdateData,
    });

    assert.deepEqual(updateWarning, { status: "RECURRING_OVERLAP" });
    assert.equal(
      (
        await prisma.bonusClass.findUniqueOrThrow({
          where: { id: editBonusClass.id },
          select: { startTime: true },
        })
      ).startTime,
      "13:00",
      "An unconfirmed recurring-overlap update must leave the stored schedule unchanged.",
    );

    const confirmedUpdate = await bonusClassFunctions.updateBonusClassWithConflictCheck({
      bonusClassId: editBonusClass.id,
      confirmRegularClassOverlap: true,
      data: recurringUpdateData,
    });

    assert.equal(confirmedUpdate.status, "SAVED");
    assert.deepEqual(
      await prisma.bonusClass.findUniqueOrThrow({
        where: { id: editBonusClass.id },
        select: { notes: true, startTime: true },
      }),
      { notes: "Updated after explicit confirmation", startTime: "09:15" },
      "Explicit confirmation should permit a recurring-overlap update.",
    );
  } finally {
    await prisma.bonusClass.deleteMany({
      where: { subject: { startsWith: bonusSubjectPrefix } },
    });
    await prisma.class.deleteMany({ where: { name: { endsWith: suffix } } });
    if (studentId) {
      await prisma.student.deleteMany({ where: { id: studentId } });
    }
  }
});

test.after(async () => {
  await prisma.$disconnect();
});
