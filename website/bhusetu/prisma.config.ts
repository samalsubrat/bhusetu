// Prisma configuration — loads .env.local first (Next.js convention), then .env
import dotenv from "dotenv";
dotenv.config({ path: ".env.local", override: false });
dotenv.config({ path: ".env", override: false });
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
