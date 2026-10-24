import { connectDatabase } from "./postgres-connection.mjs";

const required = ["DATABASE_URL"];
for (const key of required) {
    if (!process.env[key]) throw new Error(`Missing ${key} in .env`);
}

const db = await connectDatabase();

const sourcePublicIds  = ["TSR001", "TSR002", "TSR003", "TSR004"];
const notePublicIds    = ["TNT001", "TNT002", "TNT003", "TNT004", "TNT005"];
const quizPublicIds    = ["TQZ001", "TQZ002", "TQZ003", "TQZ004", "TQZ005", "TQZ006"];
const coursePublicIds  = ["TCR001", "TCR002", "TCR003"];

async function idsFor(table, publicIds) {
    if (!publicIds.length) return [];
    const placeholders = publicIds.map(() => "?").join(", ");
    const [rows] = await db.execute(
        `SELECT id FROM \`${table}\` WHERE public_id IN (${placeholders})`,
        publicIds,
    );
    return rows.map(({ id }) => id);
}

await db.beginTransaction();
try {
    const sourceIds = await idsFor("sources",  sourcePublicIds);
    const noteIds   = await idsFor("notes",    notePublicIds);
    const quizIds   = await idsFor("quizzes",  quizPublicIds);
    const courseIds = await idsFor("courses",  coursePublicIds);

    if (courseIds.length) {
        const q = courseIds.map(() => "?").join(", ");
        await db.execute(`DELETE FROM course_users       WHERE course_id IN (${q})`,                        courseIds);
        await db.execute(`DELETE FROM courses_hierarchy  WHERE inferior  IN (${q}) OR superior IN (${q})`,  [...courseIds, ...courseIds]);
    }

    for (const [type, ids] of [["course", courseIds], ["note", noteIds], ["quiz", quizIds], ["source", sourceIds]]) {
        if (!ids.length) continue;
        const q = ids.map(() => "?").join(", ");
        await db.execute(`DELETE FROM resource_permissions WHERE resource_type = ? AND resource_id IN (${q})`, [type, ...ids]);
        await db.execute(`DELETE FROM resource_relations   WHERE (A_type = ? AND A IN (${q})) OR (B_type = ? AND B IN (${q}))`, [type, ...ids, type, ...ids]);
        if (type !== "course") {
            await db.execute(`DELETE FROM resource_contributors WHERE type = ? AND resource_id IN (${q})`, [type, ...ids]);
        }
    }

    if (quizIds.length) {
        const q = quizIds.map(() => "?").join(", ");
        await db.execute(`DELETE FROM user_quizzes WHERE quiz_id IN (${q})`, quizIds);
    }

    for (const [table, publicIds] of [
        ["quizzes", quizPublicIds],
        ["notes",   notePublicIds],
        ["sources", sourcePublicIds],
        ["courses", coursePublicIds],
    ]) {
        const q = publicIds.map(() => "?").join(", ");
        await db.execute(`DELETE FROM \`${table}\` WHERE public_id IN (${q})`, publicIds);
    }

    await db.commit();
    console.log("Test resources removed. Conflict resolution course is untouched.");
} catch (error) {
    await db.rollback();
    throw error;
} finally {
    await db.end();
}
