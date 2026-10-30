import styles from "./MasoneryList.module.css";

export function MasoneryList({ children, dash = false, dash2 = false }) {
    const variant = dash ? styles.dash : dash2 ? styles.dash2 : "";

    return <ul className={`${styles.grid} ${variant}`}>{children}</ul>;
}
