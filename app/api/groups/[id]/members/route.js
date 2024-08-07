import { unauthorized } from "@/lib/apiErrorResponses";
import { Notification, Group } from "@models";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { useUser } from "@/lib/auth";
import { db } from "@/lib/db/db.js";

export async function POST(req, { params }) {
    const { input } = await req.json();
    const { userId, username } = params;

    try {
        const user = await useUser({ token: cookies().get("token")?.value });
        if (!user) return unauthorized;

        // const isId = input.match(/^[0-9a-fA-F]{24}$/);

        // const member = await User.findOne({
        //     [isId ? "id" : "username"]: input,
        // });

        let member;
        if (userId) {
            const [memberResults, memberFields] = await db
                .promise()
                .query("SELECT `id` FROM `Users` WHERE `id` = ?", [userId]);
            member = memberResults.length > 0 ? memberResults[0] : false;
        }
        if (username) {
            const [memberResults, memberFields] = await db
                .promise()
                .query("SELECT `id` FROM `Users` WHERE `username` = ?", [
                    username,
                ]);
            member = memberResults.length > 0 ? memberResults[0] : false;
        }

        if (!member) {
            return NextResponse.json(
                {
                    success: false,
                    message: "No user found with that username or ID.",
                },
                { status: 404 },
            );
        }

        // NEED TO REMOVE Group AND Notification MODELS
        const group = await Group.findOne({ _id: id });

        if (!group) {
            return NextResponse.json(
                {
                    success: false,
                    message: "No group found with that ID.",
                },
                { status: 404 },
            );
        }

        if (group.users.includes(member.id)) {
            return NextResponse.json(
                {
                    success: false,
                    message: "User is already a member of this group.",
                },
                { status: 400 },
            );
        }

        const alreadySent = await Notification.findOne({
            type: 2,
            recipient: member.id,
            group: group.id,
        });

        if (!alreadySent) {
            const notification = await Notification.create({
                type: 2,
                sender: user.id,
                recipient: member.id,
                group: group.id,
                subject: "Group Invite",
                message: `You have been invited by ${user.username} to join ${group.name}.`,
            });

            await notification.save();

            member.notifications.push(notification.id);
            await member.save();
        }

        return NextResponse.json(
            {
                success: true,
                message: "Successfully invited user to group.",
            },
            { status: 200 },
        );
    } catch (error) {
        console.error("[ERROR] /api/groups/id/members:POST ", error);
        return NextResponse.json(
            {
                success: false,
                message: "Something went wrong.",
            },
            { status: 500 },
        );
    }
}
