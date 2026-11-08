import { randomBytes } from "node:crypto";
import bcrypt from "bcrypt";
import pg from "pg";

const { Client } = pg;
const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
const password = process.env.SUPERADMIN_PASSWORD || Array.from(randomBytes(24), (byte) => alphabet[byte % alphabet.length]).join("");
const username = process.env.SUPERADMIN_USERNAME || `superadmin_${randomBytes(3).toString("hex")}`;
const publicId = randomBytes(5).toString("hex").slice(0, 6).toUpperCase();
const rawConnectionString = process.env.DATABASE_URL?.trim();
const connectionString = rawConnectionString?.replace(/^(["'])(.*)\1$/, "$2");

if (!connectionString) throw new Error("DATABASE_URL is required");
if (!/^[A-Za-z0-9_-]{2,32}$/.test(username)) throw new Error("SUPERADMIN_USERNAME must use 2-32 letters, numbers, underscores, or hyphens");
if (password.length < 16 || password.length > 72) throw new Error("SUPERADMIN_PASSWORD must be 16-72 characters");

const client = new Client({
  connectionString,
  ssl: process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false" },
});

try {
  await client.connect();
  const exists = await client.query("select 1 from users where lower(username) = lower($1)", [username]);
  if (exists.rowCount) throw new Error(`Account ${username} already exists`);
  const result = await client.query(
    `insert into users (public_id, username, display_name, role, password, settings, tokens)
     values ($1, $2, $2, 'superadmin', $3, $4::jsonb, '[]'::jsonb)
     returning id, public_id`,
    [publicId, username, await bcrypt.hash(password, 12), JSON.stringify({ showConfetti: true, showResourceOptions: true, notifications: { email: true, push: true } })],
  );
  const account = result.rows[0];
  console.log(JSON.stringify({ id: account.id, publicId: account.public_id.trim(), username, password }, null, 2));
} finally {
  await client.end().catch(() => {});
}
