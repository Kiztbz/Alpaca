import {
  createEmptyCard,
  reviewCard,
  previewRatings,
  formatInterval,
  retrievability,
  cardFromRow,
  cardToRow,
  Rating,
  State,
} from "../fsrs.js";

describe("FSRS v5 Algorithm", () => {
  test("creates a valid empty card", () => {
    const card = createEmptyCard();
    expect(card.state).toBe(State.New);
    expect(card.difficulty).toBe(0);
    expect(card.stability).toBe(0);
    expect(card.reps).toBe(0);
    expect(card.lapses).toBe(0);
    expect(card.scheduledDays).toBe(0);
  });

  test("retrievability decay calculation", () => {
    // S = 10 days, after 0 days -> R = 1.0 (100%)
    expect(retrievability(0, 10)).toBe(1);

    // After 10 days, R should be approximately 0.90 (90%)
    const r10 = retrievability(10, 10);
    expect(r10).toBeGreaterThan(0.88);
    expect(r10).toBeLessThan(0.92);

    // After 30 days, R should have decayed significantly
    const r30 = retrievability(30, 10);
    expect(r30).toBeLessThan(r10);
    expect(r30).toBeGreaterThan(0.5);
  });

  test("New card rating transitions", () => {
    const card = createEmptyCard();
    const now = new Date();

    // Rating Good on new card -> moves to Review, schedules interval >= 2
    const goodReview = reviewCard(card, Rating.Good, now, { enableFuzz: false });
    expect(goodReview.card.state).toBe(State.Review);
    expect(goodReview.card.reps).toBe(1);
    expect(goodReview.interval).toBeGreaterThanOrEqual(2);

    // Rating Easy on new card -> moves to Review with even longer interval
    const easyReview = reviewCard(card, Rating.Easy, now, { enableFuzz: false });
    expect(easyReview.card.state).toBe(State.Review);
    expect(easyReview.interval).toBeGreaterThan(goodReview.interval);

    // Rating Again on new card -> moves to Learning, immediate interval
    const againReview = reviewCard(card, Rating.Again, now, { enableFuzz: false });
    expect(againReview.card.state).toBe(State.Learning);
    expect(againReview.interval).toBe(0);
  });

  test("Review card lapse transitions to Relearning", () => {
    // Establish a review card
    const card = createEmptyCard();
    const { card: revCard } = reviewCard(card, Rating.Good, new Date("2026-01-01"), { enableFuzz: false });
    expect(revCard.state).toBe(State.Review);

    // User forgets card (Again)
    const lapseReview = reviewCard(revCard, Rating.Again, new Date("2026-01-10"), { enableFuzz: false });
    expect(lapseReview.card.state).toBe(State.Relearning);
    expect(lapseReview.card.lapses).toBe(1);
    expect(lapseReview.interval).toBe(0);
  });

  test("previewRatings generates intervals for all 4 buttons", () => {
    const card = createEmptyCard();
    const previews = previewRatings(card);
    expect(previews).toHaveProperty("Again");
    expect(previews).toHaveProperty("Hard");
    expect(previews).toHaveProperty("Good");
    expect(previews).toHaveProperty("Easy");
    expect(previews.Good).toBeGreaterThan(previews.Hard);
    expect(previews.Easy).toBeGreaterThan(previews.Good);
  });

  test("formatInterval outputs clean strings", () => {
    expect(formatInterval(0)).toBe("< 1d");
    expect(formatInterval(0.5)).toBe("< 1d");
    expect(formatInterval(1)).toBe("1d");
    expect(formatInterval(5)).toBe("5d");
    expect(formatInterval(45)).toBe("1mo");
    expect(formatInterval(730)).toBe("2.0y");
  });

  test("DB row conversions preserve card data", () => {
    const row = {
      state: State.Review,
      difficulty: 4.8,
      stability: 12.5,
      reps: 6,
      lapses: 1,
      last_review: "2026-10-20 12:00:00",
      scheduled_days: 14,
    };

    const card = cardFromRow(row);
    expect(card.state).toBe(State.Review);
    expect(card.difficulty).toBe(4.8);
    expect(card.stability).toBe(12.5);
    expect(card.reps).toBe(6);
    expect(card.lapses).toBe(1);

    const converted = cardToRow(card);
    expect(converted.state).toBe(State.Review);
    expect(converted.difficulty).toBe(4.8);
    expect(converted.stability).toBe(12.5);
    expect(converted.reps).toBe(6);
    expect(converted.lapses).toBe(1);
  });
});
