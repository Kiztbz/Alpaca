"use client";

import { CourseInput, Dialog, DialogContent, DialogDescription, DialogHeading, NoteInput, QuizInput, SourceInput, Spinner } from "@client";
import { noteCardCount } from "@/lib/noteCards";
import { useAlerts, useStore } from "@/store/store";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
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

export function CourseActions({ course, user, isLogged, isEnrolled, isManager, isLoading, setIsLoading }) {
  const addAlert = useAlerts((state) => state.addAlert);
  const [courseState, setCourseState] = useState({ ...course });
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [certificateStatus, setCertificateStatus] = useState(null);
  const isOwner = Boolean(user && String(user.id) === String(course.creator?.id));

  useEffect(() => {
    if (!isLogged || !isEnrolled || isManager) return;
    fetch(`${basePath}/api/course/${course.id}/certificate`)
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => setCertificateStatus(payload?.content || null))
      .catch(() => null);
  }, [course.id, isEnrolled, isLogged, isManager]);

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

  if (!isLogged && !isOwner) {
    return <div className={styles.courseActions}>
      <Link className={styles.primaryAction} href={`/login?next=${encodeURIComponent(`/courses/${course.name}`)}`}>Log in to enroll</Link>
    </div>;
  }

  const completeItems = (certificateStatus?.notes.completed || 0) + (certificateStatus?.quizzes.completed || 0);
  const totalItems = (certificateStatus?.notes.total || 0) + (certificateStatus?.quizzes.total || 0);

  return <>
    <div className={styles.courseActions}>
      {isManager && <button type="button" className={styles.primaryAction} onClick={() => setEditOpen(true)}>Edit course</button>}
      {!isManager && isLogged && !isEnrolled && course.enrollment === "paid" && <button type="button" className={styles.primaryAction} onClick={() => setCheckoutOpen(true)} disabled={isLoading}>Demo checkout · $49</button>}
      {!isManager && isLogged && (isEnrolled || course.enrollment !== "paid") && <button type="button" className={isEnrolled ? styles.secondaryAction : styles.primaryAction} onClick={toggleEnrollment} disabled={isLoading}>{isEnrolled ? "Leave course" : "Start course"}{isLoading && <Spinner />}</button>}
      {certificateStatus && <div className={styles.certificateStatus}>
        <span>{certificateStatus.certificate ? "Certificate earned" : "Certificate progress"}</span>
        <strong>{certificateStatus.certificate ? "Complete" : `${completeItems} / ${totalItems}`}</strong>
        {certificateStatus.certificate && <Link href={`/certificates/${certificateStatus.certificate.publicId}`}>View certificate →</Link>}
        {!certificateStatus.certificate && certificateStatus.eligible && <button type="button" onClick={claimCertificate} disabled={isLoading}>Claim certificate</button>}
      </div>}
      {isManager && <div className={styles.ownerActions}>
        <button type="button" onClick={() => updateCourse({ enrollment: courseState.enrollment === "open" ? "private" : "open" }, "Enrollment updated")} disabled={isLoading}>{courseState.enrollment === "open" ? "Close enrollment" : "Open enrollment"}</button>
        <button type="button" onClick={() => updateCourse({ permissions: { allRead: !courseState.permissions?.allRead } }, "Visibility updated")} disabled={isLoading}>{courseState.permissions?.allRead ? "Make private" : "Make public"}</button>
      </div>}
    </div>

    <Dialog open={editOpen} onOpenChange={setEditOpen}>
      <DialogContent><DialogHeading>Edit course</DialogHeading><CourseInput course={courseState} close={() => { setEditOpen(false); window.location.reload(); }} /></DialogContent>
    </Dialog>

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

export function ManageWorkspace({ course }) {
  const notes = useStore((state) => state.notes);
  const quizzes = useStore((state) => state.quizzes);
  const sources = useStore((state) => state.sources);
  const groups = [
    { type: "note", label: "Lessons", create: "Note", items: relatedItems(course.notes, notes) },
    { type: "quiz", label: "Practice", create: "Quiz", items: relatedItems(course.quizzes, quizzes) },
    { type: "source", label: "Sources", create: "Source", items: relatedItems(course.sources, sources) },
  ];
  return <section className={styles.manageWorkspace}>
    <header><div><span>Course administration</span><h2>Manage course resources</h2><p>Create, edit, remove, or preview only the resources attached to this course.</p></div></header>
    {groups.map((group) => <section className={styles.manageGroup} key={group.type}>
      <header><div><h3>{group.label}</h3><span>{group.items.length} items</span></div><Link className="button primary" href={`/create?type=${group.create}&course=${course.id}`}>Create {group.create.toLowerCase()}</Link></header>
      <div className={styles.manageGrid}>{group.items.map((item) => <ManageResourceCard key={item.id} item={item} type={group.type} course={course} />)}
        {!group.items.length && <p className={styles.manageEmpty}>No {group.label.toLowerCase()} attached yet.</p>}
      </div>
    </section>)}
  </section>;
}

