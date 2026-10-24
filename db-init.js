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
    await client.connect();
    await client.query(`
        create table if not exists public.schema_migrations (
            name text primary key,
            applied_at timestamptz not null default now()
        )
    `);

    const { rows: [schemaState] } = await client.query(
        "select to_regclass('public.users') as users"
    );
    if (schemaState.users) {
        const baselineMigrations = [
            "0001_initial_schema.sql",
            "0002_add_relational_keys_and_indexes.sql",
            "0003_remove_duplicate_pair_constraints.sql",
        ];
        for (const name of baselineMigrations) {
            await client.query(
                "insert into public.schema_migrations (name) values ($1) on conflict (name) do nothing",
                [name]
            );
        }
    }

    const migrationDirectory = "./supabase/migrations";
    const files = (await fs.readdir(migrationDirectory))
        .filter((file) => file.endsWith(".sql"))
        .sort();

    for (const file of files) {
        const { rowCount } = await client.query(
            "select 1 from public.schema_migrations where name = $1",
            [file]
        );
        if (rowCount) {
            console.log(`Skipped ${file} (already applied)`);
            continue;
        }

        const migration = await fs.readFile(`${migrationDirectory}/${file}`, "utf8");
        await client.query(migration);
        await client.query(
            "insert into public.schema_migrations (name) values ($1)",
            [file]
        );
        console.log(`Applied ${file}`);
    }
    console.log("Supabase schema initialized successfully.");
} finally {
    await client.end().catch(() => {});
}
