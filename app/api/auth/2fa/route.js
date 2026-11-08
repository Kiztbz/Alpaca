import { getToken, catchRouteError } from "@/lib/db/helpers";
import { NextResponse } from "next/server";
import { verifyToken } from "node-2fa";
import { headers } from "next/headers";
import { db } from "@/lib/db/db";
import { authCookie, getClientIp, isRateLimited, readJson, recordAuthAttempt, requestErrorResponse } from "@/lib/security";

export async function POST(req) {
    let token, code, recovery;
    let newCodes = null;

    try {
        ({ token, code, recovery } = await readJson(req));
        const ip = getClientIp(req);
        if (await isRateLimited({ action: "two_factor", identifier: token, ip, limit: 8, minutes: 15 })) {
            return NextResponse.json({ errors: { server: "Too many verification attempts. Log in again later." } }, { status: 429 });
        }
        const user = await db
            .selectFrom("users")
            .select(["id", "username", "tokens", "twoFactorSecret", "twoFactorRecovery", "twoFactorTempExpires"])
            .where("twoFactorTemp", "=", token)
            .executeTakeFirst();

        if (!user || !user.twoFactorTempExpires || new Date(user.twoFactorTempExpires).getTime() < Date.now()) {
            return NextResponse.json(
                {
                    errors: {
                        token: "Invalid token provided - you need to login again",
                    },
                },
                { status: 401 }
            );
        }

        if (!user.twoFactorSecret) {
            return NextResponse.json(
                {
                    errors: {
                        token: "Two factor authentication is not enabled for this account",
                    },
                },
                { status: 401 }
            );
        }

        if (recovery) {
            const isIncluded = user.twoFactorRecovery.find((r) => r.code === recovery && !r.used);

            if (!isIncluded) {
                await recordAuthAttempt({ action: "two_factor", identifier: token, ip, succeeded: false });
                return NextResponse.json(
                    {
                        errors: {
                            code: "Invalid recovery code provided",
                        },
                    },
                    { status: 401 }
                );
            }

            newCodes = user.twoFactorRecovery.map((r) => {
                if (r.code === recovery) {
                    return {
                        code: r.code,
                        used: true,
                    };
                }

                return r;
            });
        } else {
            const verified = verifyToken(user.twoFactorSecret, code);

            if (!verified) {
                await recordAuthAttempt({ action: "two_factor", identifier: token, ip, succeeded: false });
                return NextResponse.json(
                    {
                        errors: {
                            code: "Invalid code provided",
                        },
                    },
                    { status: 401 }
                );
            }
        }

        const refreshToken = await getToken(user.username, true);
        const accessToken = await getToken(user.username, false);

        const userAgent = (await headers()).get("user-agent") || "Unknown";
        const location = {};

        const tokenObject = {
            token: refreshToken,
            login: Date.now(),
            expires: Date.now() + 2592000000,
            userAgent,
            location,
            device: getDeviceFromUserAgent(userAgent),
            ip,
        };

        // To prevent someone loggin in a lot of times and filling up the tokens array
        // we also want to filter out tokens where the user agent or ip is the same
        // Refrain from using ip though, as someone could be using more than one browser on the same device
        const newTokens = [
            ...user.tokens.filter((token) => {
                return (
                    token.expires > Date.now() &&
                    (token.ip === ip ? token.userAgent !== userAgent : true)
                );
            }),
            tokenObject,
        ];

        await db
            .updateTable("users")
            .set({
                tokens: JSON.stringify(newTokens),
                twoFactorTemp: null,
                twoFactorTempExpires: null,
                twoFactorRecovery: newCodes ? JSON.stringify(newCodes) : undefined,
            })
            .where("id", "=", user.id)
            .execute();
        await recordAuthAttempt({ action: "two_factor", identifier: token, ip, succeeded: true });

        return NextResponse.json(
            {
                token: accessToken,
                message: "Successfully logged in",
            },
            {
                status: 200,
                headers: {
                    "Set-Cookie": authCookie(refreshToken),
                },
            }
        );
    } catch (error) {
        return requestErrorResponse(error) || catchRouteError({ error, route: req.nextUrl.pathname });
    }
}

function getDeviceFromUserAgent(userAgent) {
    if (userAgent.includes("Mobile")) return "Mobile";
    if (userAgent.includes("Tablet")) return "Tablet";
    if (userAgent.includes("Windows")) return "Windows";
    if (userAgent.includes("Macintosh")) return "Macintosh";
    if (userAgent.includes("Linux")) return "Linux";
    return "Unknown";
}
