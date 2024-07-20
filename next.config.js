const nextConfig = {
    basePath: process.env.NEXT_PUBLIC_BASEPATH || "",
    assetPrefix: process.env.NEXT_PUBLIC_BASEPATH || "",
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "ucarecdn.com",
            },
        ],
        dangerouslyAllowSVG: true,
    },
    experimental: {
        instrumentationHook: true,
    },
};

module.exports = nextConfig;
