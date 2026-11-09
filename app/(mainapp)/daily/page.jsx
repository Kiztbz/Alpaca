import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getEnrolledLearningData, selectEnrolledCourse } from "@/lib/enrolledCourses";
import { DailyTrain, FillStore, CourseSwitcher } from "@client";
import shuffleQuizzes from "@/lib/shuffleQuizzes";
import styles from "../AppScreen.module.css";
import switcherStyles from "@/app/components/CourseContext/CourseSwitcher.module.css";
import { contiguousCompletedNoteIds, quizIdsForNotes } from "@/lib/courseUnits";

export const metadata = { title: "Daily train", robots: { index: false, follow: false } };

export default async function DailyPage(props) {
  const cookieStore = await cookies();
  const user = await getSessionUser(cookieStore.get("token")?.value);
  if (!user) redirect("/login?next=/daily");
  const searchParams = await props.searchParams;
  const { resources, relationships, courses } = await getEnrolledLearningData(user.id, user.role);
  const rememberedCourse = cookieStore.get(`alpaca-course-${user.id}`)?.value;
  const activeCourse = selectEnrolledCourse(courses, searchParams.course || rememberedCourse);
  if (!activeCourse) return <main className={switcherStyles.empty}><div><h1>Enroll before training</h1><p>Daily Train builds a focused queue from one of your enrolled courses.</p><Link className="button primary" href="/marketplace">Browse courses</Link></div></main>;

  const completedUnitIds = contiguousCompletedNoteIds(activeCourse);
  const requestedUnit = resources.notes.find((note) => note.publicId === searchParams.unit && completedUnitIds.some((id) => String(id) === String(note.id)));
  const eligibleUnitIds = requestedUnit ? [requestedUnit.id] : completedUnitIds;
  const completedUnitQuizIds = quizIdsForNotes(relationships, eligibleUnitIds);
  const courseQuizIds = new Set((activeCourse.quizzes || []).map(String));
  const courseQuizzes = resources.quizzes
    .filter((quiz) => courseQuizIds.has(String(quiz.id)) && completedUnitQuizIds.has(String(quiz.id)))
    .map((quiz) => ({ ...quiz, courses: [activeCourse.id] }));
  const sortedQuizzes = shuffleQuizzes(courseQuizzes);

  return <main className={styles.screen}>
    <FillStore user={user} relationships={relationships} {...resources} quizzes={courseQuizzes} />
    <header className={switcherStyles.bar}><div><span>Spaced repetition · FSRS v5</span><h1>{requestedUnit ? `Practice · ${requestedUnit.title}` : "Daily Train"}</h1></div><CourseSwitcher courses={courses} activeCourse={activeCourse} label="Training course" /></header>
    <section className={styles.content}><div className={styles.sessionPanel}><div><span>{activeCourse.name}</span><h2>{Math.min(5, sortedQuizzes.length)} questions in this session</h2><p>{completedUnitIds.length ? "Questions are selected only from fully completed units. Answers, skips, and timeouts each count as one question." : "Complete your first unit in Learn to unlock Daily Train."}</p></div><DailyTrain quizzes={sortedQuizzes} courseId={activeCourse.id} courseName={activeCourse.name} /></div></section>
  </main>;
}
