import { connectDatabase } from "./postgres-connection.mjs";

const required = ["DATABASE_URL"];
for (const key of required) {
    if (!process.env[key]) throw new Error(`Missing ${key} in .env`);
}

const db = await connectDatabase();

const json = JSON.stringify;
const identityTables = new Set(["users", "groups", "sources", "notes", "quizzes", "courses", "notifications", "user_reports", "error_logs"]);

async function insert(table, row) {
    const columns = Object.keys(row);
    const placeholders = columns.map(() => "?").join(", ");
    const sql = `INSERT INTO \`${table}\` (${columns.map((column) => `\`${column.toLowerCase()}\``).join(", ")}) VALUES (${placeholders})${identityTables.has(table) ? " RETURNING id" : ""}`;
    const [rows] = await db.execute(sql, Object.values(row));
    return rows[0]?.id;
}

async function idsFor(table, publicIds) {
    if (!publicIds.length) return [];
    const placeholders = publicIds.map(() => "?").join(", ");
    const [rows] = await db.execute(
        `SELECT id FROM \`${table}\` WHERE public_id IN (${placeholders})`,
        publicIds,
    );
    return rows.map(({ id }) => id);
}

const coursePublicId = "CRC001";
const notePublicIds = Array.from({ length: 8 }, (_, index) => `CRN${String(index + 1).padStart(3, "0")}`);
const quizPublicIds = Array.from({ length: 48 }, (_, index) => `CRQ${String(index + 1).padStart(3, "0")}`);
const sourcePublicIds = Array.from({ length: 7 }, (_, index) => `CRS${String(index + 1).padStart(3, "0")}`);

const sources = [
    { publicId: "CRS001", title: "Acas — Handling a problem at work", url: "https://www.acas.org.uk/handling-a-problem-at-work", credits: [{ name: "Acas", type: "Publisher" }] },
    { publicId: "CRS002", title: "CIPD — Conflict management", url: "https://www.cipd.org/en/topics/conflict-management/", credits: [{ name: "CIPD", type: "Publisher" }] },
    { publicId: "CRS003", title: "CIPD — Mediation at work", url: "https://www.cipd.org/uk/knowledge/factsheets/mediation-factsheet/", credits: [{ name: "CIPD", type: "Publisher" }] },
    { publicId: "CRS004", title: "Center for Nonviolent Communication — Four-part process", url: "https://www.nonviolentcommunication.com/pdf_files/4part_nvc_process.pdf", credits: [{ name: "Center for Nonviolent Communication", type: "Publisher" }] },
    { publicId: "CRS005", title: "Center for Nonviolent Communication — Resources", url: "https://www.cnvc.org/", credits: [{ name: "Center for Nonviolent Communication", type: "Publisher" }] },
    { publicId: "CRS006", title: "Harvard Program on Negotiation — What is negotiation?", url: "https://www.pon.harvard.edu/daily/negotiation-skills-daily/what-is-negotiation/", credits: [{ name: "Harvard Program on Negotiation", type: "Publisher" }] },
    { publicId: "CRS007", title: "The Myers-Briggs Company — TKI model", url: "https://asia.themyersbriggs.com/instruments/tki/", credits: [{ name: "The Myers-Briggs Company", type: "Publisher" }] },
];

