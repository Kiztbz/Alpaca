import { createHash } from "node:crypto";
import { catchRouteError } from "@/lib/db/helpers";
import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";
import { db } from "@/lib/db/db";
import { nanoid } from "nanoid";
import { getClientIp, isRateLimited, readJson, recordAuthAttempt, requestErrorResponse } from "@/lib/security";

const success = () => NextResponse.json({ message: "If that account exists, a reset email has been sent" });

export async function POST(req) {
  const ip = getClientIp(req);
  try {
    const { email: rawEmail } = await readJson(req);
    const email = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";
    if (await isRateLimited({ action: "password_reset", identifier: email, ip, limit: 5, minutes: 60 })) return success();
    await recordAuthAttempt({ action: "password_reset", identifier: email, ip, succeeded: false });
    if (!/^.{1,64}@.{1,190}$/.test(email)) return success();

    const user = await db.selectFrom("users").select("id").where("email", "ilike", email).executeTakeFirst();
    if (!user) return success();

    const token = nanoid(32);
    const tokenHash = createHash("sha256").update(token).digest("hex");
    await db.updateTable("users").set({
      passwordReset: tokenHash,
      passwordResetExpiration: new Date(Date.now() + 3_600_000),
    }).where("id", "=", user.id).execute();

    const emailId = await sendEmail({ email, code: token, type: "password-reset" });
    if (!emailId) throw new Error("Failed to send email");
    await recordAuthAttempt({ action: "password_reset", identifier: email, ip, succeeded: true });
    return success();
  } catch (error) {
    return requestErrorResponse(error) || catchRouteError({ error, route: req.nextUrl.pathname });
  }
}
