import { redirect } from "next/navigation";
import styles from "../Auth.module.css";
import { cookies } from "next/headers";
import { useUser } from "@/lib/auth";
import { UserInput } from "@client";
import Link from "next/link";
import Image from "next/image";
import { safeNextPath } from "@/lib/security";

export const metadata = {
    title: "Log in",
    description: "Log in to Alpaca",
    robots: { index: false, follow: false },
};

export default async function LoginPage(props) {
    const searchParams = await props.searchParams;
    const user = await useUser({ token: (await cookies()).get("token")?.value });

    if (user) {
        const { next } = searchParams;

        if (next) return redirect(safeNextPath(next));
        else return redirect("/learn");
    }

    return (
        <main className={styles.main}>
            <section className={styles.container}>
                <aside className={styles.welcome}>
                    <span className={styles.eyebrow}>Welcome back</span>
                    <h1>Keep your learning streak moving.</h1>
                    <p>Pick up exactly where you left off with your notes, practice, and progress together.</p>
                    <div className={styles.mascotWrap}>
                        <span className={styles.speech}>Ready for the next step?</span>
                        <Image src="/assets/images/llama-face-v2.png" alt="Alpaca mascot" width={1254} height={1254} priority />
                    </div>
                    <ul className={styles.perks}>
                        <li><span>✓</span> Continue your active course</li>
                        <li><span>⚡</span> Keep Daily Train on track</li>
                    </ul>
                </aside>
                <div className={styles.panel}>
                    <span className={styles.panelKicker}>Your Alpaca account</span>
                    <h2>Log in</h2>
                    <p className={styles.panelIntro}>Enter your details to continue learning.</p>
                    <UserInput isRegistering={false} />
                    <div className={styles.other}>
                        Don't have an account?{" "}<Link className="link" href="/register">Create one free</Link>
                    </div>
                </div>
            </section>
        </main>
    );
}
