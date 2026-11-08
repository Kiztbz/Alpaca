const nextConfig = {
    reactStrictMode: false,
    basePath: process.env.NEXT_PUBLIC_BASEPATH || "",
    assetPrefix: process.env.NEXT_PUBLIC_BASEPATH || "",
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "utfs.io",
            },
        ],
        dangerouslyAllowSVG: true,
    },
    typescript: {
        ignoreBuildErrors: true,
    },
    async headers() {
        const noIndex = [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }];
        const privateRoutes = [
            "/api/:path*", "/me/:path*", "/admin/:path*", "/study", "/daily",
            "/create", "/input", "/login", "/register", "/forgot-password",
            "/reset-password", "/verify-email/:path*", "/groups/:path*",
            "/users/:path*", "/certificates/:path*", "/notes/:id",
            "/quizzes/:id", "/sources/:id",
        ];

        return privateRoutes.map((source) => ({ source, headers: noIndex }));
    },
};

module.exports = nextConfig;