const units = [
    {
        title: "Unit 1 — Foundations of Workplace Conflict",
        time: "1.5 hours",
        tags: ["conflict", "foundations", "workplace"],
        sources: [0, 1],
        text: `Learning objectives
• Define workplace conflict and explain why it can occur without malicious intent.
• Distinguish task, process, relationship and values conflict.
• Separate observable facts, interpretations and impact.
• Identify when a concern requires formal escalation.

Core notes
Workplace conflict is a perceived incompatibility between goals, needs, expectations, values or preferred actions. Disagreement can reveal useful information; harm increases when conflict is personalised, ignored or handled unfairly.

Task conflict concerns what should be done. Process conflict concerns who does what, when and how. Relationship conflict involves interpersonal tension or distrust. Values conflict involves differences in principles or priorities. One event may contain several types.

Common triggers include role ambiguity, workload, deadlines, inconsistent rules, poor handovers, communication gaps and perceived unfairness. Warning signs such as avoidance, sarcasm and repeated complaints are prompts to investigate, not proof of intent.

Keep fact, interpretation and impact separate. Fact: “The report arrived two days after the deadline.” Interpretation: “You do not respect my time.” Impact: “The client pack was delayed.”

Routine disputes may be discussed directly. Persistent matters may need a manager, HR or facilitator. Threats, violence, discrimination, serious misconduct or safeguarding concerns require the appropriate formal procedure.

Practical activity
Create a conflict map recording observable facts, each person’s interpretation, impact, concerns, missing information and the safest next step.`,
        questions: [
            ["prompt-response", "What is workplace conflict, and why can it occur even when both employees have good intentions?", [], ["A perceived incompatibility in goals, needs, expectations, values or actions. It can arise from misunderstandings, unclear responsibilities, competing priorities or different perspectives without malicious intent."], ["Define the incompatibility and name non-malicious causes."]],
            ["multiple-choice", "Two employees disagree about who approves a purchase request. What type of conflict is this primarily?", ["Relationship conflict", "Process conflict", "Values conflict", "Safeguarding concern"], ["Process conflict"], ["The disagreement concerns responsibility and how work is organised."]],
            ["fill-in-the-blank", "A disagreement about who performs a task, when it is performed and how it is organised is called _____ conflict.", [], ["Process"], ["Think about how work is organised."]],
            ["ordered-list-answer", "Arrange these routine conflict-resolution steps in a sensible sequence.", [], [["Establish facts", "Listen to perspectives", "Identify the issue", "Explore options", "Agree actions and follow-up"]], ["Safety assessment may need to come first."]],
            ["unordered-list-answer", "List four common organisational causes of workplace conflict.", [], [["Unclear responsibilities", "Competing priorities", "Communication gaps", "Unequal or perceived unfair workloads"]], ["Other valid examples include scarce resources, inconsistent rules, poor handovers and ambiguous expectations."]],
            ["verbatim", "Complete exactly: Conflict resolution aims to address disagreement constructively, fairly and _____.", [], ["safely"], []],
        ],
    },
    {
        title: "Unit 2 — Conflict Styles and Human Behaviour",
        time: "1.5 hours",
        tags: ["conflict", "styles", "behaviour"],
        sources: [6],
        text: `Learning objectives
• Describe five common conflict-handling modes.
• Select a style based on context and trade-offs.
• Recognise why power and safety can make compromise inappropriate.

Core notes
The Thomas–Kilmann framework describes competing, collaborating, compromising, avoiding and accommodating. These modes vary in assertiveness and cooperativeness.

Competing prioritises a decision and may be needed for urgent safety or compliance decisions. Collaboration seeks to address important concerns on both sides and is useful for complex issues when time and safety allow. Compromise seeks a mutually acceptable middle ground, but a midpoint is not automatically fair and cannot override legal duties, safety or rights.

Avoiding may allow a cooling-off period or suit a trivial matter, but persistent avoidance leaves issues unresolved. Accommodation prioritises the other party’s concern and may suit minor preferences, though repeated accommodation can create resentment or reflect coercion.

Consider urgency, importance, complexity, time, trust, authority and relative power. These are situational modes, not fixed personality types. Not all disputes have equal responsibility on both sides.

Practical activity
For five fictional scenarios, choose a conflict mode, explain its trade-off and state what information would change your choice.`,
        questions: [
            ["prompt-response", "Explain the difference between collaborating and compromising.", [], ["Collaboration seeks a solution addressing important concerns on both sides; compromise seeks a mutually acceptable middle ground, often involving trade-offs."], ["Compare solving concerns with finding a midpoint."]],
            ["multiple-choice", "When may a competing approach be appropriate?", ["When a manager feels annoyed", "When an urgent safety decision is needed", "To silence objections", "Whenever the other person has lower status"], ["When an urgent safety decision is needed"], ["Immediate safety may require decisive action."]],
            ["fill-in-the-blank", "The conflict mode that seeks to address both parties’ important concerns is called _____.", [], ["Collaborating"], []],
            ["ordered-list-answer", "Put a context check in order.", [], [["Identify urgency and safety", "Consider each party’s concerns", "Assess power and time", "Choose a suitable approach", "Review the result"]], []],
            ["unordered-list-answer", "List three factors that can affect which conflict style is appropriate.", [], [["Urgency", "Importance", "Power imbalance"]], ["Other valid factors include time, trust, complexity, relationship needs, authority and safety."]],
            ["verbatim", "Complete exactly: The five modes are competing, collaborating, compromising, avoiding and _____.", [], ["accommodating"], []],
        ],
    },
    {
        title: "Unit 3 — Emotional Intelligence and Self-Regulation",
        time: "2 hours",
        tags: ["conflict", "emotional-intelligence", "self-regulation"],
        sources: [1, 3],
        text: `Learning objectives
• Recognise emotional triggers and escalation signals.
• Use a pause-and-prepare routine.
• Distinguish emotion from assumption and behaviour.

Core notes
Anger, fear, embarrassment and frustration can signal that a need or expectation feels threatened. The emotion is real; its interpretation may be incomplete.

An event is interpreted; the interpretation affects emotion and behaviour; behaviour affects the next response. Testing assumptions can interrupt escalation.

When safe, slow breathing, relax posture, lower speaking pace and pause. If you cannot continue respectfully, request a time-limited break and agree when to resume. Empathy means trying to understand another perspective without requiring agreement. People remain responsible for their behaviour even when frustrated.

Reflect on the trigger, assumption, emotion, response, effect and possible alternative. Focus on changeable behaviours and systems rather than labels.

Practical activity
Complete a trigger log using a fictional or anonymised incident: event, interpretation, emotion, impulse, response and alternative response.`,
        questions: [
            ["prompt-response", "Describe how the trigger–interpretation–emotion–behaviour cycle can escalate a workplace disagreement.", [], ["An event receives an interpretation; that interpretation affects emotion and behaviour; the behaviour then shapes the other person’s response, potentially reinforcing the conflict."], []],
            ["multiple-choice", "You notice you are too angry to listen carefully. What is the best next step?", ["Send your reply immediately", "Pause and regulate, then resume when able", "Label the other person irrational", "Demand an apology first"], ["Pause and regulate, then resume when able"], ["A pause reduces impulsive responding."]],
            ["fill-in-the-blank", "Trying to understand another person’s perspective without necessarily agreeing is called _____.", [], ["Empathy"], []],
            ["ordered-list-answer", "Order a reflection cycle.", [], [["Identify the event", "Notice your interpretation and emotion", "Review your behaviour and its effect", "Choose an alternative response"]], []],
            ["unordered-list-answer", "List three signs that you may need to pause before responding.", [], [["Racing heart", "Tight jaw", "Inability to listen"]], ["Other valid signs include faster speech, interrupting, an urge to retaliate and a raised voice."]],
            ["verbatim", "Complete exactly: A pause should be time-limited and include a plan to _____ the conversation.", [], ["resume"], []],
        ],
    },
    {
        title: "Unit 4 — Communication and Active Listening",
        time: "2 hours",
        tags: ["conflict", "communication", "active-listening"],
        sources: [3, 4],
        text: `Learning objectives
• Use paraphrasing and open questions.
• Communicate assertively without personal attacks.
• Make concrete requests and maintain boundaries.

Core notes
Give attention, avoid unnecessary interruption and summarise the concern before presenting your view. Listening is not agreement; it improves understanding. Summarise neutrally and invite correction. Use open questions for explanation, clarifying questions for specifics and future-focused questions for solutions.

Assertiveness states concerns and boundaries clearly while respecting others. Avoid passive silence and aggressive attacks.

The observation–feeling–need–request structure describes an observation without evaluation, names a feeling, identifies a need or value and makes a concrete request.

Emotionally charged digital messages may need a private conversation when appropriate. Keep written messages factual; do not move serious complaints off-record to avoid accountability.

Practical activity
Rewrite accusations as specific, neutral and actionable statements. Practise paraphrasing a parent, customer or colleague’s concern.`,
        questions: [
            ["prompt-response", "Write an assertive statement addressing repeated last-minute changes to a work schedule.", [], ["When the rota changes after publication, it becomes difficult to arrange care. Could we agree to discuss changes with affected staff in advance except in emergencies?"], []],
            ["multiple-choice", "Which response best demonstrates active listening?", ["That is not my problem.", "You are wrong.", "Let me check I understand: the late change affected your staffing plan.", "Calm down."], ["Let me check I understand: the late change affected your staffing plan."], ["Look for a neutral paraphrase that checks understanding."]],
            ["fill-in-the-blank", "In the observation–feeling–need–request structure, the final element is a concrete _____.", [], ["request"], []],
            ["ordered-list-answer", "Order the four-part communication structure.", [], [["Observation", "Feeling", "Need", "Request"]], []],
            ["unordered-list-answer", "List three qualities of a useful clarifying question.", [], [["Neutral", "Specific", "Non-leading"]], ["Relevant and open where appropriate are also valid."]],
            ["verbatim", "Complete exactly: Assertiveness communicates needs and boundaries clearly while _____ others.", [], ["respecting"], []],
        ],
    },
    {
        title: "Unit 5 — De-escalation and Difficult Conversations",
        time: "2 hours",
        tags: ["conflict", "de-escalation", "safety"],
        sources: [0, 2],
        text: `Learning objectives
• Assess risk before engaging.
• Use calm language and proportionate boundaries.
• Recognise when informal discussion is unsafe or unsuitable.

Core notes
Consider immediate risk, ability to participate and available support. Do not attempt to manage violence alone or block exits.

Use a calm voice, respectful distance, simple language, listening and realistic choices. Avoid sarcasm, threats, crowding and public humiliation. Acknowledge concern without confirming unverified claims; explain that facts will be checked and the appropriate process followed.

State acceptable behaviour and the next step. A pause should include a clear return time when safe and appropriate. Credible threats, violence, safeguarding concerns, discrimination, harassment and serious misconduct may require formal reporting or emergency procedures.

After an incident, record objective details, preserve relevant evidence and follow organisational reporting procedures.

Practical activity
Role-play a difficult customer or parent interaction. Practise acknowledgement, fact-finding, a boundary, realistic options and escalation judgment.`,
        questions: [
            ["prompt-response", "How can a professional acknowledge a person’s distress without confirming an unverified allegation?", [], ["Acknowledge the concern, explain that facts will be checked and state the process, without prematurely deciding whether the allegation is true."], []],
            ["multiple-choice", "A person makes a credible threat and moves toward an employee. What comes first?", ["Negotiate a compromise", "Protect safety and follow emergency procedures", "Finish the customer survey", "Request a written apology"], ["Protect safety and follow emergency procedures"], ["Immediate safety takes priority."]],
            ["fill-in-the-blank", "After a serious incident, records should prioritise objective observations and actions taken rather than speculation about _____.", [], ["motives"], []],
            ["ordered-list-answer", "Arrange these steps for a routine difficult conversation.", [], [["Assess safety", "Acknowledge concern", "Clarify facts", "Offer realistic options", "Agree next steps or escalate"]], []],
            ["unordered-list-answer", "List three de-escalation practices that can support safe communication.", [], [["Calm voice", "Respectful distance", "Simple language"]], ["Listening, realistic choices, non-threatening posture and clear boundaries are also valid."]],
            ["verbatim", "Complete exactly: Immediate _____ takes priority over ordinary conflict-resolution techniques.", [], ["safety"], []],
        ],
    },
    {
        title: "Unit 6 — Negotiation and Collaborative Problem-Solving",
        time: "2 hours",
        tags: ["conflict", "negotiation", "problem-solving"],
        sources: [5],
        text: `Learning objectives
• Distinguish positions from interests.
• Generate options and use objective criteria.
• Write practical, measurable agreements.

Core notes
A position is what a party says they want; an interest is the need or concern behind it. Understanding interests can reveal alternatives.

Before negotiating, clarify goals, constraints, evidence, authority, negotiable issues and alternatives if no agreement is reached. Generate several options before judging them. Compare options using transparent criteria such as documented workload, service standards, policy and deadlines.

Trade-offs can address different priorities, but must not compromise safety, rights or mandatory duties. Deadlocks may require more information, facilitation or formal decision-making.

A strong agreement specifies who will do what, by when, with what support, how success will be measured and when the agreement will be reviewed.

Practical activity
Prepare a negotiation sheet: goals, interests, constraints, evidence, options, alternatives and follow-up measures.`,
        questions: [
            ["prompt-response", "Explain the difference between a position and an underlying interest, using a workplace example.", [], ["A position is the stated demand; an interest is the underlying need. For example, ‘I need Fridays off’ may reflect a recurring caregiving commitment."], []],
            ["multiple-choice", "Which is an example of an objective criterion?", ["A manager’s personal preference", "A documented service-level deadline", "A rumour", "Who speaks loudest"], ["A documented service-level deadline"], ["Choose a shared standard that can be checked."]],
            ["fill-in-the-blank", "The underlying need or concern behind a stated demand is called an _____.", [], ["interest"], []],
            ["ordered-list-answer", "Order the basic negotiation preparation process.", [], [["Clarify goals and constraints", "Identify interests", "Gather evidence", "Generate options", "Agree measures and follow-up"]], []],
            ["unordered-list-answer", "List three elements of an actionable resolution agreement.", [], [["Named owner", "Specific action", "Deadline"]], ["Required support, a success measure, review date and escalation route are also valid."]],
            ["verbatim", "Complete exactly: A useful agreement specifies who will do what, by when, and how progress will be _____.", [], ["reviewed"], []],
        ],
    },
    {
        title: "Unit 7 — Mediation, Ethics and Workplace Safeguarding",
        time: "2 hours",
        tags: ["conflict", "mediation", "safeguarding"],
        sources: [0, 1, 2],
        text: `Learning objectives
• Explain mediation and its limits.
• Apply impartiality, informed participation and confidentiality limits.
• Recognise when formal referral must take precedence.

Core notes
Mediation is a structured process where an impartial third party helps participants explore a mutually acceptable way forward. The mediator manages process rather than imposing a verdict.

Core principles include impartiality, appropriate voluntary participation, clear ground rules, respectful turn-taking, disclosure of conflicts of interest and realistic confidentiality boundaries.

The process is to screen for safety and suitability; explain the process; hear perspectives; summarise; identify interests; generate options; document voluntary agreements; and follow up or refer.

Differences in authority, dependence, language access or control over work can prevent free participation. Joint mediation may be inappropriate. Serious allegations of abuse, harassment, discrimination, retaliation or misconduct may require formal investigation. Do not pressure a complainant to meet an accused person.

In childcare, education, healthcare and care services, follow applicable safeguarding and reporting rules. Do not investigate beyond your role or delay escalation for informal resolution.

Practical activity
Run a triad role-play with a facilitator, two participants and an observer. Score neutrality, turn-taking, summarising, power awareness, consent and referral judgment.`,
        questions: [
            ["prompt-response", "Why is mediation not an appropriate substitute for investigating every serious workplace allegation?", [], ["Mediation facilitates dialogue but does not establish the truth of serious allegations or replace required safeguarding, disciplinary or legal processes."], []],
            ["multiple-choice", "When may mediation be unsuitable?", ["A routine low-stakes misunderstanding with willing participants", "A scheduling disagreement", "A serious allegation requiring formal investigation or a situation involving intimidation", "A task-allocation dispute"], ["A serious allegation requiring formal investigation or a situation involving intimidation"], ["Consider safety and required formal procedures."]],
            ["fill-in-the-blank", "A mediator should explain the process and the limits of _____ before participants proceed.", [], ["confidentiality"], []],
            ["ordered-list-answer", "Arrange the core mediation process.", [], [["Screen for suitability", "Explain process and boundaries", "Hear perspectives", "Identify interests", "Explore options", "Record agreement or refer"]], []],
            ["unordered-list-answer", "List three matters that may require formal referral rather than ordinary informal resolution.", [], [["Credible threats or violence", "Safeguarding concerns", "Harassment"]], ["Discrimination, retaliation, serious misconduct and immediate safety risks are also valid."]],
            ["verbatim", "Complete exactly: Mediation supports dialogue; it does not replace required formal _____.", [], ["procedures"], []],
        ],
    },
    {
        title: "Unit 8 — Resolution Agreements, Prevention and Final Assessment",
        time: "3 hours",
        tags: ["conflict", "agreements", "assessment"],
        sources: [0, 1, 5],
        text: `Learning objectives
• Document incidents objectively.
• Set measurable agreements and follow-up.
• Identify systemic causes and evaluate outcomes.
• Apply the full course framework in a capstone scenario.

Core notes
Record date, setting, observable events, relevant statements, actions and next steps. Distinguish firsthand observation from hearsay. Avoid character labels and follow privacy and retention policies.

Resolution agreements specify the issue, commitments, owners, deadlines, support, success measures, review date and route if the agreement is not followed. Check whether actions occurred and whether the underlying issue improved. Where appropriate, acknowledge impact, correct misinformation and apologise for specific behaviour without forcing reconciliation.

Prevent recurrence by reviewing role clarity, workload, handovers, information access, staffing, decision rights, training and reporting channels. Measure participant feedback, action completion, recurrence, time to resolution and confidence in reporting. More reports may reflect improved reporting access rather than deterioration.

CLEAR framework
Calm the situation; Listen to understand; Establish the issue; Agree on a way forward; Review the outcome. CLEAR is a teaching aid, not a replacement for professional judgment or formal procedures.

Capstone activity
Analyse a cross-industry case, choose a resolution route, complete a 5–8 minute role-play, write an agreement and submit a 30-day action plan.

Assessment and certification
Unit quizzes: 20%. Case-study analysis: 25%. Practical role-play: 35%. Personal action plan: 20%. Suggested passing standard: 70% overall, satisfactory practical assessment and no critical failure in safety or escalation judgment. The credential is a Certificate of Completion and is not externally accredited unless formally approved.`,
        questions: [
            ["prompt-response", "Rewrite ‘The team will communicate better’ as a measurable resolution agreement.", [], ["For the next two weeks, the shift lead posts the rota by Wednesday noon; affected staff report conflicts by Thursday noon; the team reviews the process on the agreed date."], []],
            ["multiple-choice", "Which incident note is most objective?", ["The employee was lazy.", "At 10:15, the employee interrupted twice and said, ‘I will not complete this today’; the supervisor requested a private meeting.", "Everyone knows this person causes trouble.", "The meeting was a disaster."], ["At 10:15, the employee interrupted twice and said, ‘I will not complete this today’; the supervisor requested a private meeting."], ["Choose specific observed behaviour and the response."]],
            ["fill-in-the-blank", "A resolution agreement should specify an action owner, deadline, success measure and a _____ date.", [], ["review"], []],
            ["ordered-list-answer", "Arrange the CLEAR framework.", [], [["Calm the situation", "Listen to understand", "Establish the issue", "Agree on a way forward", "Review the outcome"]], []],
            ["unordered-list-answer", "List three indicators that can help evaluate a workplace conflict-resolution programme.", [], [["Completion of agreed actions", "Participant feedback", "Repeat disputes"]], ["Time to resolution, assessment improvement and confidence in reporting are also valid."]],
            ["verbatim", "Complete exactly: CLEAR stands for Calm, Listen, Establish, Agree and _____.", [], ["Review"], []],
        ],
    },
];