function ManageResourceCard({ item, type, course }) {
  const [editing, setEditing] = useState(false);
  const [removing, setRemoving] = useState(false);
  const addAlert = useAlerts((state) => state.addAlert);
  const title = type === "quiz" ? quizLabel(item) : item.title;
  const plural = `${type}s`;
  const Editor = type === "note" ? NoteInput : type === "quiz" ? QuizInput : SourceInput;
  const editorProp = { [type]: item };

  async function remove() {
    setRemoving(true);
    try {
      const response = await fetch(`${basePath}/api/course/${course.id}/resources`, {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resourceId: item.id, resourceType: type }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || "Unable to remove resource");
      addAlert({ success: true, message: payload.message });
      window.location.reload();
    } catch (error) {
      addAlert({ success: false, message: error.message });
      setRemoving(false);
    }
  }

  return <article className={styles.manageCard}><div><span>{type}</span><h4>{title || `${type} ${item.id}`}</h4></div><nav>
    <button type="button" onClick={() => setEditing(true)}>Edit</button>
    <Link href={`/${plural}/${item.publicId}?course=${encodeURIComponent(course.publicId)}`}>Preview</Link>
    <button type="button" className={styles.removeResource} onClick={remove} disabled={removing}>{removing ? "Deleting…" : "Delete from course"}</button>
  </nav>
  <Dialog open={editing} onOpenChange={setEditing}><DialogContent><DialogHeading>Edit {type}</DialogHeading><Editor {...editorProp} close={() => { setEditing(false); window.location.reload(); }} /></DialogContent></Dialog>
  </article>;
}

export function NotesTabInfo({ course }) {
  const notes = useStore((state) => state.notes);
  const courseNotes = relatedItems(course.notes, notes);
  const completedIds = new Set((course.noteProgress || []).filter((item) => item.completedAt).map((item) => String(item.noteId)));
  const completedNotes = courseNotes.findIndex((note) => !completedIds.has(String(note.id)));
  const contiguousCompleted = completedNotes < 0 ? courseNotes.length : completedNotes;
  return <span className={styles.countPill}>{contiguousCompleted} / {courseNotes.length} complete</span>;
}

