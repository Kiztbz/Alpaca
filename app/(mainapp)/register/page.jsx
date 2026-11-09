import { redirect } from "next/navigation";
import styles from "../Auth.module.css";
import { cookies } from "next/headers";
import { useUser } from "@/lib/auth";
import { UserInput } from "@client";
import Link from "next/link";
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
                <h2>Start your journey on Alpaca</h2>

                <UserInput isRegistering={true} courses={courses} />

                <div className={styles.other}>
                    Already have an acccount?{" "}
                    <Link
                        className="link"
                        href="/login"
                    >
                        Login here
                    </Link>
                </div>
            </section>
        </main>
    );
}
