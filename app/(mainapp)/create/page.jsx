import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/auth";
import { getGroups, getPermittedResources } from "@/lib/db/helpers";
import { FillStore } from "@client";
import Create from "./Create";

export default async function CreatePage(props) {
  const searchParams = await props.searchParams;
  const user = await getSessionUser((await cookies()).get("token")?.value);
  if (!user) return redirect("/login?next=/create");

  const [resources, groups] = await Promise.all([
    getPermittedResources({ userId: user.id, takeAll: true }),
    getGroups(user.id),
  ]);

  return (
    <>
      <FillStore user={user} groups={groups} {...resources} />
      <Create initialTab={["Note", "Quiz", "Source", "Course"].includes(searchParams.type) ? searchParams.type : undefined} />
    </>
  );
}
