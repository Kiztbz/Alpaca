import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getGroups } from "@/lib/db/helpers";
import { getEnrolledLearningData, selectEnrolledCourse } from "@/lib/enrolledCourses";
import { CourseDash } from "../courses/[name]/CourseDash";
import { CourseSwitcher, FillStore } from "@client";
import switcherStyles from "@/app/components/CourseContext/CourseSwitcher.module.css";

export const metadata = { title: "Learn", robots: { index: false, follow: false } };

export default async function LearnPage(props) {
  const user = await getSessionUser((await cookies()).get("token")?.value);
  if (!user) redirect("/login?next=/learn");
  const searchParams = await props.searchParams;
  const [{ resources, relationships, courses }, groups] = await Promise.all([getEnrolledLearningData(user.id), getGroups(user.id)]);
  const activeCourse = selectEnrolledCourse(courses, searchParams.course);
  if (!activeCourse) return <main className={switcherStyles.empty}><div><h1>Choose your first course</h1><p>Learn and Daily Train are organized around enrolled courses. Enroll in one course to begin.</p><Link className="button primary" href="/marketplace">Browse courses</Link></div></main>;

  return <>
    <FillStore user={user} groups={groups} relationships={relationships} {...resources} />
    <header className={switcherStyles.bar}><div><span>Your classroom</span><h1>Learn</h1></div><CourseSwitcher courses={courses} activeCourse={activeCourse} label="Enrolled course" /></header>
    <CourseDash course={activeCourse} isLogged canAccessContent embedded />
  </>;
}
