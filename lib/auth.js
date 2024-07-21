import { User } from "@/app/api/models";
import { db } from "@/lib/db/db.js";
import hasCommonItem from "./hasCommonItem";

export const useUser = async ({ id, username, token } = {}) => {
    try {
        // if (id) return await User.findById(id);
        // else if (username) return await User.findOne({ username });
        if (id) {
            console.log("In useUser")
            const [results, fields] = await db.execute(
                "SELECT * FROM Users WHERE id = ? LIMIT 1",
                [id],
            );
            console.log("\nResults:", results, "\nFields", fields);
            return results;
        }

        if (!token) return null;

        return await User.findOne({ refreshTokens: token });
    } catch (error) {
        console.error(error);
        // throw Error(`Error in useUser: ${error.message}`);
    }
};

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
        (resource.permissions.usersRead &&
            resource.permissions.usersRead.includes(user._id)) ||
        hasCommonItem(resource.permissions.groupsRead, user.groups)
    );
};

export const canEdit = (resource, user) => {
    if (!user) {
        return resource.permissions?.allWrite;
    }

    return (
        (resource.createdBy &&
            resource.createdBy.toString() === user._id.toString()) ||
        resource.permissions == undefined ||
        resource.permissions.allWrite ||
        (resource.permissions.usersWrite &&
            resource.permissions.usersWrite.includes(user._id)) ||
        hasCommonItem(resource.permissions.groupsWrite, user.groups)
    );
};

export const queryReadableResources = (user) => {
    if (!user) {
        return {
            $or: [
                { permissions: { $exists: false } },
                { "permissions.allWrite": true },
                { "permissions.allRead": true },
            ],
        };
    }

    let groupPerms = [];
    user.groups.forEach((groupId) => {
        groupPerms.push({ "permissions.groupsRead": { $in: [groupId] } });
        groupPerms.push({ "permissions.groupsWrite": { $in: [groupId] } });
    });

    return {
        $or: [
            { createdBy: user._id },
            { permissions: { $exists: false } },
            { "permissions.allWrite": true },
            { "permissions.allRead": true },
            { "permissions.usersRead": { $in: [user._id] } },
            { "permissions.usersWrite": { $in: [user._id] } },
            ...groupPerms,
        ],
    };
};

export const queryWritableResources = {};
