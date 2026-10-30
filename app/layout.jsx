import { FillStore, Timer, Alerts, ThemeSetter } from "@client";
import { metadatas } from "@/lib/metadatas";
import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/auth";
import "./globals.css";

export const metadata = {
    metadataBase: new URL(metadatas.layout.url),
    title: metadatas.layout.title,
    description: metadatas.layout.description,
    keywords: metadatas.layout.keywords.join(", "),
    openGraph: {
        title: metadatas.layout.title,
        description: metadatas.layout.description,
        url: metadatas.layout.url,
        type: "website",
        siteName: metadatas.layout.title,
        locale: "en_US",
        images: metadatas.layout.images,
    },
};

export default async function RootLayout({ children }) {
    const user = await getSessionUser((await cookies()).get("token")?.value);

    return (
        <html lang="en" suppressHydrationWarning>
            {user && (
                <FillStore
                    user={user}
                    associates={user.associates}
                    notifications={user.notifications || []}
                />
            )}

            <ThemeSetter settings={user?.settings} />

            <body>
                {/* So Firefox displays page after css has loaded */}
                <script>0</script>

                {children}

                <Timer />
                <Alerts />
            </body>
        </html>
    );
}
