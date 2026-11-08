"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { CourseDisplay } from "@/app/components/Course/CourseDisplay";
import styles from "./Marketplace.module.css";

const tourSteps = [
  { view: "learn", title: "Your course, organized", text: "Lessons, sources, and practice live together. Try completing the first lesson." },
  { view: "daily", title: "Recall, not rereading", text: "Daily Train builds a short practice set from the course you selected. Pick an answer." },
  { view: "profile", title: "Progress you can see", text: "Your profile turns activity into a clear learning history without noisy vanity metrics." },
];

function Icon({ name }) {
  const paths = {
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    learn: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Z"/><path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5a2.5 2.5 0 0 1 2.5 2.5v-16Z"/></>,
    daily: <path d="m13 2-7 11h5l-1 9 8-12h-5V2Z"/>,
    profile: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
    close: <><path d="m6 6 12 12M18 6 6 18"/></>,
    arrow: <path d="m9 18 6-6-6-6"/>,
    play: <path d="m9 7 8 5-8 5V7Z"/>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

function DemoLesson({ complete, onComplete }) {
  return <div className={styles.demoPanel}>
    <div className={styles.demoHeading}><div><span>Alpaca demo · Lesson 1</span><h3>Build a memory that lasts</h3></div><b>4 min</b></div>
    <p>Active recall strengthens memory by asking your brain to retrieve an idea before seeing it again.</p>
    <div className={styles.lessonCard}><small>QUICK IDEA</small><strong>Retrieval is the workout. Rereading is only the warm-up.</strong></div>
    <button type="button" className={`${styles.demoAction} ${complete ? styles.complete : ""}`} onClick={onComplete}>{complete ? "✓ Lesson complete" : "Mark lesson complete"}</button>
  </div>;
}

function DemoDaily({ answer, setAnswer }) {
  return <div className={styles.demoPanel}>
    <div className={styles.demoHeading}><div><span>Daily Train · 1 of 5</span><h3>Which action best uses active recall?</h3></div><b>+10 XP</b></div>
    <div className={styles.answers}>
      {["Highlight the whole page", "Close the notes and explain the idea", "Read the same paragraph again"].map((choice, index) => <button type="button" key={choice} onClick={() => setAnswer(index)} className={answer === index ? (index === 1 ? styles.correct : styles.incorrect) : ""}><span>{String.fromCharCode(65 + index)}</span>{choice}</button>)}
    </div>
    {answer !== null && <p className={styles.feedback}>{answer === 1 ? "Exactly — retrieving the idea makes the memory stronger." : "Almost. Try the option that makes you recall without looking."}</p>}
  </div>;
}

function DemoProfile({ lessonComplete, answer }) {
  return <div className={styles.demoPanel}>
    <div className={styles.demoHeading}><div><span>Your profile</span><h3>A calm view of your momentum</h3></div><b>Level 1</b></div>
    <div className={styles.statGrid}><article><strong>{lessonComplete ? 1 : 0}</strong><span>lesson completed</span></article><article><strong>{answer === 1 ? 1 : 0}</strong><span>correct recall</span></article><article><strong>{lessonComplete || answer !== null ? 1 : 0}</strong><span>day active</span></article></div>
    <div className={styles.week}><span>M</span><span>T</span><span className={lessonComplete || answer !== null ? styles.activeDay : ""}>W</span><span>T</span><span>F</span><span>S</span><span>S</span></div>
  </div>;
}

function DemoDialog({ onClose }) {
  const [step, setStep] = useState(0);
  const [view, setView] = useState("learn");
  const [lessonComplete, setLessonComplete] = useState(false);
  const [answer, setAnswer] = useState(null);
  const closeButton = useRef(null);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButton.current?.focus();
    function onKeyDown(event) { if (event.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKeyDown);
    return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", onKeyDown); };
  }, [onClose]);

  function chooseView(nextView) {
    setView(nextView);
    const nextStep = tourSteps.findIndex((item) => item.view === nextView);
    if (nextStep >= 0) setStep(nextStep);
  }

  function next() {
    if (step === tourSteps.length - 1) return onClose();
    const nextStep = step + 1;
    setStep(nextStep);
    setView(tourSteps[nextStep].view);
  }

  return <div className={styles.overlay} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className={styles.demoDialog} role="dialog" aria-modal="true" aria-labelledby="demo-title">
      <button ref={closeButton} type="button" className={styles.closeButton} onClick={onClose} aria-label="Close Alpaca demo"><Icon name="close" /></button>
      <aside className={styles.demoSidebar}>
        <div className={styles.demoBrand}><Image src="/assets/images/llama-face-v2.png" alt="" width={48} height={48}/><strong>Alpaca</strong></div>
        <nav aria-label="Demo navigation">
          {[['learn', 'Learn'], ['daily', 'Daily Train'], ['profile', 'Profile']].map(([key, label]) => <button type="button" key={key} className={view === key ? styles.selected : ""} onClick={() => chooseView(key)}><Icon name={key}/><span>{label}</span></button>)}
        </nav>
        <div className={styles.demoUser}><span>AD</span><div><strong>Alex Demo</strong><small>Learning today</small></div></div>
      </aside>
      <div className={styles.demoMain}>
        <header><div><small>INTERACTIVE PREVIEW</small><h2 id="demo-title">See how Alpaca feels</h2></div><button type="button">Alpaca demo <span>⌄</span></button></header>
        <div className={styles.demoStage}>
          {view === "learn" && <DemoLesson complete={lessonComplete} onComplete={() => setLessonComplete((done) => !done)} />}
          {view === "daily" && <DemoDaily answer={answer} setAnswer={setAnswer} />}
          {view === "profile" && <DemoProfile lessonComplete={lessonComplete} answer={answer} />}
          <aside className={styles.coachmark} aria-live="polite"><div><span>{step + 1} / {tourSteps.length}</span><h3>{tourSteps[step].title}</h3><p>{tourSteps[step].text}</p></div><button type="button" onClick={next}>{step === tourSteps.length - 1 ? "Finish demo" : "Next tip"}<Icon name="arrow"/></button></aside>
        </div>
      </div>
    </section>
  </div>;
}

export function MarketplaceExperience({ courses, isLoggedIn }) {
  const [query, setQuery] = useState("");
  const [demoOpen, setDemoOpen] = useState(false);
  const filteredCourses = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return courses.filter((course) => !normalized || `${course.name} ${course.description || ""}`.toLowerCase().includes(normalized));
  }, [courses, query]);
  const demo = courses.find((course) => course.isDemo) || courses[0];

  return <main className={styles.marketplace}>
    <section className={styles.hero}>
      <div className={styles.heroCopy}><span className={styles.eyebrow}>Course library</span><h1>Marketplace</h1><p>Find a course, preview what you will learn, and enroll when you are ready.</p></div>
      <label className={styles.search}><Icon name="search"/><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search courses"/><span>{filteredCourses.length} courses</span></label>
    </section>

    {demo && <section className={styles.featured}>
      <span className={styles.featureIcon}><Icon name="play"/></span>
      <div className={styles.featureCopy}><span className={styles.eyebrow}>Interactive preview</span><h2>Try Alpaca demo</h2><p>Complete a short lesson, answer a Daily Train question, and see how course progress works before creating an account.</p><div className={styles.featurePoints}><span>Lesson</span><span>Daily Train</span><span>Progress</span></div></div>
      <button type="button" className={styles.tryButton} onClick={() => setDemoOpen(true)}>Open demo <Icon name="arrow"/></button>
    </section>}

    <section className={styles.catalog}>
      <header className={styles.sectionHeader}><span className={styles.sectionIcon}><Icon name="learn"/></span><div><small>Available courses</small><h2>Browse courses</h2></div><span className={styles.countPill}>{query ? `${filteredCourses.length} results` : `${filteredCourses.length} total`}</span></header>
      <div className={styles.contentBody}>{filteredCourses.length ? <div className={styles.courseGrid}>{filteredCourses.map((course) => <div className={styles.courseSlot} key={course.publicId || course.id}><CourseDisplay course={course} compact presentation="marketplace" onDemo={course.isDemo ? () => setDemoOpen(true) : undefined} /></div>)}</div> : <div className={styles.empty}><strong>No courses match “{query}”</strong><p>Try another search or view the complete marketplace.</p><button type="button" onClick={() => setQuery("")}>Clear search</button></div>}</div>
    </section>

    <section className={styles.bottomCta}><div><span className={styles.eyebrow}>Next step</span><h2>{isLoggedIn ? "Continue with your enrolled courses" : "Ready to start learning?"}</h2></div><Link href={isLoggedIn ? "/learn" : "/register"}>{isLoggedIn ? "Go to Learn" : "Create account"}<Icon name="arrow"/></Link></section>
    {demoOpen && <DemoDialog onClose={() => setDemoOpen(false)} />}
  </main>;
}
