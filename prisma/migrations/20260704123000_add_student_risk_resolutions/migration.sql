CREATE TABLE "StudentRiskResolution" (
  "id" TEXT NOT NULL,
  "resolvedThroughDate" TIMESTAMP(3) NOT NULL,
  "resolvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "classId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "resolvedById" TEXT NOT NULL,

  CONSTRAINT "StudentRiskResolution_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StudentRiskResolution_classId_studentId_key" ON "StudentRiskResolution"("classId", "studentId");
CREATE INDEX "StudentRiskResolution_studentId_idx" ON "StudentRiskResolution"("studentId");
CREATE INDEX "StudentRiskResolution_resolvedById_idx" ON "StudentRiskResolution"("resolvedById");

ALTER TABLE "StudentRiskResolution" ADD CONSTRAINT "StudentRiskResolution_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentRiskResolution" ADD CONSTRAINT "StudentRiskResolution_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentRiskResolution" ADD CONSTRAINT "StudentRiskResolution_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
