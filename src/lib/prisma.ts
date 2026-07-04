import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaSchemaVersion?: string;
};

const connectionString = process.env.DATABASE_URL;
const prismaSchemaVersion = "20260704120000_allow_same_date_named_lessons";

if (!connectionString) {
  throw new Error("DATABASE_URL is required to connect to the database.");
}

const adapter = new PrismaPg({ connectionString });

export const prisma =
  globalForPrisma.prismaSchemaVersion === prismaSchemaVersion &&
  globalForPrisma.prisma
    ? globalForPrisma.prisma
    : new PrismaClient({
        adapter,
      });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaSchemaVersion = prismaSchemaVersion;
}
