import { NextResponse } from "next/server";
import { useUser } from "@/lib/auth";
import { cookies } from "next/headers";
// import { User } from "@mneme_app/database-models";
import { User } from "@/app/api/models";
import { server, unauthorized } from "@/lib/apiErrorResponses";

export async function GET(req) {
    const userId = req.nextUrl.pathname.split("/")[3];

    try {
        const user = await useUser({ token: cookies().get("token")?.value });

        if (!user) {
            return unauthorized;
        }

        const content = await User.findOne({ _id: user.id }).populate("groups")
            .groups;
        return NextResponse.json({
            content,
        });
    } catch (error) {
        console.error(`[${userId}/me] GET error: ${error}`);
        return server;
    }
}
