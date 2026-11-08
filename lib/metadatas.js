const defaultOrigin = "http://localhost:3000";

function normalizeOrigin(value) {
    if (!value) return defaultOrigin;
    const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;

    try {
        return new URL(withProtocol).origin;
    } catch {
        return defaultOrigin;
    }
}

const origin = normalizeOrigin(
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL,
);
const basePath = (process.env.NEXT_PUBLIC_BASEPATH || "").replace(/\/$/, "");

export const siteConfig = {
    name: "Alpaca",
    legalName: "LLAMA",
    description:
        "Connect sources, notes, and active-recall quizzes in one focused learning workspace.",
    origin,
    basePath,
    locale: "en_US",
    keywords: [
        "active recall",
        "spaced repetition",
        "learning platform",
        "study notes",
        "online courses",
        "quiz maker",
    ],
};

export function absoluteUrl(path = "/") {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return new URL(`${basePath}${normalizedPath}`, `${origin}/`).toString();
}

export function pageMetadata({ title, description, path, index = true, image }) {
    const url = absoluteUrl(path);
    const images = image ? [image] : [{ url: absoluteUrl("/opengraph-image"), width: 1200, height: 630, alt: `${siteConfig.name} learning workspace` }];

    return {
        title,
        description,
        alternates: { canonical: url },
        robots: index
            ? { index: true, follow: true }
            : { index: false, follow: false, nocache: true },
        openGraph: {
            title,
            description,
            url,
            siteName: siteConfig.name,
            locale: siteConfig.locale,
            type: "website",
            images,
        },
        twitter: {
            card: "summary_large_image",
            title,
            description,
            images: images.map(({ url: imageUrl }) => imageUrl),
        },
    };
}

// Kept as an export for older imports while the app migrates to siteConfig.
export const metadatas = {
    layout: {
        title: siteConfig.name,
        description: siteConfig.description,
        url: absoluteUrl("/"),
        keywords: siteConfig.keywords,
        images: [{ url: absoluteUrl("/opengraph-image"), width: 1200, height: 630, alt: `${siteConfig.name} learning workspace` }],
    },
};
