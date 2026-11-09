"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import styles from "./CourseSwitcher.module.css";

export function CourseSwitcher({ courses, activeCourse, label = "Course" }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const switcherRef = useRef(null);

  useEffect(() => {
    function close(event) {
      if (switcherRef.current && !switcherRef.current.contains(event.target)) setOpen(false);
    }
    function closeOnEscape(event) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  function selectCourse(publicId) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("course", publicId);
    params.delete("view");
    params.delete("item");
    setOpen(false);
    router.push(`${pathname}?${params.toString()}`);
  }

  return <div className={styles.switcher} ref={switcherRef}>
    <span className={styles.label}>{label}</span>
    <div className={styles.control}>
      <button type="button" className={styles.trigger} onClick={() => setOpen((value) => !value)} aria-haspopup="listbox" aria-expanded={open}>
        <strong>{activeCourse?.name || "Choose a course"}</strong>
        <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2"><path d="m5 7.5 5 5 5-5" /></svg>
      </button>
      {open && <div className={styles.menu} role="listbox" aria-label={label}>
        {courses.map((course) => <button type="button" role="option" aria-selected={course.id === activeCourse?.id} className={course.id === activeCourse?.id ? styles.selected : ""} onClick={() => selectCourse(course.publicId)} key={course.id}>
          <span>{course.name}</span>{course.id === activeCourse?.id && <b>✓</b>}
        </button>)}
      </div>}
    </div>
  </div>;
}
