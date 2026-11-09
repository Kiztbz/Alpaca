import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

export const config = {
    matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api)(.*)"],
};

const guestPages = new Set([
    "/",
    "/about",
    "/login",
    "/marketplace",
    "/privacy",
    "/register",
    "/terms",
]);

const authenticatedPages = new Set([
    "/admin",
    "/daily",
    "/help",
    "/learn",
    "/marketplace",
    "/me/dashboard",
    "/me/settings",
    "/privacy",
    "/terms",
]);

// Generated social metadata is an asset rather than a navigable page.
const publicAssets = new Set(["/opengraph-image"]);

const isAuthenticated = async (req) => {
    const token = req.cookies.get("token")?.value;
    if (!token) return false;

    try {
        const secret = new TextEncoder().encode(
            process.env.REFRESH_TOKEN_SECRET,
        );

        const { payload } = await jwtVerify(token, secret, {
            issuer: "mnemefeast",
            audience: "mnemefeast",
        });

        return !!payload.username;
    } catch (error) {
        console.error(error);
        return false;
    }
};

export async function proxy(req) {
    const { pathname } = req.nextUrl;

    if (pathname.startsWith("/api/") || pathname === "/api") {
        // Will need to check for Authorization header
        return NextResponse.next();
    }

    if (publicAssets.has(pathname)) {
        return NextResponse.next();
    }

    const authenticated = await isAuthenticated(req);

    if (!authenticated && guestPages.has(pathname)) {
        return NextResponse.next();
    }

    if (!authenticated) {
        const loginUrl = new URL("/login", req.url);
        loginUrl.searchParams.set("next", `${pathname}${req.nextUrl.search}`);
        return NextResponse.redirect(loginUrl);
    }

    if (authenticatedPages.has(pathname)) {
        return NextResponse.next();
    }

    return NextResponse.redirect(new URL("/learn", req.url));
}
