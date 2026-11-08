import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/auth";
import { getPermittedResources } from "@/lib/db/helpers";
import { MarketplaceExperience } from "./MarketplaceExperience";

export const metadata = {
  title: "Course marketplace",
  description: "Explore Alpaca courses and try the interactive Alpaca demo.",
};

const demoFallback = {
  id: "alpaca-demo-preview",
  publicId: "ALPD01",
  name: "Alpaca demo",
  description: "A hands-on preview of lessons, daily practice, course switching, and progress tracking on Alpaca.",
  enrollment: "open",
  isDemo: true,
  notesTotal: 4,
  quizzesTotal: 3,
  level: 1,
};

export default async function MarketplacePage() {
  const user = await getSessionUser((await cookies()).get("token")?.value);
  const { courses = [] } = await getPermittedResources({ withCourses: true, userId: user?.id });
  const visibleCourses = courses.filter((course) => course.enrollment !== "private" && !course.isDeleted);
  const databaseDemo = visibleCourses.find((course) => course.publicId === "ALPD01" || course.name?.toLowerCase() === "alpaca demo");
  const demo = databaseDemo ? {
    ...databaseDemo,
    isDemo: true,
    notesTotal: Math.max(4, Number(databaseDemo.notesTotal || 0)),
    quizzesTotal: Math.max(3, Number(databaseDemo.quizzesTotal || 0)),
  } : demoFallback;
  const catalog = [
    demo,
    ...visibleCourses
      .filter((course) => String(course.id) !== String(databaseDemo?.id))
      .map((course) => ({ ...course, isDemo: false })),
  ];

  return <MarketplaceExperience courses={catalog} isLoggedIn={Boolean(user)} />;
}
