import { CamelCasePlugin, Kysely, PostgresDialect } from "kysely";
import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
    console.warn("DATABASE_URL is not set. Database operations will fail at runtime.");
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || "",
    max: Number(process.env.DATABASE_POOL_SIZE || 1),
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
    allowExitOnIdle: true,
    ssl: process.env.DATABASE_SSL === "false"
        ? false
        : { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false" },
});

export const db =
    global.db ||
    new Kysely({
        dialect: new PostgresDialect({ pool }),
        plugins: [new CamelCasePlugin()],
        // log: ["query"],
    });

global.db = db;
