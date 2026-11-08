import { ImageResponse } from "next/og";

export const alt = "Alpaca — connected learning that lasts";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
    return new ImageResponse(
        <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "72px", color: "white", background: "linear-gradient(135deg, #000511 0%, #0a1222 58%, #172554 100%)", fontFamily: "Arial, sans-serif" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "22px", fontSize: 34, fontWeight: 800 }}><span style={{ width: 62, height: 62, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 18, background: "#2563eb" }}>A</span>Alpaca</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "24px", maxWidth: 960 }}><div style={{ fontSize: 72, lineHeight: 1.02, fontWeight: 800 }}>Turn what you learn into what you remember.</div><div style={{ color: "#bfdbfe", fontSize: 30 }}>Sources, notes, courses, and active recall in one focused workspace.</div></div>
            <div style={{ display: "flex", gap: "14px", color: "#93c5fd", fontSize: 22 }}><span>Connect</span><span>•</span><span>Practice</span><span>•</span><span>Remember</span></div>
        </div>, size,
    );
}
