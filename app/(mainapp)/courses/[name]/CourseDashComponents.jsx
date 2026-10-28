"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeading, Spinner } from "@client";
import { noteCardCount } from "@/lib/noteCards";
import { useAlerts, useStore } from "@/store/store";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import styles from "./CourseDash.module.css";

const basePath = process.env.NEXT_PUBLIC_BASEPATH ?? "";

function Icon({ name }) {
  const paths = {
    arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
    book: <><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3Z" /><path d="M8 17h11M9 8h6" /></>,
    bolt: <path d="m13 2-7 11h5l-1 9 8-12h-5V2Z" />,
    check: <path d="m5 12 4 4L19 6" />,
    file: <><path d="M6 2h8l4 4v16H6z" /><path d="M14 2v5h5M9 12h6M9 16h6" /></>,
    lock: <><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

function relatedItems(ids, items) {
  return ids?.length ? ids.map((id) => items.find((item) => String(item.id) === String(id))).filter(Boolean) : [];
}

function plainText(value) {
  return String(value || "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

function quizLabel(quiz) {
  if (quiz.title) return quiz.title;
  if (typeof quiz.question === "string") return plainText(quiz.question);
  if (Array.isArray(quiz.question)) return plainText(quiz.question.map((part) => typeof part === "string" ? part : part?.text || part?.value || "").join(" "));
  return "Practice question";
}

export function CourseActions({ course, user, isLogged, isEnrolled, isLoading, setIsLoading }) {
  const addAlert = useAlerts((state) => state.addAlert);
  const [courseState, setCourseState] = useState({ ...course });
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [certificateStatus, setCertificateStatus] = useState(null);
  const isOwner = Boolean(user && String(user.id) === String(course.creator?.id));

  useEffect(() => {
    if (!isLogged || !isEnrolled || isOwner) return;
    fetch(`${basePath}/api/course/${course.id}/certificate`)
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => setCertificateStatus(payload?.content || null))
      .catch(() => null);
  }, [course.id, isEnrolled, isLogged, isOwner]);

  async function request(url, options, successMessage, reload = false) {
    setIsLoading(true);
    try {
      const response = await fetch(url, options);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || `${response.status}: ${response.statusText}`);
      addAlert({ success: true, message: payload.message || successMessage });
      if (reload) window.location.reload();
      return true;
    } catch (error) {
      addAlert({ success: false, message: error.message || "Something went wrong" });
      return false;
    } finally {
      setIsLoading(false);
    }
  }

  async function toggleEnrollment() {
    await request(`${basePath}/api/course/${course.id}/${isEnrolled ? "unenroll" : "enroll"}`, { method: "POST" }, isEnrolled ? "Left course" : "Course added", true);
  }

  async function completeDemoCheckout() {
    const paid = await request(`${basePath}/api/course/${course.id}/checkout`, { method: "POST" }, "Demo payment complete");
    if (paid) {
      setCheckoutOpen(false);
      window.location.reload();
    }
  }

  async function claimCertificate() {
    setIsLoading(true);
    try {
      const response = await fetch(`${basePath}/api/course/${course.id}/certificate`, { method: "POST" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || "Certificate is not ready yet");
      window.location.assign(`${basePath}/certificates/${payload.content.publicId}`);
    } catch (error) {
      addAlert({ success: false, message: error.message });
    } finally {
      setIsLoading(false);
    }
  }

  async function updateCourse(patch, message) {
    const updated = await request(`${basePath}/api/course/${course.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) }, message);
    if (updated) setCourseState((current) => ({ ...current, ...patch }));
  }

  if (!isLogged && !isOwner) return null;

  const completeItems = (certificateStatus?.notes.completed || 0) + (certificateStatus?.quizzes.completed || 0);
  const totalItems = (certificateStatus?.notes.total || 0) + (certificateStatus?.quizzes.total || 0);

  return <>
    <div className={styles.courseActions}>
      {isLogged && !isEnrolled && course.enrollment === "paid" && <button type="button" className={styles.primaryAction} onClick={() => setCheckoutOpen(true)} disabled={isLoading}>Demo checkout · $49</button>}
      {isLogged && (isEnrolled || course.enrollment !== "paid") && <button type="button" className={isEnrolled ? styles.secondaryAction : styles.primaryAction} onClick={toggleEnrollment} disabled={isLoading}>{isEnrolled ? "Leave course" : "Start course"}{isLoading && <Spinner />}</button>}
      {certificateStatus && <div className={styles.certificateStatus}>
        <span>{certificateStatus.certificate ? "Certificate earned" : "Certificate progress"}</span>
        <strong>{certificateStatus.certificate ? "Complete" : `${completeItems} / ${totalItems}`}</strong>
        {certificateStatus.certificate && <Link href={`/certificates/${certificateStatus.certificate.publicId}`}>View certificate →</Link>}
        {!certificateStatus.certificate && certificateStatus.eligible && <button type="button" onClick={claimCertificate} disabled={isLoading}>Claim certificate</button>}
      </div>}
      {isOwner && <div className={styles.ownerActions}>
        <button type="button" onClick={() => updateCourse({ enrollment: courseState.enrollment === "open" ? "private" : "open" }, "Enrollment updated")} disabled={isLoading}>{courseState.enrollment === "open" ? "Close enrollment" : "Open enrollment"}</button>
        <button type="button" onClick={() => updateCourse({ permissions: { allRead: !courseState.permissions?.allRead } }, "Visibility updated")} disabled={isLoading}>{courseState.permissions?.allRead ? "Make private" : "Make public"}</button>
      </div>}
    </div>

    <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
      <DialogContent>
        <DialogHeading>Demo checkout</DialogHeading>
        <DialogDescription>No real card or charge is involved. Completing this demo payment immediately unlocks the course.</DialogDescription>
        <div className={styles.checkoutSummary}>
          <span>Course</span><strong>{course.name}</strong>
          <span>Demo price</span><strong>$49.00 USD</strong>
          <span>Payment method</span><strong>Alpaca demo card</strong>
        </div>
        <button type="button" className="button primary" onClick={completeDemoCheckout} disabled={isLoading}>{isLoading ? <Spinner /> : "Complete demo payment"}</button>
      </DialogContent>
    </Dialog>
  </>;
}

export function NotesTabInfo({ course }) {
  const notes = useStore((state) => state.notes);
  return <span className={styles.countPill}>{relatedItems(course.notes, notes).length} lessons</span>;
}

export function NotesTabMain({ course }) {
  const notes = useStore((state) => state.notes);
  const courseNotes = useMemo(() => relatedItems(course.notes, notes), [course.notes, notes]);
  const [progress, setProgress] = useState({});

  useEffect(() => {
    const saved = {};
    courseNotes.forEach((note) => {
      try { saved[note.publicId] = JSON.parse(localStorage.getItem(`alpaca-note-progress:${note.publicId}`) || "null"); }
      catch { saved[note.publicId] = null; }
    });
    setProgress(saved);
  }, [courseNotes]);

  if (!courseNotes.length) return <EmptyState icon="book" title="No lessons yet" copy="Notes added to this course will appear here as short learning sessions." />;

  return <div className={styles.lessonGrid}>{courseNotes.map((note, index) => {
    const saved = progress[note.publicId];
    const cards = Math.max(1, noteCardCount(note.text));
    const complete = Boolean(saved?.complete);
    const percent = complete ? 100 : Math.min(99, Math.round(((saved?.index || 0) / cards) * 100));
    return <Link key={note.id} href={`/notes/${note.publicId}?course=${encodeURIComponent(course.publicId)}`} className={`${styles.appCard} ${complete ? styles.completeCard : ""}`}>
      <div className={styles.cardTop}><span className={styles.lessonNumber}>{complete ? <Icon name="check" /> : index + 1}</span><span className={styles.cardStatus}>{complete ? "Complete" : percent ? `${percent}% done` : "Lesson"}</span></div>
      <h3>{note.title}</h3>
      <p>{plainText(note.text).slice(0, 120) || "Open this lesson to start learning."}</p>
      <div className={styles.cardProgress}><i style={{ width: `${percent}%` }} /></div>
      <footer><span>{cards} cards · {Math.max(2, Math.ceil(cards * .7))} min</span><strong>{percent ? "Continue" : "Start"}<Icon name="arrow" /></strong></footer>
    </Link>;
  })}</div>;
}

function getQuizStats(ids, quizzes) {
  const items = relatedItems(ids, quizzes);
  const available = items.filter((quiz) => !quiz.hiddenUntil || new Date(quiz.hiddenUntil) <= new Date()).length;
  const average = items.length ? items.reduce((sum, quiz) => sum + (quiz.level || 0), 0) / items.length : 0;
  return { items, available, average };
}

export function QuizzesTabInfo({ course }) {
  const quizzes = useStore((state) => state.quizzes);
  const { available } = getQuizStats(course.quizzes, quizzes);
  return <span className={styles.countPill}>{available} ready</span>;
}

export function QuizzesTabMain({ course }) {
  const quizzes = useStore((state) => state.quizzes);
  const { items, available, average } = getQuizStats(course.quizzes, quizzes);
  if (!items.length) return <EmptyState icon="bolt" title="No practice yet" copy="Quizzes connected to this course will collect here." />;

  return <><div className={styles.practiceSummary}><div><span>Ready now</span><strong>{available}</strong></div><div><span>Average level</span><strong>{average.toFixed(1)}</strong></div><div><span>Total practice</span><strong>{items.length}</strong></div></div><div className={styles.cardGrid}>{items.map((quiz) => {
    const availableNow = !quiz.hiddenUntil || new Date(quiz.hiddenUntil) <= new Date();
    return <Link key={quiz.id} href={`/quizzes/${quiz.publicId}?course=${encodeURIComponent(course.publicId)}`} className={`${styles.appCard} ${!availableNow ? styles.lockedCard : ""}`}>
      <div className={styles.cardTop}><span className={styles.typeIcon}><Icon name={availableNow ? "bolt" : "lock"} /></span><span className={styles.cardStatus}>{availableNow ? "Ready" : "Review later"}</span></div>
      <h3>{quizLabel(quiz)}</h3>
      <p>{availableNow ? "Test what you remember and strengthen this skill." : "This practice will unlock again after its review interval."}</p>
      <footer><span>Level {quiz.level || 0}</span><strong>{availableNow ? "Practice" : "Preview"}<Icon name="arrow" /></strong></footer>
    </Link>;
  })}</div></>;
}

export function SourcesInfoTab({ course }) {
  const sources = useStore((state) => state.sources);
  return <span className={styles.countPill}>{relatedItems(course.sources, sources).length} sources</span>;
}

export function SourcesMainTab({ course }) {
  const sources = useStore((state) => state.sources);
  const courseSources = relatedItems(course.sources, sources);
  if (!courseSources.length) return <EmptyState icon="file" title="No sources yet" copy="Course references and supporting material will appear here." />;

  return <div className={styles.cardGrid}>{courseSources.map((source) => <Link key={source.id} href={`/sources/${source.publicId}?course=${encodeURIComponent(course.publicId)}`} className={styles.appCard}>
    <div className={styles.cardTop}><span className={styles.typeIcon}><Icon name="file" /></span><span className={styles.cardStatus}>{source.medium || "Source"}</span></div>
    <h3>{source.title}</h3>
    <p>{source.credits?.length ? `Credited to ${source.credits.map((credit) => typeof credit === "string" ? credit : credit?.name).filter(Boolean).slice(0, 2).join(", ")}.` : "Supporting material for this course."}</p>
    <footer><span>{source.tags?.length || 0} tags</span><strong>Open<Icon name="arrow" /></strong></footer>
  </Link>)}</div>;
}

function EmptyState({ icon, title, copy }) {
  return <div className={styles.emptyState}><span><Icon name={icon} /></span><h3>{title}</h3><p>{copy}</p></div>;
}
