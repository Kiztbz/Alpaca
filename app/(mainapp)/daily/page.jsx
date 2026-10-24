import { getPermittedResources, getRelationships } from "@/lib/db/helpers";
import styles from "../AppScreen.module.css";
import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/auth";
import { DailyTrain, FillStore } from "@client";
import Link from "next/link";
import shuffleQuizzes from "@/lib/shuffleQuizzes";
import { expandCourseRelationships } from "@/lib/resourceRelations";

export default async function DailyPage() {
  const user = await getSessionUser((await cookies()).get("token")?.value);

  const [resourcesObject, rawRelationships] = await Promise.all([
    getPermittedResources({
      userId: user?.id,
      takeAll: true,
    }),
    getRelationships(),
  ]);
  const { quizzes } = resourcesObject;
  const sortedQuizzes = shuffleQuizzes(quizzes);

  const relationships = expandCourseRelationships(rawRelationships);
  
  function pushToList(rel, type) {
    const resourceList = [
      {
        name: "sources",
        title: "Sources",
        singular: "source",
        description:
          "A source is a record of a resource such as a book, website, or video tutorial, that you can cite for your notes or quiz questions.",
      },
      {
        name: "notes",
        title: "Notes",
        singular: "note",
        description:
          "A note is a record of your thoughts, ideas, or summaries of a source. You can use notes to create quiz questions or to help you study.",
      },
      {
        name: "quizzes",
        title: "Quizzes",
        singular: "quiz",
        description:
          "A quiz is a question that challenges your understanding and recall of information from a source or note.",
      },
      {
        name: "courses",
        title: "Courses",
        singular: "course",
        description:
          "A course is a collection of notes, quizzes, and sources that are related to a specific topic or subject.",
      },
    ];
    if (rel.AType === type) {
      quizzes
        .filter((x) => x.id === rel.A)
        .forEach((x) => {
          const listType = resourceList.find(
            (x) => x.singular === rel.BType
          ).name;
          if (!x[listType]) x[listType] = [];
          if (!x[listType].includes(rel.B)) x[listType].push(rel.B);
        });
    }

    if (rel.BType === type) {
      quizzes
        .filter((x) => x.id === rel.B)
        .forEach((x) => {
          const listType = resourceList.find(
            (x) => x.singular === rel.AType
          ).name;
          if (!x[listType]) x[listType] = [];
          if (!x[listType].includes(rel.A)) x[listType].push(rel.A);
        });
    }
  }

  relationships.forEach((rel) => pushToList(rel, "quiz"));

  return (
    <main className={styles.screen}>
      {user && <FillStore user={user} relationships={relationships} {...resourcesObject} />}
      <header className={styles.screenHeader}>
        <div><span>Spaced repetition</span><h1>Daily Train</h1><p>A focused session of questions that are ready for review today.</p></div>
      </header>
      <section className={styles.content}><div className={styles.sessionPanel}><div><span>Today&apos;s queue</span><h2>{sortedQuizzes.length} questions ready</h2><p>Correct answers wait longer before returning. Missed answers come back sooner so you can strengthen them.</p></div>
        {user ? (
          <DailyTrain quizzes={sortedQuizzes} />
        ) : (
          <p>
            Please{" "}
            <Link className="link" href="/login">
              log in
            </Link>{" "}
            to start training
          </p>
        )}</div>
      </section>
    </main>
  );
}
