import { getCourseAccessRows, getPermittedResources, getRelationships } from "@/lib/db/helpers";
import { SearchOptions } from "../[resource]/SearchOptions";
import styles from "../AppScreen.module.css";
import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/auth";
import shuffleArray from "@/lib/shuffleArray";
import StudyList from "./StudyList";
import { expandCourseRelationships } from "@/lib/resourceRelations";
import { filterPaidCourseContent } from "@/lib/courseAccess";

const DEFAULT_PAGE_SIZE = 10;

export default async function StudyPage(props) {
  const searchParams = await props.searchParams;
  const user = await getSessionUser((await cookies()).get("token")?.value);

  const page = Number(searchParams["page"] ?? 1);
  const amount = Number(searchParams["amount"] ?? DEFAULT_PAGE_SIZE);
  const tag = searchParams["tag"] ?? null;

  const [resources, rawRelationships, courses] = await Promise.all([
    getPermittedResources({
      withNotes: true,
      withQuizzes: true,
      withSources: true,
      userId: user?.id,
      limit: amount,
      offset: (page - 1) * amount,
      tagSearch: tag ? tag : undefined,
    }),
    getRelationships(),
    getCourseAccessRows(user?.id),
  ]);
  const relationships = expandCourseRelationships(rawRelationships);
  const notes = filterPaidCourseContent({ items: resources.notes, resourceType: "note", courses, relationships, userId: user?.id });
  const quizzes = filterPaidCourseContent({ items: resources.quizzes, resourceType: "quiz", courses, relationships, userId: user?.id });
  const sources = filterPaidCourseContent({ items: resources.sources, resourceType: "source", courses, relationships, userId: user?.id });

  return (
    <main className={styles.screen}>
      <header className={styles.screenHeader}>
        <div><span>Practice space</span><h1>Study</h1><p>Review notes, rehearse flashcards, and revisit sources without changing quiz levels.</p></div>
        <div className={styles.headerControls}><SearchOptions
          tag={tag}
          page={page}
          amount={amount}
          maxPage={100}
          name="study"
          noTags={false}
        /></div>
      </header>
      <div className={styles.studyGrid}>
        <StudyList resources={shuffleArray(notes)} type="note" heading="Notes" />
        <StudyList
        resources={shuffleArray(quizzes).sort(
          (quiz1, quiz2) => quiz1.level - quiz2.level
        )}
        type="quiz"
        heading="Flashcards"
        />
        <StudyList resources={sources} type="source" heading="Sources" />
      </div>
    </main>
  );
}
