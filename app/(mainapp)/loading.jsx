import styles from "./Loading.module.css";

export default function Loading() {
    return (
        <main className={styles.shell} aria-label="Loading page" aria-busy="true">
            <span className={styles.srOnly}>Loading your learning path…</span>
            <div className={styles.heading} />
            <div className={styles.line} />
            <div className={styles.timeline} aria-hidden="true">
                {Array.from({ length: 5 }, (_, index) => <div className={styles.step} key={index} style={{ "--delay": `${index * 80}ms` }}><i /><span /></div>)}
            </div>
        </main>
    );
}
