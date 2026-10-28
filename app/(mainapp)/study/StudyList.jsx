"use client";

import { useRef } from "react";
import Link from "next/link";
import styles from "../AppScreen.module.css";

const TYPE_LABELS = {
  note: "Note",
  quiz: "Flashcard",
  source: "Source",
};

function plainText(value = "") {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&lt;[^&]*?&gt;/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function resourceHref(resource, type) {
  const publicId = resource.publicId;

  if (!publicId) return null;
  if (type === "note") return `/notes/${publicId}`;
  if (type === "quiz") return `/quizzes/${publicId}`;
  if (type === "source") return `/sources/${publicId}`;

  return null;
}

function StudyPreviewCard({ resource, type }) {
  const href = resourceHref(resource, type);
  const title = type === "quiz"
    ? resource.type === "fill-in-the-blank" ? "Fill in the blank" : resource.prompt
    : resource.title;
  const description = type === "note"
    ? plainText(resource.text)
    : type === "quiz"
      ? plainText(resource.prompt)
      : plainText(resource.description || resource.url || "Open this source to review its details.");
  const tags = resource.tags?.slice(0, 3) || [];

  const content = (
    <>
      <header className={styles.previewHeader}>
        <span>{TYPE_LABELS[type]}</span>
        {type === "quiz" && resource.level != null && <small>Level {resource.level}</small>}
        {type === "source" && resource.medium && <small>{resource.medium}</small>}
      </header>

      <h3>{title || `Untitled ${TYPE_LABELS[type].toLowerCase()}`}</h3>
      {description && <p className={styles.previewDescription}>{description}</p>}

      {!!tags.length && (
        <ul className={styles.previewTags} aria-label="Tags">
          {tags.map((tag) => <li key={tag}>{tag}</li>)}
        </ul>
      )}

      <footer>
        <span>{resource.creator?.username ? `By ${resource.creator.username}` : "Shared resource"}</span>
        {href && <strong>Preview →</strong>}
      </footer>
    </>
  );

  return href ? (
    <Link className={styles.studyPreview} href={href} aria-label={`Open ${title || TYPE_LABELS[type]}`}>
      {content}
    </Link>
  ) : (
    <div className={styles.studyPreview}>{content}</div>
  );
}

export default function StudyList({ resources, type, heading }) {
  const railRef = useRef(null);

  function scrollRail(direction) {
    const rail = railRef.current;

    if (!rail) return;

    const card = rail.querySelector(`.${styles.studyCard}`);
    const gap = Number.parseFloat(getComputedStyle(rail).columnGap) || 0;
    const distance = (card?.getBoundingClientRect().width || rail.clientWidth * 0.8) + gap;

    rail.scrollBy({ left: direction * distance, behavior: "smooth" });
  }

  return (
    <section className={`${styles.studySection} ${styles[`studySection_${type}`]}`}>
      <header className={styles.studySectionHeader}>
        <div>
          <span className={styles.studyEyebrow}>{type === "quiz" ? "Active recall" : type}</span>
          <h2>{heading}</h2>
          <p>{resources.length} {resources.length === 1 ? "item" : "items"} available</p>
        </div>

        {resources.length > 1 && (
          <div className={styles.sliderControls} aria-label={`${heading} slider controls`}>
            <button type="button" onClick={() => scrollRail(-1)} aria-label={`Previous ${heading.toLowerCase()}`}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14.5 5-7 7 7 7" /></svg>
            </button>
            <button type="button" onClick={() => scrollRail(1)} aria-label={`Next ${heading.toLowerCase()}`}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9.5 5 7 7-7 7" /></svg>
            </button>
          </div>
        )}
      </header>

      {resources.length === 0 ? (
        <div className={styles.empty}>
          <span aria-hidden="true">○</span>
          <p>Nothing here yet for the selected filter.</p>
        </div>
      ) : (
        <div
          ref={railRef}
          className={styles.studyRail}
          role="region"
          aria-label={`${heading}, horizontally scrollable`}
          tabIndex="0"
        >
          {resources.map((res) => (
            <article className={styles.studyCard} key={res.id}>
              <StudyPreviewCard resource={res} type={type} />
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
