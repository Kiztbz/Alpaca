import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db/db";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import PrintCertificate from "./PrintCertificate";
import styles from "./Certificate.module.css";

export default async function CertificatePage(props) {
  const { id } = await props.params;
  const user = await getSessionUser((await cookies()).get("token")?.value);
  if (!user) redirect(`/login?next=/certificates/${id}`);

  const certificate = await db
    .selectFrom("course_certificates as cc")
    .innerJoin("courses as c", "c.id", "cc.courseId")
    .innerJoin("users as u", "u.id", "cc.userId")
    .select(["cc.publicId", "cc.issuedAt", "cc.userId", "c.name as courseName", "c.publicId as coursePublicId", "u.displayName", "u.username"])
    .where("cc.publicId", "=", id)
    .executeTakeFirst();

  if (!certificate || String(certificate.userId) !== String(user.id)) redirect("/me/dashboard");

  return <main className={styles.page}>
    <nav><Link href={`/courses/${encodeURIComponent(certificate.courseName)}`}>← Back to course</Link><PrintCertificate /></nav>
    <article className={styles.certificate}>
      <div className={styles.corner}>A</div>
      <span className={styles.eyebrow}>Certificate of completion</span>
      <h1>Alpaca Learning</h1>
      <p>This certifies that</p>
      <h2>{certificate.displayName || certificate.username}</h2>
      <p>has successfully completed</p>
      <h3>{certificate.courseName}</h3>
      <div className={styles.rule} />
      <footer>
        <div><span>Issued</span><strong>{new Date(certificate.issuedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</strong></div>
        <div><span>Certificate ID</span><strong>{certificate.publicId}</strong></div>
      </footer>
    </article>
  </main>;
}
