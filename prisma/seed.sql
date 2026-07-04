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
  "book",
  "semester",
  "year",
  "isActive",
  "createdAt",
  "updatedAt",
  "teacherId"
) VALUES
  (
    'class_evening_a2',
    'Evening English A2',
    'Book 2',
    1,
    2026,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    'user_teacher_ana'
  ),
  (
    'class_saturday_b1',
    'Saturday Conversation B1',
    'Book 3',
    1,
    2026,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    'user_teacher_bruno'
  )
ON CONFLICT ("id") DO UPDATE SET
  "name" = EXCLUDED."name",
  "book" = EXCLUDED."book",
  "semester" = EXCLUDED."semester",
  "year" = EXCLUDED."year",
  "isActive" = EXCLUDED."isActive",
  "teacherId" = EXCLUDED."teacherId",
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "Student" (
  "id",
  "fullName",
  "isActive",
  "createdAt",
  "updatedAt"
) VALUES
  (
    'student_larissa',
    'Larissa Almeida',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'student_mateus',
    'Mateus Oliveira',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'student_sofia',
    'Sofia Ribeiro',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'student_rafael',
    'Rafael Santos',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'student_beatriz',
    'Beatriz Lima',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
ON CONFLICT ("id") DO UPDATE SET
  "fullName" = EXCLUDED."fullName",
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
  "name",
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
    'Past simple review',
    TIMESTAMP '2026-06-24 00:00:00',
    'SUBMITTED',
    'Sample submitted lesson for attendance and homework review.',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    'class_evening_a2',
    'user_teacher_ana'
  )
ON CONFLICT ("classId", "lessonDate") DO UPDATE SET
  "name" = EXCLUDED."name",
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

INSERT INTO "PartialEvaluationGrade" (
  "id",
  "period",
  "grade",
  "notes",
  "createdAt",
  "updatedAt",
  "classId",
  "studentId"
) VALUES
  (
    'partial_a2_larissa_7',
    'CLASS_7',
    'B_PLUS',
    'Strong participation and steady homework habits.',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    'class_evening_a2',
    'student_larissa'
  ),
  (
    'partial_a2_mateus_7',
    'CLASS_7',
    'B',
    'Good oral work; review written accuracy.',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    'class_evening_a2',
    'student_mateus'
  ),
  (
    'partial_a2_sofia_7',
    'CLASS_7',
    'C_PLUS',
    'Needs more consistent attendance.',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    'class_evening_a2',
    'student_sofia'
  )
ON CONFLICT ("classId", "studentId", "period") DO UPDATE SET
  "grade" = EXCLUDED."grade",
  "notes" = EXCLUDED."notes",
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "TestGrade" (
  "id",
  "period",
  "oralGrade",
  "compositionScore",
  "writtenTestScore",
  "notes",
  "createdAt",
  "updatedAt",
  "classId",
  "studentId"
) VALUES
  (
    'test_a2_larissa_mid',
    'MID_TERM',
    'A_MINUS',
    1.75,
    7.25,
    'Clear speaking and organized writing.',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    'class_evening_a2',
    'student_larissa'
  ),
  (
    'test_a2_mateus_mid',
    'MID_TERM',
    'B_PLUS',
    1.50,
    6.75,
    'Good speaking confidence; watch verb forms.',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    'class_evening_a2',
    'student_mateus'
  )
ON CONFLICT ("classId", "studentId", "period") DO UPDATE SET
  "oralGrade" = EXCLUDED."oralGrade",
  "compositionScore" = EXCLUDED."compositionScore",
  "writtenTestScore" = EXCLUDED."writtenTestScore",
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
