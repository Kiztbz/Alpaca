import { getGroups, getPermittedResources, getRelationships } from "@/lib/db/helpers";
import { redirect } from "next/navigation";
import { CourseDash } from "./CourseDash";
import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/auth";
import { FillStore } from "@client";
import { expandCourseRelationships } from "@/lib/resourceRelations";
import { hasCourseContentAccess } from "@/lib/courseAccess";
import { absoluteUrl, pageMetadata, siteConfig } from "@/lib/metadatas";

async function getPublicCourse(name) {
  const { courses } = await getPermittedResources({ withCourses: true });
  return courses.find((course) => course.name === name && course.enrollment !== "private");
}

export async function generateMetadata(props) {
  const params = await props.params;
  const name = decodeURIComponent(params.name);
  const course = await getPublicCourse(name);

  if (!course) {
    return pageMetadata({
      title: "Course",
      description: "Explore courses on Alpaca.",
      path: `/courses/${encodeURIComponent(name)}`,
      index: false,
    });
  }

  return pageMetadata({
    title: course.name,
    description: course.description || `Learn ${course.name} through connected notes, sources, and active-recall quizzes.`,
    path: `/courses/${encodeURIComponent(course.name)}`,
  });
}

function CourseStructuredData({ course }) {
  if (course.enrollment === "private") return null;

  const courseUrl = absoluteUrl(`/courses/${encodeURIComponent(course.name)}`);
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Course",
        "@id": `${courseUrl}#course`,
        name: course.name,
        description: course.description || `Learn ${course.name} on Alpaca.`,
        url: courseUrl,
        provider: {
          "@type": "Organization",
          name: siteConfig.legalName,
          url: absoluteUrl("/"),
        },
        educationalLevel: `Level ${course.level || 0}`,
        isAccessibleForFree: course.enrollment !== "paid",
        offers: {
          "@type": "Offer",
          category: course.enrollment === "paid" ? "Paid" : "Free",
          price: course.enrollment === "paid" ? "49.00" : "0",
          priceCurrency: "USD",
          availability: "https://schema.org/InStock",
          url: courseUrl,
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Courses", item: absoluteUrl("/courses") },
          { "@type": "ListItem", position: 2, name: course.name, item: courseUrl },
        ],
      },
    ],
  };

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

export default async function CoursePage(props) {
  const params = await props.params;
  const user = await getSessionUser((await cookies()).get("token")?.value);
  const name = decodeURIComponent(params.name);

  const [resources, relationships, groups] = await Promise.all([
    getPermittedResources({ userId: user?.id, userRole: user?.role, takeAll: true }),
    getRelationships(),
    user ? getGroups(user.id) : Promise.resolve([]),
  ]);

  const course = resources.courses.find((x) => x.name === name);
  if (!course) return redirect("/marketplace");

  const canAccessContent = hasCourseContentAccess(course, user?.id);

  if (!canAccessContent) {
    const lockedCourse = {
      ...course,
      notes: [],
      quizzes: [],
      sources: [],
    };

    return <>
      <CourseStructuredData course={course} />
      {user && <FillStore user={user} groups={groups} />}
      <CourseDash course={lockedCourse} resources={resources} relationships={relationships} isLogged={!!user} canAccessContent={false} />
    </>;
  }

  const expandedRelationships = expandCourseRelationships(relationships);

  const listName = {
    quiz: "quizzes",
    note: "notes",
    source: "sources",
    course: "courses",
  };

  expandedRelationships.forEach((rel) => {
    if (String(rel.A) === String(course.id) && rel.AType === "course") {
      const listType = listName[rel.BType];
      if (!course[listType]) course[listType] = [];
      course[listType].push(rel.B);
      return;
    }

    if (String(rel.B) === String(course.id) && rel.BType === "course") {
      const listType = listName[rel.AType];
      if (!course[listType]) course[listType] = [];
      course[listType].push(rel.A);
      return;
    }
  });

  const createdAt = (type, id) => new Date(resources[type].find((item) => String(item.id) === String(id))?.createdAt || 0).getTime();
  course.notes?.sort((a, b) => createdAt("notes", a) - createdAt("notes", b));
  course.quizzes?.sort((a, b) => createdAt("quizzes", a) - createdAt("quizzes", b));
  course.sources?.sort((a, b) => createdAt("sources", a) - createdAt("sources", b));

  return <>
    <CourseStructuredData course={course} />
    {user && <FillStore user={user} groups={groups} relationships={expandedRelationships} {...resources} />}
    <CourseDash course={course} resources={resources} relationships={expandedRelationships} isLogged={!!user} canAccessContent />
  </>;
}
