import { unauthorized } from "@/lib/apiErrorResponses";
import { getSessionUser } from "@/lib/auth";
import { catchRouteError } from "@/lib/db/helpers";
import { db } from "@/lib/db/db";
import { readJson } from "@/lib/security";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

function cleanText(value, max = 1_000) {
  return String(value ?? "").slice(0, max);
}

function cleanResults(results) {
  if (!Array.isArray(results) || results.length < 1 || results.length > 5) return null;
  return results.map((result) => ({
    quizId: Number(result?.quizId) || null,
    prompt: cleanText(result?.prompt),
    userAnswer: cleanText(result?.userAnswer),
    correctAnswer: cleanText(result?.correctAnswer),
    isCorrect: Boolean(result?.isCorrect),
    outcome: cleanText(result?.outcome, 40),
  }));
}

export async function GET(req) {
  const user = await getSessionUser((await cookies()).get("token")?.value);
  if (!user) return unauthorized;

  try {
    const history = await db
      .selectFrom("daily_train_sessions as dts")
      .innerJoin("courses as c", "c.id", "dts.courseId")
      .select([
        "dts.id",
        "dts.courseId",
        "c.name as courseName",
        "dts.totalQuestions",
        "dts.correctAnswers",
        "dts.durationSeconds",
        "dts.results",
        "dts.completedAt",
      ])
      .where("dts.userId", "=", user.id)
      .orderBy("dts.completedAt", "desc")
      .limit(20)
      .execute();
    return NextResponse.json({ content: history });
  } catch (error) {
    return catchRouteError({ error, route: req.nextUrl.pathname });
  }
}

export async function POST(req) {
  const user = await getSessionUser((await cookies()).get("token")?.value);
  if (!user) return unauthorized;

  try {
    const body = await readJson(req, 32_768);
    const courseId = Number(body.courseId);
    const results = cleanResults(body.results);
    const durationSeconds = Math.max(0, Math.min(86_400, Number(body.durationSeconds) || 0));
    if (!Number.isInteger(courseId) || courseId < 1 || !results) {
      return NextResponse.json({ message: "Invalid assessment history" }, { status: 400 });
    }

    const enrollment = await db.selectFrom("course_users")
      .select("courseId")
      .where("courseId", "=", courseId)
      .where("userId", "=", user.id)
      .executeTakeFirst();
    if (!enrollment) return NextResponse.json({ message: "Enroll before saving assessment history" }, { status: 403 });

    const saved = await db.insertInto("daily_train_sessions").values({
      userId: user.id,
      courseId,
      totalQuestions: results.length,
      correctAnswers: results.filter((result) => result.isCorrect).length,
      durationSeconds,
      results: JSON.stringify(results),
    }).returning(["id", "courseId", "totalQuestions", "correctAnswers", "durationSeconds", "results", "completedAt"]).executeTakeFirstOrThrow();

    return NextResponse.json({ message: "Assessment history saved", content: { ...saved, courseName: cleanText(body.courseName, 200) } });
  } catch (error) {
    return catchRouteError({ error, route: req.nextUrl.pathname });
  }
}
