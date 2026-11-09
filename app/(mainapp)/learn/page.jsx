import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getGroups } from "@/lib/db/helpers";
import { getEnrolledLearningData, selectEnrolledCourse } from "@/lib/enrolledCourses";
import { CourseDash } from "../courses/[name]/CourseDash";
import { FillStore } from "@client";
import { NoteReader } from "@/app/components/Note/NoteReader";
import switcherStyles from "@/app/components/CourseContext/CourseSwitcher.module.css";

export const metadata = { title: "Learn", robots: { index: false, follow: false } };

const resourceViews = {
  note: { collection: "notes", courseKey: "notes" },
};

function linkedIds(relationships, id, type, linkedType) {
  return relationships.flatMap((relation) => {
    if (String(relation.A) === String(id) && relation.AType === type && relation.BType === linkedType) return [String(relation.B)];
    if (String(relation.B) === String(id) && relation.BType === type && relation.AType === linkedType) return [String(relation.A)];
    return [];
  });
}

export default async function LearnPage(props) {
  const cookieStore = await cookies();
  const user = await getSessionUser(cookieStore.get("token")?.value);
  if (!user) redirect("/login?next=/learn");
  const searchParams = await props.searchParams;
  const [{ resources, relationships, courses }, groups] = await Promise.all([getEnrolledLearningData(user.id, user.role), getGroups(user.id)]);
  const rememberedCourse = cookieStore.get(`alpaca-course-${user.id}`)?.value;
  const activeCourse = selectEnrolledCourse(courses, searchParams.course || rememberedCourse);
  if (!activeCourse) return <main className={switcherStyles.empty}><div><h1>Choose your first course</h1><p>Learn and Daily Train are organized around enrolled courses. Enroll in one course to begin.</p><Link className="button primary" href="/marketplace">Browse courses</Link></div></main>;

  const view = resourceViews[searchParams.view];
  if (view && searchParams.item) {
    const items = (activeCourse[view.courseKey] || [])
      .map((id) => resources[view.collection].find((item) => String(item.id) === String(id)))
      .filter(Boolean);
    const item = items.find((candidate) => candidate.publicId === searchParams.item);
    if (!item) redirect(`/learn?course=${encodeURIComponent(activeCourse.publicId)}`);

    const currentIndex = items.findIndex((candidate) => String(candidate.id) === String(item.id));
    const completedNoteIds = new Set((activeCourse.noteProgress || []).filter((progress) => progress.completedAt).map((progress) => String(progress.noteId)));
    let firstIncompleteIndex = items.findIndex((candidate) => !completedNoteIds.has(String(candidate.id)));
    if (firstIncompleteIndex < 0) firstIncompleteIndex = items.length;
    if (currentIndex > firstIncompleteIndex) redirect(`/learn?course=${encodeURIComponent(activeCourse.publicId)}`);

    const sourceIds = new Set(linkedIds(relationships, item.id, "note", "source"));
    const sources = resources.sources.filter((source) => sourceIds.has(String(source.id)));
    return <>
      <FillStore user={user} groups={groups} relationships={relationships} {...resources} />
      <NoteReader
        note={item}
        activeCourse={{ id: activeCourse.id, publicId: activeCourse.publicId, name: activeCourse.name }}
        initialProgress={activeCourse.noteProgress?.find((progress) => String(progress.noteId) === String(item.id)) || null}
        courses={[activeCourse]}
        position={currentIndex + 1}
        totalNotes={items.length}
        previousNote={currentIndex > 0 ? items[currentIndex - 1] : null}
        nextNote={currentIndex < items.length - 1 ? items[currentIndex + 1] : null}
        sources={sources}
        userId={user.id}
      />
    </>;
  }

  return <>
    <FillStore user={user} groups={groups} relationships={relationships} {...resources} />
    <CourseDash course={activeCourse} courses={courses} resources={resources} relationships={relationships} isLogged canAccessContent embedded />
  </>;
}
