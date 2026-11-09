import { catchRouteError, isDatabaseUnavailableError } from "./db/helpers";
import hasCommonItem from "./hasCommonItem";
import { db } from "@/lib/db/db.js";
import { sql } from "kysely";
import bcrypt from "bcrypt";
import { cache } from "react";
import { jwtVerify } from "jose";

export const getSessionUser = cache(async (token) => {
    if (!token) return null;

    // The refresh token already contains the username. Verify it locally first,
    // then use the indexed username to narrow the database lookup to one row.
    // Keeping the token predicate preserves server-side session revocation.
    let username;
    try {
        const secret = new TextEncoder().encode(process.env.REFRESH_TOKEN_SECRET);
        const { payload } = await jwtVerify(token, secret, {
            issuer: "mnemefeast",
            audience: "mnemefeast",
        });
        username = payload.username;
    } catch {
        return null;
    }

    if (!username) return null;
    return useUser({
        username,
        token,
        select: ["id", "username", "displayName", "avatar", "email", "role", "settings"],
        withAssociates: true,
        withNotifications: true,
    });
});

export async function useUser({
    id,
    username,
    token,
    select = ["id"],
    withAssociates,
    withGroups,
    withCourses,
    withNotifications,
}) {
    if (!id && !username && !token) {
        return null;
    }

    try {
        let query = db.selectFrom("users").select(select);

        if (id) {
            query = query.where("id", "=", id);
        } else if (username) {
            query = query.where("username", "=", username);
            if (token) {
                query = query.where(sql`tokens @> jsonb_build_array(jsonb_build_object('token', ${token}::text))`);
            }
        } else {
            query = query.where(sql`tokens @> jsonb_build_array(jsonb_build_object('token', ${token}::text))`);
        }

        const user = await query.executeTakeFirst();

        if (!user) {
            return null;
        } else {
            let [associates, groups, courses, notifications] = [[], [], [], []];

            const [loadedAssociates, loadedNotifications] = await Promise.all([
                withAssociates ? getAssociates({
                    userId: user.id,
                    select: ["id", "username", "displayName", "avatar", "description"],
                }) : [],
                withNotifications ? getNotifications({
                    userId: user.id,
                    select: ["id", "type", "senderId", "groupId", "subject", "message", "isRead"],
                }) : [],
            ]);
            associates = loadedAssociates;
            notifications = loadedNotifications;

            return {
                ...user,
                associates,
                groups,
                courses,
                notifications,
            };
        }
    } catch (error) {
        if (isDatabaseUnavailableError(error)) {
            console.warn("Database unavailable while resolving a user session.");
        } else {
            console.error(error);
        }
        return null;
    }
}

export async function getAssociates({ userId, select = ["id"] }) {
    try {
        const associates = await db
            .selectFrom("associates")
            .innerJoin(
                (eb) =>
                    eb
                        .selectFrom("users")
                        .select(select)
                        .where("users.id", "!=", userId)
                        .as("users"),
                (join) =>
                    join.on(({ eb, ref }) =>
                        eb("users.id", "=", ref("associates.A")).or(
                            "users.id",
                            "=",
                            ref("associates.B")
                        )
                    )
            )
            .select(select)
            .where(({ eb, or, and }) =>
                or([
                    and([eb("A", "=", userId), eb("B", "!=", userId)]),
                    and([eb("A", "!=", userId), eb("B", "=", userId)]),
                ])
            )
            .execute();

        return associates || [];
    } catch (error) {
        catchRouteError({ error, route: "withAssociates" });
        return [];
    }
}

export async function getNotifications({ userId, select = ["id"] }) {
    try {
        const notifications = await db
            .selectFrom("notifications")
            .select(select)
            .where("recipientId", "=", userId)
            .execute();

        return notifications || [];
    } catch (error) {
        catchRouteError({ error, route: "withNotifications" });
        return [];
    }
}

export const canRead = (resource, user) => {
    if (!resource) {
        return false;
    }
    if (!user) {
        if (!resource.permissions) return true;
        return resource.permissions.allWrite || resource.permissions.allRead;
    }
    if (canEdit(resource, user)) {
        return true;
    }

    return (
        resource.permissions.allRead ||
        (resource.permissions.usersRead && resource.permissions.usersRead.includes(user.id)) ||
        hasCommonItem(resource.permissions.groupsRead, user.groups)
    );
};

export const canEdit = (resource, user) => {
    if (!user) {
        return resource.permissions?.allWrite;
    }

    return (
        user.role === "superadmin" ||
        (resource.createdBy && resource.createdBy.toString() === user.id.toString()) ||
        resource.permissions == undefined ||
        resource.permissions.allWrite ||
        (resource.permissions.usersWrite && resource.permissions.usersWrite.includes(user.id)) ||
        hasCommonItem(resource.permissions.groupsWrite, user.groups)
    );
};
