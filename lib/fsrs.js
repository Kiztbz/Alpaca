/**
 * FSRS v5 (Free Spaced Repetition Scheduler) — pure JS implementation.
 *
 * References:
 *   - https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm
 *   - Piotr Woźniak's Three Component Model of Memory
 *
 * Key concepts:
 *   State  – New (0), Learning (1), Review (2), Relearning (3)
 *   Rating – Again (1), Hard (2), Good (3), Easy (4)
 *   D      – Difficulty  [1, 10]
 *   S      – Stability   (days until retrievability drops to 90%)
 *   R      – Retrievability [0, 1]
 */

// ──────────────────── Default Parameters (FSRS-5) ────────────────────

export const FSRS_DEFAULTS = {
  // w[0..18] – optimized weights
  w: [
    0.4072, 1.1829, 3.1262, 15.4722,   // w0–w3: initial stability for Again/Hard/Good/Easy
    7.2102, 0.5316, 1.0651,             // w4–w6: difficulty init
    0.0589, 1.5330, 0.1618, 1.0190,     // w7–w10: stability after recall
    2.0902, 0.0091, 0.3246, 0.3690,     // w11–w14: stability after forget
    2.1730, 0.1570, 2.9898, 0.5100,     // w15–w18: difficulty mean reversion, hard/easy penalty
    0.0000,                              // w19: (FSRS-5 short-term scheduling)
  ],
  requestRetention: 0.9,    // desired retention rate
  maximumInterval: 36500,   // maximum interval in days (100 years)
  enableFuzz: true,          // add small randomness to intervals
};

// ──────────────────── Enums ────────────────────

export const State = {
  New: 0,
  Learning: 1,
  Review: 2,
  Relearning: 3,
};

export const Rating = {
  Again: 1,
  Hard: 2,
  Good: 3,
  Easy: 4,
};

// ──────────────────── Card Factory ────────────────────

/**
 * Create a brand-new card with FSRS defaults.
 */
export function createEmptyCard(now = new Date()) {
  return {
    state: State.New,
    difficulty: 0,
    stability: 0,
    reps: 0,
    lapses: 0,
    lastReview: now,
    scheduledDays: 0,
    elapsedDays: 0,
  };
}

// ──────────────────── Core Maths ────────────────────

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Retrievability: R(t, S) = (1 + FACTOR * t / S) ^ DECAY
 * FSRS-5: FACTOR = 19/81, DECAY = -0.5
 */
const DECAY = -0.5;
const FACTOR = 19 / 81;

export function retrievability(elapsedDays, stability) {
  if (stability <= 0) return 0;
  return Math.pow(1 + (FACTOR * elapsedDays) / stability, DECAY);
}

/**
 * Given desired retention, compute the interval:
 *   I(r, S) = S / FACTOR * (r^(1/DECAY) - 1)
 */
function nextInterval(stability, requestRetention, maximumInterval) {
  const interval = Math.round(
    (stability / FACTOR) * (Math.pow(requestRetention, 1 / DECAY) - 1)
  );
  return clamp(interval, 1, maximumInterval);
}

// ──────────────────── Initial Difficulty & Stability ────────────────────

function initDifficulty(rating, w) {
  // D0(G) = w4 - exp(w5 * (G - 1)) + 1
  return clamp(w[4] - Math.exp(w[5] * (rating - 1)) + 1, 1, 10);
}

function initStability(rating, w) {
  // S0(G) = max(w[G-1], 0.1)
  return Math.max(w[rating - 1], 0.1);
}

// ──────────────────── Difficulty Update ────────────────────

function nextDifficulty(d, rating, w) {
  // D'(D, G) = w6 · D0(3) + (1 - w6) · (D - w7 · (G - 3))
  // then clamp to [1, 10]
  const newD = w[6] * initDifficulty(Rating.Good, w) + (1 - w[6]) * (d - w[7] * (rating - 3));
  return clamp(newD, 1, 10);
}

// ──────────────────── Stability Update ────────────────────

