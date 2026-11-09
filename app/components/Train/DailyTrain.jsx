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
import { consumeDailyTrainQuestion, createDailyTrainQueue, DAILY_TRAIN_QUESTION_SECONDS, DAILY_TRAIN_SESSION_SIZE } from "@/lib/dailyTrain";

const SESSION_SIZE = DAILY_TRAIN_SESSION_SIZE;
const QUESTION_SECONDS = DAILY_TRAIN_QUESTION_SECONDS;

function reviewAnswerText(value) {
  const values = Array.isArray(value) ? value : value == null ? [] : [value];
  const text = values.map((answer) => {
    if (answer == null || answer === "") return "";
    if (typeof answer === "object") return answer.label ?? answer.text ?? answer.value ?? JSON.stringify(answer);
    return String(answer);
  }).filter(Boolean);
  return text.length ? text.join(", ") : "No answer";
}

function reviewPrompt(quiz) {
  return String(quiz?.prompt || quiz?.title || "Quiz question").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function reviewCorrectAnswer(quiz) {
  let answers = quiz?.answers;
  if (typeof answers === "string") {
    try { answers = JSON.parse(answers); } catch { answers = [answers]; }
  }
  return reviewAnswerText(answers);
}

export function DailyTrain({ quizzes = [], courseId, courseName }) {
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
  const [questionSeconds, setQuestionSeconds] = useState(QUESTION_SECONDS);
  const [questionSerial, setQuestionSerial] = useState(0);
  const [reviewResults, setReviewResults] = useState([]);
  const [showReview, setShowReview] = useState(false);
  const [assessmentHistory, setAssessmentHistory] = useState([]);
  const [historyError, setHistoryError] = useState("");

  // Current card evaluation state
  const [currentGraded, setCurrentGraded] = useState(false);
  const [lastGradeResult, setLastGradeResult] = useState(null);
  const [sessionFinished, setSessionFinished] = useState(false);

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
  const currentAnswersRef = useRef([]);
  const reviewResultsRef = useRef([]);
  const advancingRef = useRef(false);
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

  useEffect(() => {
    if (!courseId) return;
    const controller = new AbortController();
    fetch(`${process.env.NEXT_PUBLIC_BASEPATH ?? ""}/api/daily-train/history`, { signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.message || "Could not load assessment history");
        setAssessmentHistory(Array.isArray(payload.content) ? payload.content : []);
        setHistoryError("");
      })
      .catch((error) => {
        if (error.name !== "AbortError") setHistoryError(error.message || "Could not load assessment history");
      });
    return () => controller.abort();
  }, [courseId]);

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
    const initialQueue = createDailyTrainQueue(filteredQuizzes);
    setQueue(initialQueue);
    setTotalQuestions(initialQueue.length);
    setCompletedCount(0);
    setCurrentIndex(0);
    setCurrentGraded(false);
    setLastGradeResult(null);
    setSessionFinished(false);
    setHasAnswersProvided(false);
    currentAnswersRef.current = [];
    setQuestionSeconds(QUESTION_SECONDS);
    setQuestionSerial((value) => value + 1);
    setRatingsCount({
      [Rating.Again]: 0,
      [Rating.Hard]: 0,
      [Rating.Good]: 0,
      [Rating.Easy]: 0,
    });
    setReviewResults([]);
    reviewResultsRef.current = [];
    setShowReview(false);

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
    currentAnswersRef.current = answers;
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

  const currentQuiz = queue[currentIndex];

  const recordReviewResult = useCallback((quiz, answers, isCorrect, outcome) => {
    if (!quiz) return;
    if (reviewResultsRef.current.some((result) => String(result.quizId) === String(quiz.id))) return;
    const result = {
      quizId: quiz.id,
      prompt: reviewPrompt(quiz),
      userAnswer: reviewAnswerText(answers),
      correctAnswer: reviewCorrectAnswer(quiz),
      isCorrect: Boolean(isCorrect),
      outcome,
    };
    reviewResultsRef.current = [...reviewResultsRef.current, result];
    setReviewResults(reviewResultsRef.current);
  }, []);

  const saveAssessmentHistory = useCallback(async (results, durationSeconds) => {
    if (!courseId || !results.length) return;
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASEPATH ?? ""}/api/daily-train/history`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId, courseName, durationSeconds, results }),
      keepalive: true,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message || "Could not save assessment history");
    setAssessmentHistory((history) => [payload.content, ...history].slice(0, 20));
    setHistoryError("");
  }, [courseId, courseName]);

  // Graded callback from QuizDisplay
  const handleGraded = useCallback((content) => {
    setLastGradeResult(content);
    setCurrentGraded(true);
    recordReviewResult(currentQuiz, currentAnswersRef.current, content?.isCorrect, content?.isCorrect ? "Correct" : "Incorrect");
  }, [currentQuiz, recordReviewResult]);

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
      if (!queue.length || !currentQuiz || advancingRef.current) return;
      advancingRef.current = true;

      if (!currentGraded) {
        recordReviewResult(
          currentQuiz,
          currentAnswersRef.current,
          false,
          questionSeconds === 0 ? "Timed out" : "Skipped"
        );
      }

      // Update statistics
      setRatingsCount((prev) => ({
        ...prev,
        [ratingValue]: (prev[ratingValue] || 0) + 1,
      }));

      // Commit rating update to API if explicit
      const defaultRating = lastGradeResult?.isCorrect ? Rating.Good : Rating.Again;
      if (!currentGraded || ratingValue !== defaultRating) {
        try {
          await fetch(
            `${process.env.NEXT_PUBLIC_BASEPATH ?? ""}/api/quiz/${currentQuiz.id}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ rating: ratingValue, courseId }),
            }
          );
        } catch (e) {
          console.error("Failed to commit FSRS rating:", e);
        }
      }

      // Every question consumes exactly one of the five session slots. Incorrect,
      // skipped, and timed-out cards return in a future assessment, not this one.
      const updatedQueue = consumeDailyTrainQuestion(queue, currentIndex);
      setCompletedCount((prev) => prev + 1);

      if (updatedQueue.length === 0) {
        const finalDuration = sessionStartTimestamp.current
          ? Math.round((Date.now() - sessionStartTimestamp.current) / 1000)
          : sessionDuration;
        setSessionDuration(finalDuration);
        try {
          await saveAssessmentHistory(reviewResultsRef.current, finalDuration);
        } catch (error) {
          setHistoryError(error.message || "Could not save assessment history");
        }
        setQueue([]);
        setSessionFinished(true);
        setShowReview(true);
        correctConfetti();
      } else {
        setQueue(updatedQueue);
        setCurrentIndex(currentIndex < updatedQueue.length ? currentIndex : 0);
      }

      // Reset state for next card
      setCurrentGraded(false);
      setLastGradeResult(null);
      setHasAnswersProvided(false);
      currentAnswersRef.current = [];
      setQuestionSerial((value) => value + 1);
      advancingRef.current = false;
    },
    [queue, currentIndex, currentQuiz, currentGraded, lastGradeResult, questionSeconds, recordReviewResult, saveAssessmentHistory, sessionDuration]
  );

  useEffect(() => {
    if (!start || sessionFinished || !currentQuiz) return;
    setQuestionSeconds(QUESTION_SECONDS);
  }, [currentQuiz?.id, questionSerial, start, sessionFinished]);

  useEffect(() => {
    if (!start || isPaused || sessionFinished || currentGraded || !currentQuiz) return;
    const timer = window.setInterval(() => {
      setQuestionSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [currentGraded, currentQuiz, isPaused, sessionFinished, start, questionSerial]);

  useEffect(() => {
    if (questionSeconds !== 0 || !start || isPaused || sessionFinished || currentGraded || !currentQuiz) return;
    handleRateCard(Rating.Again);
  }, [currentGraded, currentQuiz, handleRateCard, isPaused, questionSeconds, sessionFinished, start]);

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

  return (
    <>
      {/* ── Main Start Bar ── */}
      {!start && <div className={styles.buttonContainer}>
        <button
          type="button"
          className="button"
          onClick={handleStartSession}
          disabled={filteredQuizzes.length === 0}
        >
          {filteredQuizzes.length > 0
            ? `Start Daily Train (${Math.min(SESSION_SIZE, filteredQuizzes.length)})`
            : "Complete a unit to unlock training"}
        </button>

        <button
          type="button"
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
      </div>}

      {!start && <section className={styles.historySection} aria-labelledby="assessment-history-title">
        <header><div><span>Progress</span><h2 id="assessment-history-title">Assessment history</h2></div><small>Your latest 20 Daily Train sessions</small></header>
        {historyError && <p className={styles.historyError}>{historyError}</p>}
        {!assessmentHistory.length && !historyError && <p className={styles.historyEmpty}>Complete a Daily Train session and its results will appear here.</p>}
        <div className={styles.historyList}>
          {assessmentHistory.map((session) => <details key={session.id} className={styles.historyItem}>
            <summary>
              <div><strong>{session.courseName || courseName}</strong><small>{new Date(session.completedAt).toLocaleString()}</small></div>
              <span>{session.correctAnswers} / {session.totalQuestions} correct</span>
              <small>{formatTime(Number(session.durationSeconds || 0))}</small>
            </summary>
            <div className={styles.historyResults}>
              {(Array.isArray(session.results) ? session.results : []).map((result, index) => <div key={`${session.id}-${result.quizId || index}`} className={result.isCorrect ? styles.historyCorrect : styles.historyWrong}>
                <span>{result.isCorrect ? "✓" : "✕"}</span><div><strong>{result.prompt}</strong><small>Your answer: {result.userAnswer}</small>{!result.isCorrect && <small>Correct answer: {result.correctAnswer}</small>}</div>
              </div>)}
            </div>
          </details>)}
        </div>
      </section>}

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
                type="button"
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
              <button
                type="button"
                className={styles.headerIconBtn}
                onClick={() => setIsPaused(!isPaused)}
                aria-label={isPaused ? "Resume training" : "Pause training"}
                title={isPaused ? "Resume training" : "Pause training"}
              >
                {isPaused ? "▶" : "Ⅱ"}
              </button>
              {queue.length > 0 && !sessionFinished && (
                <div className={`${styles.queueBadge} ${questionSeconds <= 10 ? styles.timerDanger : ""}`} title="Time remaining for this question" aria-live="polite">
                  ◷ {questionSeconds}s
                </div>
              )}
              {queue.length > 0 && !sessionFinished && (
                <div className={styles.queueBadge} title="Questions remaining">
                  ⚡ {queue.length} left
                </div>
              )}

              <button
                type="button"
                className={styles.headerIconBtn}
                onClick={() => setShowSettings(true)}
                title="Settings"
                aria-label="Settings"
              >
                ⚙
              </button>
            </div>
          </header>

          {isPaused && (
            <div className={styles.blurContainer}>
              <div className={styles.dialogModal}>
                <h3>Training paused</h3>
                <p>Your place and remaining time are preserved.</p>
                <div className={styles.modalActions}>
                  <button type="button" className="button primary" onClick={() => setIsPaused(false)}>
                    Resume Training
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Main Canvas (Center) ── */}
          <div className={styles.trainBody}>
            {/* 1. Lesson Completed Screen */}
            {sessionFinished && showReview && (
              <section className={styles.reviewContainer} aria-labelledby="daily-review-title">
                <header className={styles.reviewHeader}>
                  <div><span>Session complete</span><h2 id="daily-review-title">Review your answers</h2></div>
                  <strong>{reviewResults.filter((result) => result.isCorrect).length} / {reviewResults.length} correct</strong>
                </header>
                <div className={styles.reviewList}>
                  {reviewResults.map((result, index) => (
                    <article className={`${styles.reviewItem} ${result.isCorrect ? styles.reviewCorrect : styles.reviewWrong}`} key={result.quizId}>
                      <div className={styles.reviewStatus}><span>{result.isCorrect ? "✓" : "✕"}</span><small>Question {index + 1} · {result.outcome}</small></div>
                      <h3>{result.prompt}</h3>
                      <dl>
                        <div><dt>Your answer</dt><dd>{result.userAnswer}</dd></div>
                        {!result.isCorrect && <div><dt>Correct answer</dt><dd>{result.correctAnswer}</dd></div>}
                      </dl>
                    </article>
                  ))}
                </div>
                <div className={styles.completionActions}>
                  <button type="button" className={styles.duoPrimaryBtn} onClick={() => setShowReview(false)}>View summary</button>
                  <button type="button" className={styles.duoSuccessBtn} onClick={() => { setStart(false); setIsPaused(false); }}>Finish</button>
                </div>
              </section>
            )}

            {sessionFinished && !showReview && (
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
                    <span className={styles.statLabel}>Questions attempted</span>
                  </div>
                  <div className={styles.statCard}>
                    <span className={styles.statValue}>
                      {reviewResults.length > 0
                        ? `${Math.round((reviewResults.filter((result) => result.isCorrect).length / reviewResults.length) * 100)}%`
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
                  <button className={styles.duoPrimaryBtn} onClick={() => setShowReview(true)}>REVIEW ANSWERS</button>
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
                <div className={styles.quizCardSlot}>
                  <QuizDisplay
                    key={currentQuiz.id}
                    quiz={currentQuiz}
                    contextCourseId={courseId}
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
                        This question will return in a future review.
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
                    type="button"
                    className="button primary"
                    onClick={() => setShowExitConfirm(false)}
                  >
                    Keep Practicing
                  </button>
                  <button
                    type="button"
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
