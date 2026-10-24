"use client";

import {
  NoteDisplay,
  MasoneryList,
  QuizDisplay,
  SourceDisplay,
} from "@/app/components/client";
import { useState } from "react";
import styles from "../AppScreen.module.css";

export default function StudyList({ resources, type, heading }) {
  const [open, setOpen] = useState(false);

  return (
    <section className={styles.studySection}>
      <header><h2>{heading}<span>{resources.length} available</span></h2><button
        className="button primary"
        onClick={() => setOpen((prev) => !prev)}
      >
        {open ? "Hide" : "Show"}
      </button></header>
      {resources.length === 0 && <p className={styles.empty}>None available for the selected filter.</p>}
      {open && (
        <div><MasoneryList>
          {resources.map((res) => {
            if (type === "note") return <NoteDisplay key={res.id} note={res} />;

            if (type === "quiz")
              return (
                <QuizDisplay
                  key={res.id}
                  quiz={res}
                  isFlashcard={true}
                  canClientCheck={true}
                />
              );

            if (type === "source")
              return <SourceDisplay key={res.id} source={res} />;
          })}
        </MasoneryList></div>
      )}
    </section>
  );
}
