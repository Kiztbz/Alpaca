import { unauthorized } from "@/lib/apiErrorResponses";
import { catchRouteError } from "@/lib/db/helpers";
import { customAlphabet } from "nanoid";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { useUser } from "@/lib/auth";
import { db } from "@/lib/db/db";

const makeReceiptId = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", 12);
const DEMO_PRICE_CENTS = 4900;

export async function POST(req, props) {
  const user = await useUser({ token: (await cookies()).get("token")?.value });
  if (!user) return unauthorized;

  const { id } = await props.params;

  try {
    const course = await db
      .selectFrom("courses")
      .select(["id", "name", "enrollment", "createdBy"])
      .where("id", "=", id)
      .where("isDeleted", "=", false)
      .executeTakeFirst();

    if (!course) return NextResponse.json({ message: "Course not found" }, { status: 404 });
    if (course.enrollment !== "paid") return NextResponse.json({ message: "This course does not require checkout" }, { status: 400 });
    if (String(course.createdBy) === String(user.id)) return NextResponse.json({ message: "Course owners do not need to purchase their course" }, { status: 400 });

    const result = await db.transaction().execute(async (trx) => {
      let payment = await trx
        .selectFrom("course_payments")
        .select(["receiptId", "amountCents", "currency"])
        .where("courseId", "=", id)
        .where("userId", "=", user.id)
        .executeTakeFirst();

      if (!payment) {
        payment = await trx
          .insertInto("course_payments")
          .values({
            receiptId: makeReceiptId(),
            courseId: id,
            userId: user.id,
            amountCents: DEMO_PRICE_CENTS,
            currency: "USD",
            status: "paid",
            isDemo: true,
          })
          .returning(["receiptId", "amountCents", "currency"])
          .executeTakeFirstOrThrow();
      }

      await trx
        .insertInto("course_users")
        .values({ courseId: id, userId: user.id, role: "student" })
        .onConflict((conflict) => conflict.columns(["courseId", "userId"]).doNothing())
        .execute();

      return payment;
    });

    return NextResponse.json({
      message: "Demo payment complete — course unlocked",
      content: { ...result, demo: true, course: course.name },
    });
  } catch (error) {
    return catchRouteError({ error, route: req.nextUrl.pathname });
  }
}
