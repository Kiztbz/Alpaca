import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getClientIp, readJson, recordAnalyticsEvent, requestErrorResponse } from "@/lib/security";

export async function POST(req) {
  try {
    const { path } = await readJson(req, 2_048);
    if (typeof path !== "string" || !path.startsWith("/") || path.length > 512) {
      return NextResponse.json({ message: "Invalid path" }, { status: 400 });
    }
    const user = await getSessionUser((await cookies()).get("token")?.value);
    await recordAnalyticsEvent({
      eventType: "page_view", path, userId: user?.id || null,
      visitor: `${getClientIp(req)}|${req.headers.get("user-agent") || ""}`,
      userAgent: req.headers.get("user-agent") || "",
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return requestErrorResponse(error) || NextResponse.json({ message: "Unable to record analytics" }, { status: 500 });
  }
}