function nextRecallStability(d, s, r, rating, w) {
  // S'_r(D, S, R, G)
  const hardPenalty = rating === Rating.Hard ? w[15] : 1;
  const easyBonus = rating === Rating.Easy ? w[16] : 1;

  return (
    s *
    (
      1 +
      Math.exp(w[8]) *
      (11 - d) *
      Math.pow(s, -w[9]) *
      (Math.exp((1 - r) * w[10]) - 1) *
      hardPenalty *
      easyBonus
    )
  );
}

function nextForgetStability(d, s, r, w) {
  // S'_f(D, S, R)
  return (
    w[11] *
    Math.pow(d, -w[12]) *
    (Math.pow(s + 1, w[13]) - 1) *
    Math.exp((1 - r) * w[14])
  );
}

// ──────────────────── Fuzz ────────────────────

function applyFuzz(interval) {
  if (interval < 2.5) return interval;

  // Determine fuzz range based on interval
  let minIvl, maxIvl;
  if (interval < 7) {
    minIvl = Math.max(2, Math.round(interval * 0.75));
    maxIvl = Math.round(interval * 1.25);
  } else if (interval < 30) {
    minIvl = Math.round(interval * 0.85);
    maxIvl = Math.round(interval * 1.15);
  } else {
    minIvl = Math.round(interval * 0.90);
    maxIvl = Math.round(interval * 1.10);
  }

  // Make sure minIvl <= interval <= maxIvl
  minIvl = Math.min(minIvl, interval);
  maxIvl = Math.max(maxIvl, interval);

  return Math.round(minIvl + Math.random() * (maxIvl - minIvl));
}

// ──────────────────── Schedule One Review ────────────────────

/**
 * Given a card and a rating, produce the updated card + scheduling info.
 *
 * @param {object} card – { state, difficulty, stability, reps, lapses, lastReview, scheduledDays, elapsedDays }
 * @param {1|2|3|4} rating
 * @param {Date}   now
 * @param {object} params – FSRS parameters (defaults to FSRS_DEFAULTS)
 * @returns {{ card: object, scheduledDays: number, interval: number }}
 */
