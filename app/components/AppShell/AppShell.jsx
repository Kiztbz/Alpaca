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
    admin: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/><path d="m3 7 6-4 6 6 6-4"/></>,
    more: <><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9A1.7 1.7 0 0 0 21 10h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/></>,
    help: <><circle cx="12" cy="12" r="9"/><path d="M9.8 9a2.3 2.3 0 1 1 3.6 1.9c-.8.5-1.4.9-1.4 2.1M12 17h.01"/></>,
    shield: <path d="M12 2 4 5v6c0 5 3.4 9.5 8 11 4.6-1.5 8-6 8-11V5l-8-3Z"/>,
    logout: <><path d="M10 17l5-5-5-5M15 12H3"/><path d="M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5"/></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

function NavGlyph({ name }) {
  const glyphs = {
    learn: <svg viewBox="0 0 40 40"><path fill="#ff5b5f" d="M5 17 20 6l15 11-3.7 5L20 14 8.7 22Z"/><path fill="#ffc928" d="M9 18.5 20 11l11 7.5V33a3 3 0 0 1-3 3H12a3 3 0 0 1-3-3Z"/><circle cx="20" cy="23" r="4" fill="#f29b16"/><path fill="#e98c13" d="M17 29h6v7h-6z"/></svg>,
    marketplace: <svg viewBox="0 0 40 40"><path fill="#77c8ea" d="M7 17h26v19H7z"/><path fill="#ff5a59" d="M5 10h30v8H5z"/><path fill="#fff4df" d="M11 10h6v8h-6zm12 0h6v8h-6z"/><path fill="#486d86" d="M11 24h7v12h-7zm11 0h7v7h-7z"/><path fill="#cf4548" d="M5 18c0 3 6 3 6 0 0 3 6 3 6 0 0 3 6 3 6 0 0 3 6 3 6 0 0 3 6 3 6 0Z"/></svg>,
    train: <svg viewBox="0 0 40 40"><g transform="rotate(-27 20 20)"><rect x="8" y="17" width="24" height="6" rx="3" fill="#38c8f4"/><rect x="4" y="12" width="7" height="16" rx="3.5" fill="#20aee9"/><rect x="10" y="14" width="5" height="12" rx="2.5" fill="#68ddff"/><rect x="29" y="12" width="7" height="16" rx="3.5" fill="#20aee9"/><rect x="25" y="14" width="5" height="12" rx="2.5" fill="#68ddff"/></g></svg>,
    profile: <svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="18" fill="#f4c6b8"/><path fill="#34495e" d="M8 20C8 9 14 4 21 4c8 0 13 6 12 17-3-6-7-8-13-8-5 0-9 2-12 7Z"/><circle cx="20" cy="21" r="10" fill="#c77b55"/><path fill="#1f3445" d="M11 17c2-7 14-8 18 0-5-2-12-2-18 0Z"/><rect x="11" y="19" width="8" height="6" rx="2" fill="#263a4b"/><rect x="21" y="19" width="8" height="6" rx="2" fill="#263a4b"/><path stroke="#263a4b" strokeWidth="2" d="M19 21h2"/><path stroke="#fff" strokeWidth="1.5" strokeLinecap="round" d="M17 29c2 2 5 2 7 0"/></svg>,
    more: <svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="18" fill="#c86df0"/><circle cx="12" cy="20" r="2" fill="#fff"/><circle cx="20" cy="20" r="2" fill="#fff"/><circle cx="28" cy="20" r="2" fill="#fff"/></svg>,
  };
  return <span className={styles.navGlyph} data-glyph={name} aria-hidden="true">{glyphs[name]}</span>;
}

export function AppShell({ user, children }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const locationKey = `${pathname}?${searchParams.toString()}`;
  const selectedCourse = searchParams.get("course");
  const [moreOpen, setMoreOpen] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const moreRef = useRef(null);

  useEffect(() => {
    setMoreOpen(false);
    setNavigating(false);
  }, [locationKey]);

  useEffect(() => {
    primaryLinks.forEach(({ href }) => router.prefetch(href));
  }, [router]);

  useEffect(() => {
    function close(event) {
      if (moreRef.current && !moreRef.current.contains(event.target)) setMoreOpen(false);
    }
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  async function logout() {
    setNavigating(true);
    await fetch(`${process.env.NEXT_PUBLIC_BASEPATH ?? ""}/api/auth/logout`, { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  function showNavigationFeedback(event) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest("a[href]");
    if (!link || link.target === "_blank" || link.hasAttribute("download")) return;

    const destination = new URL(link.href, window.location.href);
    if (destination.origin !== window.location.origin) return;
    if (`${destination.pathname}${destination.search}` === `${window.location.pathname}${window.location.search}`) return;
    setNavigating(true);
  }

  return <div className={styles.shell} data-navigating={navigating || undefined} onClickCapture={showNavigationFeedback}>
    <div className={styles.navigationProgress} role="progressbar" aria-label="Loading page" />
    <aside className={styles.sidebar}>
      <Link className={styles.brand} href="/learn"><Image src="/assets/images/llama-face-v2.png" alt="Alpaca" width={1254} height={1254} priority /><span>Alpaca</span></Link>
      <nav className={styles.primaryNav} aria-label="Application navigation">
        {primaryLinks.map((item) => {
          const active = pathname === item.href || (item.href === "/learn" && pathname.startsWith("/courses/"));
          const href = selectedCourse && ["/learn", "/daily"].includes(item.href) ? `${item.href}?course=${encodeURIComponent(selectedCourse)}` : item.href;
          return <Link key={item.name} href={href} data-tone={item.icon} className={active ? styles.active : ""} aria-current={active ? "page" : undefined}><span className={styles.navIcon}><NavGlyph name={item.icon}/></span><span className={styles.navLabel}>{item.name}</span></Link>;
        })}
      </nav>
      <div className={styles.account}><div><strong>{user.displayName || user.username}</strong><small>@{user.username}</small></div></div>
      <div className={styles.moreWrap} ref={moreRef}>
        {moreOpen && <div className={styles.moreMenu} role="dialog" aria-label="More options">
          {user.role === "superadmin" && <Link href="/admin"><Icon name="admin"/>Admin analytics</Link>}
          <Link href="/me/settings"><Icon name="settings"/>Settings</Link>
          <Link href="/help"><Icon name="help"/>Help</Link>
          <Link href="/privacy"><Icon name="shield"/>Privacy policy</Link>
          <Link href="/terms"><Icon name="shield"/>Terms of service</Link>
          <button type="button" onClick={logout}><Icon name="logout"/>Log out</button>
        </div>}
        <button type="button" className={`${styles.moreButton} ${moreOpen ? styles.active : ""}`} onClick={() => setMoreOpen((open) => !open)} aria-expanded={moreOpen}><span className={`${styles.navIcon} ${styles.moreIcon}`}><NavGlyph name="more"/></span><span className={styles.navLabel}>More</span></button>
      </div>
    </aside>
    <section className={styles.content} aria-busy={navigating}>{children}</section>
  </div>;
}
