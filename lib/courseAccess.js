function value(relation, key) {
  return relation[key] ?? relation[key.charAt(0).toLowerCase() + key.slice(1)];
}

export function hasCourseContentAccess(course, userId) {
  if (!course || course.enrollment !== "paid") return true;

  return Boolean(
    course.isEnrolled ||
    course.isOwned ||
    course.isAdmin ||
    (userId && String(course.createdBy ?? course.creator?.id) === String(userId))
  );
}

export function filterPaidCourseContent({ items = [], resourceType, courses = [], relationships = [], userId }) {
  const lockedCourseIds = new Set(
    courses
      .filter((course) => !hasCourseContentAccess(course, userId))
      .map((course) => String(course.id))
  );

  if (!lockedCourseIds.size) return items;

  const lockedResourceIds = new Set();
  relationships.forEach((relation) => {
    const a = value(relation, "A");
    const b = value(relation, "B");
    const aType = value(relation, "AType");
    const bType = value(relation, "BType");

    if (aType === resourceType && bType === "course" && lockedCourseIds.has(String(b))) {
      lockedResourceIds.add(String(a));
    }
    if (bType === resourceType && aType === "course" && lockedCourseIds.has(String(a))) {
      lockedResourceIds.add(String(b));
    }
  });

  return items.filter((item) => !lockedResourceIds.has(String(item.id)));
}
