import { redirect } from "next/navigation";
import styles from "../Auth.module.css";
import { cookies } from "next/headers";
import { useUser } from "@/lib/auth";
import { UserInput } from "@client";
import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/db/db";

export const metadata = {
    title: "Sign up",
    description: "Create an Alpaca account",
    robots: { index: false, follow: false },
};

export default async function RegisterPage() {
    const user = await useUser({ token: (await cookies()).get("token")?.value });
    if (user) return redirect(`/learn`);

    const courses = await db.selectFrom("courses").select(["id", "name", "description", "isDemo"])
        .where("enrollment", "=", "open").where("isDeleted", "=", false).orderBy("isDemo", "desc").orderBy("name").execute();

    return (
        <main className={styles.main}>
            <section className={styles.container}>
                <aside className={styles.welcome}>
                    <span className={styles.eyebrow}>Start free</span>
                    <h1>Build skills one friendly step at a time.</h1>
                    <p>Choose your first course now. Alpaca will turn it into a clear path of notes and daily practice.</p>
                    <div className={styles.mascotWrap}>
                        <span className={styles.speech}>Your path starts here!</span>
                        <Image src="/assets/images/llama-face-v2.png" alt="Alpaca mascot" width={1254} height={1254} priority />
                    </div>
                    <ul className={styles.perks}>
                        <li><span>✓</span> Learn in focused notes</li>
                        <li><span>⚡</span> Remember with daily practice</li>
                    </ul>
                </aside>
                <div className={styles.panel}>
                    <span className={styles.panelKicker}>Join Alpaca</span>
                    <h2>Create your account</h2>
                    <p className={styles.panelIntro}>Choose a course and start learning right away.</p>
                    <UserInput isRegistering={true} courses={courses} />
                    <div className={styles.other}>
                        Already have an account?{" "}<Link className="link" href="/login">Log in</Link>
                    </div>
                </div>
            </section>
        </main>
    );
}
