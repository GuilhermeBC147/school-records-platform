import { config } from "dotenv";

config({ path: ".env.local" });
config();

const className = "Browser QC recurring overlap";
const bonusSubjectPrefix = "Browser QC bonus overlap";

async function main() {
  const { prisma } = await import("@/lib/prisma");

  try {
    if (process.argv[2] === "cleanup") {
      await prisma.bonusClass.deleteMany({
        where: { subject: { startsWith: bonusSubjectPrefix } },
      });
      await prisma.class.deleteMany({ where: { name: className } });
      return;
    }

    const [teacher, student] = await Promise.all([
      prisma.user.findFirstOrThrow({
        where: { isActive: true, role: "TEACHER" },
        orderBy: { id: "asc" },
        select: { id: true, name: true },
      }),
      prisma.student.findFirstOrThrow({
        where: { isActive: true },
        orderBy: { id: "asc" },
        select: { fullName: true, id: true },
      }),
    ]);

    await prisma.class.deleteMany({ where: { name: className } });
    await prisma.class.create({
      data: {
        classType: "REGULAR",
        durationMinutes: 60,
        isActive: true,
        name: className,
        startTime: "09:00",
        teacherId: teacher.id,
        weekDays: ["MONDAY"],
      },
    });

    console.log(JSON.stringify({ bonusSubjectPrefix, student, teacher }));
  } finally {
    await prisma.$disconnect();
  }
}

void main();
