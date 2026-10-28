import fs from "node:fs";
import { customAlphabet } from "nanoid";
import { connectDatabase } from "./postgres-connection.mjs";

const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const makePublicId = customAlphabet(alphabet, 6);
const json = JSON.stringify;

function argument(name, fallback = null) {
    const index = process.argv.indexOf(`--${name}`);
    return index === -1 ? fallback : process.argv[index + 1];
}

const bundlePath = argument("bundle");
const ownerUsername = argument("owner");
const courseName = argument("name");
const description = argument("description");
const enrollment = argument("enrollment", "private");

if (!bundlePath || !ownerUsername || !courseName || !description) {
    throw new Error("Usage: node --env-file=.env scripts/import-resource-course.mjs --bundle <path> --owner <username> --name <course name> --description <description> [--enrollment open|paid|private]");
}

if (!fs.existsSync(bundlePath)) throw new Error(`Bundle not found: ${bundlePath}`);
if (!new Set(["open", "paid", "private"]).has(enrollment)) throw new Error(`Invalid enrollment: ${enrollment}`);

function parseBundle(path) {
    const normalized = fs.readFileSync(path, "utf8")
        .replace(/\\\r?\n/g, "")
        .replaceAll("&#x20;", " ")
        .replace(/\\([<>])/g, "$1");

    return JSON.parse(normalized);
}

const bundle = parseBundle(bundlePath);

// Keep generated questions inside Alpaca's input limits without changing the
// concepts or correct answers. These corrections apply only when the matching
// logical key exists in an imported bundle.
const quizCorrections = {
    "quiz-01": { choices: ["A list of weekly tasks", "Where to play and how to win", "A statement of company vision", "A measure of execution quality"], answers: ["Where to play and how to win"] },
    "quiz-03": { answers: ["Strategy chooses; tactics support it."] },
    "quiz-04": { choices: ["To replace customer interviews", "To compare market segments", "To calculate company valuation", "To predict the exact launch date"], answers: ["To compare market segments"] },
    "quiz-06": { choices: ["Choose the broadest audience", "Select the largest market", "Compare learning speed and risk", "Choose the fewest interviews"], answers: ["Compare learning speed and risk"] },
    "quiz-08": { answers: ["It requires costly customer education."] },
    "quiz-09": { choices: ["Red avoids; blue copies", "Red competes; blue changes value", "Red seeks new; blue existing", "Red removes; blue assures demand"], answers: ["Red competes; blue changes value"] },
    "quiz-13": { choices: ["One function across industries", "Industry-specific complete SaaS", "A buyer-seller connector", "A developer-only product"], answers: ["Industry-specific complete SaaS"] },
    "quiz-14": { answers: ["Core product creates value before ecosystem."] },
    "quiz-15": { prompt: "Name the four marketplace metrics recommended by the course." },
    "quiz-17": { choices: ["Users add value for other users", "A large advertising budget", "Many unrelated product features", "The company hires employees"], answers: ["Users add value for other users"] },
    "quiz-19": { choices: ["It creates a network effect", "It damages customer trust", "It guarantees a higher take rate", "It removes all competition"], answers: ["It damages customer trust"] },
    "quiz-20": { prompt: "Name the six barriers to entry listed in the course." },
    "quiz-23": { choices: ["Yes, the capstone is enough", "No, both are required", "Yes, with two peer reviews", "No, the capstone requires 80"], answers: ["No, both are required"] },
    "quiz-24": { answers: ["State assumptions and their cheapest tests."] },
};

if (bundle.source?.title === "Startup Strategy Fundamentals: Complete Paid Course") {
    for (const quiz of bundle.quizzes || []) {
        Object.assign(quiz, quizCorrections[quiz.key] || {});
    }
}

