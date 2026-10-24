import { getPermittedResources, getRelationships } from "@/lib/db/helpers";
import { CardDescription, QuizDisplay } from "@/app/components/client";
import styles from "./ResourceDetail.module.css";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/auth";
import Link from "next/link";
import { NoteReader } from "@/app/components/Note/NoteReader";
import { expandCourseRelationships } from "@/lib/resourceRelations";

const resourceConfig = {
    sources: { singular: "source", label: "Source", title: (item) => item.title },
    notes: { singular: "note", label: "Note", title: (item) => item.title },
    quizzes: { singular: "quiz", label: "Quiz", title: (item) => item.prompt },
    courses: { singular: "course", label: "Course", title: (item) => item.name },
};

const pluralByType = { source: "sources", note: "notes", quiz: "quizzes", course: "courses" };

function relationValue(relation, key) {
    return relation[key] ?? relation[key.charAt(0).toLowerCase() + key.slice(1)];
}

function otherEnd(relation, id, type) {
    const a = relationValue(relation, "A");
    const b = relationValue(relation, "B");
    const aType = relationValue(relation, "AType");
    const bType = relationValue(relation, "BType");

    if (String(a) === String(id) && aType === type) return { id: b, type: bType };
    if (String(b) === String(id) && bType === type) return { id: a, type: aType };
    return null;
}

function itemTitle(type, item) {
    return resourceConfig[pluralByType[type]]?.title(item) || "Untitled resource";
}

