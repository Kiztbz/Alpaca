import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db/db";
import { readJson, requestErrorResponse } from "@/lib/security";

async function requireSuperadmin() {
  const user = await getSessionUser((await cookies()).get("token")?.value);
  return user?.role === "superadmin" ? user : null;
}

export async function POST(req) {
  try {
    if (!(await requireSuperadmin())) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    const { courseId, username } = await readJson(req);
    const id = Number(courseId);
    if (!Number.isSafeInteger(id) || id < 1 || typeof username !== "string" || !username.trim()) {
      return NextResponse.json({ message: "A valid course and username are required" }, { status: 400 });
    }
    const [course, account] = await Promise.all([
      db.selectFrom("courses").select("id").where("id", "=", id).executeTakeFirst(),
      db.selectFrom("users").select(["id", "username"]).where("username", "ilike", username.trim()).executeTakeFirst(),
    ]);
    if (!course || !account) return NextResponse.json({ message: "Course or account not found" }, { status: 404 });

    await db.insertInto("course_users").values({ courseId: id, userId: account.id, role: "admin" })
      .onConflict((oc) => oc.columns(["courseId", "userId"]).doUpdateSet({ role: "admin" }))
      .execute();
    return NextResponse.json({ message: `${account.username} is now a course admin` });
  } catch (error) {
    return requestErrorResponse(error) || NextResponse.json({ message: "Unable to assign course admin" }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    if (!(await requireSuperadmin())) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    const { courseId, userId } = await readJson(req);
    const course = Number(courseId);
    const user = Number(userId);
    if (!Number.isSafeInteger(course) || !Number.isSafeInteger(user)) return NextResponse.json({ message: "Invalid assignment" }, { status: 400 });
    await db.deleteFrom("course_users").where("courseId", "=", course).where("userId", "=", user).where("role", "=", "admin").execute();
    return NextResponse.json({ message: "Course admin access removed" });
  } catch (error) {
    return requestErrorResponse(error) || NextResponse.json({ message: "Unable to remove course admin" }, { status: 500 });
  }
}