export function NotesTabMain({ course }) {
  const notes = useStore((state) => state.notes);
  const courseNotes = useMemo(() => relatedItems(course.notes, notes), [course.notes, notes]);
  const pathRef = useRef(null);
  const currentRef = useRef(null);

  const serverProgress = new Map((course.noteProgress || []).map((item) => [String(item.noteId), item]));
  let sequenceOpen = true;
  const statuses = courseNotes.map((note, index) => {
    const server = serverProgress.get(String(note.id)) || {};
    const cards = Math.max(1, noteCardCount(note.text));
    const recordedComplete = Boolean(server.completedAt);
    const complete = sequenceOpen && recordedComplete;
    const unlocked = sequenceOpen;
    if (!recordedComplete) sequenceOpen = false;
    const lastCardIndex = complete ? cards - 1 : Math.min(cards - 1, Number(server.lastCardIndex || 0));
    const started = unlocked && (complete || Boolean(server.updatedAt));
    const percent = complete ? 100 : started ? Math.min(99, Math.round(((lastCardIndex + 1) / cards) * 100)) : 0;
    return { item: note, title: note.title, cards, complete, unlocked, lastCardIndex, started, percent, index };
  });
  const partialIndex = statuses.findIndex((item) => item.started && !item.complete && item.unlocked);
  const unfinishedIndex = statuses.findIndex((item) => !item.complete && item.unlocked);
  const currentIndex = partialIndex >= 0 ? partialIndex : unfinishedIndex >= 0 ? unfinishedIndex : Math.max(0, statuses.length - 1);
  const current = statuses[currentIndex];
  const allComplete = statuses.length > 0 && statuses.every((item) => item.complete);
  const completedLessons = statuses.filter((item) => item.complete).length;
  const completedCards = statuses.reduce((total, item) => total + (item.complete ? item.cards : item.started ? item.lastCardIndex : 0), 0);
  const totalCards = statuses.reduce((total, item) => total + item.cards, 0);
  const completedActivities = statuses.filter((item) => item.complete).length;
  const totalActivities = statuses.length;
  const coursePercent = totalActivities ? Math.round((completedActivities / totalActivities) * 100) : 0;
  const pathHref = (item) => `/learn?course=${encodeURIComponent(course.publicId)}&view=note&item=${encodeURIComponent(item.item.publicId)}`;
  const currentHref = current ? pathHref(current) : "#";

  useEffect(() => {
    const target = currentRef.current;
    if (!pathRef.current || !target || currentIndex < 3) return;
    target.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [currentIndex, course.id]);

  if (!statuses.length) return <EmptyState icon="book" title="No notes yet" copy="Notes added to this course will appear here as one learning path." />;

  return <div className={styles.learningDashboard}>
    <section className={styles.pathWorkspace}>
      <header className={styles.pathHeader}>
        <div><small>{allComplete ? "Course complete" : `Note ${currentIndex + 1} of ${statuses.length}`}</small><h2>{allComplete ? "Review any note" : current.title}</h2><p>{allComplete ? "Every note is complete and ready to replay." : current.started ? `Resume at card ${current.lastCardIndex + 1} of ${current.cards}.` : `${current.cards} cards · ${Math.max(2, Math.ceil(current.cards * .7))} min`}</p></div>
        <Link href={currentHref}><Icon name="book" />{allComplete ? "Review" : current.started ? "Continue" : "Start note"}</Link>
      </header>
      <div className={styles.pathScroller} ref={pathRef}>
        {statuses.map((item, index) => {
          const isCurrent = index === currentIndex;
          const status = item.complete ? "Completed" : !item.unlocked ? "Locked" : isCurrent ? item.started ? `Card ${item.lastCardIndex + 1} of ${item.cards}` : "Up next" : "Ready";
          return <article ref={isCurrent ? currentRef : null} className={`${styles.pathStep} ${item.complete ? styles.pathComplete : ""} ${isCurrent ? styles.pathCurrent : ""} ${!item.unlocked ? styles.pathLocked : ""}`} key={item.item.id}>
            {item.unlocked ? <Link className={styles.pathNode} title={`Note ${index + 1}: ${item.title}`} href={pathHref(item)} aria-label={`Note ${index + 1} · ${status}: ${item.title}`}>{item.complete ? <Icon name="check" /> : isCurrent ? <Icon name="book" /> : index + 1}</Link> : <span className={styles.pathNode} aria-label={`Note ${index + 1} locked`}><Icon name="lock" /></span>}
            {item.unlocked ? <Link className={styles.pathBubble} href={pathHref(item)}><small>Note {index + 1} · {status}</small><strong>{item.title}</strong><span>{item.started ? "Continue note" : "Open note"}<Icon name="arrow" /></span></Link> : <div className={styles.pathBubble}><small>Note {index + 1} · Locked</small><strong>{item.title}</strong><span>Complete note {index} to unlock</span></div>}
          </article>;
        })}
      </div>
    </section>

    <aside className={styles.learningRail}>
      <section className={styles.railProgress}><span>Course progress</span><strong>{coursePercent}%</strong><div><i style={{ width: `${coursePercent}%` }} /></div><p>{completedActivities} of {totalActivities} notes complete</p></section>
      <section className={styles.railCard}><header><span className={styles.typeIcon}><Icon name="book" /></span><div><small>Notes</small><h3>{completedLessons} of {statuses.length}</h3></div></header><p>{completedCards} of {totalCards} cards completed</p><Link href={currentHref}>{allComplete ? "Review notes" : "Continue notes"}<Icon name="arrow" /></Link></section>
    </aside>
  </div>;
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
    return <Link key={quiz.id} href={`/learn?course=${encodeURIComponent(course.publicId)}&view=quiz&item=${encodeURIComponent(quiz.publicId)}`} className={`${styles.appCard} ${!availableNow ? styles.lockedCard : ""}`}>
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

  return <div className={styles.cardGrid}>{courseSources.map((source) => <Link key={source.id} href={`/learn?course=${encodeURIComponent(course.publicId)}&view=source&item=${encodeURIComponent(source.publicId)}`} className={styles.appCard}>
    <div className={styles.cardTop}><span className={styles.typeIcon}><Icon name="file" /></span><span className={styles.cardStatus}>{source.medium || "Source"}</span></div>
    <h3>{source.title}</h3>
    <p>{source.credits?.length ? `Credited to ${source.credits.map((credit) => typeof credit === "string" ? credit : credit?.name).filter(Boolean).slice(0, 2).join(", ")}.` : "Supporting material for this course."}</p>
    <footer><span>{source.tags?.length || 0} tags</span><strong>Open<Icon name="arrow" /></strong></footer>
  </Link>)}</div>;
}

function EmptyState({ icon, title, copy }) {
  return <div className={styles.emptyState}><span><Icon name={icon} /></span><h3>{title}</h3><p>{copy}</p></div>;
}