export function reviewCard(card, rating, now = new Date(), params = FSRS_DEFAULTS) {
  const mergedParams = { ...FSRS_DEFAULTS, ...params };
  const { w, requestRetention, maximumInterval, enableFuzz } = mergedParams;

  const elapsed =
    card.lastReview
      ? Math.max(0, (now - new Date(card.lastReview)) / (1000 * 60 * 60 * 24))
      : 0;

  const r = card.state === State.Review
    ? retrievability(elapsed, card.stability)
    : 0;

  let newCard = { ...card, lastReview: now, elapsedDays: elapsed };
  let interval = 0;

  switch (card.state) {
    // ── New Card ──
    case State.New: {
      newCard.difficulty = initDifficulty(rating, w);
      newCard.stability = initStability(rating, w);
      newCard.reps = 1;

      if (rating === Rating.Again) {
        newCard.state = State.Learning;
        interval = 0; // show again immediately (within minutes)
        newCard.scheduledDays = 0;
      } else if (rating === Rating.Hard) {
        newCard.state = State.Learning;
        interval = 0;
        newCard.scheduledDays = 0;
      } else if (rating === Rating.Good) {
        newCard.state = State.Review;
        interval = nextInterval(newCard.stability, requestRetention, maximumInterval);
        if (enableFuzz) interval = applyFuzz(interval);
        newCard.scheduledDays = interval;
      } else {
        // Easy
        newCard.state = State.Review;
        interval = nextInterval(newCard.stability, requestRetention, maximumInterval);
        if (enableFuzz) interval = applyFuzz(interval);
        newCard.scheduledDays = interval;
      }
      break;
    }

    // ── Learning / Relearning ──
    case State.Learning:
    case State.Relearning: {
      newCard.difficulty = nextDifficulty(card.difficulty, rating, w);
      newCard.stability = initStability(rating, w);

      if (rating === Rating.Again) {
        newCard.state = card.state; // stay in same state
        newCard.lapses = card.state === State.Relearning ? card.lapses : card.lapses;
        interval = 0;
        newCard.scheduledDays = 0;
      } else if (rating === Rating.Hard) {
        newCard.state = card.state;
        interval = 0;
        newCard.scheduledDays = 0;
      } else if (rating === Rating.Good) {
        newCard.state = State.Review;
        interval = nextInterval(newCard.stability, requestRetention, maximumInterval);
        if (enableFuzz) interval = applyFuzz(interval);
        newCard.scheduledDays = interval;
        newCard.reps += 1;
      } else {
        // Easy
        newCard.state = State.Review;
        interval = nextInterval(newCard.stability, requestRetention, maximumInterval);
        if (enableFuzz) interval = applyFuzz(interval);
        newCard.scheduledDays = interval;
        newCard.reps += 1;
      }
      break;
    }

    // ── Review ──
    case State.Review: {
      newCard.difficulty = nextDifficulty(card.difficulty, rating, w);

      if (rating === Rating.Again) {
        // Lapse – forgot the card
        newCard.state = State.Relearning;
        newCard.lapses += 1;
        newCard.stability = nextForgetStability(
          newCard.difficulty,
          card.stability,
          r,
          w
        );
        interval = 0;
        newCard.scheduledDays = 0;
      } else {
        // Hard, Good, or Easy – recalled
        newCard.stability = nextRecallStability(
          newCard.difficulty,
          card.stability,
          r,
          rating,
          w
        );
        newCard.state = State.Review;
        newCard.reps += 1;
        interval = nextInterval(newCard.stability, requestRetention, maximumInterval);
        if (enableFuzz) interval = applyFuzz(interval);
        newCard.scheduledDays = interval;
      }
      break;
    }
  }

  return {
    card: newCard,
    interval,
    scheduledDays: newCard.scheduledDays,
  };
}

// ──────────────────── Preview all ratings ────────────────────

/**
 * Returns the interval that would result from each rating.
 * Useful for showing intervals on buttons ("Again <1m" "Good 3d" etc.)
 */
export function previewRatings(card, now = new Date(), params = FSRS_DEFAULTS) {
  const result = {};
  for (const [name, value] of Object.entries(Rating)) {
    const { interval } = reviewCard(card, value, now, { ...params, enableFuzz: false });
    result[name] = interval;
  }
  return result;
}

// ──────────────────── Interval Formatting ────────────────────

/**
 * Format an interval (in days) to a human-readable string.
 */
export function formatInterval(days) {
  if (days < 1) return "< 1d";
  if (days === 1) return "1d";
  if (days < 30) return `${Math.round(days)}d`;
  if (days < 365) {
    const months = Math.round(days / 30.44);
    return `${months}mo`;
  }
  const years = (days / 365.25).toFixed(1);
  return `${years}y`;
}

// ──────────────────── Card from DB row ────────────────────

/**
 * Convert a user_quizzes DB row into an FSRS card object.
 */
export function cardFromRow(row) {
  if (!row) return createEmptyCard();

  return {
    state: row.state ?? State.New,
    difficulty: row.difficulty ?? 0,
    stability: row.stability ?? 0,
    reps: row.reps ?? 0,
    lapses: row.lapses ?? 0,
    lastReview: row.lastReview ?? row.last_review ?? new Date(0),
    scheduledDays: row.scheduledDays ?? row.scheduled_days ?? 0,
    elapsedDays: row.elapsedDays ?? row.elapsed_days ?? 0,
  };
}

/**
 * Convert an FSRS card object into fields for DB update.
 */
export function cardToRow(card) {
  return {
    state: card.state,
    difficulty: card.difficulty,
    stability: card.stability,
    reps: card.reps,
    lapses: card.lapses,
    lastReview: card.lastReview instanceof Date
      ? card.lastReview.toISOString().slice(0, 19).replace("T", " ")
      : card.lastReview,
    scheduledDays: card.scheduledDays,
  };
}
