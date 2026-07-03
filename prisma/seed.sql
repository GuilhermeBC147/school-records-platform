-- Sample data for local development.
-- Safe to run multiple times.

INSERT INTO "User" (
  "id",
  "name",
  "email",
  "passwordHash",
  "role",
  "isActive",
  "createdAt",
  "updatedAt"
) VALUES
  (
    'user_admin_demo',
    'Admin Demo',
    'admin@example.com',
    'pbkdf2_sha256$120000$dev_seed_auth_salt_v1$bvo_8hrvWUEeSseYrGHL0b6gtOps5XcKYzUVKPSbWCU',
    'ADMIN',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'user_teacher_ana',
    'Ana Martins',
    'ana@example.com',
    'pbkdf2_sha256$120000$dev_seed_auth_salt_v1$bvo_8hrvWUEeSseYrGHL0b6gtOps5XcKYzUVKPSbWCU',
    'TEACHER',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'user_teacher_bruno',
    'Bruno Costa',
    'bruno@example.com',
    'pbkdf2_sha256$120000$dev_seed_auth_salt_v1$bvo_8hrvWUEeSseYrGHL0b6gtOps5XcKYzUVKPSbWCU',
    'TEACHER',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
ON CONFLICT ("email") DO UPDATE SET
  "name" = EXCLUDED."name",
  "passwordHash" = EXCLUDED."passwordHash",
  "role" = EXCLUDED."role",
  "isActive" = EXCLUDED."isActive",
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "Class" (
  "id",
  "name",
  "level",
  "isActive",
  "createdAt",
  "updatedAt",
  "teacherId"
) VALUES
  (
    'class_evening_a2',
    'Evening English A2',
    'A2',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    'user_teacher_ana'
  ),
  (
    'class_saturday_b1',
    'Saturday Conversation B1',
    'B1',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    'user_teacher_bruno'
  )
ON CONFLICT ("id") DO UPDATE SET
  "name" = EXCLUDED."name",
  "level" = EXCLUDED."level",
  "isActive" = EXCLUDED."isActive",
  "teacherId" = EXCLUDED."teacherId",
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "Student" (
  "id",
  "fullName",
  "preferredName",
  "isActive",
  "createdAt",
  "updatedAt"
) VALUES
  (
    'student_larissa',
    'Larissa Almeida',
    'Larissa',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'student_mateus',
    'Mateus Oliveira',
    'Mateus',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'student_sofia',
    'Sofia Ribeiro',
    'Sofia',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'student_rafael',
    'Rafael Santos',
    'Rafael',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'student_beatriz',
    'Beatriz Lima',
    'Bia',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
ON CONFLICT ("id") DO UPDATE SET
  "fullName" = EXCLUDED."fullName",
  "preferredName" = EXCLUDED."preferredName",
  "isActive" = EXCLUDED."isActive",
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "Enrollment" (
  "id",
  "status",
  "createdAt",
  "updatedAt",
  "classId",
  "studentId"
) VALUES
  ('enroll_a2_larissa', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'class_evening_a2', 'student_larissa'),
  ('enroll_a2_mateus', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'class_evening_a2', 'student_mateus'),
  ('enroll_a2_sofia', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'class_evening_a2', 'student_sofia'),
  ('enroll_b1_sofia', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'class_saturday_b1', 'student_sofia'),
  ('enroll_b1_rafael', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'class_saturday_b1', 'student_rafael'),
  ('enroll_b1_beatriz', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'class_saturday_b1', 'student_beatriz')
ON CONFLICT ("classId", "studentId") DO UPDATE SET
  "status" = EXCLUDED."status",
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "Lesson" (
  "id",
  "lessonDate",
  "status",
  "notes",
  "submittedAt",
  "createdAt",
  "updatedAt",
  "classId",
  "submittedById"
) VALUES
  (
    'lesson_a2_sample',
    TIMESTAMP '2026-06-24 18:30:00',
    'SUBMITTED',
    'Sample submitted lesson for attendance and homework review.',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    'class_evening_a2',
    'user_teacher_ana'
  )
ON CONFLICT ("classId", "lessonDate") DO UPDATE SET
  "status" = EXCLUDED."status",
  "notes" = EXCLUDED."notes",
  "submittedAt" = EXCLUDED."submittedAt",
  "submittedById" = EXCLUDED."submittedById",
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "AttendanceRecord" (
  "id",
  "status",
  "notes",
  "createdAt",
  "updatedAt",
  "lessonId",
  "studentId"
) VALUES
  ('attendance_a2_larissa', 'PRESENT', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'lesson_a2_sample', 'student_larissa'),
  ('attendance_a2_mateus', 'LATE', 'Arrived 10 minutes late.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'lesson_a2_sample', 'student_mateus'),
  ('attendance_a2_sofia', 'ABSENT', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'lesson_a2_sample', 'student_sofia')
ON CONFLICT ("lessonId", "studentId") DO UPDATE SET
  "status" = EXCLUDED."status",
  "notes" = EXCLUDED."notes",
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "HomeworkRecord" (
  "id",
  "status",
  "notes",
  "createdAt",
  "updatedAt",
  "lessonId",
  "studentId"
) VALUES
  ('homework_a2_larissa', 'COMPLETED', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'lesson_a2_sample', 'student_larissa'),
  ('homework_a2_mateus', 'INCOMPLETE', 'Missing workbook page 12.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'lesson_a2_sample', 'student_mateus'),
  ('homework_a2_sofia', 'NOT_ASSIGNED', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'lesson_a2_sample', 'student_sofia')
ON CONFLICT ("lessonId", "studentId") DO UPDATE SET
  "status" = EXCLUDED."status",
  "notes" = EXCLUDED."notes",
  "updatedAt" = CURRENT_TIMESTAMP;
