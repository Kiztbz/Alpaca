"use client";

import { createNoteCards, notePlainText } from "@/lib/noteCards";
import { Dialog, DialogContent, DialogDescription, DialogHeading } from "@client";
import styles from "./NoteReader.module.css";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

function updateStreak(userId) {
  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayKey = yesterday.toISOString().slice(0, 10);
  let stored = null;
  try {
    stored = JSON.parse(localStorage.getItem(`alpaca-note-streak:${userId}`) || "null");
  } catch {
    localStorage.removeItem(`alpaca-note-streak:${userId}`);
  }

  if (stored?.date === todayKey) return stored.count || 1;
  const count = stored?.date === yesterdayKey ? (stored.count || 0) + 1 : 1;
  localStorage.setItem(`alpaca-note-streak:${userId}`, JSON.stringify({ date: todayKey, count }));
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
  initialProgress = null,
  userId,
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
  const [completedBefore, setCompletedBefore] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const [exitError, setExitError] = useState("");
  const [ready, setReady] = useState(false);
  const touchStart = useRef(null);
  const router = useRouter();
  const storageKey = `alpaca-note-progress:${userId || "anonymous"}:${note.publicId}`;
  const progress = complete ? 100 : Math.round(((index + 1) / cards.length) * 100);
  const current = cards[index] || cards[0];
  const courseHref = activeCourse ? `/learn?course=${encodeURIComponent(activeCourse.publicId)}` : "/learn";
  const learnResourceHref = useCallback((view, publicId, courseId = activeCourse?.publicId) => {
    const params = new URLSearchParams();
    if (courseId) params.set("course", courseId);
    params.set("view", view);
    params.set("item", publicId);
    return `/learn?${params.toString()}`;
  }, [activeCourse?.publicId]);

  useEffect(() => {
    let saved = null;
    try {
      saved = JSON.parse(localStorage.getItem(storageKey) || "null");
    } catch {
      localStorage.removeItem(storageKey);
    }
    const wasCompleted = Boolean(initialProgress?.completedAt || saved?.complete);
    const savedIndex = Math.max(Number(initialProgress?.lastCardIndex || 0), Number(saved?.index || 0));
    setIndex(wasCompleted ? 0 : Math.min(savedIndex, cards.length - 1));
    setCompletedBefore(wasCompleted);
    setComplete(false);
    setReady(true);
  }, [cards.length, initialProgress?.completedAt, initialProgress?.lastCardIndex, storageKey]);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(storageKey, JSON.stringify({ index, complete: completedBefore || complete, total: cards.length }));
  }, [cards.length, complete, completedBefore, index, ready, storageKey]);

  useEffect(() => {
    if (!ready || !activeCourse?.id || complete) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      fetch(`${process.env.NEXT_PUBLIC_BASEPATH ?? ""}/api/course/${activeCourse.id}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noteId: note.id, cardIndex: index, totalCards: cards.length, complete: false }),
        signal: controller.signal,
        keepalive: true,
      }).catch(() => null);
    }, 180);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [activeCourse?.id, cards.length, complete, index, note.id, ready]);

  const goTo = useCallback((nextIndex) => {
    const bounded = Math.max(0, Math.min(cards.length - 1, nextIndex));
    setDirection(bounded >= index ? "next" : "previous");
    setIndex(bounded);
    setComplete(false);
  }, [cards.length, index]);

  const finish = useCallback(async () => {
    setComplete(true);
    setCompletedBefore(true);
    updateStreak(userId || "anonymous");

    if (activeCourse?.id) {
      await fetch(`${process.env.NEXT_PUBLIC_BASEPATH ?? ""}/api/course/${activeCourse.id}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noteId: note.id, cardIndex: cards.length - 1, totalCards: cards.length, complete: true }),
        keepalive: true,
      }).catch(() => null);
    }

    const destination = nextNote ? learnResourceHref("note", nextNote.publicId) : courseHref;
    window.setTimeout(() => router.push(destination), 450);
  }, [activeCourse?.id, cards.length, courseHref, learnResourceHref, nextNote, note.id, router, userId]);

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
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [advance, goTo, index, infoOpen]);

  function requestClose() {
    if (completedBefore || complete) {
      router.push(courseHref);
      return;
    }
    setExitError("");
    setExitOpen(true);
  }

  async function leaveAndReset() {
    if (activeCourse?.id) {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_BASEPATH ?? ""}/api/course/${activeCourse.id}/progress`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ noteId: note.id }),
        });
        if (!response.ok) throw new Error("Reset failed");
      } catch {
        setExitError("We could not reset your progress. Please try again.");
        return;
      }
    }
    localStorage.removeItem(storageKey);
    setExitOpen(false);
    router.push(courseHref);
    router.refresh();
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
        <button type="button" className={styles.close} onClick={requestClose} aria-label="Close note"><span>×</span><strong>Close</strong></button>
        <div className={styles.titleBlock}>
          <span>{activeCourse?.name || "Quick lesson"}</span>
          <h1>{note.title}</h1>
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
            <button type="button" onClick={() => goTo(index - 1)} disabled={index === 0}>↑ Previous card</button>
            <span>{index + 1} of {cards.length}</span>
            <button type="button" onClick={advance}>{index === cards.length - 1 ? "Complete note ✓" : "Next card ↓"}</button>
          </div>}
        </section>

      </div>

      <button type="button" className={styles.infoButton} aria-label="Open note information" onClick={() => setInfoOpen(true)}>i</button>
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
          <section className={styles.infoSection}><h3>Sources</h3>{sources.length ? <div className={styles.infoLinks}>{sources.map((src) => <a key={src.id} href={src.url || courseHref} target={src.url ? "_blank" : undefined} rel={src.url ? "noopener noreferrer" : undefined}><span>{src.medium || "Source"}</span><strong>{src.title}</strong></a>)}</div> : <p>No sources are linked to this note.</p>}</section>
          {courses.length > 1 && <section className={styles.infoSection}><h3>Also in</h3><div className={styles.infoLinks}>{courses.filter((course) => course.id !== activeCourse?.id).map((course) => <Link key={course.id} href={learnResourceHref("note", note.publicId, course.publicId)}><strong>{course.name}</strong></Link>)}</div></section>}
          {related.length > 0 && <section className={styles.infoSection}><h3>Related resources</h3><div className={styles.infoLinks}>{related.map((item) => <Link key={`${item.resource}-${item.id}`} href={learnResourceHref(item.resource.replace(/s$/, ""), item.publicId)}><span>{item.resource}</span><strong>{item.title}</strong></Link>)}</div></section>}
        </DialogContent>
      </Dialog>
      <Dialog open={exitOpen} onOpenChange={setExitOpen}>
        <DialogContent>
          <DialogHeading>Leave this note?</DialogHeading>
          <DialogDescription>You have not completed this note. If you leave now, your progress will be cleared and you will restart from the beginning next time.</DialogDescription>
          {exitError && <p className={styles.exitError}>{exitError}</p>}
          <div className={styles.exitActions}>
            <button type="button" onClick={() => setExitOpen(false)}>Keep reading</button>
            <button type="button" onClick={leaveAndReset}>Leave and restart</button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
