import { AppShell } from "@client";
import { GuestDock } from "@/app/components/GuestDock/GuestDock";
import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/auth";

export default async function RootLayout({ children }) {
    const user = await getSessionUser((await cookies()).get("token")?.value);

    if (user) return <AppShell user={user}>{children}</AppShell>;
    return <>{children}<GuestDock /></>;
}
