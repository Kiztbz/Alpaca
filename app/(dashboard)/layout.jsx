import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/auth";
import { Header } from "@server";
import { FillStore } from "@client";
import { getGroups, getPermittedResources, getRelationships } from "@/lib/db/helpers";

export const metadata = {
    title: "My learning",
    robots: { index: false, follow: false, nocache: true },
};

export default async function RootLayout({ children }) {
    const user = await getSessionUser((await cookies()).get("token")?.value);

    if (!user) redirect("/login");

    const [resources, groups, relationships] = await Promise.all([
        getPermittedResources({ userId: user.id, takeAll: true }),
        getGroups(user.id),
        getRelationships(),
    ]);

    return (
        <>
            <Header user={user} />
            <FillStore user={user} groups={groups} relationships={relationships} {...resources} />
            {children}
        </>
    );
}
