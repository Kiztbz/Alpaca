import { Dashboard } from "./Dashboard";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { FillStore } from "@client";
import { getGroups } from "@/lib/db/helpers";
import { getEnrolledLearningData } from "@/lib/enrolledCourses";

export default async function DashboardPage() {
    const user = await getSessionUser((await cookies()).get("token")?.value);
    if (!user) redirect("/login");

    const [{ resources, relationships }, groups] = await Promise.all([
        getEnrolledLearningData(user.id, user.role),
        getGroups(user.id),
    ]);

    return <><FillStore user={user} groups={groups} relationships={relationships} {...resources} /><Dashboard /></>;
}
