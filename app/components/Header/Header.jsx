"use client";

import { RightContainer } from "@client";
import styles from "./Header.module.css";
import { DynamicNav } from "@server";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Header({ user }) {
    const pathname = usePathname();
    if (pathname === "/") return null;
    return (
        <div className={styles.header}>
            <header>
                <div>
                    <Link
                        className={styles.link}
                        href="/"
                    >
                        Alpaca
                    </Link>
                </div>

                <DynamicNav user={user} />

                <RightContainer user={user} />
            </header>
        </div>
    );
}
