import { isValidDate, timestampFromDate } from "@/lib/date";
import { unauthorized } from "@/lib/apiErrorResponses";
import checkAnswers from "@/lib/checkAnswers";
import { areFieldsEqual } from "@/lib/objects";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { useUser } from "@/lib/auth";
import { db } from "@/lib/db/db.js";
import {
  reviewCard,
  previewRatings,
  cardFromRow,
  formatInterval,
  Rating,
} from "@/lib/fsrs";
import {
  getResourcePermissions,
  canDeleteResource,
  canEditResource,
  catchRouteError,
  updateQuiz,
} from "@/lib/db/helpers";

// UPDATE QUIZ
export async function PATCH(req, { params }) {
  const { id } = params;

  const data = await req.json();
  const {
    type,
    prompt,
    choices,
    answers,
    hints,
    sources,
    notes,
    courses,
    tags,
    permissions,
  } = data;

  if (!Object.keys(data).length) {
    return NextResponse.json(
      {
        message: "No data provided to update",
      },
      { status: 400 }
    );
  }

  try {
    const user = await useUser({
      token: (await cookies()).get("token")?.value,
    });
    if (!user) return unauthorized;

    if (!(await canEditResource(user.id, id, "quizzes", "quiz"))) {
      return NextResponse.json(
        {
          message: "You do not have permission to edit this quiz",
        },
        { status: 400 }
      );
    }

    const quiz = await db
      .selectFrom("quizzes")
      .select(({ eb }) => [
        "id",
        "createdBy",
        getResourcePermissions("quiz", id, eb),
      ])
      .where("id", "=", id)
      .executeTakeFirst();

    if (!quiz) {
      return NextResponse.json(
        {
          message: "Quiz not found",
        },
        { status: 404 }
      );
    }

    if (
      !areFieldsEqual(permissions, quiz.permissions) &&
      quiz.createdBy !== user.id
    ) {
      return NextResponse.json(
        {
          message:
            "You do not have permission to edit permissions for this quiz",
        },
        { status: 403 }
      );
    }

    const content = await updateQuiz({
      id,
      type,
      prompt,
      choices,
      answers,
      hints,
      sources,
      notes,
      courses,
      tags,
      permissions,
      contributorId: user.id,
    });

    if (!content.valid) {
      return NextResponse.json(
        {
          message: "Invalid quiz data",
          errors: content.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: "Successfully updated quiz",
      content,
    });
  } catch (error) {
    return catchRouteError({ error, route: req.nextUrl.pathname });
  }
}

// GRADE QUIZ (with FSRS Spaced Repetition)
export async function POST(req, props) {
  const params = await props.params;
  const body = await req.json();
  const { answers, rating: explicitRating } = body;
  const { id } = params;

  try {
    const user = await useUser({
      token: (await cookies()).get("token")?.value,
    });
    if (!user) return unauthorized;

    const quiz = await db
      .selectFrom("quizzes")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();

    if (!quiz) {
      return NextResponse.json(
        {
          message: "Quiz not found",
        },
        { status: 404 }
      );
    }

    let isCorrect = false;
    let matchQuality = 0;
    let incorrectIndexes = [];

    // Check answers if provided
    if (Array.isArray(answers)) {
      const result = checkAnswers({
        userAnswers: answers,
        quiz,
      });
      isCorrect = result.isCorrect;
      matchQuality = result.matchQuality;
      incorrectIndexes = result.incorrectIndexes;
    } else if (explicitRating) {
      // Manual rating (e.g. from flashcard mode): 2, 3, 4 considered successful recall
      isCorrect = explicitRating >= Rating.Hard;
      matchQuality = isCorrect ? 1 : 0;
    }

    // Determine final FSRS rating: explicit rating takes priority, otherwise derived from isCorrect
    let finalRating = Rating.Good;
    if (explicitRating && [1, 2, 3, 4].includes(Number(explicitRating))) {
      finalRating = Number(explicitRating);
    } else {
      finalRating = isCorrect ? Rating.Good : Rating.Again;
    }

    // Fetch existing user interaction
    const quizInteraction = await db
      .selectFrom("user_quizzes")
      .selectAll()
      .where("userId", "=", user.id)
      .where("quizId", "=", quiz.id)
      .executeTakeFirst();

    const hasUserInteractedWithQuiz = !!quizInteraction;
    const now = new Date();

    // Convert existing DB row to FSRS card
    const card = cardFromRow(quizInteraction);

    // Compute preview of all rating options prior to applying
    const ratingPreviews = previewRatings(card, now);

    // Apply FSRS review transition
    const { card: nextCard, interval, scheduledDays } = reviewCard(card, finalRating, now);

    // Compute hiddenUntil timestamp
    let nextHiddenUntil = new Date(now);
    if (scheduledDays > 0) {
      nextHiddenUntil.setDate(nextHiddenUntil.getDate() + scheduledDays);
    } else {
      // Lapse or learning: available again in 10 minutes
      nextHiddenUntil = new Date(now.getTime() + 10 * 60 * 1000);
    }

    // Backwards-compatible level and tries
    const level = Math.max(0, Math.round(nextCard.stability));
    const triesAtLevel = isCorrect ? 0 : ((quizInteraction?.triesAtLevel || 0) + 1);

    const updatePayload = {
      level,
      triesAtLevel,
      lastCorrect: isCorrect ? now : (quizInteraction?.lastCorrect || null),
      hiddenUntil: nextHiddenUntil,
      state: nextCard.state,
      difficulty: nextCard.difficulty,
      stability: nextCard.stability,
      reps: nextCard.reps,
      lapses: nextCard.lapses,
      scheduledDays: nextCard.scheduledDays,
      lastReview: now,
    };

    if (hasUserInteractedWithQuiz) {
      await db
        .updateTable("user_quizzes")
        .set(updatePayload)
        .where("quizId", "=", quiz.id)
        .where("userId", "=", user.id)
        .execute();
    } else {
      await db
        .insertInto("user_quizzes")
        .values({
          userId: user.id,
          quizId: quiz.id,
          ...updatePayload,
        })
        .execute();
    }

    const sendHints = shouldSendHints(level, triesAtLevel);

    return NextResponse.json(
      {
        message: "Quiz successfully graded",
        content: {
          isCorrect,
          incorrectIndexes,
          hints: sendHints ? hintsFromLevel(quiz.hints, level) : [],
          matchQuality,
          fsrs: {
            state: nextCard.state,
            difficulty: nextCard.difficulty,
            stability: nextCard.stability,
            reps: nextCard.reps,
            lapses: nextCard.lapses,
            scheduledDays: nextCard.scheduledDays,
            interval,
            intervalFormatted: formatInterval(interval),
            hiddenUntil: nextHiddenUntil.toISOString(),
            ratingApplied: finalRating,
            previews: {
              again: formatInterval(ratingPreviews.Again),
              hard: formatInterval(ratingPreviews.Hard),
              good: formatInterval(ratingPreviews.Good),
              easy: formatInterval(ratingPreviews.Easy),
            },
          },
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return catchRouteError({ error, route: req.nextUrl.pathname });
  }
}

function hintsFromLevel(hints, level) {
  if (!hints) return [];
  if (hints.length === 0) return [];

  // We want at least one hint to be sent

  const randomHint = hints[Math.floor(Math.random() * hints.length)];
  const newHints = hints.slice(0, level + 1);

  if (newHints.length === 0) return [randomHint];
  return newHints;
}

function shouldSendHints(level, tries) {
  // The more the level, the more tries needed to send hints
  // Minimum tries to send hints is 3

  return tries >= Math.max(3, level * 2);
}

// DELETE QUIZ

export async function DELETE(req, props) {
  const params = await props.params;
  const { id } = params;

  try {
    const user = await useUser({
      token: (await cookies()).get("token")?.value,
    });
    if (!user) return unauthorized;

    if (!(await canDeleteResource(user.id, id, "quizzes"))) {
      return NextResponse.json(
        {
          message: "You do not have permission to delete this quiz",
        },
        { status: 403 }
      );
    }

    await db.deleteFrom("quizzes").where("id", "=", id).execute();

    return NextResponse.json(
      {
        message: "Successfully deleted quiz",
      },
      { status: 200 }
    );
  } catch (error) {
    return catchRouteError({ error, route: req.nextUrl.pathname });
  }
}
