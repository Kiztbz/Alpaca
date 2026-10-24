import bcrypt from "bcrypt";
import { connectDatabase } from "./postgres-connection.mjs";

const required = ["DATABASE_URL"];

for (const key of required) {
    if (!process.env[key]) throw new Error(`Missing ${key} in .env`);
}

const connection = await connectDatabase();

const password = "AlpacaTest123!";
const passwordHash = await bcrypt.hash(password, 10);
const json = JSON.stringify;

const settings = json({
    showConfetti: true,
    showResourceOptions: true,
    notifications: { email: true, push: true },
});

const identityTables = new Set(["users", "groups", "sources", "notes", "quizzes", "courses", "notifications", "user_reports", "error_logs"]);

async function insert(table, row) {
    const columns = Object.keys(row);
    const placeholders = columns.map(() => "?").join(", ");
    const sql = `INSERT INTO \`${table}\` (${columns.map((key) => `\`${key.toLowerCase()}\``).join(", ")}) VALUES (${placeholders})${identityTables.has(table) ? " RETURNING id" : ""}`;
    const [rows] = await connection.execute(sql, Object.values(row));
    return rows[0]?.id;
}

async function idsFor(table, publicIds) {
    const placeholders = publicIds.map(() => "?").join(", ");
    const [rows] = await connection.execute(
        `SELECT id, public_id FROM \`${table}\` WHERE public_id IN (${placeholders})`,
        publicIds,
    );
    return Object.fromEntries(rows.map((row) => [row.public_id, row.id]));
}

async function deletePreviousSeed() {
    const userPublicIds = ["TUA001", "TUI001", "TUS001", "TUP001"];
    const groupPublicIds = ["TGR001", "TGR002"];
    const sourcePublicIds = ["TSR001", "TSR002", "TSR003", "TSR004"];
    const notePublicIds = ["TNT001", "TNT002", "TNT003", "TNT004", "TNT005"];
    const quizPublicIds = ["TQZ001", "TQZ002", "TQZ003", "TQZ004", "TQZ005", "TQZ006"];
    const coursePublicIds = ["TCR001", "TCR002", "TCR003"];

    const users = await idsFor("users", userPublicIds);
    const groups = await idsFor("groups", groupPublicIds);
    const sources = await idsFor("sources", sourcePublicIds);
    const notes = await idsFor("notes", notePublicIds);
    const quizzes = await idsFor("quizzes", quizPublicIds);
    const courses = await idsFor("courses", coursePublicIds);

    const userIds = Object.values(users);
    const groupIds = Object.values(groups);
    const courseIds = Object.values(courses);

    if (userIds.length) {
        const q = userIds.map(() => "?").join(", ");
        await connection.execute(`DELETE FROM notifications WHERE recipient_id IN (${q}) OR sender_id IN (${q})`, [...userIds, ...userIds]);
        await connection.execute(`DELETE FROM associates WHERE A IN (${q}) OR B IN (${q})`, [...userIds, ...userIds]);
        await connection.execute(`DELETE FROM blocked WHERE blocker IN (${q}) OR blocked IN (${q})`, [...userIds, ...userIds]);
        await connection.execute(`DELETE FROM members WHERE user_id IN (${q})`, userIds);
        await connection.execute(`DELETE FROM course_users WHERE user_id IN (${q})`, userIds);
        await connection.execute(`DELETE FROM user_quizzes WHERE user_id IN (${q})`, userIds);
        await connection.execute(`DELETE FROM resource_contributors WHERE user_id IN (${q})`, userIds);
        await connection.execute(`DELETE FROM user_reports WHERE reporter IN (${q}) OR reported IN (${q})`, [...userIds, ...userIds]);
    }

    if (groupIds.length) {
        const q = groupIds.map(() => "?").join(", ");
        await connection.execute(`DELETE FROM members WHERE group_id IN (${q})`, groupIds);
        await connection.execute(`DELETE FROM resource_permissions WHERE group_id IN (${q})`, groupIds);
    }

    if (courseIds.length) {
        const q = courseIds.map(() => "?").join(", ");
        await connection.execute(`DELETE FROM course_users WHERE course_id IN (${q})`, courseIds);
        await connection.execute(`DELETE FROM courses_hierarchy WHERE inferior IN (${q}) OR superior IN (${q})`, [...courseIds, ...courseIds]);
    }

    for (const [type, records] of [["source", sources], ["note", notes], ["quiz", quizzes], ["course", courses], ["group", groups]]) {
        const resourceIds = Object.values(records);
        if (!resourceIds.length) continue;
        const q = resourceIds.map(() => "?").join(", ");
        await connection.execute(`DELETE FROM resource_permissions WHERE resource_type = ? AND resource_id IN (${q})`, [type, ...resourceIds]);
        await connection.execute(`DELETE FROM resource_relations WHERE (A_type = ? AND A IN (${q})) OR (B_type = ? AND B IN (${q}))`, [type, ...resourceIds, type, ...resourceIds]);
        if (["source", "note", "quiz"].includes(type)) {
            await connection.execute(`DELETE FROM resource_contributors WHERE type = ? AND resource_id IN (${q})`, [type, ...resourceIds]);
        }
    }

    for (const [table, publicIds] of [["quizzes", quizPublicIds], ["notes", notePublicIds], ["sources", sourcePublicIds], ["courses", coursePublicIds], ["groups", groupPublicIds], ["users", userPublicIds]]) {
        const q = publicIds.map(() => "?").join(", ");
        await connection.execute(`DELETE FROM \`${table}\` WHERE public_id IN (${q})`, publicIds);
    }
}

