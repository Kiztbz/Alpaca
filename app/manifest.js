import { siteConfig } from "@/lib/metadatas";

export default function manifest() {
    return {
        name: "Alpaca Learning",
        short_name: siteConfig.name,
        description: siteConfig.description,
        start_url: "/",
        display: "standalone",
        background_color: "#000511",
        theme_color: "#2563eb",
        icons: [{ src: "/assets/images/logo.png", sizes: "140x140", type: "image/png" }],
    };
}
