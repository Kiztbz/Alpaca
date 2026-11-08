import { absoluteUrl } from "@/lib/metadatas";

export default function robots() {
    return {
        rules: {
            userAgent: "*",
            allow: "/",
            disallow: [
                "/api/", "/me/", "/admin/", "/study", "/daily", "/create",
                "/input", "/login", "/register", "/forgot-password",
                "/reset-password", "/verify-email/", "/groups/", "/users/",
                "/certificates/", "/notes/", "/quizzes/", "/sources/",
            ],
        },
        sitemap: absoluteUrl("/sitemap.xml"),
        host: absoluteUrl("/"),
    };
}
