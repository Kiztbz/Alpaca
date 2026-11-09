import { createNoteCards, noteCardCount, notePlainText, sanitizeNoteHtml } from "../noteCards";

test("splits a note into short semantic cards", () => {
  const longParagraph = Array.from(
    { length: 10 },
    (_, index) => `Concept ${index + 1} gives the learner a short and memorable explanation.`
  ).join(" ");
  const cards = createNoteCards(`<h2>Foundations</h2><p>${longParagraph}</p>`, 30);

  expect(cards.length).toBeGreaterThan(2);
  expect(cards[0].content).toContain("Foundations");
  expect(Math.max(...cards.map((card) => card.words))).toBeLessThanOrEqual(40);
});

test("splits bullet-like runs inside a single paragraph", () => {
  const cards = createNoteCards(
    "<p>Learning objectives<br>• Understand the first concept clearly<br>• Apply the second concept in practice<br>• Review the final concept later</p>",
    8
  );

  expect(cards.length).toBeGreaterThan(1);
  expect(notePlainText(cards.map((card) => card.content).join(" "))).toContain("final concept");
});

test("always reports at least one card for an empty note", () => {
  expect(noteCardCount("")).toBe(1);
});

test("keeps the rich-text tags used by notes", () => {
  expect(sanitizeNoteHtml('<h2>Safe</h2><p><strong>Useful</strong> text</p>')).toBe(
    '<h2>Safe</h2><p><strong>Useful</strong> text</p>'
  );
});

test("neutralizes scripts, event handlers, and unsafe links", () => {
  const payloads = [
    '<img src=x onerror="alert(1)">Hello',
    '<script>alert(1)</script><p>Lesson</p>',
    '<a href="javascript:alert(1)">Open</a>',
  ];

  payloads.forEach((payload) => {
    const sanitized = sanitizeNoteHtml(payload);
    expect(sanitized).not.toMatch(/<script|<img|javascript:|onerror/i);
  });
});
