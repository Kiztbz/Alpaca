# Alpaca Course Creation Blueprint

This guide is for instructors, subject-matter experts, and developers building a course on Alpaca. It turns the platform's content model into a repeatable authoring process.

## The course model

Build every course as an ordered sequence of small units:

```text
Course
  Shared source library
  Unit 1: focused notes + quiz pool
  Unit 2: focused notes + quiz pool
  Unit 3: focused notes + quiz pool
```

Sources are universal course resources. Create each source once, then reference it from any number of notes or quizzes across the course. Sources do not belong to a single unit.

Notes and quizzes are unit content. Every note and every quiz must be assigned to exactly one unit, and units must have an explicit order. A learner finishes all notes in the current unit before the next unit unlocks. Completing a unit also unlocks practice using only that unit's quiz questions. Daily Train selects five questions from the units the learner has fully completed.

This means each unit must stand on its own: one learning outcome, one or more short notes, and enough unit-specific quiz questions to practise the outcome. Its content can cite any relevant item in the shared source library.

## The fastest way to create a course

1. Define the learner and the result they should achieve.
2. Outline 4-8 units in prerequisite order.
3. Give each unit one observable learning outcome.
4. Build a shared library of reliable sources; add each source only once.
5. Add one or more concise notes to each unit.
6. Add at least 5 quiz questions to each unit.
7. Put the units and their notes in the intended learning order.
8. Preview the course as a learner and complete the quality checklist below.

Use the [course planning template](templates/COURSE_PLANNING_TEMPLATE.md) to draft the course before entering it into Alpaca.

## Recommended content budget

These are authoring targets rather than hard platform limits.

| Item | Recommended target | Platform consideration |
| --- | --- | --- |
| Course | 4-8 units | Units should be ordered from foundation to application. |
| Unit | 1 outcome and 1-5 short notes | Every note must belong to exactly one unit. |
| Note | 120-240 words | Alpaca turns semantic blocks into cards of about 40 words. Note content has an 8,192-character limit. |
| Note cards | 3-6 cards | One idea per card keeps the lesson quick and readable. |
| Sources | Shared course library | Add a source once and reuse it across any relevant units, notes, and quizzes. |
| Quiz pool | 5-10 questions per unit | Five is the practical minimum for a complete unit practice set. |
| Hints | 0-2 per question | A hint should guide recall without revealing the answer. |

## Designing units

### One outcome per unit

Write the outcome with an observable verb. A learner should be able to demonstrate it immediately after finishing the note.

Good:

> Distinguish a fixed cost from a variable cost in a business scenario.

Too broad:

> Understand business finance.

If an outcome needs several related explanations, divide it into several short notes inside the unit. If it introduces a second outcome, split it into another unit.

### Order by dependency

Put prerequisite knowledge first. Do not depend on a concept introduced in a locked unit. A useful sequence is:

1. Definition and vocabulary
2. Recognition and comparison
3. Procedure or method
4. Application to a scenario
5. Evaluation or decision-making

### Unit completion and practice

- The learner must finish all notes in the current unit before the next unit becomes available.
- Unit practice should contain only quizzes assigned to that unit.
- Daily Train uses quizzes from fully completed units and presents five questions at a time.
- A skipped Daily Train question still counts as one of the five questions, so every question should be complete and usable on its own.

## Writing short notes for Alpaca

Alpaca is designed for focused learning, not textbook chapters. The note renderer groups semantic content into cards of roughly 40 words, so write in clean, meaningful blocks.

### The short-note recipe

Use 3-6 blocks:

1. **Purpose:** Tell the learner what the concept helps them do.
2. **Core idea:** Define the concept in plain language.
3. **How it works:** Give the rule, sequence, or comparison.
4. **Example:** Show one realistic application.
5. **Takeaway:** State the decision rule or fact to remember.

Not every note needs all five. Remove any block that does not help the unit outcome.

### Writing rules

