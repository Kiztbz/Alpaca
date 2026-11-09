function relationEnds(relation) {
  return {
    a: { id: relation.A ?? relation.a, type: relation.AType ?? relation.aType },
    b: { id: relation.B ?? relation.b, type: relation.BType ?? relation.bType },
  };
}

export function contiguousCompletedNoteIds(course) {
  const completed = new Set((course?.noteProgress || [])
    .filter((progress) => progress.completedAt)
    .map((progress) => String(progress.noteId)));
  const result = [];
  for (const noteId of course?.notes || []) {
    if (!completed.has(String(noteId))) break;
    result.push(noteId);
  }
  return result;
}

export function quizIdsForNotes(relationships = [], noteIds = []) {
  const notes = new Set(noteIds.map(String));
  const quizzes = new Set();
  relationships.forEach((relation) => {
    const { a, b } = relationEnds(relation);
    if (a.type === "quiz" && b.type === "note" && notes.has(String(b.id))) quizzes.add(String(a.id));
    if (b.type === "quiz" && a.type === "note" && notes.has(String(a.id))) quizzes.add(String(b.id));
  });
  return quizzes;
}

export function quizIdsForUnit(relationships = [], noteId) {
  return quizIdsForNotes(relationships, [noteId]);
}
