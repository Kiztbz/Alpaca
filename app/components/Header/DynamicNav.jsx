import styles from "./DynamicNav.module.css";
import { links } from "@/lib/nav";
import Link from "next/link";

export function DynamicNav({ user }) {
    const list = links.filter((link) => {
        if (link.auth) return user;
        return true;
    });

    return (
        <nav className={styles.nav}>
            <ul>
                {list.map((link) => (
                    <li key={link.name} className={link.children ? styles.hasMenu : ""}>
                        <Link href={link.href}>{link.name}</Link>
                        {link.children && <div className={styles.createMenu}>
                            <span>Create new</span>
                            {link.children.map((child) => <Link key={child.name} href={child.href}>
                                <b>{child.name}</b><small>{child.description}</small>
                            </Link>)}
                        </div>}
                    </li>
                ))}
            </ul>
        </nav>
    );
}
