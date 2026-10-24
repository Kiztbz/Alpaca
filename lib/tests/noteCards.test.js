import { createNoteCards, noteCardCount, notePlainText } from "../noteCards";

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
