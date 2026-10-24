"use client";

import { noteCardCount } from "@/lib/noteCards";
import { useStore } from "@/store/store";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import styles from "./Dash.module.css";

function Icon({ name }) {
  const paths = {
    arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
    award: <><circle cx="12" cy="8" r="5" /><path d="m8.5 12-1 9 4.5-2.5 4.5 2.5-1-9" /></>,
    bolt: <path d="m13 2-7 11h5l-1 9 8-12h-5V2Z" />,
    book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Z" /><path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5a2.5 2.5 0 0 1 2.5 2.5v-16Z" /></>,
    cards: <><rect x="5" y="3" width="14" height="18" rx="3" /><path d="M9 8h6M9 12h6" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    chevron: <path d="m9 18 6-6-6-6" />,
    flame: <path d="M13.4 2.7c.4 2.7-.8 4-2 5.2-1.1 1.2-2.1 2.3-1.7 4.5.6-1.1 1.4-1.8 2.4-2.5-.2 2.1 2.3 3 2.3 5.4a3.4 3.4 0 0 1-6.8 0c0-2.1.9-3.8 2.4-5.5C11.6 8 13.2 6.4 13.4 2.7Z" />,
    lock: <><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    star: <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z" />,
    target: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

function greeting() {
  const hour = new Date().getHours();
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

export function Dashboard() {
  const user = useStore((state) => state.user);
  const notes = useStore((state) => state.notes);
  const quizzes = useStore((state) => state.quizzes);
  const courses = useStore((state) => state.courses);
  const [savedProgress, setSavedProgress] = useState({});
  const [streak, setStreak] = useState({ count: 0, date: null });

  const lessons = useMemo(() => notes.map((note) => ({
    ...note,
    cardCount: Math.max(1, noteCardCount(note.text)),
  })), [notes]);

  useEffect(() => {
    const progress = {};
    lessons.forEach((note) => {
      try {
        progress[note.publicId] = JSON.parse(localStorage.getItem(`alpaca-note-progress:${note.publicId}`) || "null");
      } catch {
        progress[note.publicId] = null;
      }
    });
    setSavedProgress(progress);
    try {
      const value = JSON.parse(localStorage.getItem("alpaca-note-streak") || "null");
      setStreak({ count: value?.count || 0, date: value?.date || null });
    } catch {
      setStreak({ count: 0, date: null });
    }
  }, [lessons]);

  if (!user) return null;

  const firstName = (user.displayName || user.username || "Learner").trim().split(/\s+/)[0];
  const sortedCourses = [...courses].sort((a, b) => (b.level || 0) - (a.level || 0));
  const activeCourse = sortedCourses[0];
  const courseLessons = activeCourse ? lessons.filter((note) => note.courses?.some((id) => String(id) === String(activeCourse.id))) : [];
  const pathLessons = (courseLessons.length ? courseLessons : lessons).slice(0, 8);
  const completed = pathLessons.filter((note) => savedProgress[note.publicId]?.complete).length;
  const continueNote = pathLessons.find((note) => savedProgress[note.publicId]?.index > 0 && !savedProgress[note.publicId]?.complete)
    || pathLessons.find((note) => !savedProgress[note.publicId]?.complete)
    || pathLessons[0];
  const progressPercent = pathLessons.length ? Math.round((completed / pathLessons.length) * 100) : 0;
  const lessonsRemaining = Math.max(pathLessons.length - completed, 0);
  const certificateReady = Boolean(activeCourse && pathLessons.length && lessonsRemaining === 0);
  const dueQuizzes = quizzes.filter((quiz) => !quiz.hiddenUntil || new Date(quiz.hiddenUntil) <= new Date());
  const today = new Date().toISOString().slice(0, 10);
  const learnedToday = streak.date === today;
  const week = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    return {
      label: date.toLocaleDateString(undefined, { weekday: "narrow" }),
      active: index >= 7 - Math.min(streak.count, 7),
      today: index === 6,
    };
  });

  return (
    <main className={styles.app}>
      <section className={styles.learningColumn}>
        <header className={styles.pageHeader}>
          <div><span>{greeting()}</span><h1>Ready to learn, {firstName}?</h1></div>
          <Link href="/daily"><Icon name="bolt" /> Daily train</Link>
        </header>

        <section className={styles.courseHeader}>
          <div className={styles.courseTopline}><span>Current course</span><strong>{progressPercent}% complete</strong></div>
          <h2>{activeCourse?.name || "Your learning path"}</h2>
          <p>{activeCourse?.description || "Complete each short lesson to build momentum."}</p>
          <div className={styles.courseProgress}><i style={{ width: `${progressPercent}%` }} /></div>
          <div className={styles.courseBottom}>
            <span>{completed} of {pathLessons.length} lessons</span>
            {activeCourse && <Link href={`/courses/${encodeURIComponent(activeCourse.name)}`}>Course details <Icon name="chevron" /></Link>}
          </div>
        </section>

        {pathLessons.length ? <section className={styles.path} aria-label="Course lessons">
          <div className={styles.lessonPath}>
            {pathLessons.map((note, index) => {
              const progress = savedProgress[note.publicId];
              const complete = Boolean(progress?.complete);
              const current = note.publicId === continueNote?.publicId;
              const status = complete ? "Complete" : current ? progress?.index ? "In progress" : "Next lesson" : "Ready";
              const query = activeCourse ? `?course=${encodeURIComponent(activeCourse.publicId)}` : "";
              return <div className={`${styles.lessonStep} ${complete ? styles.complete : ""} ${current ? styles.current : ""}`} key={note.id}>
                <div className={styles.stepRail}>
                  <Link href={`/notes/${note.publicId}${query}`} aria-label={`${status}: ${note.title}`} className={styles.stepButton}>
                    <Icon name={complete ? "check" : current ? "star" : "book"} />
                  </Link>
                  {index < pathLessons.length - 1 && <i />}
                </div>
                <Link href={`/notes/${note.publicId}${query}`} className={styles.lessonInfo}>
                  <span>{status}</span>
                  <h3>{note.title}</h3>
                  <p>{note.cardCount} cards · {Math.max(2, Math.ceil(note.cardCount * .7))} min</p>
                  {current && <strong>{progress?.index ? "Continue" : "Start lesson"}<Icon name="arrow" /></strong>}
                </Link>
              </div>;
            })}
          </div>
          <Link href="/notes" className={styles.libraryLink}>View all notes <Icon name="arrow" /></Link>
        </section> : <section className={styles.emptyPath}>
          <span><Icon name="cards" /></span><h2>Create your first lesson</h2><p>Turn a note into small cards and start a focused learning path.</p><Link href="/create?type=Note"><Icon name="plus" /> Create note</Link>
        </section>}
      </section>

      <aside className={styles.progressRail}>
        <section className={styles.statStrip} aria-label="Learning stats">
          <div><Icon name="flame" /><strong>{streak.count}</strong><span>Streak</span></div>
          <div><Icon name="bolt" /><strong>{dueQuizzes.length}</strong><span>Review</span></div>
          <div><Icon name="cards" /><strong>{lessons.length}</strong><span>Notes</span></div>
        </section>

        <section className={styles.railCard}>
          <header><span className={styles.targetIcon}><Icon name="target" /></span><div><small>Daily quests</small><h2>Today&apos;s goals</h2></div><b>{learnedToday ? 1 : 0}/3</b></header>
          <div className={styles.quests}>
            <Link href={continueNote ? `/notes/${continueNote.publicId}` : "/create?type=Note"}><span className={learnedToday ? styles.done : ""}>{learnedToday ? <Icon name="check" /> : <Icon name="book" />}</span><div><strong>Complete a lesson</strong><small>{learnedToday ? "Finished today" : "Keep your streak alive"}</small></div></Link>
            <Link href="/daily"><span><Icon name="bolt" /></span><div><strong>Quick review</strong><small>{dueQuizzes.length} questions available</small></div></Link>
            <Link href="/study"><span><Icon name="cards" /></span><div><strong>Study your notes</strong><small>Choose your own session</small></div></Link>
          </div>
        </section>

        <section className={styles.railCard}>
          <header><span className={styles.flameIcon}><Icon name="flame" /></span><div><small>Your streak</small><h2>{streak.count} days strong</h2></div></header>
          <div className={styles.week}>
            {week.map((day, index) => <div className={`${day.active ? styles.activeDay : ""} ${day.today ? styles.today : ""}`} key={`${day.label}-${index}`}><span>{day.active && <Icon name="check" />}</span><small>{day.label}</small></div>)}
          </div>
          <p>{learnedToday ? "Today is complete. Come back tomorrow to continue." : "Complete one lesson today to grow your streak."}</p>
        </section>

        <section className={styles.railCard}>
          <header><span><Icon name="award" /></span><div><small>Course</small><h2>Options</h2></div></header>
          <div className={styles.optionList}>
            <div className={`${styles.optionRow} ${certificateReady ? styles.optionReady : ""}`}>
              <span><Icon name={certificateReady ? "award" : "lock"} /></span>
              <div><strong>Certificate</strong><small>{certificateReady ? "Course complete" : activeCourse ? `${lessonsRemaining} lesson${lessonsRemaining === 1 ? "" : "s"} remaining` : "Choose a course first"}</small></div>
              <b>{certificateReady ? "Ready" : "Locked"}</b>
            </div>
            <Link href="/courses" className={styles.optionRow}>
              <span><Icon name="book" /></span>
              <div><strong>Other courses</strong><small>{sortedCourses.length > 1 ? `${sortedCourses.length - 1} more available` : "Browse learning paths"}</small></div>
              <Icon name="chevron" />
            </Link>
            <Link href="/notes" className={styles.optionRow}>
              <span><Icon name="cards" /></span>
              <div><strong>Notes library</strong><small>{lessons.length} note{lessons.length === 1 ? "" : "s"}</small></div>
              <Icon name="chevron" />
            </Link>
          </div>
        </section>
      </aside>
    </main>
  );
}
