import { unauthorized } from "@/lib/apiErrorResponses";
import { catchRouteError } from "@/lib/db/helpers";
import { customAlphabet } from "nanoid";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { useUser } from "@/lib/auth";
import { db } from "@/lib/db/db";
import { sql } from "kysely";

const makeCertificateId = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", 12);

async function completionStatus(courseId, userId) {
  const [enrollment, noteTotals, quizTotals, certificate] = await Promise.all([
    db.selectFrom("course_users").select("courseId").where("courseId", "=", courseId).where("userId", "=", userId).executeTakeFirst(),
    db.selectFrom("resource_relations as rr")
      .leftJoin("course_note_progress as cp", (join) => join.onRef("cp.noteId", "=", "rr.a").on("cp.courseId", "=", courseId).on("cp.userId", "=", userId))
      .select([sql`count(distinct rr.a)::int`.as("total"), sql`count(distinct cp.note_id)::int`.as("completed")])
      .where("rr.b", "=", courseId).where("rr.aType", "=", "note").where("rr.bType", "=", "course").executeTakeFirst(),
    db.selectFrom("resource_relations as rr")
      .leftJoin("user_quizzes as uq", (join) => join.onRef("uq.quizId", "=", "rr.a").on("uq.userId", "=", userId).on("uq.lastCorrect", "is not", null))
      .select([sql`count(distinct rr.a)::int`.as("total"), sql`count(distinct uq.quiz_id)::int`.as("completed")])
      .where("rr.b", "=", courseId).where("rr.aType", "=", "quiz").where("rr.bType", "=", "course").executeTakeFirst(),
    db.selectFrom("course_certificates").select(["publicId", "issuedAt"]).where("courseId", "=", courseId).where("userId", "=", userId).executeTakeFirst(),
  ]);

  const notes = { total: Number(noteTotals?.total || 0), completed: Number(noteTotals?.completed || 0) };
  const quizzes = { total: Number(quizTotals?.total || 0), completed: Number(quizTotals?.completed || 0) };
  const eligible = Boolean(enrollment && notes.completed === notes.total && quizzes.completed === quizzes.total && (notes.total + quizzes.total > 0));

  return { enrolled: Boolean(enrollment), eligible, notes, quizzes, certificate: certificate || null };
}

export async function GET(req, props) {
  const user = await useUser({ token: (await cookies()).get("token")?.value });
  if (!user) return unauthorized;
  const { id } = await props.params;

  try {
    return NextResponse.json({ content: await completionStatus(id, user.id) });
  } catch (error) {
    return catchRouteError({ error, route: req.nextUrl.pathname });
  }
}

export async function POST(req, props) {
  const user = await useUser({ token: (await cookies()).get("token")?.value });
  if (!user) return unauthorized;
  const { id } = await props.params;

  try {
    const status = await completionStatus(id, user.id);
    if (!status.eligible) return NextResponse.json({ message: "Complete every lesson and pass every quiz before claiming your certificate", content: status }, { status: 400 });

    let certificate = status.certificate;
    if (!certificate) {
      certificate = await db
        .insertInto("course_certificates")
        .values({ publicId: makeCertificateId(), courseId: id, userId: user.id })
        .onConflict((conflict) => conflict.columns(["courseId", "userId"]).doNothing())
        .returning(["publicId", "issuedAt"])
        .executeTakeFirst();

      certificate ||= await db.selectFrom("course_certificates").select(["publicId", "issuedAt"]).where("courseId", "=", id).where("userId", "=", user.id).executeTakeFirst();
    }

    return NextResponse.json({ message: "Certificate issued", content: certificate });
  } catch (error) {
    return catchRouteError({ error, route: req.nextUrl.pathname });
  }
}