function stripHtml(value = "") {
    return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export default async function ResourceDetailPage(props) {
    const params = await props.params;
    const searchParams = await props.searchParams;
    const { resource, id } = params;
    const config = resourceConfig[resource];

    if (!config) redirect("/");

    const user = await getSessionUser((await cookies()).get("token")?.value);
    if (!user) redirect(`/login?next=/${resource}/${id}`);

    const [resourcesObject, rawRelationships] = await Promise.all([
        getPermittedResources({ userId: user.id, takeAll: true }),
        getRelationships(),
    ]);
    const relationships = expandCourseRelationships(rawRelationships);

    const res = resourcesObject[resource]?.find((item) => item.publicId === id);
    if (!res) redirect(`/${resource}`);

    // Relationships do not store an explicit position yet, so resources use
    // their creation date as a stable course order.
    const courseIds = relationships
        .map((relationship) => otherEnd(relationship, res.id, config.singular))
        .filter((end) => end?.type === "course")
        .map((end) => String(end.id));

    const courses = resourcesObject.courses
        .filter((course) => courseIds.includes(String(course.id)))
        .sort((a, b) => a.name.localeCompare(b.name));

    const requestedCourse = searchParams.course;
    const activeCourse = courses.find((course) =>
        course.publicId === requestedCourse || course.name === requestedCourse || String(course.id) === String(requestedCourse)
    ) || courses[0];

    const courseResourceIds = activeCourse
        ? relationships
              .map((relationship) => otherEnd(relationship, activeCourse.id, "course"))
              .filter((end) => end?.type === config.singular)
              .map((end) => String(end.id))
        : [];

    const sequence = resourcesObject[resource]
        .filter((item) => !activeCourse || courseResourceIds.includes(String(item.id)))
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    const currentIndex = sequence.findIndex((item) => item.id === res.id);
    const previous = currentIndex > 0 ? sequence[currentIndex - 1] : null;
    const next = currentIndex >= 0 && currentIndex < sequence.length - 1 ? sequence[currentIndex + 1] : null;
    const courseQuery = activeCourse ? `?course=${encodeURIComponent(activeCourse.publicId)}` : "";

    const related = relationships
        .map((relationship) => otherEnd(relationship, res.id, config.singular))
        .filter((end) => end && end.type !== "course")
        .map((end) => {
            const plural = pluralByType[end.type];
            const item = resourcesObject[plural]?.find((candidate) => String(candidate.id) === String(end.id));
            return item ? { ...item, resource: plural, type: end.type } : null;
        })
        .filter(Boolean)
        .filter((item, index, items) => items.findIndex((candidate) => candidate.resource === item.resource && candidate.id === item.id) === index)
        .slice(0, 8);

    const tags = Array.isArray(res.tags) ? res.tags : [];
    const wordCount = resource === "notes" ? stripHtml(res.text).split(" ").filter(Boolean).length : 0;
    const readingMinutes = Math.max(1, Math.ceil(wordCount / 220));
    const title = config.title(res);

    if (resource === "notes") {
        return (
            <NoteReader
                note={{
                    id: res.id,
                    publicId: res.publicId,
                    title: res.title,
                    text: res.text,
                    tags: res.tags,
                    creator: res.creator ? { username: res.creator.username } : null,
                }}
                activeCourse={activeCourse ? { id: activeCourse.id, publicId: activeCourse.publicId, name: activeCourse.name } : null}
                courses={courses.map((course) => ({ id: course.id, publicId: course.publicId, name: course.name }))}
                position={currentIndex + 1}
                totalNotes={sequence.length}
                previousNote={previous ? { publicId: previous.publicId, title: previous.title } : null}
                nextNote={next ? { publicId: next.publicId, title: next.title } : null}
                related={related.map((item) => ({
                    id: item.id,
                    publicId: item.publicId,
                    resource: item.resource,
                    title: itemTitle(item.type, item),
                }))}
            />
        );
    }

    return (
        <main className={styles.page}>
            <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
                <Link href={`/${resource}`}>{resource}</Link><span>/</span><span aria-current="page">{title}</span>
            </nav>

            <header className={styles.hero}>
                <div className={styles.heroCopy}>
                    <div className={styles.eyebrowRow}>
                        <span className={styles.type}>{config.label}</span>
                        {activeCourse && <span className={styles.context}>In {activeCourse.name}</span>}
                    </div>
                    <h1>{title}</h1>
                    <p>{res.creator ? `Created by ${res.creator.username}` : "Shared learning resource"}{res.createdAt && ` · ${new Date(res.createdAt).toLocaleDateString()}`}</p>
                </div>
                <div className={styles.heroActions}>
                    {resource === "sources" && res.url && <a className="button primary" href={res.url} target="_blank" rel="noopener noreferrer">Open source ↗</a>}
                    {activeCourse && <Link className="button" href={`/courses/${encodeURIComponent(activeCourse.name)}`}>View course</Link>}
                    <Link className="button" href={`/${resource}`}>All {resource}</Link>
                </div>
            </header>

            <div className={styles.layout}>
                <article className={styles.content}>
                    {resource === "notes" && <>
                        <div className={styles.contentHeading}>
                            <div><span>Reading time</span><strong>{readingMinutes} min</strong></div>
                            <div><span>Words</span><strong>{wordCount}</strong></div>
                        </div>
                        <div className={styles.noteBody}><CardDescription setInnerHtml>{res.text}</CardDescription></div>
                    </>}

                    {resource === "sources" && <div className={styles.sourceBody}>
                        <div className={styles.sourceLead}><span>{res.medium || "source"}</span><h2>{res.title}</h2><p>Use this source as the reference point for connected notes and practice questions.</p></div>
                        <dl className={styles.metadataGrid}>
                            <div><dt>Medium</dt><dd>{res.medium || "Not specified"}</dd></div>
                            <div><dt>Published</dt><dd>{res.publishedAt ? new Date(res.publishedAt).toLocaleDateString() : "Not specified"}</dd></div>
                            <div><dt>Last accessed</dt><dd>{res.lastAccessed ? new Date(res.lastAccessed).toLocaleDateString() : "Not recorded"}</dd></div>
                            <div><dt>Credits</dt><dd>{res.credits?.length ? res.credits.join(", ") : "None listed"}</dd></div>
                        </dl>
                    </div>}

                    {resource === "quizzes" && <div className={styles.quizBody}>
                        <div className={styles.sectionIntro}><span>Practice</span><h2>Test your recall</h2><p>Answer the question, review the feedback, then continue through this course.</p></div>
                        <QuizDisplay quiz={res} canEditDelete showDetailLink={false} />
                    </div>}

                    {resource === "courses" && <div className={styles.sourceBody}><div className={styles.sourceLead}><span>Course overview</span><h2>{res.name}</h2><p>{res.description || "No course description has been added yet."}</p></div></div>}

                    <nav className={styles.sequenceNav} aria-label={`${config.label} navigation`}>
                        {previous ? <Link href={`/${resource}/${previous.publicId}${courseQuery}`}><span>← Previous {config.singular}</span><strong>{config.title(previous)}</strong></Link> : <div className={styles.disabledNav}><span>Start of {activeCourse ? "course" : resource}</span><strong>No previous {config.singular}</strong></div>}
                        {next ? <Link href={`/${resource}/${next.publicId}${courseQuery}`}><span>Next {config.singular} →</span><strong>{config.title(next)}</strong></Link> : <div className={styles.disabledNav}><span>End of {activeCourse ? "course" : resource}</span><strong>No next {config.singular}</strong></div>}
                    </nav>
                </article>

                <aside className={styles.sidebar}>
                    {courses.length > 0 && <section className={styles.sideSection}>
                        <div className={styles.sideHeading}><span>Course context</span><strong>{currentIndex + 1} of {sequence.length}</strong></div>
                        <div className={styles.courseList}>{courses.map((course) => <Link key={course.id} className={course.id === activeCourse?.id ? styles.activeCourse : ""} href={`/${resource}/${res.publicId}?course=${encodeURIComponent(course.publicId)}`}><span>{course.name}</span><small>{course.id === activeCourse?.id ? "Browsing" : "Switch"}</small></Link>)}</div>
                    </section>}

                    {tags.length > 0 && <section className={styles.sideSection}>
                        <div className={styles.sideHeading}><span>Tags</span><strong>{tags.length}</strong></div>
                        <div className={styles.tags}>{tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
                    </section>}

                    <section className={styles.sideSection}>
                        <div className={styles.sideHeading}><span>Related resources</span><strong>{related.length}</strong></div>
                        {related.length ? <div className={styles.relatedList}>{related.map((item) => <Link key={`${item.resource}-${item.id}`} href={`/${item.resource}/${item.publicId}`}><span>{resourceConfig[item.resource].label}</span><strong>{itemTitle(item.type, item)}</strong></Link>)}</div> : <p className={styles.empty}>No directly related resources yet.</p>}
                    </section>
                </aside>
            </div>
        </main>
    );
}
