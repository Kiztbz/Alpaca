"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import styles from "./GuestDock.module.css";

function Icon({ name }) {
  const paths = {
    home: <><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10M9 20v-6h6v6"/></>,
    marketplace: <><path d="M4 7h16l-1 13H5L4 7Z"/><path d="M8 7a4 4 0 0 1 8 0"/></>,
    login: <><path d="m10 17 5-5-5-5M15 12H3"/><path d="M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5"/></>,
    join: <><path d="M12 5v14M5 12h14"/><circle cx="12" cy="12" r="9"/></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

export function GuestDock() {
  const pathname = usePathname();
  const links = [
    { href: "/", label: "Home", icon: "home", active: pathname === "/" },
    { href: "/marketplace", label: "Courses", icon: "marketplace", active: pathname === "/marketplace" || pathname.startsWith("/courses/") },
    { href: "/login", label: "Log in", icon: "login", active: pathname === "/login" },
    { href: "/register", label: "Join", icon: "join", active: pathname === "/register" },
  ];

  return <nav className={styles.dock} aria-label="Public navigation">
    <Link className={styles.brand} href="/"><Image src="/assets/images/llama-face-v2.png" alt="" width={1254} height={1254} priority /><strong>Alpaca</strong></Link>
    <div className={styles.links}>
      {links.map((link) => <Link key={link.href} href={link.href} className={`${link.active ? styles.active : ""} ${link.icon === "join" ? styles.join : ""}`} aria-current={link.active ? "page" : undefined}><Icon name={link.icon}/><span>{link.label}</span></Link>)}
    </div>
  </nav>;
}
