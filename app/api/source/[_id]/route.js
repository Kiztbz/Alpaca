import { NextResponse } from "next/server";
import { useUser } from "@/lib/auth";
import { cookies } from "next/headers";
// import { Source } from "@mneme_app/database-models";
import { Source } from "@/app/api/models";
import { server, unauthorized } from "@/lib/apiErrorResponses";

export async function DELETE(req, { params }) {
    try {
        const user = await useUser({ token: cookies().get("token")?.value });

        if (!user) {
            return unauthorized;
        }

        const { _id } = params;

        const source = await Source.findById(_id);
        if (!source) {
            return NextResponse.json(
                {
                    message: `The source ${_id} could not be found to delete`,
                },
                { status: 404 },
            );
        }

        if (source.createdBy.toString() !== user.id.toString()) {
            return NextResponse.json(
                {
                    message: `User ${user.id} is not authorized to delete source ${_id}. Only the creator ${source.createdBy} is permitted`,
                },
                { status: 403 },
            );
        }

        const deletion = await Source.deleteOne({ _id });
        if (deletion.deletedCount === 0) {
            console.error(`Unable to delete source ${_id}`);
            return NextResponse.json(
                {
                    message: `Unable to delete source ${_id}`,
                },
                { status: 500 },
            );
        }
        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error(`[Source] DELETE error:\n ${error}`);
        return server;
    }
}
