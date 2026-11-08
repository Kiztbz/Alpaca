import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getEnrolledLearningData, selectEnrolledCourse } from "@/lib/enrolledCourses";
import { DailyTrain, FillStore, CourseSwitcher } from "@client";
import shuffleQuizzes from "@/lib/shuffleQuizzes";
import styles from "../AppScreen.module.css";
import switcherStyles from "@/app/components/CourseContext/CourseSwitcher.module.css";

export const metadata = { title: "Daily train", robots: { index: false, follow: false } };

export default async function DailyPage(props) {
  const user = await getSessionUser((await cookies()).get("token")?.value);
  if (!user) redirect("/login?next=/daily");
  const searchParams = await props.searchParams;
  const { resources, relationships, courses } = await getEnrolledLearningData(user.id);
  const activeCourse = selectEnrolledCourse(courses, searchParams.course);
  if (!activeCourse) return <main className={switcherStyles.empty}><div><h1>Enroll before training</h1><p>Daily Train builds a focused queue from one of your enrolled courses.</p><Link className="button primary" href="/marketplace">Browse courses</Link></div></main>;

  const quizIds = new Set((activeCourse.quizzes || []).map(String));
  const courseQuizzes = resources.quizzes.filter((quiz) => quizIds.has(String(quiz.id))).map((quiz) => ({ ...quiz, courses: [activeCourse.id] }));
  const sortedQuizzes = shuffleQuizzes(courseQuizzes);

  return <main className={styles.screen}>
    <FillStore user={user} relationships={relationships} {...resources} quizzes={courseQuizzes} />
    <header className={switcherStyles.bar}><div><span>Spaced repetition · FSRS v5</span><h1>Daily Train</h1></div><CourseSwitcher courses={courses} activeCourse={activeCourse} label="Training course" /></header>
    <section className={styles.content}><div className={styles.sessionPanel}><div><span>{activeCourse.name}</span><h2>{sortedQuizzes.length} questions ready</h2><p>Your queue only includes practice from this enrolled course. Mastered cards wait longer; difficult cards return sooner.</p></div><DailyTrain quizzes={sortedQuizzes} /></div></section>
  </main>;
}
