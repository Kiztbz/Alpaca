import { getNanoId, catchRouteError } from "@/lib/db/helpers";
import { validation } from "@/lib/validation";
import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { getClientIp, isRateLimited, readJson, recordAnalyticsEvent, recordAuthAttempt, requestErrorResponse } from "@/lib/security";
import bcrypt from "bcrypt";

export async function POST(req) {
  const ip = getClientIp(req);
  try {
    const body = await readJson(req);
    const name = typeof body.username === "string" ? body.username.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (await isRateLimited({ action: "register", identifier: name, ip, limit: 5, minutes: 60 })) {
      return NextResponse.json({ errors: { server: "Too many registration attempts. Try again later." } }, { status: 429 });
    }
    const errors = {};
    if (!validation.user.username.regex.test(name)) errors.username = validation.user.username.error;
    if (!validation.user.password.regex.test(password)) errors.password = validation.user.password.error;
    if (Object.keys(errors).length) {
      await recordAuthAttempt({ action: "register", identifier: name, ip, succeeded: false });
      return NextResponse.json({ errors }, { status: 400 });
    }

    const exists = await db.selectFrom("users").select("id")
      .where(({ or, eb }) => or([eb("username", "ilike", name), eb("email", "ilike", name)]))
      .executeTakeFirst();
    if (exists) {
      await recordAuthAttempt({ action: "register", identifier: name, ip, succeeded: false });
      return NextResponse.json({ errors: { username: "An account with that username already exists" } }, { status: 409 });
    }

    const publicId = getNanoId();
    const inserted = await db.insertInto("users").values({
      publicId, username: name, displayName: name,
      settings: JSON.stringify({ showConfetti: true, showResourceOptions: true, notifications: { email: true, push: true } }),
      password: await bcrypt.hash(password, 12), tokens: JSON.stringify([]),
    }).returning("id").executeTakeFirstOrThrow();

    await Promise.all([
      recordAuthAttempt({ action: "register", identifier: name, ip, succeeded: true }),
      recordAnalyticsEvent({ eventType: "registration", userId: inserted.id, visitor: ip, userAgent: req.headers.get("user-agent") || "" }),
    ]);
    return NextResponse.json({ message: "User registered successfully" }, { status: 201 });
  } catch (error) {
    const response = requestErrorResponse(error);
    if (response) return response;
    if (error?.code === "23505") return NextResponse.json({ errors: { username: "An account with that username already exists" } }, { status: 409 });
    return catchRouteError({ error, route: req.nextUrl.pathname });
  }
}
