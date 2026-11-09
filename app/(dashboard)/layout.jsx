import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/auth";

export const metadata = {
    title: "My learning",
    robots: { index: false, follow: false, nocache: true },
};

export default async function RootLayout({ children }) {
    const user = await getSessionUser((await cookies()).get("token")?.value);

    if (!user) redirect("/login");

    return children;
}
