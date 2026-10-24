import shuffleArray from "./shuffleArray.js";
import { State, retrievability } from "./fsrs.js";

/**
 * Filter and sort quizzes for Daily Train using FSRS priority queue rules:
 * 1. Only include quizzes due for review (hiddenUntil <= now or new cards).
 * 2. Order by:
 *    - Priority 1: Learning / Relearning cards (states 1 and 3)
 *    - Priority 2: Overdue Review cards (state 2), sorted by lowest retrievability first
 *    - Priority 3: New cards (state 0), randomized
 */
export default function shuffleQuizzes(quizArray) {
  if (!Array.isArray(quizArray)) return [];

  const now = Date.now();

  const dueQuizzes = quizArray.filter((quiz) => {
    if (!quiz) return false;
    // New cards that haven't been reviewed yet are always available
    if (quiz.state === State.New && (!quiz.level || quiz.level === 0)) return true;
    if (!quiz.hiddenUntil) return true;
    const hiddenDate = new Date(quiz.hiddenUntil).getTime();
    return Number.isNaN(hiddenDate) || hiddenDate <= now;
  });

  const learning = [];
  const review = [];
  const newCards = [];

  for (const quiz of dueQuizzes) {
    const state = quiz.state ?? (quiz.level > 0 ? State.Review : State.New);
    if (state === State.Learning || state === State.Relearning) {
      learning.push(quiz);
    } else if (state === State.Review) {
      review.push(quiz);
    } else {
      newCards.push(quiz);
    }
  }

  // Shuffle learning cards to prevent predictability
  const shuffledLearning = shuffleArray(learning);

  // Sort review cards by retrievability ascending (hardest / closest to forgetting first)
  review.sort((a, b) => {
    const elapsedA = a.lastReview ? Math.max(0, (now - new Date(a.lastReview).getTime()) / 86400000) : 0;
    const elapsedB = b.lastReview ? Math.max(0, (now - new Date(b.lastReview).getTime()) / 86400000) : 0;
    const retA = a.stability > 0 ? retrievability(elapsedA, a.stability) : 0.5;
    const retB = b.stability > 0 ? retrievability(elapsedB, b.stability) : 0.5;

    if (retA !== retB) return retA - retB;
    return (a.level || 0) - (b.level || 0);
  });

  // Shuffle new cards
  const shuffledNew = shuffleArray(newCards);

  return [...shuffledLearning, ...review, ...shuffledNew];
}
