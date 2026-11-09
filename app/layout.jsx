import { AppShell, FillStore, Alerts, ThemeSetter } from "@client";
import { absoluteUrl, siteConfig } from "@/lib/metadatas";
import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/auth";
import "./globals.css";
import { AnalyticsTracker } from "@/app/components/AnalyticsTracker";

export const metadata = {
    metadataBase: new URL(siteConfig.origin),
    applicationName: siteConfig.name,
    title: {
        default: "Alpaca · Learn it for good",
        template: "%s · Alpaca",
    },
    description: siteConfig.description,
    keywords: siteConfig.keywords,
    creator: siteConfig.legalName,
    publisher: siteConfig.legalName,
    category: "education",
    alternates: { canonical: absoluteUrl("/") },
    icons: {
        icon: [{ url: "/assets/images/llama-face-v2.png", type: "image/png" }],
        shortcut: "/assets/images/llama-face-v2.png",
        apple: "/assets/images/llama-face-v2.png",
    },
    manifest: "/manifest.webmanifest",
    openGraph: {
        title: "Alpaca · Learn it for good",
        description: siteConfig.description,
        url: absoluteUrl("/"),
        type: "website",
        siteName: siteConfig.name,
        locale: siteConfig.locale,
        images: [{ url: absoluteUrl("/opengraph-image"), width: 1200, height: 630, alt: "Alpaca learning workspace" }],
    },
    twitter: {
        card: "summary_large_image",
        title: "Alpaca · Learn it for good",
        description: siteConfig.description,
        images: [absoluteUrl("/opengraph-image")],
    },
    robots: { index: true, follow: true },
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

                {user ? <AppShell user={user}>{children}</AppShell> : children}

                <AnalyticsTracker />
                <Alerts />
            </body>
        </html>
    );
}