async function deletePreviousCourse() {
    const courseIds = await idsFor("courses", [coursePublicId]);
    const noteIds = await idsFor("notes", notePublicIds);
    const quizIds = await idsFor("quizzes", quizPublicIds);
    const sourceIds = await idsFor("sources", sourcePublicIds);

    if (courseIds.length) {
        const q = courseIds.map(() => "?").join(", ");
        await db.execute(`DELETE FROM course_users WHERE course_id IN (${q})`, courseIds);
        await db.execute(`DELETE FROM courses_hierarchy WHERE inferior IN (${q}) OR superior IN (${q})`, [...courseIds, ...courseIds]);
    }

    for (const [type, ids] of [["course", courseIds], ["note", noteIds], ["quiz", quizIds], ["source", sourceIds]]) {
        if (!ids.length) continue;
        const q = ids.map(() => "?").join(", ");
        await db.execute(`DELETE FROM resource_permissions WHERE resource_type = ? AND resource_id IN (${q})`, [type, ...ids]);
        await db.execute(`DELETE FROM resource_relations WHERE (A_type = ? AND A IN (${q})) OR (B_type = ? AND B IN (${q}))`, [type, ...ids, type, ...ids]);
        if (type !== "course") {
            await db.execute(`DELETE FROM resource_contributors WHERE type = ? AND resource_id IN (${q})`, [type, ...ids]);
        }
    }

    if (quizIds.length) {
        const q = quizIds.map(() => "?").join(", ");
        await db.execute(`DELETE FROM user_quizzes WHERE quiz_id IN (${q})`, quizIds);
    }

    for (const [table, publicIds] of [["quizzes", quizPublicIds], ["notes", notePublicIds], ["sources", sourcePublicIds], ["courses", [coursePublicId]]]) {
        const q = publicIds.map(() => "?").join(", ");
        await db.execute(`DELETE FROM \`${table}\` WHERE public_id IN (${q})`, publicIds);
    }
}