await connection.beginTransaction();

try {
    await deletePreviousSeed();

    const admin = await insert("users", {
        public_id: "TUA001", username: "demo_admin", display_name: "Demo Admin", role: "admin",
        email: "admin@alpaca.test", email_verified: true, description: "Administrator account for testing moderation and reports.",
        settings, is_private: false, password: passwordHash, tokens: json([]),
    });
    const instructor = await insert("users", {
        public_id: "TUI001", username: "demo_instructor", display_name: "Maya Instructor", role: "user",
        email: "instructor@alpaca.test", email_verified: true, description: "Creates courses and learning resources.",
        settings, is_private: false, password: passwordHash, tokens: json([]),
    });
    const student = await insert("users", {
        public_id: "TUS001", username: "demo_student", display_name: "Sam Student", role: "user",
        email: "student@alpaca.test", email_verified: true, description: "Primary learner account with progress and notifications.",
        settings, is_private: false, password: passwordHash, tokens: json([]),
    });
    const privateUser = await insert("users", {
        public_id: "TUP001", username: "demo_private", display_name: "Priya Private", role: "moderator",
        email: "private@alpaca.test", email_verified: false, description: "Private profile for permission testing.",
        settings, is_private: true, password: passwordHash, tokens: json([]),
    });

    const studyGroup = await insert("groups", {
        public_id: "TGR001", name: "Learning Lab", description: "Public group for collaborative study.",
        icon: null, is_public: true, created_by: instructor,
    });
    const privateGroup = await insert("groups", {
        public_id: "TGR002", name: "Private Research Team", description: "Private group for access-control testing.",
        icon: null, is_public: false, created_by: privateUser,
    });

    for (const row of [
        [studyGroup, instructor, "owner"], [studyGroup, student, "student"], [studyGroup, admin, "admin"],
        [privateGroup, privateUser, "owner"], [privateGroup, instructor, "user"],
    ]) await insert("members", { group_id: row[0], user_id: row[1], role: row[2] });

    await insert("associates", { A: instructor, B: student });
    await insert("associates", { A: student, B: instructor });
    await insert("blocked", { blocker: privateUser, blocked: student });

    const source1 = await insert("sources", {
        public_id: "TSR001", title: "Learning How to Learn", medium: "book", url: "https://example.com/learning",
        tags: json(["learning", "memory"]), credits: json([{ name: "Barbara Oakley", type: "Author" }]), created_by: instructor,
        published_at: "2018-08-07", last_accessed: "2026-10-20",
    });
    const source2 = await insert("sources", {
        public_id: "TSR002", title: "Spaced Repetition Explained", medium: "article", url: "https://example.com/spaced-repetition",
        tags: json(["spaced repetition", "study"]), credits: json([{ name: "Learning Lab", type: "Publisher" }]), created_by: instructor,
        published_at: "2024-03-15", last_accessed: "2026-10-21",
    });
    const source3 = await insert("sources", {
        public_id: "TSR003", title: "The Science of Memory", medium: "video", url: "https://example.com/memory-video",
        tags: json(["memory", "science"]), credits: json([{ name: "Dr. Elena Park", type: "Speaker" }]), created_by: student,
        published_at: "2025-01-10", last_accessed: "2026-10-22",
    });
    const source4 = await insert("sources", {
        public_id: "TSR004", title: "Private Research Notes", medium: "website", url: "https://example.com/private-research",
        tags: json(["private", "research"]), credits: json([{ name: "Priya Private", type: "Author" }]), created_by: privateUser,
        published_at: null, last_accessed: "2026-10-23",
    });

    const note1 = await insert("notes", { public_id: "TNT001", title: "Active Recall", text: "Active recall strengthens memory by retrieving information without looking at the answer.", tags: json(["memory", "recall"]), created_by: instructor });
    const note2 = await insert("notes", { public_id: "TNT002", title: "Spacing Effect", text: "Reviewing information over expanding intervals improves long-term retention.", tags: json(["spacing", "retention"]), created_by: instructor });
    const note3 = await insert("notes", { public_id: "TNT003", title: "Interleaving", text: "Mixing related problem types helps learners choose the correct strategy.", tags: json(["practice", "strategy"]), created_by: student });
    const note4 = await insert("notes", { public_id: "TNT004", title: "Memory Consolidation", text: "Sleep supports the consolidation of newly encoded memories.", tags: json(["sleep", "memory"]), created_by: student });
    const note5 = await insert("notes", { public_id: "TNT005", title: "Restricted Findings", text: "Internal findings used to test private permissions.", tags: json(["private"]), created_by: privateUser });

    const quizRows = [
        ["TQZ001", "prompt-response", "What learning technique retrieves information without looking at the answer?", [], ["Active recall"], ["It starts with active..."], ["recall"]],
        ["TQZ002", "multiple-choice", "Which schedule best supports long-term retention?", ["One long session", "Expanding review intervals", "No review", "Passive rereading"], ["Expanding review intervals"], ["Think about spacing."], ["spacing"]],
        ["TQZ003", "fill-in-the-blank", "Sleep supports memory _____.", [], ["consolidation"], ["A process that stabilizes memories."], ["sleep"]],
        ["TQZ004", "ordered-list-answer", "Order the learning loop.", [], [["Study", "Recall", "Check", "Repeat"]], ["Begin by encountering the material."], ["process"]],
        ["TQZ005", "unordered-list-answer", "Name two effective study techniques.", [], [["Active recall", "Spaced repetition"]], ["Retrieval and timing."], ["study"]],
        ["TQZ006", "verbatim", "Type the learning motto exactly: Practice makes progress.", [], ["Practice makes progress."], [], ["verbatim"]],
    ];
    const quizIds = [];
    for (const [publicId, type, prompt, choices, answers, hints, tags] of quizRows) {
        quizIds.push(await insert("quizzes", { public_id: publicId, type, prompt, choices: json(choices), answers: json(answers), hints: json(hints), tags: json(tags), created_by: instructor }));
    }

    const course1 = await insert("courses", { public_id: "TCR001", name: "Learning Fundamentals", description: "Open introductory course covering memory and effective study.", enrollment: "open", created_by: instructor });
    const course2 = await insert("courses", { public_id: "TCR002", name: "Advanced Memory Practice", description: "A private follow-up course for deliberate practice.", enrollment: "private", created_by: instructor });
    const course3 = await insert("courses", { public_id: "TCR003", name: "Research Methods", description: "A paid-course example for enrollment testing.", enrollment: "paid", created_by: privateUser });

    for (const row of [[course1, instructor, "owner"], [course1, student, "student"], [course1, admin, "student"], [course2, instructor, "owner"], [course2, student, "student"], [course3, privateUser, "owner"]]) {
        await insert("course_users", { course_id: row[0], user_id: row[1], role: row[2], expiration: null });
    }
    await insert("courses_hierarchy", { inferior: course2, superior: course1, relationship: "prerequisite", average_level_required: 2, minimum_level_required: 1 });
    await insert("courses_hierarchy", { inferior: course1, superior: course3, relationship: "encompasses", average_level_required: 0, minimum_level_required: 0 });

    const resources = [
        ...[source1, source2, source3].map((id) => [id, "source", studyGroup, true, false, json([student]), json([instructor])]),
        [source4, "source", privateGroup, false, false, json([privateUser, instructor]), json([privateUser])],
        ...[note1, note2, note3, note4].map((id) => [id, "note", studyGroup, true, false, json([student]), json([instructor])]),
        [note5, "note", privateGroup, false, false, json([privateUser]), json([privateUser])],
        ...quizIds.map((id) => [id, "quiz", studyGroup, true, false, json([student]), json([instructor])]),
        [course1, "course", studyGroup, true, false, json([student]), json([instructor])],
        [course2, "course", studyGroup, false, false, json([student, instructor]), json([instructor])],
        [course3, "course", privateGroup, false, false, json([privateUser]), json([privateUser])],
        [studyGroup, "group", studyGroup, true, false, json([student, instructor, admin]), json([instructor, admin])],
        [privateGroup, "group", privateGroup, false, false, json([privateUser, instructor]), json([privateUser])],
    ];
    for (const [resourceId, resourceType, groupId, allRead, allWrite, read, write] of resources) {
        await insert("resource_permissions", { resource_id: resourceId, resource_type: resourceType, group_id: groupId, group_locked: false, all_read: allRead, all_write: allWrite, read, write });
    }

    const relations = [
        [source1, note1, "source", "note"], [source2, note2, "source", "note"], [source3, note4, "source", "note"],
        [quizIds[0], source1, "quiz", "source"], [quizIds[1], source2, "quiz", "source"], [quizIds[2], note4, "quiz", "note"],
        [quizIds[3], note3, "quiz", "note"], [quizIds[4], note1, "quiz", "note"], [quizIds[5], source1, "quiz", "source"],
        [source1, course1, "source", "course"], [source2, course1, "source", "course"], [source3, course2, "source", "course"],
        [note1, course1, "note", "course"], [note2, course1, "note", "course"], [note3, course2, "note", "course"], [note4, course2, "note", "course"],
        ...quizIds.slice(0, 4).map((id) => [id, course1, "quiz", "course"]),
        ...quizIds.slice(4).map((id) => [id, course2, "quiz", "course"]),
    ];
    for (const [A, B, AType, BType] of relations) {
        await insert("resource_relations", { A, B, A_type: AType, B_type: BType, include_reference: true, reference: null, reference_type: null });
    }

    for (let index = 0; index < quizIds.length; index += 1) {
        await insert("user_quizzes", { user_id: student, quiz_id: quizIds[index], level: index % 4, tries_at_level: index + 1, last_correct: "2026-10-23 09:00:00", hidden_until: index < 3 ? "2026-10-24 00:00:00" : "2026-10-28 00:00:00" });
        await insert("resource_contributors", { resource_id: quizIds[index], user_id: instructor, type: "quiz" });
    }
    for (const id of [source1, source2, source3]) await insert("resource_contributors", { resource_id: id, user_id: instructor, type: "source" });
    for (const id of [note1, note2, note3, note4]) await insert("resource_contributors", { resource_id: id, user_id: student, type: "note" });

    await insert("notifications", { recipient_id: student, sender_id: instructor, group_id: studyGroup, type: "message", subject: "Welcome to Learning Lab", message: "Your demo course and quizzes are ready to explore.", action: "Reply", is_read: false });
    await insert("notifications", { recipient_id: student, sender_id: admin, group_id: null, type: "alert", subject: "Demo notification", message: "This unread alert is included for interface testing.", action: "Delete", is_read: false });
    await insert("notifications", { recipient_id: instructor, sender_id: privateUser, group_id: privateGroup, type: "invite", subject: "Private Research Team", message: "You have been invited to collaborate.", action: "Accept", is_read: false });
    await insert("user_reports", { reporter: student, reported: privateUser, type: "other", reason: "Dummy report for testing the admin review screen.", link: "/users/demo_private" });

    await connection.commit();
    console.log("Dummy data seeded successfully.");
    console.log("Database: Supabase PostgreSQL");
    console.log("Accounts: demo_admin, demo_instructor, demo_student, demo_private");
    console.log(`Password: ${password}`);
} catch (error) {
    await connection.rollback();
    throw error;
} finally {
    await connection.end();
}
