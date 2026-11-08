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
        const securityHeaders = [
            { key: "X-Content-Type-Options", value: "nosniff" },
            { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
            { key: "X-Frame-Options", value: "DENY" },
            { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
            { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
        ];
        const privateRoutes = [
            "/api/:path*", "/me/:path*", "/admin/:path*", "/daily",
            "/create", "/input", "/login", "/register", "/forgot-password",
            "/reset-password", "/verify-email/:path*", "/groups/:path*",
            "/users/:path*", "/certificates/:path*", "/notes/:id",
            "/quizzes/:id", "/sources/:id",
        ];

        return [
            { source: "/:path*", headers: securityHeaders },
            ...privateRoutes.map((source) => ({ source, headers: noIndex })),
        ];
    },
};

module.exports = nextConfig;
