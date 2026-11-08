import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db/db";
import { readJson, requestErrorResponse } from "@/lib/security";

const resourceTypes = new Set(["note", "quiz", "source"]);

export async function DELETE(req, props) {
  try {
    const { id } = await props.params;
    const courseId = Number(id);
    const { resourceId: rawResourceId, resourceType } = await readJson(req);
    const resourceId = Number(rawResourceId);
    if (!Number.isSafeInteger(courseId) || !Number.isSafeInteger(resourceId) || !resourceTypes.has(resourceType)) {
      return NextResponse.json({ message: "Invalid course resource" }, { status: 400 });
    }

    const user = await getSessionUser((await cookies()).get("token")?.value);
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (user.role !== "superadmin") {
      const assignment = await db.selectFrom("course_users").select("courseId")
        .where("courseId", "=", courseId).where("userId", "=", user.id)
        .where("role", "in", ["owner", "admin"]).executeTakeFirst();
      if (!assignment) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const result = await db.deleteFrom("resource_relations")
      .where("A", "=", resourceId).where("AType", "=", resourceType)
      .where("B", "=", courseId).where("BType", "=", "course").executeTakeFirst();
    if (!Number(result.numDeletedRows)) return NextResponse.json({ message: "Resource is not attached to this course" }, { status: 404 });
    return NextResponse.json({ message: "Resource removed from the course" });
  } catch (error) {
    return requestErrorResponse(error) || NextResponse.json({ message: "Unable to remove course resource" }, { status: 500 });
  }
}
