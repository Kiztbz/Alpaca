import { contiguousCompletedNoteIds, quizIdsForNotes } from "../courseUnits";

test("only a contiguous run of completed units unlocks practice", () => {
  const course = {
    notes: [10, 20, 30, 40],
    noteProgress: [
      { noteId: 10, completedAt: "2026-01-01" },
      { noteId: 30, completedAt: "2026-01-02" },
    ],
  };
  expect(contiguousCompletedNoteIds(course)).toEqual([10]);
});

test("selects quizzes linked to completed unit notes", () => {
  const relationships = [
    { A: 101, AType: "quiz", B: 10, BType: "note" },
    { A: 102, AType: "quiz", B: 20, BType: "note" },
  ];
  expect([...quizIdsForNotes(relationships, [10])]).toEqual(["101"]);
});
