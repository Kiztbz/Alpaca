import { expandCourseRelationships } from "../resourceRelations";

test("infers course resources from an included reference without duplicates", () => {
  const relationships = expandCourseRelationships([
    { A: 10, AType: "source", B: 20, BType: "course", includeReference: true },
    { A: 10, AType: "source", B: 30, BType: "note", includeReference: false },
    { A: 30, AType: "note", B: 40, BType: "quiz", includeReference: false },
  ]);

  expect(relationships).toEqual(expect.arrayContaining([
    expect.objectContaining({ A: 20, AType: "course", B: 30, BType: "note" }),
  ]));
  expect(relationships.filter((relation) => relation.AType === "course" && relation.BType === "note")).toHaveLength(1);
});

test("accepts camel-cased database relationship keys", () => {
  const [relationship] = expandCourseRelationships([
    { a: 1, aType: "note", b: 2, bType: "course", includeReference: false },
  ]);

  expect(relationship).toEqual(expect.objectContaining({ A: 1, AType: "note", B: 2, BType: "course" }));
});
