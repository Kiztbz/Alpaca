import { getGroups, getPermittedResources, getRelationships } from "@/lib/db/helpers";
import { redirect } from "next/navigation";
import { CourseDash } from "./CourseDash";
import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/auth";
import { FillStore } from "@client";
import { expandCourseRelationships } from "@/lib/resourceRelations";

export default async function CoursePage(props) {
  const params = await props.params;
  const user = await getSessionUser((await cookies()).get("token")?.value);
  const name = decodeURIComponent(params.name);

  const [resources, relationships, groups] = await Promise.all([
    getPermittedResources({ userId: user?.id, takeAll: true }),
    getRelationships(),
    user ? getGroups(user.id) : Promise.resolve([]),
  ]);

  const course = resources.courses.find((x) => x.name === name);
  if (!course) return redirect("/courses");

  const expandedRelationships = expandCourseRelationships(relationships);

  const listName = {
    quiz: "quizzes",
    note: "notes",
    source: "sources",
    course: "courses",
  };

  expandedRelationships.forEach((rel) => {
    if (rel.A === course.id && rel.AType === "course") {
      const listType = listName[rel.BType];
      if (!course[listType]) course[listType] = [];
      course[listType].push(rel.B);
      return;
    }

    if (rel.B === course.id && rel.BType === "course") {
      const listType = listName[rel.AType];
      if (!course[listType]) course[listType] = [];
      course[listType].push(rel.A);
      return;
    }
  });

  return <>
    {user && <FillStore user={user} groups={groups} relationships={expandedRelationships} {...resources} />}
    <CourseDash course={course} isLogged={!!user} />
  </>;
}
