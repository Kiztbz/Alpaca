import { db } from "@/lib/db/db";
import { getPermittedResources, getRelationships } from "@/lib/db/helpers";
import { expandCourseRelationships } from "@/lib/resourceRelations";

export async function getEnrolledLearningData(userId) {
  const memberships = await db.selectFrom("course_users").select("courseId")
    .where("userId", "=", userId).where("role", "=", "student").execute();
  const enrolledIds = new Set(memberships.map((row) => String(row.courseId)));
  const [resources, rawRelationships] = await Promise.all([
    getPermittedResources({ userId, takeAll: true }),
    getRelationships(),
  ]);
  const relationships = expandCourseRelationships(rawRelationships);
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
  });

  return { resources: { ...resources, courses }, relationships, courses };
}

export function selectEnrolledCourse(courses, requested) {
  return courses.find((course) => [course.publicId, course.name, String(course.id)].includes(String(requested))) || courses[0] || null;
}