function validateBundle(data) {
    const errors = [];
    const noteKeys = new Set((data.notes || []).map((note) => note.key));
    const quizKeys = new Set((data.quizzes || []).map((quiz) => quiz.key));
    const sourceKey = data.source?.key;
    const quizTypes = new Set(["prompt-response", "multiple-choice", "fill-in-the-blank", "ordered-list-answer", "unordered-list-answer", "verbatim"]);

    if (!data.source || !sourceKey) errors.push("A keyed source is required");
    if (!data.notes?.length) errors.push("At least one note is required");
    if (!data.quizzes?.length) errors.push("At least one quiz is required");
    if (noteKeys.size !== data.notes?.length) errors.push("Note keys must be unique");
    if (quizKeys.size !== data.quizzes?.length) errors.push("Quiz keys must be unique");

    const validateTags = (item) => {
        if ((item.tags || []).length > 20) errors.push(`${item.key}: more than 20 tags`);
        for (const tag of item.tags || []) if (!tag || tag.length > 16) errors.push(`${item.key}: invalid tag '${tag}'`);
    };

    for (const note of data.notes || []) {
        if (!note.title || note.title.length > 100) errors.push(`${note.key}: invalid title length`);
        if (!note.text || note.text.length > 8192) errors.push(`${note.key}: invalid text length`);
        if (!(note.sourceKeys || []).includes(sourceKey)) errors.push(`${note.key}: missing source reference`);
        validateTags(note);
    }

    for (const quiz of data.quizzes || []) {
        if (!quizTypes.has(quiz.type)) errors.push(`${quiz.key}: invalid type`);
        if (!quiz.prompt || quiz.prompt.length > 256) errors.push(`${quiz.key}: invalid prompt length`);
        if (!quiz.answers?.length) errors.push(`${quiz.key}: at least one answer is required`);
        for (const choice of quiz.choices || []) if (!choice || choice.length > 32) errors.push(`${quiz.key}: choice exceeds 32 characters: ${choice}`);
        for (const answer of quiz.answers || []) if (!answer || answer.length > 45) errors.push(`${quiz.key}: answer exceeds 45 characters: ${answer}`);
        for (const hint of quiz.hints || []) if (hint.length > 256) errors.push(`${quiz.key}: hint exceeds 256 characters`);
        if (quiz.type === "multiple-choice" && !quiz.answers.every((answer) => quiz.choices.includes(answer))) errors.push(`${quiz.key}: answer must exactly match a choice`);
        for (const key of quiz.noteKeys || []) if (!noteKeys.has(key)) errors.push(`${quiz.key}: unknown note key ${key}`);
        if (!(quiz.sourceKeys || []).includes(sourceKey) && !(quiz.noteKeys || []).length) errors.push(`${quiz.key}: missing source or note reference`);
        validateTags(quiz);
    }

    validateTags(data.source || { key: "source" });
    if (courseName.length > 100) errors.push("Course name exceeds 100 characters");
    if (description.length > 512) errors.push("Course description exceeds 512 characters");

    if (errors.length) throw new Error(`Bundle validation failed:\n- ${errors.join("\n- ")}`);
}

validateBundle(bundle);

const connection = await connectDatabase();
const identityTables = new Set(["sources", "notes", "quizzes", "courses"]);

