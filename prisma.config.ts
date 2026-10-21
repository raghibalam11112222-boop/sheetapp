import "dotenv/config";
import { defineConfig } from "prisma/config";

// Prisma ORM 7: the CLI no longer reads env files or the schema datasource
// block — connection + paths live here. process.env (not env()) so commands
// that need no database (e.g. `prisma generate`) work without DATABASE_URL.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? "",
  },
});
