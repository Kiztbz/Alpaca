"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@client";
import { useEffect, useRef } from "react";
import styles from "./Card.module.css";
import hljs from "highlight.js";
import Link from "next/link";

export function Card({ link, darker, border, lighter, fullWidth, hideAnimatedBorder, ...props }) {
    // Link is external if it starts with http
    const isExternalLink = link && link.startsWith("http");
    const bg = darker ? "var(--bg-1)" : lighter ? "var(--bg-3)" : "";

    if (link) {
        return (
            <Link
                href={link}
                className={`${styles.container} ${lighter ? styles.lighter : ""} ${
                    darker ? styles.darker : ""
                }`}
                style={{
                    width: fullWidth ? "100%" : "",
                    backgroundColor: bg,
                    borderColor: border || "",
                }}
                target={isExternalLink ? "_blank" : "_self"}
                rel={isExternalLink ? "noopener noreferrer" : ""}
                {...props}
            >
                {props.children}
            </Link>
        );
    }

    return (
        <div
            style={{
                width: fullWidth ? "100%" : "",
                backgroundColor: bg,
                borderColor: border || "",
            }}
            className={`${styles.container} ${lighter ? styles.lighter : ""} ${
                darker ? styles.darker : ""
            }`}
            {...props}
        >
            {props.children}
        </div>
    );
}

export function CardList({ orderded = false, children }) {
    if (orderded) {
        return <ol className={styles.list}>{children}</ol>;
    }

    return <ul className={styles.list}>{children}</ul>;
}

export function CardListItem({ children }) {
    return <li className={styles.listItem}>{children}</li>;
}

export function CardChip({ children }) {
    return <span className={styles.chip}>{children}</span>;
}

export function CardButtons({ children }) {
    return <section className={styles.buttons}>{children}</section>;
}

export function CardDescription({ children, setInnerHtml = false }) {
    if (setInnerHtml) {
        return <CardDescriptionHTML>{children}</CardDescriptionHTML>;
    }

    return <p className={styles.description}>{children}</p>;
}

export function CardDescriptionHTML({ children }) {
    const contentRef = useRef(null);

    useEffect(() => {
        contentRef.current?.querySelectorAll("pre code").forEach((block) => {
            if (!block.dataset.highlighted) hljs.highlightElement(block);
        });
    }, [children]);

    return (
        <p
            ref={contentRef}
            className={styles.description}
            dangerouslySetInnerHTML={{ __html: children }}
        />
    );
}

export function CardCreatedAt({ children }) {
    return (
        <Tooltip>
            <TooltipTrigger>
                <p className={styles.createdAt}>{children}</p>
            </TooltipTrigger>

            <TooltipContent>{new Date(children).toLocaleString()}</TooltipContent>
        </Tooltip>
    );
}
