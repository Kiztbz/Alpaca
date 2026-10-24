"use client";

import {
  Dialog,
  DialogContent,
  DialogHeading,
  QuizDisplay,
  TrainSettings,
} from "@client";
import hasCommonItem from "@/lib/hasCommonItem";
import listPrint from "@/lib/listPrint";
import { useDailyTrain } from "@/store/store";
import styles from "./DailyTrain.module.css";
import { useState, useEffect, useCallback, useRef } from "react";
import { Rating, previewRatings, cardFromRow, formatInterval } from "@/lib/fsrs";
import { correctConfetti } from "@/lib/correctConfetti";

export function DailyTrain({ quizzes = [] }) {
  const [showSettings, setShowSettings] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [tags, setTags] = useState([]);
  const [courses, setCourses] = useState([]);
  const [sources, setSources] = useState([]);
  const [notes, setNotes] = useState([]);

  // Lesson queue state
  const [queue, setQueue] = useState([]);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasAnswersProvided, setHasAnswersProvided] = useState(false);

  // Current card evaluation state
  const [currentGraded, setCurrentGraded] = useState(false);
  const [lastGradeResult, setLastGradeResult] = useState(null);
  const [sessionFinished, setSessionFinished] = useState(false);
  const [mistakeSet, setMistakeSet] = useState(new Set());

  // Statistics
  const [ratingsCount, setRatingsCount] = useState({
    [Rating.Again]: 0,
    [Rating.Hard]: 0,
    [Rating.Good]: 0,
    [Rating.Easy]: 0,
  });
  const [sessionDuration, setSessionDuration] = useState(0);

  const setStart = useDailyTrain((state) => state.setStart);
  const start = useDailyTrain((state) => state.start);
  const isPaused = useDailyTrain((state) => state.isPaused);
  const setIsPaused = useDailyTrain((state) => state.setIsPaused);
  const settings = useDailyTrain((state) => state.settings);

  const sessionStartTimestamp = useRef(null);
  const formId = "daily-train-active-form";

  // Metadata filter extraction
  useEffect(() => {
    const presentTags = [];
    const presentCourses = [];
    const presentSources = [];
    const presentNotes = [];

    if (Array.isArray(quizzes)) {
      quizzes.forEach((q) => {
        if (Array.isArray(q.tags)) {
          q.tags.forEach((t) => {
            if (!presentTags.includes(t)) presentTags.push(t);
          });
        }
        if (Array.isArray(q.courses)) {
          q.courses.forEach((c) => {
            if (!presentCourses.includes(c)) presentCourses.push(c);
          });
        }
        if (Array.isArray(q.sources)) {
          q.sources.forEach((s) => {
            if (!presentSources.includes(s)) presentSources.push(s);
          });
        }
        if (Array.isArray(q.notes)) {
          q.notes.forEach((n) => {
            if (!presentNotes.includes(n)) presentNotes.push(n);
          });
        }
      });
    }

    setTags(presentTags);
    setCourses(presentCourses);
    setSources(presentSources);
    setNotes(presentNotes);
  }, [quizzes]);

  // Compute filtered queue
  const filteredQuizzes = quizzes.filter((quiz) => {
    if (!quiz) return false;
    const hasTagFilter = settings.tags?.length > 0;
    const hasCourseFilter = settings.courses?.length > 0;
    const hasSourceFilter = settings.sources?.length > 0;
    const hasNoteFilter = settings.notes?.length > 0;

    if (!hasTagFilter && !hasCourseFilter && !hasSourceFilter && !hasNoteFilter) {
      return true;
    }

    if (hasTagFilter && hasCommonItem(settings.tags.map((x) => x.tag), quiz.tags || [])) {
      return true;
    }
    if (hasCourseFilter && hasCommonItem(settings.courses.map((x) => x.id), quiz.courses || [])) {
      return true;
    }
    if (hasSourceFilter && hasCommonItem(settings.sources.map((x) => x.id), quiz.sources || [])) {
      return true;
    }
    if (hasNoteFilter && hasCommonItem(settings.notes.map((x) => x.id), quiz.notes || [])) {
      return true;
    }

    return false;
  });

  // Start training session
  const handleStartSession = useCallback(() => {
    const initialQueue = [...filteredQuizzes];
    setQueue(initialQueue);
    setTotalQuestions(initialQueue.length);
    setCompletedCount(0);
    setCurrentIndex(0);
    setCurrentGraded(false);
    setLastGradeResult(null);
    setSessionFinished(false);
    setMistakeSet(new Set());
    setHasAnswersProvided(false);
    setRatingsCount({
      [Rating.Again]: 0,
      [Rating.Hard]: 0,
      [Rating.Good]: 0,
      [Rating.Easy]: 0,
    });

    sessionStartTimestamp.current = Date.now();
    setSessionDuration(0);

    setStart(true);
    setIsPaused(false);
  }, [filteredQuizzes, setStart, setIsPaused]);

  // Lock body scroll during training
  useEffect(() => {
    if (start) {
      document.documentElement.style.overflow = "hidden";
    } else {
      document.documentElement.style.overflow = "";
    }
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [start]);

  // Stopwatch timer
  useEffect(() => {
    if (!start || isPaused || sessionFinished) return;

    const timer = setInterval(() => {
      if (sessionStartTimestamp.current) {
        setSessionDuration(Math.round((Date.now() - sessionStartTimestamp.current) / 1000));
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [start, isPaused, sessionFinished]);

  // Track answer inputs to enable/disable bottom "CHECK" button
  const handleAnswerChange = useCallback((answers) => {
    if (!answers) {
      setHasAnswersProvided(false);
      return;
    }
    if (Array.isArray(answers)) {
      setHasAnswersProvided(answers.some((a) => a !== "" && a !== null && a !== undefined));
    } else if (typeof answers === "string") {
      setHasAnswersProvided(answers.trim().length > 0);
    } else {
      setHasAnswersProvided(true);
    }
  }, []);

  // Graded callback from QuizDisplay
  const handleGraded = useCallback((content) => {
    setLastGradeResult(content);
    setCurrentGraded(true);
  }, []);

  // Current active quiz
  const currentQuiz = queue[currentIndex];

  // Helper to extract clean answer string
  const getCorrectAnswerDisplay = (quiz) => {
    if (!quiz) return "";
    let answersArr = [];
    if (Array.isArray(quiz.answers)) {
      answersArr = quiz.answers;
    } else if (typeof quiz.answers === "string") {
      try {
        answersArr = JSON.parse(quiz.answers);
      } catch (e) {
        answersArr = [quiz.answers];
      }
    }
    return listPrint(answersArr, quiz.multipleAnswers ? "and" : "or");
  };

  // Commit FSRS rating & advance
  const handleRateCard = useCallback(
    async (ratingValue) => {
      if (!queue.length || !currentQuiz) return;

      // Update statistics
      setRatingsCount((prev) => ({
        ...prev,
        [ratingValue]: (prev[ratingValue] || 0) + 1,
      }));

      // Commit rating update to API if explicit
      const defaultRating = lastGradeResult?.isCorrect ? Rating.Good : Rating.Again;
      if (ratingValue !== defaultRating) {
        try {
          await fetch(
            `${process.env.NEXT_PUBLIC_BASEPATH ?? ""}/api/quiz/${currentQuiz.id}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ rating: ratingValue }),
            }
          );
        } catch (e) {
          console.error("Failed to commit FSRS rating:", e);
        }
      }

      // Re-queue on Again / Wrong
      if (ratingValue === Rating.Again) {
        setMistakeSet((prev) => new Set(prev).add(currentQuiz.id));

        const updatedQueue = [...queue];
        const [missed] = updatedQueue.splice(currentIndex, 1);
        updatedQueue.push(missed);

        setQueue(updatedQueue);
        setCurrentIndex(currentIndex < updatedQueue.length ? currentIndex : 0);
      } else {
        // Successful card clearance
        const updatedQueue = queue.filter((_, idx) => idx !== currentIndex);
        setCompletedCount((prev) => prev + 1);

        if (updatedQueue.length === 0) {
          // Completed lesson!
          setQueue([]);
          setSessionFinished(true);
          correctConfetti();
        } else {
          setQueue(updatedQueue);
          setCurrentIndex(currentIndex < updatedQueue.length ? currentIndex : 0);
        }
      }

      // Reset state for next card
      setCurrentGraded(false);
      setLastGradeResult(null);
      setHasAnswersProvided(false);
    },
    [queue, currentIndex, currentQuiz, lastGradeResult]
  );

  // Trigger form submit
  const handleTriggerCheck = useCallback(() => {
    const formElem = document.getElementById(formId);
    if (formElem) {
      formElem.requestSubmit();
    }
  }, [formId]);

  // Recommended default rating
  const recommendedRating = lastGradeResult?.isCorrect ? Rating.Good : Rating.Again;

  // Keyboard navigation
  useEffect(() => {
    if (!start || isPaused || sessionFinished) return;

    function handleKeyDown(e) {
      const tag = document.activeElement?.tagName?.toLowerCase();
      const isInput = tag === "input" || tag === "textarea";

      // Escape to prompt exit
      if (e.key === "Escape") {
        setShowExitConfirm(true);
        return;
      }

      // Enter / Space navigation
      if (e.key === "Enter") {
        if (!currentGraded) {
          // If on an input and enter pressed, let form submit naturally
          if (!isInput && hasAnswersProvided) {
            e.preventDefault();
            handleTriggerCheck();
          }
        } else {
          e.preventDefault();
          handleRateCard(recommendedRating);
        }
      }

      // Numeric shortcuts for FSRS ratings
      if (currentGraded && !isInput) {
        if (e.key === "1") {
          e.preventDefault();
          handleRateCard(Rating.Again);
        } else if (e.key === "2") {
          e.preventDefault();
          handleRateCard(Rating.Hard);
        } else if (e.key === "3") {
          e.preventDefault();
          handleRateCard(Rating.Good);
        } else if (e.key === "4") {
          e.preventDefault();
          handleRateCard(Rating.Easy);
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    start,
    isPaused,
    sessionFinished,
    currentGraded,
    hasAnswersProvided,
    recommendedRating,
    handleTriggerCheck,
    handleRateCard,
  ]);

  // FSRS previews
  const previews =
    lastGradeResult?.fsrs?.previews ||
    (currentQuiz
      ? (() => {
          const card = cardFromRow(currentQuiz);
          const p = previewRatings(card);
          return {
            again: formatInterval(p.Again),
            hard: formatInterval(p.Hard),
            good: formatInterval(p.Good),
            easy: formatInterval(p.Easy),
          };
        })()
      : null);

  // Progress percentage (Duolingo style)
  const progressRatio =
    totalQuestions > 0 ? Math.min(100, Math.round((completedCount / totalQuestions) * 100)) : 0;

  // Formatted duration
  function formatTime(totalSeconds) {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}m ${secs}s`;
  }

  const isMistakeRepetition = currentQuiz && mistakeSet.has(currentQuiz.id);

  return (
    <>
      {/* ── Main Start Bar ── */}
      <div className={styles.buttonContainer}>
        <button
          className="button"
          onClick={() => {
            if (start) {
              setIsPaused(!isPaused);
            } else {
              handleStartSession();
            }
          }}
        >
          {start
            ? isPaused
              ? "Continue Training"
              : "Pause Training"
            : filteredQuizzes.length > 0
              ? `Start Daily Train (${filteredQuizzes.length})`
              : "Start Training"}
        </button>

        <button
          onClick={() => setShowSettings(true)}
          className={styles.settingsButton}
          title="Daily Train Settings"
          aria-label="Settings"
        >
          <svg viewBox="0 0 512 512" fill="currentColor" height="18" width="18">
            <g>
              <path d="M21.359,101.359h58.368c11.52,42.386,55.219,67.408,97.605,55.888c27.223-7.399,48.489-28.665,55.888-55.888h257.472 c11.782,0,21.333-9.551,21.333-21.333s-9.551-21.333-21.333-21.333H233.22C221.7,16.306,178.001-8.716,135.615,2.804 c-27.223,7.399-48.489,28.665-55.888,55.888H21.359c-11.782,0-21.333,9.551-21.333,21.333S9.577,101.359,21.359,101.359z" />
              <path d="M490.692,234.692h-58.368c-11.497-42.38-55.172-67.416-97.552-55.92c-27.245,7.391-48.529,28.674-55.92,55.92H21.359 c-11.782,0-21.333,9.551-21.333,21.333c0,11.782,9.551,21.333,21.333,21.333h257.493c11.497,42.38,55.172,67.416,97.552,55.92 c27.245-7.391,48.529-28.674,55.92-55.92h58.368c11.782,0,21.333-9.551,21.333-21.333 C512.025,244.243,502.474,234.692,490.692,234.692z" />
              <path d="M490.692,410.692H233.22c-11.52-42.386-55.219-67.408-97.605-55.888c-27.223,7.399-48.489-28.665-55.888-55.888H21.359 c-11.782,0-21.333,9.551-21.333,21.333c0,11.782,9.551,21.333,21.333,21.333h58.368c11.52,42.386,55.219,67.408,97.605,55.888 c27.223-7.399,48.489-28.665,55.888-55.888h257.472c11.782,0,21.333-9.551,21.333-21.333 C512.025,420.243,502.474,410.692,490.692,410.692z" />
            </g>
          </svg>
        </button>
      </div>

      {/* ── Settings Dialog ── */}
      <Dialog open={showSettings} onOpenChange={() => setShowSettings(false)}>
        <DialogContent>
          <DialogHeading>Daily Train Settings</DialogHeading>
          <TrainSettings
            tags={tags}
            courses={courses}
            sources={sources}
            notes={notes}
          />
        </DialogContent>
      </Dialog>

      {/* ── Duolingo-Style Lesson Experience ── */}
      {start && (
        <div className={styles.popup}>
          {/* Top Bar with Duolingo Progress Bar */}
          <header className={styles.trainHeader}>
            <div className={styles.headerLeft}>
              <button
                className={styles.exitButton}
                onClick={() => setShowExitConfirm(true)}
                title="Quit lesson (Esc)"
                aria-label="Exit"
              >
                ✕
              </button>
            </div>

            {/* Chunky Progress Track */}
            <div className={styles.progressTrack}>
              <div
                className={styles.progressFill}
                style={{ width: `${progressRatio}%` }}
              />
            </div>

            <div className={styles.headerRight}>
              {queue.length > 0 && !sessionFinished && (
                <div className={styles.queueBadge} title="Questions remaining">
                  ⚡ {queue.length} left
                </div>
              )}

              <button
                className={styles.headerIconBtn}
                onClick={() => setShowSettings(true)}
                title="Settings"
                aria-label="Settings"
              >
                ⚙
              </button>
            </div>
          </header>

          {/* ── Main Canvas (Center) ── */}
          <div className={styles.trainBody}>
            {/* 1. Lesson Completed Screen */}
            {sessionFinished && (
              <div className={styles.completionContainer}>
                <div className={styles.trophyBadge}>🏆</div>
                <h2>Daily Train Complete!</h2>
                <p>
                  You cleared all your scheduled questions for today! FSRS has
                  strengthened memory stability and updated your next review intervals.
                </p>

                <div className={styles.statsGrid}>
                  <div className={styles.statCard}>
                    <span className={styles.statValue}>{completedCount}</span>
                    <span className={styles.statLabel}>Cards Mastered</span>
                  </div>
                  <div className={styles.statCard}>
                    <span className={styles.statValue}>
                      {completedCount > 0
                        ? `${Math.round(
                            ((ratingsCount[Rating.Good] + ratingsCount[Rating.Easy]) /
                              Math.max(1, completedCount + ratingsCount[Rating.Again])) *
                              100
                          )}%`
                        : "100%"}
                    </span>
                    <span className={styles.statLabel}>First-Try Accuracy</span>
                  </div>
                  <div className={styles.statCard}>
                    <span className={styles.statValue}>{formatTime(sessionDuration)}</span>
                    <span className={styles.statLabel}>Time Spent</span>
                  </div>
                </div>

                <div className={styles.ratingsBreakdown}>
                  <span>Again: {ratingsCount[Rating.Again]}</span>
                  <span>•</span>
                  <span>Hard: {ratingsCount[Rating.Hard]}</span>
                  <span>•</span>
                  <span>Good: {ratingsCount[Rating.Good]}</span>
                  <span>•</span>
                  <span>Easy: {ratingsCount[Rating.Easy]}</span>
                </div>

                <div className={styles.completionActions}>
                  <button
                    className={styles.duoSuccessBtn}
                    onClick={() => {
                      setStart(false);
                      setIsPaused(false);
                    }}
                  >
                    CONTINUE ↵
                  </button>
                </div>
              </div>
            )}

            {/* 2. Empty Queue Screen */}
            {!sessionFinished && queue.length === 0 && (
              <div className={styles.emptyContainer}>
                <div className={styles.emptyIcon}>✨</div>
                <h3>All Caught Up!</h3>
                <p>
                  There are no questions due for review right now based on your
                  filters. As cards reach their optimal FSRS review date, they will
                  appear back here automatically.
                </p>
                <button
                  className={styles.duoPrimaryBtn}
                  onClick={() => setShowSettings(true)}
                >
                  Adjust Filters
                </button>
              </div>
            )}

            {/* 3. Active Question View */}
            {!sessionFinished && currentQuiz && (
              <div className={styles.cardWrapper}>
                {isMistakeRepetition && (
                  <div className={styles.mistakeNotice}>
                    <span>🔄</span> Let&apos;s review this one again!
                  </div>
                )}

                <div className={styles.quizCardSlot}>
                  <QuizDisplay
                    key={currentQuiz.id}
                    quiz={currentQuiz}
                    canClientCheck={false}
                    trainMode={true}
                    formId={formId}
                    hideFormButtons={true}
                    onGraded={handleGraded}
                    onAnswerChange={handleAnswerChange}
                  />
                </div>
              </div>
            )}
          </div>

          {/* ── Duolingo Sticky Bottom Footer ── */}
          {!sessionFinished && currentQuiz && (
            <footer
              className={`${styles.duoFooter} ${
                !currentGraded
                  ? styles.footerNeutral
                  : lastGradeResult?.isCorrect
                  ? styles.footerCorrect
                  : styles.footerWrong
              }`}
            >
              {/* State A: Unanswered */}
              {!currentGraded && (
                <>
                  <div className={styles.footerLeftNeutral}>
                    <button
                      type="button"
                      className={styles.skipBtn}
                      onClick={() => handleRateCard(Rating.Again)}
                    >
                      Skip / I don&apos;t know
                    </button>
                  </div>

                  <div className={styles.footerActions}>
                    <button
                      type="button"
                      className={styles.duoPrimaryBtn}
                      disabled={!hasAnswersProvided}
                      onClick={handleTriggerCheck}
                    >
                      CHECK ANSWER ↵
                    </button>
                  </div>
                </>
              )}

              {/* State B: Correct Answer (Green) */}
              {currentGraded && lastGradeResult?.isCorrect && (
                <>
                  <div className={styles.feedbackBanner}>
                    <div className={`${styles.feedbackIconCircle} ${styles.circleCorrect}`}>
                      ✓
                    </div>
                    <div className={styles.feedbackText}>
                      <h3 className={`${styles.feedbackHeading} ${styles.headingCorrect}`}>
                        Nicely done!
                      </h3>
                      <p className={styles.feedbackSubtext}>
                        Next review in {previews?.good || "3d"} • Memory strengthened
                      </p>
                    </div>
                  </div>

                  <div className={styles.footerActions}>
                    {/* FSRS rating adjustments */}
                    <div className={styles.fsrsPills}>
                      <button
                        type="button"
                        className={styles.fsrsPill}
                        onClick={() => handleRateCard(Rating.Hard)}
                        title="Took effort to remember (Press 2)"
                      >
                        <span>Hard</span>
                        <span className={styles.fsrsPillInterval}>{previews?.hard}</span>
                      </button>

                      <button
                        type="button"
                        className={styles.fsrsPill}
                        onClick={() => handleRateCard(Rating.Easy)}
                        title="Effortless recall (Press 4)"
                      >
                        <span>Easy</span>
                        <span className={styles.fsrsPillInterval}>{previews?.easy}</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      className={styles.duoSuccessBtn}
                      onClick={() => handleRateCard(Rating.Good)}
                    >
                      CONTINUE ↵
                    </button>
                  </div>
                </>
              )}

              {/* State C: Incorrect Answer (Red with Correct Solution Displayed) */}
              {currentGraded && !lastGradeResult?.isCorrect && (
                <>
                  <div className={styles.feedbackBanner}>
                    <div className={`${styles.feedbackIconCircle} ${styles.circleWrong}`}>
                      ✕
                    </div>
                    <div className={styles.feedbackText}>
                      <h3 className={`${styles.feedbackHeading} ${styles.headingWrong}`}>
                        Correct answer:
                      </h3>
                      <div className={styles.correctSolutionText}>
                        {getCorrectAnswerDisplay(currentQuiz)}
                      </div>
                      <p className={styles.feedbackSubtext}>
                        Don&apos;t worry — this question will reappear before you finish!
                      </p>
                    </div>
                  </div>

                  <div className={styles.footerActions}>
                    <button
                      type="button"
                      className={styles.fsrsPill}
                      onClick={() => handleRateCard(Rating.Hard)}
                      title="If you just had a typo, count as Hard (Press 2)"
                    >
                      <span>Typo? (Hard)</span>
                      <span className={styles.fsrsPillInterval}>{previews?.hard}</span>
                    </button>

                    <button
                      type="button"
                      className={styles.duoDangerBtn}
                      onClick={() => handleRateCard(Rating.Again)}
                    >
                      GOT IT ↵
                    </button>
                  </div>
                </>
              )}
            </footer>
          )}

          {/* ── Quit Confirmation Dialog ── */}
          {showExitConfirm && (
            <div className={styles.blurContainer}>
              <div className={styles.dialogModal}>
                <h3>Quit Daily Train?</h3>
                <p>
                  Any remaining questions in today&apos;s queue will stay scheduled for review.
                </p>
                <div className={styles.modalActions}>
                  <button
                    className="button primary"
                    onClick={() => setShowExitConfirm(false)}
                  >
                    Keep Practicing
                  </button>
                  <button
                    className="button border"
                    onClick={() => {
                      setShowExitConfirm(false);
                      setStart(false);
                      setIsPaused(false);
                    }}
                  >
                    Quit Lesson
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
