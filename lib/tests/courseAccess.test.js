import { filterPaidCourseContent, hasCourseContentAccess } from "../courseAccess";

const paidCourse = { id: 9, enrollment: "paid", createdBy: 2 };
const relation = { A: 11, AType: "note", B: 9, BType: "course" };

describe("paid course content access", () => {
  test("locks paid content before enrollment", () => {
    expect(hasCourseContentAccess(paidCourse, 3)).toBe(false);
    expect(filterPaidCourseContent({
      items: [{ id: 11 }, { id: 12 }],
      resourceType: "note",
      courses: [paidCourse],
      relationships: [relation],
      userId: 3,
    })).toEqual([{ id: 12 }]);
  });

  test("unlocks paid content for enrolled users and owners", () => {
    expect(hasCourseContentAccess({ ...paidCourse, isEnrolled: true }, 3)).toBe(true);
    expect(hasCourseContentAccess(paidCourse, 2)).toBe(true);
  });

  test("does not lock open course content", () => {
    expect(hasCourseContentAccess({ ...paidCourse, enrollment: "open" }, 3)).toBe(true);
  });
});
