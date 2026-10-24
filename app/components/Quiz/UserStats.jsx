import styles from "./UserStats.module.css";
import { htmlDate } from "@/lib/date";
import { State, retrievability, formatInterval } from "@/lib/fsrs";

const STATE_NAMES = {
  [State.New]: "New",
  [State.Learning]: "Learning",
  [State.Review]: "Review",
  [State.Relearning]: "Relearning",
};

export function UserStats({ userQuizInfo }) {
  if (!userQuizInfo) return null;

  const isDue = !userQuizInfo.hiddenUntil || new Date(userQuizInfo.hiddenUntil) <= Date.now();
  const state = userQuizInfo.state ?? (userQuizInfo.level > 0 ? State.Review : State.New);
  const stateLabel = STATE_NAMES[state] || "New";

  const elapsedDays = userQuizInfo.lastReview
    ? Math.max(0, (Date.now() - new Date(userQuizInfo.lastReview).getTime()) / 86400000)
    : 0;

  const r = userQuizInfo.stability > 0
    ? Math.round(retrievability(elapsedDays, userQuizInfo.stability) * 100)
    : null;

  return (
    <div className={styles.info}>
      <div className={styles.statusRow}>
        <span className={`${styles.badge} ${styles[stateLabel.toLowerCase()] || ""}`}>
          {stateLabel}
        </span>
        {isDue ? (
          <span className={styles.dueBadge}>Ready to review</span>
        ) : (
          <span className={styles.hiddenText}>
            Next review: {htmlDate(userQuizInfo.hiddenUntil)}
          </span>
        )}
      </div>

      <div className={styles.metricsGrid}>
        {userQuizInfo.stability > 0 && (
          <div className={styles.metric}>
            <span className={styles.metricLabel}>Stability</span>
            <span className={styles.metricValue}>
              {formatInterval(userQuizInfo.stability)}
            </span>
          </div>
        )}

        {userQuizInfo.difficulty > 0 && (
          <div className={styles.metric}>
            <span className={styles.metricLabel}>Difficulty</span>
            <span className={styles.metricValue}>
              {Number(userQuizInfo.difficulty).toFixed(1)}/10
            </span>
          </div>
        )}

        {r !== null && (
          <div className={styles.metric}>
            <span className={styles.metricLabel}>Estimated Recall</span>
            <span className={styles.metricValue}>{r}%</span>
          </div>
        )}

        {userQuizInfo.reps > 0 && (
          <div className={styles.metric}>
            <span className={styles.metricLabel}>Reviews</span>
            <span className={styles.metricValue}>{userQuizInfo.reps}</span>
          </div>
        )}
      </div>
    </div>
  );
}
