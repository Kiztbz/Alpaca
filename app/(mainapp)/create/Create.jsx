"use client";

import { NoteInput, QuizInput, SourceInput, CourseInput } from "@client";
import { useEffect, useState } from "react";
import styles from "./Create.module.css";
import InputDefaults from "./inputDefaults";

export default function Create({ initialTab }) {
    const [tab, setTab] = useState(initialTab || "Note");

    const tabs = {
        Note: <NoteInput />,
        Quiz: <QuizInput />,
        Source: <SourceInput />,
        Course: <CourseInput />,
    };

    useEffect(() => {
        if (typeof window !== undefined) {
            setTab(initialTab || localStorage.getItem("createTab") || "Note");
        }
    }, [initialTab]);

    return (
        <main className={styles.main}>
            <header className={styles.header}>
                <div><span>Workspace</span><h1>Create</h1><p>Add a learning building block and connect it to the rest of your library.</p></div>
                <InputDefaults />
            </header>
            <nav>
                <div className={styles.tabs}>
                    <ol>
                        {["Note", "Quiz", "Source", "Course"].map((tabName) => (
                            <li
                                tabIndex={0}
                                key={tabName}
                                onClick={() => {
                                    setTab(tabName);
                                    localStorage.setItem("createTab", tabName);
                                }}
                                className={tab === tabName ? styles.active : ""}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        setTab(tabName);
                                        localStorage.setItem("createTab", tabName);
                                    }
                                }}
                            >
                                {tabName}
                            </li>
                        ))}
                    </ol>
                </div>
            </nav>

            <section className={styles.content}>
                <div>{tabs[tab]}</div>
            </section>
        </main>
    );
}
