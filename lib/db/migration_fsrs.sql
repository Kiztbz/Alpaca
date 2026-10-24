-- Migration: Add FSRS columns to user_quizzes table
-- Run this migration to upgrade from the simple level-based system to FSRS v5

-- Add new FSRS scheduling columns
ALTER TABLE user_quizzes
  ADD COLUMN IF NOT EXISTS state SMALLINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS difficulty DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stability DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reps INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lapses INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS scheduled_days INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_review TIMESTAMP DEFAULT NOW();

-- Migrate existing data: convert old levels to approximate FSRS state
-- Cards that have level > 0 are in Review state, otherwise New
UPDATE user_quizzes
SET
  state = CASE WHEN level > 0 THEN 2 ELSE 0 END,
  difficulty = CASE WHEN level > 0 THEN GREATEST(1, LEAST(10, 10 - level)) ELSE 0 END,
  stability = CASE WHEN level > 0 THEN GREATEST(0.1, level * 1.5) ELSE 0 END,
  reps = CASE WHEN level > 0 THEN level ELSE 0 END,
  lapses = 0,
  scheduled_days = level,
  last_review = COALESCE(last_correct, NOW())
WHERE state IS NULL OR state = 0;

-- Add index for efficient due card queries
CREATE INDEX IF NOT EXISTS idx_user_quizzes_due
  ON user_quizzes (user_id, hidden_until);

CREATE INDEX IF NOT EXISTS idx_user_quizzes_state
  ON user_quizzes (user_id, state);
