import { GuestDock } from "@/app/components/GuestDock/GuestDock";
import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/auth";
import styles from "./layout.module.css";

export default async function RootLayout({ children }) {
    const user = await getSessionUser((await cookies()).get("token")?.value);

    if (user) return children;
    return <div className={styles.guestShell}>{children}<GuestDock /></div>;
}
