import Link from "next/link";
import styles from "./GuestDock.module.css";

function Icon({ name }) {
  const paths = {
    home: <><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10M9 20v-6h6v6"/></>,
    marketplace: <><path d="M4 7h16l-1 13H5L4 7Z"/><path d="M8 7a4 4 0 0 1 8 0"/></>,
    login: <><path d="m10 17 5-5-5-5M15 12H3"/><path d="M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5"/></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

export function GuestDock() {
  return <nav className={styles.dock} aria-label="Guest shortcuts">
    <Link href="/"><Icon name="home"/><span>Landing</span></Link>
    <Link href="/marketplace"><Icon name="marketplace"/><span>Marketplace</span></Link>
    <Link href="/login"><Icon name="login"/><span>Login</span></Link>
  </nav>;
}
