"use client";

import { createNoteCards, notePlainText } from "@/lib/noteCards";
import styles from "./NoteReader.module.css";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

function updateStreak() {
  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayKey = yesterday.toISOString().slice(0, 10);
  let stored = null;
  try {
    stored = JSON.parse(localStorage.getItem("alpaca-note-streak") || "null");
  } catch {
    localStorage.removeItem("alpaca-note-streak");
  }

  if (stored?.date === todayKey) return stored.count || 1;
  const count = stored?.date === yesterdayKey ? (stored.count || 0) + 1 : 1;
  localStorage.setItem("alpaca-note-streak", JSON.stringify({ date: todayKey, count }));
  return count;
}

export function NoteReader({
  note,
  activeCourse,
  courses = [],
  position,
  totalNotes,
  previousNote,
  nextNote,
  related = [],
}) {
  const cards = useMemo(() => {
    const generated = createNoteCards(note.text);
    return generated.length ? generated : [{
      content: "<p>This note does not have any content yet.</p>",
      words: 8,
      label: "Empty note",
    }];
  }, [note.text]);
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState("next");
  const [complete, setComplete] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [ready, setReady] = useState(false);
  const touchStart = useRef(null);
  const storageKey = `alpaca-note-progress:${note.publicId}`;
  const progress = complete ? 100 : Math.round(((index + 1) / cards.length) * 100);
  const current = cards[index] || cards[0];
  const courseQuery = activeCourse ? `?course=${encodeURIComponent(activeCourse.publicId)}` : "";

  useEffect(() => {
    let saved = null;
    try {
      saved = JSON.parse(localStorage.getItem(storageKey) || "null");
    } catch {
      localStorage.removeItem(storageKey);
    }
    if (saved) {
      setIndex(Math.min(saved.index || 0, cards.length - 1));
      setComplete(Boolean(saved.complete));
    }
    setBookmarked(localStorage.getItem(`${storageKey}:bookmark`) === "true");
    setReady(true);
  }, [cards.length, storageKey]);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(storageKey, JSON.stringify({ index, complete, total: cards.length }));
  }, [cards.length, complete, index, ready, storageKey]);

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  const goTo = useCallback((nextIndex) => {
    const bounded = Math.max(0, Math.min(cards.length - 1, nextIndex));
    setDirection(bounded >= index ? "next" : "previous");
    setIndex(bounded);
    setComplete(false);
  }, [cards.length, index]);

  const finish = useCallback(() => {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
    setComplete(true);
    updateStreak();
  }, []);

  const advance = useCallback(() => {
    if (index === cards.length - 1) return finish();
    goTo(index + 1);
  }, [cards.length, finish, goTo, index]);

  useEffect(() => {
    function onKeyDown(event) {
      if (["ArrowDown", "ArrowRight", " "].includes(event.key)) {
        event.preventDefault();
        advance();
      }
      if (["ArrowUp", "ArrowLeft"].includes(event.key)) {
        event.preventDefault();
        goTo(index - 1);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [advance, goTo, index]);

  function toggleSpeech() {
    if (!("speechSynthesis" in window)) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(notePlainText(current.content));
    utterance.rate = 0.95;
    utterance.onend = () => setSpeaking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  }

  function toggleBookmark() {
    const next = !bookmarked;
    setBookmarked(next);
    localStorage.setItem(`${storageKey}:bookmark`, String(next));
  }

  function handleTouchEnd(event) {
    if (touchStart.current === null) return;
    const distance = touchStart.current - event.changedTouches[0].clientY;
    touchStart.current = null;
    if (Math.abs(distance) < 45) return;
    if (distance > 0) advance();
    else goTo(index - 1);
  }

  return (
    <main className={styles.reader}>
      <header className={styles.topbar}>
        <Link className={styles.back} href="/notes" aria-label="Back to notes">←</Link>
        <div className={styles.titleBlock}>
          <span>{activeCourse?.name || "Quick lesson"}</span>
          <strong>{note.title}</strong>
        </div>
        <div className={styles.headerProgress} aria-label={`${progress}% complete`}>
          <span>{complete ? "Done" : `${index + 1} / ${cards.length}`}</span>
          <div><i style={{ width: `${progress}%` }} /></div>
        </div>
      </header>

      <div className={styles.workspace}>
        <aside className={styles.lessonRail}>
          <div className={styles.lessonBadge}>Lesson {position || 1}</div>
          <h1>{note.title}</h1>
          <p>{cards.length} bite-sized ideas · {Math.max(1, Math.ceil(notePlainText(note.text).split(/\s+/).length / 220))} min</p>

          <div className={styles.cardMap} aria-label="Lesson cards">
            {cards.map((card, cardIndex) => (
              <button
                key={`${card.label}-${cardIndex}`}
                className={cardIndex === index && !complete ? styles.activeStep : cardIndex < index || complete ? styles.doneStep : ""}
                onClick={() => goTo(cardIndex)}
                aria-label={`Open card ${cardIndex + 1}: ${card.label}`}
              >
                <span>{cardIndex < index || complete ? "✓" : cardIndex + 1}</span>
                <small>{card.label}</small>
              </button>
            ))}
          </div>

          {note.tags?.length > 0 && <div className={styles.railTags}>{note.tags.slice(0, 4).map((tag) => <span key={tag}>{tag}</span>)}</div>}
        </aside>

        <section className={styles.stage} aria-live="polite">
          {!complete ? (
            <div
              key={`${index}-${direction}`}
              className={`${styles.flashcard} ${direction === "previous" ? styles.fromTop : styles.fromBottom}`}
              onTouchStart={(event) => { touchStart.current = event.touches[0].clientY; }}
              onTouchEnd={handleTouchEnd}
            >
              <div className={styles.cardTopline}>
                <span>{current.label}</span>
                <span>{current.words} words</span>
              </div>
              <div className={styles.cardContent} dangerouslySetInnerHTML={{ __html: current.content }} />
              <div className={styles.swipeHint}><span>↑</span> Swipe up or press space to continue</div>
            </div>
          ) : (
            <div className={styles.completionCard}>
              <div className={styles.completionMark}>✓</div>
              <span>Lesson complete</span>
              <h2>You turned a long note into {cards.length} clear ideas.</h2>
              <p>Nice work. Your place is saved, so you can revisit any card whenever you need a refresher.</p>
              <div className={styles.reward}><strong>+{cards.length * 5}</strong><span>learning points</span></div>
              <div className={styles.completionActions}>
                {nextNote && <Link className="button primary" href={`/notes/${nextNote.publicId}${courseQuery}`}>Next note →</Link>}
                <button className="button" onClick={() => { setIndex(0); setComplete(false); }}>Review again</button>
                {!nextNote && <Link className="button primary" href="/notes">Back to notes</Link>}
              </div>
            </div>
          )}

          {!complete && <div className={styles.mobileControls}>
            <button onClick={() => goTo(index - 1)} disabled={index === 0}>← Previous</button>
            <button onClick={advance}>{index === cards.length - 1 ? "Finish lesson" : "Next card →"}</button>
          </div>}
        </section>

        <aside className={styles.actionRail}>
          <button onClick={toggleBookmark} className={bookmarked ? styles.activeAction : ""} aria-pressed={bookmarked}>
            <span>{bookmarked ? "★" : "☆"}</span><small>{bookmarked ? "Saved" : "Save"}</small>
          </button>
          <button onClick={toggleSpeech} className={speaking ? styles.activeAction : ""} aria-pressed={speaking}>
            <span>{speaking ? "■" : "◖"}</span><small>{speaking ? "Stop" : "Listen"}</small>
          </button>
          <button onClick={() => goTo(index - 1)} disabled={index === 0}>
            <span>↑</span><small>Back</small>
          </button>
          <button onClick={advance}>
            <span>↓</span><small>{index === cards.length - 1 ? "Finish" : "Next"}</small>
          </button>
        </aside>
      </div>

      <footer className={styles.contextBar}>
        <div>
          {previousNote ? <Link href={`/notes/${previousNote.publicId}${courseQuery}`}>← {previousNote.title}</Link> : <span>Start of course</span>}
        </div>
        <span>{activeCourse ? `${position} of ${totalNotes} notes` : `${cards.length} cards`}</span>
        <div>
          {nextNote ? <Link href={`/notes/${nextNote.publicId}${courseQuery}`}>{nextNote.title} →</Link> : <span>End of course</span>}
        </div>
      </footer>

      {(courses.length > 1 || related.length > 0) && <section className={styles.extras}>
        {courses.length > 1 && <div><span>Also in</span>{courses.filter((course) => course.id !== activeCourse?.id).map((course) => <Link key={course.id} href={`/notes/${note.publicId}?course=${encodeURIComponent(course.publicId)}`}>{course.name}</Link>)}</div>}
        {related.length > 0 && <div><span>Keep exploring</span>{related.slice(0, 3).map((item) => <Link key={`${item.resource}-${item.id}`} href={`/${item.resource}/${item.publicId}`}>{item.title}</Link>)}</div>}
      </section>}
    </main>
  );
}