await db.beginTransaction();

try {
    const [[instructor]] = await db.execute("SELECT id FROM users WHERE username = ? LIMIT 1", ["demo_instructor"]);
    const [[student]] = await db.execute("SELECT id FROM users WHERE username = ? LIMIT 1", ["demo_student"]);
    const [[group]] = await db.execute("SELECT id FROM `groups` WHERE public_id = ? LIMIT 1", ["TGR001"]);
    if (!instructor || !student || !group) {
        throw new Error("Run npm run db:seed first so the demo users and Learning Lab group exist.");
    }

    await deletePreviousCourse();

    const courseId = await insert("courses", {
        public_id: coursePublicId,
        name: "Professional Certificate in Conflict Resolution",
        description: "A 16-hour, introductory-to-intermediate professional development programme covering workplace conflict diagnosis, communication, de-escalation, negotiation, mediation, safeguarding, agreements and prevention. Includes eight units, 48 practice questions and a weighted capstone assessment. Certificate of Completion only; not externally accredited.",
        enrollment: "open",
        created_by: instructor.id,
    });

    await insert("course_users", { course_id: courseId, user_id: instructor.id, role: "owner", expiration: null });
    await insert("course_users", { course_id: courseId, user_id: student.id, role: "student", expiration: null });
    await insert("resource_permissions", { resource_id: courseId, resource_type: "course", group_id: group.id, group_locked: false, all_read: true, all_write: false, read: json([student.id]), write: json([instructor.id]) });

    const sourceIds = [];
    for (const source of sources) {
        const sourceId = await insert("sources", {
            public_id: source.publicId,
            title: source.title,
            medium: "website",
            url: source.url,
            tags: json(["conflict-resolution", "professional-development"]),
            credits: json(source.credits),
            created_by: instructor.id,
            published_at: null,
            last_accessed: new Date(),
        });
        sourceIds.push(sourceId);
        await insert("resource_permissions", { resource_id: sourceId, resource_type: "source", group_id: group.id, group_locked: false, all_read: true, all_write: false, read: json([student.id]), write: json([instructor.id]) });
        await insert("resource_relations", { A: sourceId, B: courseId, A_type: "source", B_type: "course", include_reference: true, reference: null, reference_type: null });
    }

    let quizIndex = 0;
    for (let unitIndex = 0; unitIndex < units.length; unitIndex += 1) {
        const unit = units[unitIndex];
        const noteId = await insert("notes", {
            public_id: notePublicIds[unitIndex],
            title: unit.title,
            text: `Recommended time: ${unit.time}\n\n${unit.text}`,
            tags: json(unit.tags),
            created_by: instructor.id,
        });
        await insert("resource_permissions", { resource_id: noteId, resource_type: "note", group_id: group.id, group_locked: false, all_read: true, all_write: false, read: json([student.id]), write: json([instructor.id]) });
        await insert("resource_relations", { A: noteId, B: courseId, A_type: "note", B_type: "course", include_reference: true, reference: `Unit ${unitIndex + 1}`, reference_type: "section" });

        for (const sourceIndex of unit.sources) {
            await insert("resource_relations", { A: sourceIds[sourceIndex], B: noteId, A_type: "source", B_type: "note", include_reference: true, reference: unit.title, reference_type: "section" });
        }

        for (const [type, prompt, choices, answers, hints] of unit.questions) {
            const quizId = await insert("quizzes", {
                public_id: quizPublicIds[quizIndex],
                type,
                prompt,
                choices: json(choices),
                answers: json(answers),
                hints: json(hints),
                tags: json([...unit.tags, `unit-${unitIndex + 1}`]),
                created_by: instructor.id,
            });
            await insert("resource_permissions", { resource_id: quizId, resource_type: "quiz", group_id: group.id, group_locked: false, all_read: true, all_write: false, read: json([student.id]), write: json([instructor.id]) });
            await insert("resource_relations", { A: quizId, B: courseId, A_type: "quiz", B_type: "course", include_reference: false, reference: `Unit ${unitIndex + 1}`, reference_type: "section" });
            await insert("resource_relations", { A: quizId, B: noteId, A_type: "quiz", B_type: "note", include_reference: true, reference: unit.title, reference_type: "section" });
            await insert("user_quizzes", { user_id: student.id, quiz_id: quizId, level: 0, tries_at_level: 0, hidden_until: "1970-01-02 00:00:00" });
            quizIndex += 1;
        }
    }

    const [[counts]] = await db.execute(
        `SELECT
            (SELECT COUNT(*) FROM courses WHERE public_id = ?) AS courses,
            (SELECT COUNT(*) FROM notes WHERE public_id IN (${notePublicIds.map(() => "?").join(", ")})) AS notes,
            (SELECT COUNT(*) FROM quizzes WHERE public_id IN (${quizPublicIds.map(() => "?").join(", ")})) AS quizzes,
            (SELECT COUNT(*) FROM sources WHERE public_id IN (${sourcePublicIds.map(() => "?").join(", ")})) AS sources`,
        [coursePublicId, ...notePublicIds, ...quizPublicIds, ...sourcePublicIds],
    );
    if (Number(counts.courses) !== 1 || Number(counts.notes) !== 8 || Number(counts.quizzes) !== 48 || Number(counts.sources) !== 7) {
        throw new Error(`Unexpected seed counts: ${JSON.stringify(counts)}`);
    }

    await db.commit();
    console.log("Professional Certificate in Conflict Resolution seeded successfully.");
    console.log("Created 1 course, 8 unit notes, 48 quizzes, and 7 source records.");
} catch (error) {
    await db.rollback();
    throw error;
} finally {
    await db.end();
}
