import { Header } from "@server";
import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/auth";

export default async function RootLayout({ children }) {
    const user = await getSessionUser((await cookies()).get("token")?.value);

    return (
        <>
            <Header user={user} />
            {children}
        </>
    );
}
