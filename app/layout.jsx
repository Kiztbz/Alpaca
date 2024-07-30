import { Source, Note, Quiz, Notification, Course } from "@models";
import { FillStore, Timer, Alerts, Modals, Menu } from "@client";
import { Header, Footer, DBConnectError } from "@server";
import { serialize, serializeOne } from "@/lib/db";
import { metadatas } from "@/lib/metadatas";
import { cookies } from "next/headers";
import { useUser } from "@/lib/auth";
import connectDB from "./api/db";
import "./globals.css";
import { queryReadableResources } from "@/lib/auth";
import { getPermittedCourses, getPermittedResources } from "@/lib/db/helpers";

const connection = await connectDB();

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
    const user = await useUser({ token: cookies().get("token")?.value });

    const permittedResources = user
        ? await getPermittedResources(user.id)
        : { sources: [], notes: [], quizzes: [] };

    const sources = permittedResources.sources;
    const notes = permittedResources.notes;
    const quizzes = permittedResources.quizzes;
    const courses = user ? await getPermittedCourses(user.id): [];
    const notifications = user ? user.notifications : [];

    return (
        <html lang="en">
            {user && (
                <FillStore
                    user={user}
                    sources={sources}
                    notes={notes}
                    quizzes={quizzes}
                    courses={courses}
                    groups={serialize(user.groups)}
                    // associates={serialize(user.associates)}
                    notifications={notifications}
                    // webSocketURL={process.env.WS_URL}
                />
            )}

            <body>
                <Header />
                {children}
                <Footer />

                <Timer />
                <Alerts />
                <Modals />
                <Menu />
            </body>
        </html>
    );
}
