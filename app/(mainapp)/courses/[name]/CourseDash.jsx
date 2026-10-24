"use client";

import { useStore } from "@/store/store";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  CourseActions,
  NotesTabInfo,
  NotesTabMain,
  QuizzesTabInfo,
  QuizzesTabMain,
  SourcesInfoTab,
  SourcesMainTab,
} from "./CourseDashComponents";
import styles from "./CourseDash.module.css";

function Icon({ name }) {
  const paths = {
    arrow: <path d="m15 18-6-6 6-6" />,
    book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Z" /><path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5a2.5 2.5 0 0 1 2.5 2.5v-16Z" /></>,
    bolt: <path d="m13 2-7 11h5l-1 9 8-12h-5V2Z" />,
    file: <><path d="M6 2h8l4 4v16H6z" /><path d="M14 2v5h5M9 12h6M9 16h6" /></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

export function CourseDash({ course, isLogged }) {
  const [isLoading, setIsLoading] = useState(false);
  const [currentTab, setCurrentTab] = useState(0);
  const courses = useStore((state) => state.courses);
  const user = useStore((state) => state.user);

  useEffect(() => {
    const savedTab = Number.parseInt(localStorage.getItem(`course-tab:${course.id}`) || "0", 10);
    setCurrentTab(Number.isInteger(savedTab) && savedTab >= 0 && savedTab < 3 ? savedTab : 0);
  }, [course.id]);

  const isEnrolled = courses.some((item) => String(item.id) === String(course.id));
  const tabs = [
    {
      name: "Learn",
      eyebrow: "Course lessons",
      icon: "book",
      info: <NotesTabInfo course={course} />,
      main: <NotesTabMain course={course} />,
    },
    {
      name: "Practice",
      eyebrow: "Knowledge check",
      icon: "bolt",
      info: <QuizzesTabInfo course={course} />,
      main: <QuizzesTabMain course={course} />,
    },
    {
      name: "Sources",
      eyebrow: "Course library",
      icon: "file",
      info: <SourcesInfoTab course={course} />,
      main: <SourcesMainTab course={course} />,
    },
  ];

  function selectTab(index) {
    setCurrentTab(index);
    localStorage.setItem(`course-tab:${course.id}`, String(index));
  }

  const activeTab = tabs[currentTab];
  const resourceCount = (course.notes?.length || 0) + (course.quizzes?.length || 0) + (course.sources?.length || 0);

  return (
    <main className={styles.shell}>
      <aside className={styles.sidebar}>
        <Link href="/courses" className={styles.backLink}><Icon name="arrow" /> All courses</Link>
        <div className={styles.sideCourse}>
          <span>Current course</span>
          <h2>{course.name}</h2>
          <p>{resourceCount} learning items</p>
        </div>
        <nav className={styles.sideNav} aria-label="Course navigation">
          {tabs.map((tab, index) => <button type="button" key={tab.name} className={currentTab === index ? styles.active : ""} onClick={() => selectTab(index)} aria-current={currentTab === index ? "page" : undefined}><span><Icon name={tab.icon} /></span><div><strong>{tab.name}</strong><small>{tab.eyebrow}</small></div></button>)}
        </nav>
        <div className={styles.sideFooter}>
          <span>Course level</span>
          <strong>{course.level || 0}</strong>
          <small>{course.creator?.displayName || course.creator?.username || "Alpaca course"}</small>
        </div>
      </aside>

      <section className={styles.appView}>
        <Link href="/courses" className={styles.mobileBack}><Icon name="arrow" /> All courses</Link>
        <header className={styles.courseHero}>
          <div className={styles.heroCopy}>
            <span className={styles.eyebrow}>Course dashboard</span>
            <h1>{course.name}</h1>
            <p>{course.description || "A focused learning path built from notes, practice, and trusted sources."}</p>
            <div className={styles.heroStats}>
              <span><strong>{course.notes?.length || 0}</strong> lessons</span>
              <span><strong>{course.quizzes?.length || 0}</strong> practices</span>
              <span><strong>{course.sources?.length || 0}</strong> sources</span>
            </div>
          </div>
          <CourseActions course={course} user={user} isLogged={isLogged} isEnrolled={isEnrolled} isLoading={isLoading} setIsLoading={setIsLoading} />
        </header>

        <section className={styles.workspace}>
          <header className={styles.sectionHeader}>
            <span className={styles.sectionIcon}><Icon name={activeTab.icon} /></span>
            <div><small>{activeTab.eyebrow}</small><h2>{activeTab.name}</h2></div>
            {activeTab.info}
          </header>
          <div className={styles.contentBody}>{activeTab.main}</div>
        </section>
      </section>

      <nav className={styles.mobileNav} aria-label="Course navigation">
        {tabs.map((tab, index) => <button type="button" key={tab.name} className={currentTab === index ? styles.active : ""} onClick={() => selectTab(index)} aria-current={currentTab === index ? "page" : undefined}><Icon name={tab.icon} /><span>{tab.name}</span></button>)}
      </nav>
    </main>
  );
}
