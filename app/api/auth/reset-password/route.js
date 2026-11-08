import { createHash } from "node:crypto";
import { catchRouteError } from "@/lib/db/helpers";
import { validation } from "@/lib/validation";
import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { readJson, requestErrorResponse } from "@/lib/security";
import bcrypt from "bcrypt";

export async function POST(req) {
  try {
    const { resetToken, password } = await readJson(req);
    if (typeof resetToken !== "string" || resetToken.length !== 32 || typeof password !== "string" || !validation.user.password.regex.test(password)) {
      return NextResponse.json({ message: "Invalid token or password format" }, { status: 400 });
    }
    const tokenHash = createHash("sha256").update(resetToken).digest("hex");
    const user = await db.selectFrom("users").select(["id", "passwordResetExpiration"])
      .where("passwordReset", "=", tokenHash).executeTakeFirst();
    if (!user || !user.passwordResetExpiration || new Date(user.passwordResetExpiration).getTime() < Date.now()) {
      return NextResponse.json({ message: "Invalid or expired reset link" }, { status: 400 });
    }

    await db.updateTable("users").set({
      password: await bcrypt.hash(password, 12), passwordReset: null,
      passwordResetExpiration: null, tokens: JSON.stringify([]),
    }).where("id", "=", user.id).execute();
    return NextResponse.json({ message: "Successfully reset password" });
  } catch (error) {
    return requestErrorResponse(error) || catchRouteError({ error, route: req.nextUrl.pathname });
  }
}