- Keep the full note between 120 and 240 words when possible.
- Keep each paragraph or list item focused on one idea and roughly 25-50 words.
- Use descriptive headings only when they help navigation; headings create natural card boundaries.
- Prefer one strong example over several similar examples.
- Use bullets for steps, criteria, or contrasts.
- Define unfamiliar terms on first use.
- Put essential information in the note; do not require the learner to open a source to understand it.
- Link evidence through sources instead of adding citations repeatedly inside the prose.
- Remove greetings, long introductions, repeated summaries, and motivational filler.
- Do not hide multiple learning outcomes inside one note.

### Before and after

Too long and indirect:

> There are many different kinds of costs that a business owner may encounter in the day-to-day running of a company, and it is important to understand that some of these costs can change while others may remain the same over a period of time.

Alpaca-sized:

> Fixed costs stay broadly unchanged as output changes, such as monthly rent. Variable costs rise or fall with output, such as packaging for each product sold.

The shorter version teaches the distinction, includes examples, and is easy to turn into a quiz.

### Formatting notes

Use semantic structure rather than visual spacing:

- headings for genuine sections;
- paragraphs for explanations;
- ordered lists for sequences;
- unordered lists for groups or criteria;
- emphasis only for terms that deserve attention.

Avoid empty paragraphs, manual line-break padding, giant headings, and a single unbroken wall of text. Clean blocks produce cleaner note cards and smoother transitions.

## Building the universal source library

A source supports the accuracy of one or more notes or quizzes. Sources are universal within a course: give each source a recognizable title, add it to the course library once, and reference that same record wherever it is needed. Do not duplicate a source for each unit.

| Source type | Use it for | Authoring guidance |
| --- | --- | --- |
| Article | Research papers, journal articles, and substantial reporting | Prefer the original publication or DOI page. |
| Book | Stable background, frameworks, and established theory | Include author and edition or publication detail in the title when it matters. |
| Website | Official documentation, standards, and institutional guidance | Link to the exact supporting page, not a generic homepage. A URL is required. |
| Video | Demonstrations, lectures, and visual explanations | Use a stable publisher link and make sure the note still works without watching it. |
| Podcast | Expert interviews and audio discussions | Identify the episode clearly; add the guest or host as an author when useful. |

Source titles are limited to 100 characters. URLs are limited to 512 characters. Up to 10 authors can be recorded, with 100 characters per author.

### Source quality checklist

- Add one canonical record for each source and reuse it across units.
- Prefer primary sources, official documentation, peer-reviewed work, or recognized subject experts.
- Check that the source directly supports the claim, not merely the general topic.
- Avoid broken, paywalled-only, or temporary links when an accessible equivalent exists.
- Use the most current source when the subject changes over time.
- Distinguish evidence from opinion.
- Do not copy long passages; summarize them in the note and preserve attribution.

## Choosing quiz types

Alpaca supports six quiz formats. Choose the format that matches the skill being tested.

| Quiz type | Best for | Example | How it is evaluated |
| --- | --- | --- | --- |
| Prompt response | Short recall or a concise explanation | “What cost changes with output?” | Compared with accepted answers using tolerant text matching. |
| Multiple choice | Recognition, classification, or a decision among plausible options | “Which is a variable cost?” | The selected answer set must exactly match the correct answer set. |
| Fill in the blank | A term inside a meaningful sentence | “Rent is usually a ___ cost.” | Each blank is checked against its expected answer. |
| Ordered list answer | A procedure or sequence | “Put the validation steps in order.” | Every item and its position must be correct. |
| Unordered list answer | A set where order does not matter | “Name three common fixed costs.” | All expected items must be present; order is ignored. |
| Verbatim | Exact wording that genuinely must be memorized | “Type the safety declaration exactly.” | The response is checked against the required wording. |

### Quiz field limits

- Prompt: up to 256 characters.
- Choices: up to 10 choices, 32 characters each.
- Answers: at least 1 answer, 45 characters each.
- Hints: up to 10 hints, 256 characters each.

### Quiz-writing rules

