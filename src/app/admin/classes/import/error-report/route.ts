import { NextResponse } from "next/server";
import { buildImportErrorReportCsv } from "@/lib/imports";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (currentUser.role !== "ADMIN") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const batchId = new URL(request.url).searchParams.get("batchId")?.trim();

  if (!batchId) {
    return new NextResponse("Missing batchId", { status: 400 });
  }

  const rows = await prisma.importRow.findMany({
    where: {
      importBatch: { id: batchId, type: "CLASS" },
      status: { in: ["FAILED", "DUPLICATE"] },
    },
    orderBy: { rowNumber: "asc" },
    select: {
      errors: true,
      rawRow: true,
      rowNumber: true,
      warnings: true,
    },
  });

  return new NextResponse(buildImportErrorReportCsv("CLASS", rows), {
    headers: {
      "Content-Disposition": 'attachment; filename="class-import-errors.csv"',
      "Content-Type": "text/csv; charset=utf-8",
    },
  });
}
