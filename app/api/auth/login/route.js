import { getToken, catchRouteError } from "@/lib/db/helpers";
import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { nanoid } from "nanoid";
import bcrypt from "bcrypt";
import { authCookie, getClientIp, isRateLimited, readJson, recordAnalyticsEvent, recordAuthAttempt, requestErrorResponse } from "@/lib/security";

const DUMMY_HASH = "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxM5v7S2gN0R0mNn1wzJ7MZV5fK";
const invalidCredentials = () => NextResponse.json({ errors: {
  username: "Incorrect credentials provided", password: "Incorrect credentials provided",
} }, { status: 401 });

export async function POST(req) {
  const ip = getClientIp(req);
  try {
    const body = await readJson(req);
    const username = typeof body.username === "string" ? body.username.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!username || !password || password.length > 72 || username.length > 256) return invalidCredentials();

    if (await isRateLimited({ action: "login", identifier: username, ip, limit: 10, minutes: 15 })) {
      return NextResponse.json({ errors: { server: "Too many login attempts. Try again in 15 minutes." } }, { status: 429 });
    }

    const user = await db.selectFrom("users")
      .select(["id", "username", "password", "tokens", "twoFactorEnabled"])
      .where(({ or, eb }) => or([eb("username", "ilike", username), eb("email", "ilike", username)]))
      .executeTakeFirst();
    const valid = await bcrypt.compare(password, user?.password || DUMMY_HASH);
    if (!user || !valid) {
      await recordAuthAttempt({ action: "login", identifier: username, ip, succeeded: false });
      return invalidCredentials();
    }

    if (user.twoFactorEnabled) {
      const token = nanoid(32);
      await db.updateTable("users").set({ twoFactorTemp: token, twoFactorTempExpires: new Date(Date.now() + 10 * 60_000) }).where("id", "=", user.id).execute();
      return NextResponse.json({ message: "Two factor authentication is enabled", code: token });
    }

    const refreshToken = await getToken(user.username, true);
    const accessToken = await getToken(user.username, false);
    const userAgent = req.headers.get("user-agent") || "Unknown";
    const tokenObject = {
      token: refreshToken, login: Date.now(), expires: Date.now() + 2_592_000_000,
      userAgent: userAgent.slice(0, 512), location: {}, device: getDeviceFromUserAgent(userAgent), ip,
    };
    const tokens = Array.isArray(user.tokens) ? user.tokens : [];
    const newTokens = [...tokens.filter((item) => item.expires > Date.now() && !(item.ip === ip && item.userAgent === userAgent)), tokenObject].slice(-20);
    await db.updateTable("users").set({ tokens: JSON.stringify(newTokens), twoFactorTemp: null }).where("id", "=", user.id).execute();
    await Promise.all([
      recordAuthAttempt({ action: "login", identifier: username, ip, succeeded: true }),
      recordAnalyticsEvent({ eventType: "login", userId: user.id, visitor: ip, userAgent }),
    ]);

    return NextResponse.json({ token: accessToken, message: "Successfully logged in" }, {
      status: 200, headers: { "Set-Cookie": authCookie(refreshToken), "Cache-Control": "no-store" },
    });
  } catch (error) {
    const response = requestErrorResponse(error);
    return response || catchRouteError({ error, route: req.nextUrl.pathname });
  }
}

function getDeviceFromUserAgent(userAgent) {
  if (/Mobile/i.test(userAgent)) return "Mobile";
  if (/Tablet/i.test(userAgent)) return "Tablet";
  if (/Windows/i.test(userAgent)) return "Windows";
  if (/Macintosh/i.test(userAgent)) return "Macintosh";
  if (/Linux/i.test(userAgent)) return "Linux";
  return "Unknown";
}
