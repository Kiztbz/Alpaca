import { absoluteUrl } from "@/lib/metadatas";
import { getPermittedResources } from "@/lib/db/helpers";

export const dynamic = "force-dynamic";

export default async function sitemap() {
    const staticPages = [
        ["/", 1, "weekly"], ["/courses", 0.9, "daily"],
        ["/notes", 0.7, "daily"], ["/quizzes", 0.7, "daily"],
        ["/sources", 0.7, "daily"], ["/about", 0.5, "monthly"],
    ].map(([path, priority, changeFrequency]) => ({
        url: absoluteUrl(path), changeFrequency, priority,
    }));

    try {
        const { courses } = await getPermittedResources({ withCourses: true });
        const coursePages = courses
          .filter((course) => course.enrollment !== "private")
          .map((course) => ({
            url: absoluteUrl(`/courses/${encodeURIComponent(course.name)}`),
            ...(course.updatedAt || course.createdAt ? { lastModified: course.updatedAt || course.createdAt } : {}),
            changeFrequency: "weekly",
            priority: 0.8,
          }));
        return [...staticPages, ...coursePages];
    } catch {
        return staticPages;
    }
}
