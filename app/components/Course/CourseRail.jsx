"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./CourseRail.module.css";

export function CourseRail({ children, label = "Available courses" }) {
  const railRef = useRef(null);
  const [canScrollBack, setCanScrollBack] = useState(false);
  const [canScrollForward, setCanScrollForward] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);

  const syncControls = () => {
    const rail = railRef.current;
    if (!rail) return;
    setHasOverflow(rail.scrollWidth > rail.clientWidth + 4);
    setCanScrollBack(rail.scrollLeft > 4);
    setCanScrollForward(rail.scrollLeft + rail.clientWidth < rail.scrollWidth - 28);
  };

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;

    syncControls();
    const observer = new ResizeObserver(syncControls);
    observer.observe(rail);
    rail.addEventListener("scroll", syncControls, { passive: true });

    return () => {
      observer.disconnect();
      rail.removeEventListener("scroll", syncControls);
    };
  }, [children]);

  const scroll = (direction) => {
    const rail = railRef.current;
    if (!rail) return;
    const card = rail.querySelector("li");
    const distance = card ? card.getBoundingClientRect().width + 16 : rail.clientWidth * 0.8;
    rail.scrollBy({ left: direction * distance, behavior: "smooth" });
  };

  return (
    <section className={styles.shell} aria-label={label}>
      {hasOverflow && (
        <div className={styles.controls} aria-label="Course carousel controls">
          <span>Scroll to explore</span>
          <button type="button" onClick={() => scroll(-1)} disabled={!canScrollBack} aria-label="Previous course">
            <span aria-hidden="true">←</span>
          </button>
          <button type="button" onClick={() => scroll(1)} disabled={!canScrollForward} aria-label="Next course">
            <span aria-hidden="true">→</span>
          </button>
        </div>
      )}
      <ul ref={railRef} className={styles.rail} tabIndex={0}>
        {children}
      </ul>
    </section>
  );
}