async function insert(table, row) {
    const columns = Object.keys(row);
    const placeholders = columns.map(() => "?").join(", ");
    const sql = `INSERT INTO \`${table}\` (${columns.map((key) => `\`${key}\``).join(", ")}) VALUES (${placeholders})${identityTables.has(table) ? " RETURNING id" : ""}`;
    const [rows] = await connection.execute(sql, Object.values(row));
    return rows[0]?.id;
}

function permissionRow(resourceId, resourceType, permissions = {}) {
    return {
        resource_id: resourceId,
        resource_type: resourceType,
        group_id: null,
        group_locked: Boolean(permissions.groupLocked),
        all_read: permissions.allWrite ? true : Boolean(permissions.allRead),
        all_write: Boolean(permissions.allWrite),
        read: json(permissions.read || []),
        write: json(permissions.write || []),
    };
}

await connection.beginTransaction();

try {
    const [owners] = await connection.execute("SELECT id FROM users WHERE username = ? AND is_deleted = false", [ownerUsername]);
    if (!owners.length) throw new Error(`Owner not found: ${ownerUsername}`);
    const ownerId = owners[0].id;

    const [duplicates] = await connection.execute("SELECT id FROM courses WHERE lower(name) = lower(?) AND is_deleted = false", [courseName]);
    if (duplicates.length) throw new Error(`Course already exists: ${courseName}`);

    const sourceId = await insert("sources", {
        public_id: makePublicId(),
        title: bundle.source.title,
        medium: bundle.source.medium === "other" ? "article" : bundle.source.medium,
        url: bundle.source.url || null,
        tags: json(bundle.source.tags || []),
        credits: json((bundle.source.authors || []).map((name) => ({ name, type: "Author" }))),
        created_by: ownerId,
        published_at: bundle.source.publishedAt || null,
        last_accessed: bundle.source.lastAccessed || null,
    });
    await insert("resource_permissions", permissionRow(sourceId, "source", bundle.source.permissions));
    await insert("resource_contributors", { resource_id: sourceId, user_id: ownerId, type: "source" });

    const noteIds = new Map();
    for (const note of bundle.notes) {
        const id = await insert("notes", {
            public_id: makePublicId(), title: note.title, text: note.text,
            tags: json(note.tags || []), created_by: ownerId,
        });
        noteIds.set(note.key, id);
        await insert("resource_permissions", permissionRow(id, "note", note.permissions));
        await insert("resource_contributors", { resource_id: id, user_id: ownerId, type: "note" });
        await insert("resource_relations", { a: sourceId, b: id, a_type: "source", b_type: "note", include_reference: true, reference: (note.provenance?.pages || []).join(", ") || null, reference_type: note.provenance?.pages?.length ? "page" : null });
    }

    const quizIds = new Map();
    for (const quiz of bundle.quizzes) {
        const id = await insert("quizzes", {
            public_id: makePublicId(), type: quiz.type, prompt: quiz.prompt,
            choices: json(quiz.choices || []), answers: json(quiz.answers || []),
            hints: json(quiz.hints || []), tags: json(quiz.tags || []), created_by: ownerId,
        });
        quizIds.set(quiz.key, id);
        await insert("resource_permissions", permissionRow(id, "quiz", quiz.permissions));
        await insert("resource_contributors", { resource_id: id, user_id: ownerId, type: "quiz" });
        await insert("resource_relations", { a: id, b: sourceId, a_type: "quiz", b_type: "source", include_reference: true, reference: (quiz.provenance?.pages || []).join(", ") || null, reference_type: quiz.provenance?.pages?.length ? "page" : null });
        for (const noteKey of quiz.noteKeys || []) {
            await insert("resource_relations", { a: id, b: noteIds.get(noteKey), a_type: "quiz", b_type: "note", include_reference: false, reference: null, reference_type: null });
        }
    }

    const courseId = await insert("courses", {
        public_id: makePublicId(), name: courseName, description,
        enrollment, created_by: ownerId,
    });
    await insert("course_users", { course_id: courseId, user_id: ownerId, role: "owner", expiration: null });
    await insert("resource_permissions", permissionRow(courseId, "course", bundle.source.permissions));

    await insert("resource_relations", { a: sourceId, b: courseId, a_type: "source", b_type: "course", include_reference: true, reference: null, reference_type: null });
    for (const id of noteIds.values()) await insert("resource_relations", { a: id, b: courseId, a_type: "note", b_type: "course", include_reference: true, reference: null, reference_type: null });
    for (const id of quizIds.values()) await insert("resource_relations", { a: id, b: courseId, a_type: "quiz", b_type: "course", include_reference: false, reference: null, reference_type: null });

    await connection.commit();
    console.log(JSON.stringify({ courseId, courseName, owner: ownerUsername, enrollment, sourceCount: 1, noteCount: noteIds.size, quizCount: quizIds.size }, null, 2));
} catch (error) {
    await connection.rollback();
    throw error;
} finally {
    await connection.end();
}
