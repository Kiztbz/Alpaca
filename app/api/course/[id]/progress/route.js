import { unauthorized } from "@/lib/apiErrorResponses";
import { catchRouteError } from "@/lib/db/helpers";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { useUser } from "@/lib/auth";
import { db } from "@/lib/db/db";

export async function GET(req, props) {
  const user = await useUser({ token: (await cookies()).get("token")?.value });
  if (!user) return unauthorized;

  const { id } = await props.params;
  try {
    const enrollment = await db.selectFrom("course_users").select("courseId")
      .where("courseId", "=", id).where("userId", "=", user.id).executeTakeFirst();
    if (!enrollment) return NextResponse.json({ message: "Enroll before viewing course progress" }, { status: 403 });

    const notes = await db.selectFrom("course_note_progress")
      .select(["noteId", "lastCardIndex", "totalCards", "completedAt", "updatedAt"])
      .where("courseId", "=", id).where("userId", "=", user.id).execute();
    return NextResponse.json({ content: { notes } });
  } catch (error) {
    return catchRouteError({ error, route: req.nextUrl.pathname });
  }
}

export async function POST(req, props) {
  const user = await useUser({ token: (await cookies()).get("token")?.value });
  if (!user) return unauthorized;

  const { id } = await props.params;
  const { noteId, cardIndex = 0, totalCards = 1, complete = true } = await req.json();
  const normalizedIndex = Number(cardIndex);
  const normalizedTotal = Number(totalCards);

  if (!Number.isInteger(normalizedIndex) || normalizedIndex < 0 || !Number.isInteger(normalizedTotal) || normalizedTotal < 1) {
    return NextResponse.json({ message: "Invalid card progress" }, { status: 400 });
  }

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

    const existing = await db.selectFrom("course_note_progress").selectAll()
      .where("courseId", "=", id).where("userId", "=", user.id).where("noteId", "=", noteId).executeTakeFirst();
    const now = new Date();
    const effectiveTotal = Math.max(normalizedTotal, Number(existing?.totalCards || 1));
    const nextIndex = Math.min(Math.max(normalizedIndex, Number(existing?.lastCardIndex || 0)), effectiveTotal - 1);
    const savedIndex = complete ? Math.max(nextIndex, normalizedTotal - 1) : nextIndex;
    const nextCompletedAt = existing?.completedAt || (complete ? now : null);

    if (existing) {
      await db.updateTable("course_note_progress").set({
        lastCardIndex: savedIndex,
        totalCards: effectiveTotal,
        completedAt: nextCompletedAt,
        updatedAt: now,
      }).where("courseId", "=", id).where("userId", "=", user.id).where("noteId", "=", noteId).execute();
    } else {
      await db.insertInto("course_note_progress").values({
        courseId: id,
        userId: user.id,
        noteId,
        lastCardIndex: complete ? normalizedTotal - 1 : Math.min(normalizedIndex, normalizedTotal - 1),
        totalCards: normalizedTotal,
        completedAt: complete ? now : null,
        updatedAt: now,
      }).execute();
    }

    return NextResponse.json({ message: complete ? "Lesson completion saved" : "Card progress saved", content: { noteId, lastCardIndex: savedIndex, totalCards: effectiveTotal, completedAt: nextCompletedAt } });
  } catch (error) {
    return catchRouteError({ error, route: req.nextUrl.pathname });
  }
}

export async function DELETE(req, props) {
  const user = await useUser({ token: (await cookies()).get("token")?.value });
  if (!user) return unauthorized;

  const { id } = await props.params;
  const { noteId } = await req.json();
  if (!noteId) return NextResponse.json({ message: "Note is required" }, { status: 400 });

  try {
    await db.deleteFrom("course_note_progress")
      .where("courseId", "=", id)
      .where("userId", "=", user.id)
      .where("noteId", "=", noteId)
      .where("completedAt", "is", null)
      .execute();

    return NextResponse.json({ message: "Incomplete note progress reset" });
  } catch (error) {
    return catchRouteError({ error, route: req.nextUrl.pathname });
  }
}
