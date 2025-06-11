import "@/server-only";
import { join } from "path";

export const MIGRATION_TEMPLATE = `
import "@/server-only";

export const up = \`
  SELECT 1;
\`;

export const down = \`
  SELECT 1;
\`;
`;

export async function createMigration(name: string) {
  const filename = `${Date.now()}_${name}.ts`;

  await Bun.write(
    join(import.meta.dir, "migrations", filename),
    MIGRATION_TEMPLATE
  );
}

if (import.meta.main) {
  const migrationName = process.argv[2];

  if (!migrationName) {
    throw new Error("Usage: bun run migration:create -- NAME");
  }

  await createMigration(migrationName);
}
