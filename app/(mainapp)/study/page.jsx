import { getPermittedResources } from "@/lib/db/helpers";
import { SearchOptions } from "../[resource]/SearchOptions";
import styles from "../AppScreen.module.css";
import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/auth";
import shuffleArray from "@/lib/shuffleArray";
import StudyList from "./StudyList";

const DEFAULT_PAGE_SIZE = 10;

export default async function StudyPage(props) {
  const searchParams = await props.searchParams;
  const user = await getSessionUser((await cookies()).get("token")?.value);

  const page = Number(searchParams["page"] ?? 1);
  const amount = Number(searchParams["amount"] ?? DEFAULT_PAGE_SIZE);
  const tag = searchParams["tag"] ?? null;

  const { notes, quizzes, sources } = await getPermittedResources({
    userId: user ? user.id : undefined,
    withNotes: true,
    withQuizzes: true,
    withSources: true,
    userId: user?.id,
    limit: amount,
    offset: (page - 1) * amount,
    tagSearch: tag ? tag : undefined,
  });

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
