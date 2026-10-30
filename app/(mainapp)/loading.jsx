import styles from "./Loading.module.css";

export default function Loading() {
    return (
        <main className={styles.shell} aria-label="Loading page" aria-busy="true">
            <div className={styles.heading} />
            <div className={styles.line} />
            <div className={styles.cards}>
                <div className={styles.card} />
                <div className={styles.card} />
                <div className={styles.card} />
            </div>
        </main>
    );
}
