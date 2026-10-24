import pg from "pg";

const { Client } = pg;

function postgresQuery(mysqlQuery) {
    let index = 0;
    return mysqlQuery
        .replaceAll("`", '"')
        .replace(/\?/g, () => `$${++index}`);
}

export async function connectDatabase() {
    if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL is required. Use the Supabase transaction-pooler connection string.");
    }

    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_SSL === "false"
            ? false
            : { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false" },
    });
    await client.connect();

    return {
        async execute(query, params = []) {
            const result = await client.query(postgresQuery(query), params);
            return [result.rows];
        },
        beginTransaction: () => client.query("begin"),
        commit: () => client.query("commit"),
        rollback: () => client.query("rollback"),
        end: () => client.end(),
    };
}
