import fs from "node:fs/promises";
import pg from "pg";

const { Client } = pg;

const rawConnectionString = process.env.DATABASE_URL?.trim();
const connectionString =
    rawConnectionString?.length >= 2 &&
    ((rawConnectionString.startsWith('"') && rawConnectionString.endsWith('"')) ||
        (rawConnectionString.startsWith("'") && rawConnectionString.endsWith("'")))
        ? rawConnectionString.slice(1, -1)
        : rawConnectionString;

if (!connectionString) {
    console.error("DATABASE_URL is required. Copy the Supabase transaction-pooler URL into .env.");
    throw new Error("DATABASE_URL is not set");
}

const client = new Client({
    connectionString,
    ssl: process.env.DATABASE_SSL === "false"
        ? false
        : { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false" },
});

try {
    const migration = await fs.readFile("./supabase/migrations/0001_initial_schema.sql", "utf8");
    await client.connect();
    await client.query(migration);
    console.log("Supabase schema initialized successfully.");
} finally {
    await client.end().catch(() => {});
}
