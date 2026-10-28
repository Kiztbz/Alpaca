import { unauthorized } from "@/lib/apiErrorResponses";
import { catchRouteError } from "@/lib/db/helpers";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { useUser } from "@/lib/auth";
import { db } from "@/lib/db/db";

export async function POST(req, props) {
  const user = await useUser({ token: (await cookies()).get("token")?.value });
  if (!user) return unauthorized;

  const { id } = await props.params;
  const { noteId } = await req.json();

  try {
    const enrollment = await db
      .selectFrom("course_users")
      .select("courseId")
      .where("courseId", "=", id)
      .where("userId", "=", user.id)
      .executeTakeFirst();

    if (!enrollment) return NextResponse.json({ message: "Enroll before recording course progress" }, { status: 403 });

    const relation = await db
      .selectFrom("resource_relations")
      .select("a")
      .where("a", "=", noteId)
      .where("aType", "=", "note")
      .where("b", "=", id)
      .where("bType", "=", "course")
      .executeTakeFirst();

    if (!relation) return NextResponse.json({ message: "Note is not part of this course" }, { status: 400 });

    await db
      .insertInto("course_note_progress")
      .values({ courseId: id, userId: user.id, noteId })
      .onConflict((conflict) => conflict.columns(["courseId", "userId", "noteId"]).doNothing())
      .execute();

    return NextResponse.json({ message: "Lesson completion saved" });
  } catch (error) {
    return catchRouteError({ error, route: req.nextUrl.pathname });
  }
}
