"use client";

import { noteCardCount, notePlainText } from "@/lib/noteCards";
import styles from "./NotesHub.module.css";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export function NotesHub({ notes, page, maxPage, amount, activeTag }) {
  const [query, setQuery] = useState("");
  const [progress, setProgress] = useState({});
  const [streak, setStreak] = useState(0);

  const lessons = useMemo(() => notes.map((note) => ({
    ...note,
    cardCount: noteCardCount(note.text),
    wordCount: notePlainText(note.text).split(/\s+/).filter(Boolean).length,
  })), [notes]);

  useEffect(() => {
    const saved = {};
    lessons.forEach((note) => {
      try {
        saved[note.publicId] = JSON.parse(localStorage.getItem(`alpaca-note-progress:${note.publicId}`) || "null");
      } catch {
        saved[note.publicId] = null;
      }
    });
    setProgress(saved);

    try {
      setStreak(JSON.parse(localStorage.getItem("alpaca-note-streak") || "null")?.count || 0);
    } catch {
      setStreak(0);
    }
  }, [lessons]);

  const filtered = lessons.filter((note) => {
    const haystack = `${note.title} ${note.tags?.join(" ") || ""}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  });

  const completed = lessons.filter((note) => progress[note.publicId]?.complete).length;
  const totalCards = lessons.reduce((total, note) => total + note.cardCount, 0);
  const continueNote = lessons.find((note) => progress[note.publicId]?.index > 0 && !progress[note.publicId]?.complete)
    || lessons.find((note) => !progress[note.publicId]?.complete)
    || lessons[0];
  const continueProgress = continueNote ? progress[continueNote.publicId] : null;
  const continuePercent = continueNote
    ? continueProgress?.complete ? 100 : Math.round((((continueProgress?.index || 0) + 1) / continueNote.cardCount) * 100)
    : 0;

  return (
    <main className={styles.hub}>
      <header className={styles.appHeader}>
        <div><span>Library</span><h1>Notes</h1><p>Pick up a lesson or open any note as a focused card session.</p></div>
        <div className={styles.appActions}>
          {continueNote && <Link className="button primary" href={`/notes/${continueNote.publicId}`}>{continueProgress?.index ? "Continue" : "Start learning"} →</Link>}
          <Link className="button" href="/create?type=Note">New note</Link>
        </div>
      </header>

      <section className={styles.stats} aria-label="Learning overview">
        <div><span>Available cards</span><strong>{totalCards}</strong><small>across {lessons.length} notes</small></div>
        <div><span>Lessons complete</span><strong>{completed}</strong><small>{lessons.length ? Math.round((completed / lessons.length) * 100) : 0}% of this page</small></div>
        <div><span>Learning streak</span><strong>{streak}<i> day{streak === 1 ? "" : "s"}</i></strong><small>Finish a note to keep it going</small></div>
      </section>

      {continueNote && <section className={styles.continueSection}>
        <div className={styles.sectionHeading}><div><span>Continue learning</span><h2>Your next small win</h2></div><small>Your progress saves automatically</small></div>
        <Link href={`/notes/${continueNote.publicId}`} className={styles.continueCard}>
          <div className={styles.continueIndex}>{String((continueProgress?.index || 0) + 1).padStart(2, "0")}</div>
          <div className={styles.continueCopy}>
            <span>{continueProgress?.index ? "Continue lesson" : "Recommended next"}</span>
            <h3>{continueNote.title}</h3>
            <p>{continueNote.cardCount} cards · {Math.max(1, Math.ceil(continueNote.wordCount / 220))} min · {continueNote.creator?.username || "Community note"}</p>
          </div>
          <div className={styles.continueProgress} style={{ "--progress": `${continuePercent * 3.6}deg` }}><strong>{continuePercent}%</strong></div>
          <span className={styles.continueArrow}>→</span>
        </Link>
      </section>}

      <section className={styles.library}>
        <div className={styles.libraryTop}>
          <div><span>Your library</span><h2>Choose a lesson</h2></div>
          <label className={styles.search}>
            <span>⌕</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search notes or tags" aria-label="Search notes" />
          </label>
        </div>

        {activeTag && <div className={styles.activeFilter}>Showing notes tagged <strong>{activeTag}</strong><Link href="/notes">Clear filter ×</Link></div>}

        {filtered.length ? <div className={styles.lessonGrid}>
          {filtered.map((note, noteIndex) => {
            const saved = progress[note.publicId];
            const percent = saved?.complete ? 100 : Math.round((((saved?.index || 0) + (saved ? 1 : 0)) / note.cardCount) * 100);
            return <Link key={note.id} href={`/notes/${note.publicId}`} className={styles.lessonCard}>
              <div className={styles.lessonTop}>
                <span>{saved?.complete ? "Completed" : saved?.index ? "In progress" : "New lesson"}</span>
                <b>{String((page - 1) * amount + noteIndex + 1).padStart(2, "0")}</b>
              </div>
              <h3>{note.title}</h3>
              <p>{notePlainText(note.text).slice(0, 138)}{notePlainText(note.text).length > 138 ? "…" : ""}</p>
              <div className={styles.tagRow}>{note.tags?.slice(0, 3).map((tag) => <span key={tag}>{tag}</span>)}</div>
              <div className={styles.lessonFooter}>
                <div><i style={{ width: `${percent}%` }} /></div>
                <span>{note.cardCount} cards</span>
                <strong>{saved?.complete ? "Review →" : saved?.index ? "Resume →" : "Start →"}</strong>
              </div>
            </Link>;
          })}
        </div> : <div className={styles.empty}><span>⌕</span><h3>No lessons match that search.</h3><p>Try a title, topic, or tag from your library.</p></div>}

        {maxPage > 1 && <nav className={styles.pagination} aria-label="Notes pages">
          {page > 1 ? <Link href={`/notes?page=${page - 1}&amount=${amount}${activeTag ? `&tag=${encodeURIComponent(activeTag)}` : ""}`}>← Previous</Link> : <span />}
          <strong>Page {page} of {maxPage}</strong>
          {page < maxPage ? <Link href={`/notes?page=${page + 1}&amount=${amount}${activeTag ? `&tag=${encodeURIComponent(activeTag)}` : ""}`}>Next →</Link> : <span />}
        </nav>}
      </section>
    </main>
  );
}
