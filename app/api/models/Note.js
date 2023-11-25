import { model, models, Schema } from "mongoose";
import PermissionSchema from "./PermissionSchema";

// Should add option to link to videos/images instead of text
// Captions will be required in those cases

import MAX from "@/lib/max";
// Don't forget to validate at least one source ID

const NoteSchema = new Schema(
    {
        text: {
            type: String,
            required: true,
            minLength: 1,
            maxLength: MAX.noteText,
        },
        tags: [
            {
                type: String,
                minLength: 1,
                maxLength: MAX.tag,
            },
        ],
        categories: [
            {
                type: Schema.Types.ObjectId,
                ref: "category"
            }
        ],
        sources: [
            {
                type: Schema.Types.ObjectId,
                ref: "source",
            },
        ],
        contributors: [
            {
                type: Schema.Types.ObjectId,
                ref: "user",
            },
        ],
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "user",
            required: true,
        },
        permissions: PermissionSchema,
    },
    {
        timestamps: true,
    },
);

NoteSchema.set("toJSON", {
    virtuals: true,
});

export default models?.note || model("note", NoteSchema);
