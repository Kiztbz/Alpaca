import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";

export function safeNextPath(value, fallback = "/me/dashboard") {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }
  try {
    const url = new URL(value, "https://local.invalid");
    return url.origin === "https://local.invalid" ? `${url.pathname}${url.search}${url.hash}` : fallback;
  } catch {
    return fallback;
  }
}

export async function readJson(req, maxBytes = 8_192) {
  const length = Number(req.headers.get("content-length") || 0);
  if (length > maxBytes) throw new RequestError("Request body is too large", 413);
  let body;
  try {
    body = await req.json();
  } catch {
    throw new RequestError("Invalid JSON body", 400);
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new RequestError("Invalid JSON body", 400);
  }
  return body;
}

export class RequestError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

export function requestErrorResponse(error) {
  if (!(error instanceof RequestError)) return null;
  return NextResponse.json({ errors: { server: error.message } }, { status: error.status });
}

export function getClientIp(req) {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || req.headers.get("x-real-ip")?.trim() || "unknown";
}

function digest(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}

export async function isRateLimited({ action, identifier, ip, limit, minutes }) {
  const identifierHash = digest(String(identifier || "").trim().toLowerCase());
  const ipHash = digest(ip || "unknown");
  const since = new Date(Date.now() - minutes * 60_000);
  const result = await db
    .selectFrom("auth_attempts")
    .select(({ fn }) => fn.countAll().as("count"))
    .where("action", "=", action)
    .where("createdAt", ">=", since)
    .where(({ eb, or }) => or([
      eb("identifierHash", "=", identifierHash),
      eb("ipHash", "=", ipHash),
    ]))
    .executeTakeFirst();
  return Number(result?.count || 0) >= limit;
}

export async function recordAuthAttempt({ action, identifier, ip, succeeded }) {
  await db.insertInto("auth_attempts").values({
    action,
    identifierHash: digest(String(identifier || "").trim().toLowerCase()),
    ipHash: digest(ip || "unknown"),
    succeeded,
  }).execute();
}

export async function recordAnalyticsEvent({ eventType, path = null, userId = null, visitor = "", userAgent = "" }) {
  await db.insertInto("analytics_events").values({
    eventType,
    path: path?.slice(0, 512) || null,
    userId,
    visitorHash: visitor ? digest(visitor) : null,
    userAgent: userAgent.slice(0, 512),
  }).execute();
}

export function authCookie(token) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${secure}`;
}
