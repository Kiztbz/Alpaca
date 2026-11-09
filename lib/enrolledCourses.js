import { db } from "@/lib/db/db";
import { getPermittedResources, getRelationships } from "@/lib/db/helpers";
import { expandCourseRelationships } from "@/lib/resourceRelations";

export async function getEnrolledLearningData(userId, userRole) {
  const [memberships, rawRelationships] = await Promise.all([
    db.selectFrom("course_users").select("courseId")
      .where("userId", "=", userId).where("role", "=", "student").execute(),
    getRelationships(),
  ]);
  const enrolledIds = new Set(memberships.map((row) => String(row.courseId)));
  const relationships = expandCourseRelationships(rawRelationships);
  const linkedIds = { source: new Set(), note: new Set(), quiz: new Set() };

  relationships.forEach((relation) => {
    if (relation.AType === "course" && enrolledIds.has(String(relation.A)) && linkedIds[relation.BType]) {
      linkedIds[relation.BType].add(relation.B);
    } else if (relation.BType === "course" && enrolledIds.has(String(relation.B)) && linkedIds[relation.AType]) {
      linkedIds[relation.AType].add(relation.A);
    }
  });

  // A non-matching sentinel keeps empty collections empty instead of falling
  // back to the helper's unfiltered behavior.
  const valuesOrNone = (set) => set.size ? [...set] : [-1];
  const resources = await getPermittedResources({
    userId,
    userRole,
    withSources: true,
    sourceIds: valuesOrNone(linkedIds.source),
    withNotes: true,
    noteIds: valuesOrNone(linkedIds.note),
    withQuizzes: true,
    quizIds: valuesOrNone(linkedIds.quiz),
    withCourses: true,
    courseIds: memberships.length ? memberships.map((row) => row.courseId) : [-1],
  });
  const courses = resources.courses.filter((course) => enrolledIds.has(String(course.id)));
  const listName = { quiz: "quizzes", note: "notes", source: "sources", course: "courses" };

  courses.forEach((course) => {
    course.notes = [];
    course.quizzes = [];
    course.sources = [];
    relationships.forEach((relation) => {
      if (String(relation.A) === String(course.id) && relation.AType === "course" && listName[relation.BType]) {
        course[listName[relation.BType]].push(relation.B);
      } else if (String(relation.B) === String(course.id) && relation.BType === "course" && listName[relation.AType]) {
        course[listName[relation.AType]].push(relation.A);
      }
    });
    const createdAt = (type, id) => new Date(resources[type].find((item) => String(item.id) === String(id))?.createdAt || 0).getTime();
    course.notes.sort((a, b) => createdAt("notes", a) - createdAt("notes", b));
    course.quizzes.sort((a, b) => createdAt("quizzes", a) - createdAt("quizzes", b));
    course.sources.sort((a, b) => createdAt("sources", a) - createdAt("sources", b));
  });

  return { resources: { ...resources, courses }, relationships, courses };
}

export function selectEnrolledCourse(courses, requested) {
  return courses.find((course) => [course.publicId, course.name, String(course.id)].includes(String(requested))) || courses[0] || null;
}
