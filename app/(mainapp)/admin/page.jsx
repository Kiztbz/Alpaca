import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { sql } from "kysely";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db/db";
import CourseAdminManager from "./CourseAdminManager";
import styles from "./Superadmin.module.css";

export const metadata = { title: "Superadmin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function SuperadminPage() {
  const user = await getSessionUser((await cookies()).get("token")?.value);
  if (!user) redirect("/login?next=/admin");
  if (user.role !== "superadmin") redirect("/me/dashboard");

  const since = new Date(Date.now() - 30 * 86_400_000);
  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000);
  const [counts, traffic, weeklyTraffic, lifetimeTraffic, topPages, daily, courses, assignments, accounts, courseDetails, authAttempts, recentEvents] = await Promise.all([
    db.selectNoFrom([
      sql`(select count(*)::int from users where is_deleted = false)`.as("users"),
      sql`(select count(*)::int from courses where is_deleted = false)`.as("courses"),
      sql`(select count(*)::int from course_users where role = 'student')`.as("enrollments"),
      sql`(select (select count(*) from notes) + (select count(*) from quizzes) + (select count(*) from sources))::int`.as("content"),
      sql`(select count(*)::int from notes)`.as("notes"),
      sql`(select count(*)::int from quizzes)`.as("quizzes"),
      sql`(select count(*)::int from sources)`.as("sources"),
      sql`(select count(*)::int from groups)`.as("groups"),
      sql`(select count(*)::int from user_reports)`.as("reports"),
      sql`(select count(*)::int from error_logs)`.as("errors"),
    ]).executeTakeFirst(),
    db.selectFrom("analytics_events").select(({ fn }) => [
      fn.countAll().filterWhere("eventType", "=", "page_view").as("views"),
      fn.count("visitorHash").distinct().filterWhere("eventType", "=", "page_view").as("visitors"),
      fn.countAll().filterWhere("eventType", "=", "login").as("logins"),
      fn.countAll().filterWhere("eventType", "=", "registration").as("registrations"),
    ]).where("createdAt", ">=", since).executeTakeFirst(),
    trafficQuery(sevenDaysAgo),
    trafficQuery(null),
    db.selectFrom("analytics_events").select(["path", ({ fn }) => fn.countAll().as("views")])
      .where("eventType", "=", "page_view").where("createdAt", ">=", since).where("path", "is not", null)
      .groupBy("path").orderBy("views", "desc").limit(8).execute(),
    db.selectFrom("analytics_events").select([
      sql`date_trunc('day', created_at)::date`.as("day"),
      ({ fn }) => fn.countAll().as("views"),
    ]).where("eventType", "=", "page_view").where("createdAt", ">=", since)
      .groupBy(sql`date_trunc('day', created_at)::date`).orderBy("day", "asc").execute(),
    db.selectFrom("courses").select(["id", "name"]).where("isDeleted", "=", false).orderBy("name").execute(),
    db.selectFrom("course_users as cu").innerJoin("users as u", "u.id", "cu.userId").innerJoin("courses as c", "c.id", "cu.courseId")
      .select(["cu.courseId", "cu.userId", "u.username", "c.name as courseName"]).where("cu.role", "=", "admin").orderBy("c.name").execute(),
    db.selectFrom("users").select([
      "id", "publicId", "username", "displayName", "email", "role", "emailVerified", "twoFactorEnabled", "createdAt", "isDeleted",
      sql`jsonb_array_length(tokens)`.as("sessions"),
      sql`(select count(*)::int from course_users cu where cu.user_id = users.id and cu.role = 'student')`.as("enrollments"),
      sql`(select count(*)::int from course_users cu where cu.user_id = users.id and cu.role in ('owner','admin'))`.as("managedCourses"),
    ]).orderBy("createdAt", "desc").execute(),
    db.selectFrom("courses as c").innerJoin("users as u", "u.id", "c.createdBy").select([
      "c.id", "c.publicId", "c.name", "c.enrollment", "c.createdAt", "c.isDeleted", "u.username as owner",
      sql`(select count(*)::int from course_users cu where cu.course_id = c.id and cu.role = 'student')`.as("students"),
      sql`(select count(*)::int from course_users cu where cu.course_id = c.id and cu.role = 'admin')`.as("admins"),
      sql`(select count(*)::int from resource_relations rr where rr.b = c.id and rr.b_type = 'course')`.as("resources"),
    ]).orderBy("c.createdAt", "desc").execute(),
    db.selectFrom("auth_attempts").select(["action", "succeeded", ({ fn }) => fn.countAll().as("attempts")])
      .where("createdAt", ">=", since).groupBy(["action", "succeeded"]).orderBy("attempts", "desc").execute(),
    db.selectFrom("analytics_events as ae").leftJoin("users as u", "u.id", "ae.userId")
      .select(["ae.eventType", "ae.path", "ae.createdAt", "u.username"]).orderBy("ae.createdAt", "desc").limit(30).execute(),
  ]);

  const maxViews = Math.max(1, ...daily.map((row) => Number(row.views)));
  return <main className={styles.main}>
    <header className={styles.hero}><span>Control center</span><h1>Superadmin panel</h1><p>Site traffic, product health, and course administration in one place.</p></header>

    <section className={styles.cards} aria-label="Application totals">
      <Metric label="Accounts" value={counts.users} />
      <Metric label="Courses" value={counts.courses} />
      <Metric label="Enrollments" value={counts.enrollments} />
      <Metric label="Content items" value={counts.content} />
    </section>

    <section className={styles.cards} aria-label="Content and operations totals">
      <Metric label="Notes" value={counts.notes} /><Metric label="Quizzes" value={counts.quizzes} /><Metric label="Sources" value={counts.sources} /><Metric label="Groups" value={counts.groups} />
      <Metric label="Reports" value={counts.reports} /><Metric label="Logged errors" value={counts.errors} /><Metric label="7-day views" value={weeklyTraffic.views} /><Metric label="Lifetime views" value={lifetimeTraffic.views} />
    </section>

    <section className={styles.grid}>
      <article className={styles.panel}><header><div><span>Last 30 days</span><h2>Traffic</h2></div></header>
        <div className={styles.trafficTotals}><Metric label="Page views" value={traffic.views} /><Metric label="Unique visitors" value={traffic.visitors} /><Metric label="Logins" value={traffic.logins} /><Metric label="Sign-ups" value={traffic.registrations} /></div>
        <div className={styles.chart} aria-label="Daily page views">{daily.map((row) => <div key={String(row.day)} title={`${new Date(row.day).toLocaleDateString()}: ${row.views} views`}><i style={{ height: `${Math.max(4, Number(row.views) / maxViews * 100)}%` }} /></div>)}</div>
      </article>
      <article className={styles.panel}><header><div><span>Last 30 days</span><h2>Top pages</h2></div></header>
        <ol className={styles.topPages}>{topPages.map((row) => <li key={row.path}><span>{row.path}</span><strong>{row.views}</strong></li>)}{!topPages.length && <li>No traffic recorded yet.</li>}</ol>
      </article>
    </section>

    <section className={styles.grid}>
      <article className={styles.panel}><header><div><span>Authentication</span><h2>Login and account activity</h2></div></header>
        <div className={styles.statList}>{authAttempts.map((row) => <div key={`${row.action}-${row.succeeded}`}><span>{row.action.replaceAll("_", " ")} · {row.succeeded ? "successful" : "blocked/failed"}</span><strong>{row.attempts}</strong></div>)}{!authAttempts.length && <p>No authentication activity recorded.</p>}</div>
      </article>
      <article className={styles.panel}><header><div><span>Traffic scope</span><h2>Audience totals</h2></div></header>
        <div className={styles.statList}><div><span>7-day unique visitors</span><strong>{weeklyTraffic.visitors}</strong></div><div><span>30-day unique visitors</span><strong>{traffic.visitors}</strong></div><div><span>Lifetime unique visitors</span><strong>{lifetimeTraffic.visitors}</strong></div><div><span>Lifetime registrations</span><strong>{lifetimeTraffic.registrations}</strong></div></div>
      </article>
    </section>

    <section className={styles.panel}><header><div><span>Complete directory</span><h2>Accounts</h2></div><p>{accounts.length} total accounts, including status, security, sessions, and course access.</p></header>
      <div className={styles.tableWrap}><table><thead><tr><th>Account</th><th>Role</th><th>Email</th><th>Verified</th><th>2FA</th><th>Sessions</th><th>Enrollments</th><th>Manages</th><th>Created</th></tr></thead><tbody>{accounts.map((account) => <tr key={account.id}><td><strong>{account.displayName || account.username}</strong><small>@{account.username} · {account.publicId} · #{account.id}{account.isDeleted ? " · deleted" : ""}</small></td><td>{account.role}</td><td>{account.email || "—"}</td><td>{account.emailVerified ? "Yes" : "No"}</td><td>{account.twoFactorEnabled ? "On" : "Off"}</td><td>{account.sessions}</td><td>{account.enrollments}</td><td>{account.managedCourses}</td><td>{new Date(account.createdAt).toLocaleDateString()}</td></tr>)}</tbody></table></div>
    </section>

    <section className={styles.panel}><header><div><span>Complete catalog</span><h2>Courses</h2></div><p>Ownership, monetization, administrators, learners, and attached content.</p></header>
      <div className={styles.tableWrap}><table><thead><tr><th>Course</th><th>Owner</th><th>Access</th><th>Admins</th><th>Students</th><th>Resources</th><th>Created</th></tr></thead><tbody>{courseDetails.map((course) => <tr key={course.id}><td><strong>{course.name}</strong><small>{course.publicId} · #{course.id}{course.isDeleted ? " · deleted" : ""}</small></td><td>@{course.owner}</td><td>{course.enrollment}</td><td>{course.admins}</td><td>{course.students}</td><td>{course.resources}</td><td>{new Date(course.createdAt).toLocaleDateString()}</td></tr>)}</tbody></table></div>
    </section>

    <section className={styles.panel}><header><div><span>Live audit feed</span><h2>Recent app events</h2></div></header>
      <div className={styles.eventList}>{recentEvents.map((event, index) => <div key={`${event.createdAt}-${index}`}><span>{event.eventType.replaceAll("_", " ")}</span><strong>{event.username ? `@${event.username}` : "Anonymous"}</strong><code>{event.path || "—"}</code><time>{new Date(event.createdAt).toLocaleString()}</time></div>)}{!recentEvents.length && <p>No events recorded yet.</p>}</div>
    </section>

    <section className={styles.panel}><header><div><span>Delegated access</span><h2>Course administrators</h2></div><p>Course admins can edit the selected course and all content attached to it.</p></header>
      <CourseAdminManager courses={courses} initialAssignments={assignments} />
    </section>
  </main>;
}

function Metric({ label, value }) {
  return <div className={styles.metric}><strong>{Number(value || 0).toLocaleString()}</strong><span>{label}</span></div>;
}

function trafficQuery(since) {
  let query = db.selectFrom("analytics_events").select(({ fn }) => [
    fn.countAll().filterWhere("eventType", "=", "page_view").as("views"),
    fn.count("visitorHash").distinct().filterWhere("eventType", "=", "page_view").as("visitors"),
    fn.countAll().filterWhere("eventType", "=", "login").as("logins"),
    fn.countAll().filterWhere("eventType", "=", "registration").as("registrations"),
  ]);
  if (since) query = query.where("createdAt", ">=", since);
  return query.executeTakeFirst();
}
