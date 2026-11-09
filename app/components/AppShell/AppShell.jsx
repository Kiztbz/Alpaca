"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import styles from "./AppShell.module.css";

const primaryLinks = [
  { name: "Learn", href: "/learn", icon: "learn" },
  { name: "Marketplace", href: "/marketplace", icon: "marketplace" },
  { name: "Daily train", href: "/daily", icon: "train" },
  { name: "Profile", href: "/me/dashboard", icon: "profile" },
];

function Icon({ name }) {
  const paths = {
    learn: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Z"/><path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5a2.5 2.5 0 0 1 2.5 2.5v-16Z"/></>,
    train: <path d="m13 2-7 11h5l-1 9 8-12h-5V2Z"/>,
    marketplace: <><path d="M4 10v10h16V10"/><path d="M3 4h18l-2 6a3 3 0 0 1-4 0 3 3 0 0 1-6 0 3 3 0 0 1-4 0L3 4Z"/><path d="M9 20v-6h6v6"/></>,
    profile: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
    more: <><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9A1.7 1.7 0 0 0 21 10h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/></>,
    help: <><circle cx="12" cy="12" r="9"/><path d="M9.8 9a2.3 2.3 0 1 1 3.6 1.9c-.8.5-1.4.9-1.4 2.1M12 17h.01"/></>,
    shield: <path d="M12 2 4 5v6c0 5 3.4 9.5 8 11 4.6-1.5 8-6 8-11V5l-8-3Z"/>,
    logout: <><path d="M10 17l5-5-5-5M15 12H3"/><path d="M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5"/></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

export function AppShell({ user, children }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedCourse = searchParams.get("course");
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef(null);

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    function close(event) {
      if (moreRef.current && !moreRef.current.contains(event.target)) setMoreOpen(false);
    }
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  async function logout() {
    await fetch(`${process.env.NEXT_PUBLIC_BASEPATH ?? ""}/api/auth/logout`, { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return <div className={styles.shell}>
    <aside className={styles.sidebar}>
      <Link className={styles.brand} href="/learn"><Image src="/assets/images/llama-face-v2.png" alt="Alpaca" width={1254} height={1254} priority /><span>Alpaca</span></Link>
      <nav className={styles.primaryNav} aria-label="Application navigation">
        {primaryLinks.map((item) => {
          const active = pathname === item.href || (item.href === "/learn" && pathname.startsWith("/courses/"));
          const href = selectedCourse && ["/learn", "/daily"].includes(item.href) ? `${item.href}?course=${encodeURIComponent(selectedCourse)}` : item.href;
          return <Link key={item.name} href={href} className={active ? styles.active : ""} aria-current={active ? "page" : undefined}><Icon name={item.icon}/><span>{item.name}</span></Link>;
        })}
      </nav>
      <div className={styles.account}><div><strong>{user.displayName || user.username}</strong><small>@{user.username}</small></div></div>
      <div className={styles.moreWrap} ref={moreRef}>
        {moreOpen && <div className={styles.moreMenu} role="dialog" aria-label="More options">
          <Link href="/me/settings"><Icon name="settings"/>Settings</Link>
          <Link href="/help"><Icon name="help"/>Help</Link>
          <Link href="/privacy"><Icon name="shield"/>Privacy policy</Link>
          <Link href="/terms"><Icon name="shield"/>Terms of service</Link>
          <button type="button" onClick={logout}><Icon name="logout"/>Log out</button>
        </div>}
        <button type="button" className={`${styles.moreButton} ${moreOpen ? styles.active : ""}`} onClick={() => setMoreOpen((open) => !open)} aria-expanded={moreOpen}><Icon name="more"/><span>More</span></button>
      </div>
    </aside>
    <section className={styles.content}>{children}</section>
  </div>;
}
