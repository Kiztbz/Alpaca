"use client";

import { createNoteCards, notePlainText } from "@/lib/noteCards";
import { Dialog, DialogContent, DialogHeading } from "@client";
import styles from "./NoteReader.module.css";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  sources = [],
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
  const [infoOpen, setInfoOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const touchStart = useRef(null);
  const router = useRouter();
  const storageKey = `alpaca-note-progress:${note.publicId}`;
  const progress = complete ? 100 : Math.round(((index + 1) / cards.length) * 100);
  const current = cards[index] || cards[0];
  const courseQuery = activeCourse ? `?course=${encodeURIComponent(activeCourse.publicId)}` : "";
  const courseHref = activeCourse ? `/courses/${encodeURIComponent(activeCourse.name)}` : "/notes";

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

  const finish = useCallback(async () => {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
    setComplete(true);
    updateStreak();

    if (activeCourse?.id) {
      await fetch(`${process.env.NEXT_PUBLIC_BASEPATH ?? ""}/api/course/${activeCourse.id}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noteId: note.id }),
        keepalive: true,
      }).catch(() => null);
    }

    const destination = nextNote ? `/notes/${nextNote.publicId}${courseQuery}` : courseHref;
    window.setTimeout(() => router.push(destination), 450);
  }, [activeCourse?.id, courseHref, courseQuery, nextNote, note.id, router]);

  const advance = useCallback(() => {
    if (index === cards.length - 1) return finish();
    goTo(index + 1);
  }, [cards.length, finish, goTo, index]);

  useEffect(() => {
    function onKeyDown(event) {
      const target = event.target;
      if (infoOpen || event.metaKey || event.ctrlKey || event.altKey || target?.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target?.tagName)) return;
      if (["ArrowDown", " "].includes(event.key)) {
        event.preventDefault();
        advance();
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        goTo(index - 1);
      }
      if (event.key === "ArrowLeft" && previousNote) {
        event.preventDefault();
        router.push(`/notes/${previousNote.publicId}${courseQuery}`);
      }
      if (event.key === "ArrowRight" && nextNote) {
        event.preventDefault();
        router.push(`/notes/${nextNote.publicId}${courseQuery}`);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [advance, courseQuery, goTo, index, infoOpen, nextNote, previousNote, router]);

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
        <Link className={styles.back} href={courseHref} aria-label={activeCourse ? "Back to course dashboard" : "Back to notes"}>
          <span>←</span><strong>{activeCourse ? "Course dashboard" : "All notes"}</strong>
        </Link>
        <div className={styles.titleBlock}>
          <span>{activeCourse?.name || "Quick lesson"}</span>
          <strong>{note.title}</strong>
        </div>
        <div className={styles.headerStatus}>
          <span>{activeCourse ? `${position} of ${totalNotes} notes` : "Note"}</span>
          <div className={styles.headerProgress} aria-label={`${progress}% complete`}>
            <span>{complete ? "Done" : `${index + 1} / ${cards.length}`}</span>
            <div><i style={{ width: `${progress}%` }} /></div>
          </div>
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

          <p className={styles.keyHint}><kbd>↑</kbd><kbd>↓</kbd> cards · <kbd>←</kbd><kbd>→</kbd> notes</p>
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
              <div className={styles.swipeHint}>Use <kbd>↓</kbd> or <kbd>Space</kbd> to continue</div>
            </div>
          ) : (
            <div className={styles.completionCard}>
              <div className={styles.completionMark}>✓</div>
              <span>Lesson complete</span>
              <h2>{nextNote ? "Loading your next note…" : "Course notes complete."}</h2>
              <p>Your progress is saved. You’ll continue automatically.</p>
            </div>
          )}

          {!complete && <div className={styles.cardControls}>
            <button onClick={() => goTo(index - 1)} disabled={index === 0}>↑ Previous card</button>
            <span>{index + 1} of {cards.length}</span>
            <button onClick={advance}>{index === cards.length - 1 ? "Complete note ✓" : "Next card ↓"}</button>
          </div>}
        </section>

        <aside className={styles.actionRail}>
          <button onClick={toggleBookmark} className={bookmarked ? styles.activeAction : ""} aria-pressed={bookmarked}>
            <span>{bookmarked ? "★" : "☆"}</span><small>{bookmarked ? "Saved" : "Save"}</small>
          </button>
          <button onClick={toggleSpeech} className={speaking ? styles.activeAction : ""} aria-pressed={speaking}>
            <span>{speaking ? "■" : "◖"}</span><small>{speaking ? "Stop" : "Listen"}</small>
          </button>
          {previousNote ? <Link href={`/notes/${previousNote.publicId}${courseQuery}`} aria-label={`Previous note: ${previousNote.title}`}><span>←</span><small>Previous note</small></Link> : <span className={styles.disabledAction}><span>←</span><small>First note</small></span>}
          {nextNote ? <Link href={`/notes/${nextNote.publicId}${courseQuery}`} aria-label={`Next note: ${nextNote.title}`}><span>→</span><small>Next note</small></Link> : <Link href={courseHref} aria-label="Return to course dashboard"><span>↗</span><small>Course</small></Link>}
        </aside>
      </div>

      <button className={styles.infoButton} aria-label="Open note information" onClick={() => setInfoOpen(true)}>i</button>
      <Dialog open={infoOpen} onOpenChange={setInfoOpen}>
        <DialogContent>
          <DialogHeading>About this note</DialogHeading>
          <div className={styles.infoSummary}>
            <div><span>Course</span><strong>{activeCourse?.name || "Independent note"}</strong></div>
            <div><span>Position</span><strong>{activeCourse ? `${position} of ${totalNotes}` : "—"}</strong></div>
            <div><span>Cards</span><strong>{cards.length}</strong></div>
            <div><span>Reading time</span><strong>{Math.max(1, Math.ceil(notePlainText(note.text).split(/\s+/).length / 220))} min</strong></div>
          </div>
          {note.tags?.length > 0 && <section className={styles.infoSection}><h3>Tags</h3><div className={styles.infoChips}>{note.tags.map((tag) => <span key={tag}>{tag}</span>)}</div></section>}
          <section className={styles.infoSection}><h3>Sources</h3>{sources.length ? <div className={styles.infoLinks}>{sources.map((src) => <Link key={src.id} href={`/sources/${src.publicId}`}><span>{src.medium || "Source"}</span><strong>{src.title}</strong></Link>)}</div> : <p>No sources are linked to this note.</p>}</section>
          {courses.length > 1 && <section className={styles.infoSection}><h3>Also in</h3><div className={styles.infoLinks}>{courses.filter((course) => course.id !== activeCourse?.id).map((course) => <Link key={course.id} href={`/notes/${note.publicId}?course=${encodeURIComponent(course.publicId)}`}><strong>{course.name}</strong></Link>)}</div></section>}
          {related.length > 0 && <section className={styles.infoSection}><h3>Related resources</h3><div className={styles.infoLinks}>{related.map((item) => <Link key={`${item.resource}-${item.id}`} href={`/${item.resource}/${item.publicId}`}><span>{item.resource}</span><strong>{item.title}</strong></Link>)}</div></section>}
        </DialogContent>
      </Dialog>
    </main>
  );
}