- Test the unit outcome, not an incidental sentence.
- Make each question understandable without seeing the note card beside it.
- Ask one thing at a time.
- Keep the correct answer unambiguous and supported by a linked source.
- For multiple choice, make distractors plausible, similar in length, and grammatically compatible with the prompt.
- Do not use “all of the above” or trick wording.
- For prompt response, add accepted alternatives for common valid wording.
- Use ordered lists only when order changes the meaning.
- Use verbatim sparingly, only when exact wording is part of the skill.
- Make hints reduce the search space without stating the answer.
- Mix recall with application. A useful pool has roughly 40% recall, 40% application, and 20% comparison or judgement.

### Recommended quiz mix for one unit

For a pool of 5-10 questions, start with:

- 2 prompt-response or fill-in-the-blank questions for core recall;
- 2 multiple-choice questions for recognition or classification;
- 1 scenario-based question for application;
- an ordered or unordered list only when the subject naturally requires one.

Vary the quiz type because it improves practice, not simply for visual variety.

## Connecting content correctly

Correct relationships are essential for progression and practice.

At course level:

1. Add reliable sources to the shared source library.
2. Reuse those source records from any note or quiz they support.
3. Do not assign a source exclusively to a unit or create unit-specific duplicates.

For every unit:

1. Assign every note to exactly one unit.
2. Place the notes in the correct order inside that unit.
3. Assign every quiz to exactly one unit.
4. Reference supporting items from the shared source library in the relevant notes or quizzes.
5. Confirm the unit's quiz pool does not depend on a later unit.

If a note or quiz has no unit, it is orphaned and must not be published. If it is assigned to the wrong unit, progression, unit practice, and Daily Train eligibility will be wrong. Sources are the exception: they remain universal and reusable.

## Worked unit example

### Unit 2 — Fixed and variable costs

**Outcome:** Classify a business cost as fixed or variable from a short scenario.

**Notes:**

1. “Fixed costs,” about 140 words across four cards
2. “Variable costs,” about 140 words across four cards
3. “Classifying costs,” about 160 words across four cards

**Shared sources referenced by this unit:**

- An accounting textbook chapter
- A current small-business accounting guide from a recognized institution

**Quiz pool:**

- 2 multiple-choice classification scenarios
- 1 fill-in-the-blank definition
- 2 prompt-response examples
- 1 unordered-list question asking for two fixed costs

**Unlock check:** All three notes and all six quizzes are assigned to Unit 2. The two supporting sources are reused from the course library, and no question requires knowledge from Unit 3.

## Course quality checklist

### Course structure

- [ ] The course has a specific audience and final outcome.
- [ ] Units are in prerequisite order.
- [ ] Every unit has one observable outcome.
- [ ] Every note and quiz belongs to exactly one unit.
- [ ] Every unit contains one or more focused notes.
- [ ] The first incomplete unit is the learner's next available unit.

### Notes

- [ ] Each note is usually 120-240 words and 3-6 cards.
- [ ] Each block contains one idea.
- [ ] Examples are short, relevant, and accurate.
- [ ] The note can be understood without opening an external source.
- [ ] Headings, paragraphs, and lists have meaningful semantic structure.

### Sources

- [ ] Sources are stored once in the shared course library rather than duplicated per unit.
- [ ] Important claims are supported by reliable sources.
- [ ] Links open the exact referenced material.
- [ ] Titles, authors, and source types are correct.
- [ ] Time-sensitive sources are current.

### Quizzes

- [ ] Every unit has at least 5 usable questions.
- [ ] Every question measures the unit outcome.
- [ ] Answers are unambiguous and fit the field limits.
- [ ] Distractors are plausible and not misleading.
- [ ] Questions work independently in Daily Train.
- [ ] Every quiz is assigned to the correct unit.

### Learner test

- [ ] Complete the course from a fresh learner account.
- [ ] Confirm later units remain locked until the current note is finished.
- [ ] Confirm unit practice unlocks after unit completion.
- [ ] Confirm Daily Train contains exactly five questions from completed units only.
- [ ] Confirm note and unit transitions show complete content without blank states.
- [ ] Test on both desktop and mobile.

## Definition of ready

A course is ready to publish when every note and quiz belongs to exactly one ordered unit, sources are reusable course-wide records, and a new learner can move through every unit in order, understand each short note without outside context, trace important claims to sources, practise at least five sound questions per completed unit, and receive no quiz about an unfinished unit.

