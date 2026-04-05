import * as schema from "./schema";

export * from "./schema";

let _db: import("drizzle-orm/pglite").PgliteDatabase<typeof schema> | import("drizzle-orm/node-postgres").NodePgDatabase<typeof schema>;

if (process.env.DATABASE_URL) {
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const pg = await import("pg");
  const pool = new pg.default.Pool({ connectionString: process.env.DATABASE_URL });
  _db = drizzle(pool, { schema });
} else {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { readFileSync } = await import("fs");
  const { fileURLToPath } = await import("url");
  const { dirname, join } = await import("path");

  const dataDir = process.env.PGLITE_DATA_DIR ?? join(process.cwd(), "data");
  const client = new PGlite(dataDir);

  const schemaPath = join(dirname(fileURLToPath(import.meta.url)), "schema.sql");
  const schemaSql = readFileSync(schemaPath, "utf-8");
  await client.exec(schemaSql);

  _db = drizzle(client, { schema });
  console.log(`[db] PGlite started — data dir: ${dataDir}`);
}

export const db = _db;
