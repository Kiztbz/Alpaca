"use client";

import { useStore } from "@/store/store";
import Link from "next/link";
import { useState } from "react";
import {
  CourseActions,
  ManageWorkspace,
  NotesTabInfo,
  NotesTabMain,
} from "./CourseDashComponents";
import styles from "./CourseDash.module.css";

function Icon({ name }) {
  const paths = {
    arrow: <path d="m15 18-6-6 6-6" />,
    book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Z" /><path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5a2.5 2.5 0 0 1 2.5 2.5v-16Z" /></>,
    bolt: <path d="m13 2-7 11h5l-1 9 8-12h-5V2Z" />,
    file: <><path d="M6 2h8l4 4v16H6z" /><path d="M14 2v5h5M9 12h6M9 16h6" /></>,
    lock: <><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

export function CourseDash({ course, courses = [], resources = {}, relationships, isLogged, canAccessContent = true, embedded = false }) {
  const [isLoading, setIsLoading] = useState(false);
  const user = useStore((state) => state.user);
  const isManager = Boolean(course.isAdmin || user?.role === "superadmin");
  const [selectedMode, setSelectedMode] = useState("manage");
  const mode = isManager && !embedded ? selectedMode : "preview";

  const isEnrolled = Boolean(course.isEnrolled);
  const noteCount = Number(course.notesTotal ?? course.notes?.length ?? 0);

  return (
    <main className={`${styles.shell} ${embedded ? styles.embedded : ""}`}>
      <aside className={styles.sidebar}>
        <Link href="/marketplace" className={styles.backLink}><Icon name="arrow" /> Marketplace</Link>
        <div className={styles.sideCourse}>
          <span>Current course</span>
          <h2>{course.name}</h2>
          <p>{noteCount} notes</p>
        </div>
        {isManager && <nav className={styles.modeNav} aria-label="Administration view">
          <button type="button" className={mode === "manage" ? styles.active : ""} onClick={() => setSelectedMode("manage")}>Manage</button>
          <button type="button" className={mode === "preview" ? styles.active : ""} onClick={() => setSelectedMode("preview")}>Preview</button>
        </nav>}
        {canAccessContent && mode === "preview" && <nav className={styles.sideNav} aria-label="Course navigation">
          <button type="button" className={styles.active} aria-current="page"><span><Icon name="book" /></span><div><strong>Learn</strong><small>Course notes</small></div></button>
        </nav>}
        <div className={styles.sideFooter}>
          <span>Course level</span>
          <strong>{course.level || 0}</strong>
          <small>{course.creator?.displayName || course.creator?.username || "Alpaca course"}</small>
        </div>
      </aside>

      <section className={styles.appView}>
        <Link href="/marketplace" className={styles.mobileBack}><Icon name="arrow" /> Marketplace</Link>
        {(!embedded || mode !== "preview") && <header className={styles.courseHero}>
          <div className={styles.heroCopy}>
            <span className={styles.eyebrow}>Course dashboard</span>
            <h1>{course.name}</h1>
            <p>{course.description || "A focused learning path built from course notes."}</p>
            <div className={styles.heroStats}>
              <span><strong>{noteCount}</strong> notes</span>
            </div>
          </div>
          <CourseActions course={course} user={user} isLogged={isLogged} isEnrolled={isEnrolled} isManager={isManager} isLoading={isLoading} setIsLoading={setIsLoading} />
        </header>}

        {isManager && mode === "manage" ? <ManageWorkspace course={course} resources={resources} /> : canAccessContent ? <section className={`${styles.workspace} ${embedded ? styles.embeddedWorkspace : ""}`}>
          {!embedded && <header className={styles.sectionHeader}>
            <span className={styles.sectionIcon}><Icon name="book" /></span>
            <div><small>Course notes</small><h2>Learn</h2></div>
            <NotesTabInfo course={course} initialNotes={resources.notes} />
          </header>}
          <div className={styles.contentBody}><NotesTabMain course={course} courses={courses} initialNotes={resources.notes} initialRelationships={relationships} /></div>
        </section> : <section className={styles.lockedWorkspace} aria-label="Locked course content">
          <span className={styles.lockedIcon}><Icon name="lock" /></span>
          <small>Paid course</small>
          <h2>Unlock the course to start learning</h2>
          <p>Course notes become available after the demo payment is completed.</p>
        </section>}
      </section>
    </main>
  );
}
