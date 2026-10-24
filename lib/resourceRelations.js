function normalize(relation) {
  return {
    ...relation,
    A: relation.A ?? relation.a,
    AType: relation.AType ?? relation.aType,
    B: relation.B ?? relation.b,
    BType: relation.BType ?? relation.bType,
  };
}

function endpointKey(type, id) {
  return `${type}:${id}`;
}

function relationKey(relation) {
  return [
    endpointKey(relation.AType, relation.A),
    endpointKey(relation.BType, relation.B),
  ].sort().join("|");
}

export function expandCourseRelationships(input = []) {
  const relationships = input.map(normalize);
  const adjacency = new Map();
  const seen = new Set(relationships.map(relationKey));

  function addNeighbor(type, id, neighbor) {
    const key = endpointKey(type, id);
    if (!adjacency.has(key)) adjacency.set(key, []);
    adjacency.get(key).push(neighbor);
  }

  relationships.forEach((relation) => {
    addNeighbor(relation.AType, relation.A, { id: relation.B, type: relation.BType });
    addNeighbor(relation.BType, relation.B, { id: relation.A, type: relation.AType });
  });

  const inferred = [];
  relationships.filter((relation) => relation.includeReference).forEach((relation) => {
    const course = relation.AType === "course"
      ? { id: relation.A, type: relation.AType }
      : relation.BType === "course"
        ? { id: relation.B, type: relation.BType }
        : null;
    const reference = relation.AType === "course"
      ? { id: relation.B, type: relation.BType }
      : relation.BType === "course"
        ? { id: relation.A, type: relation.AType }
        : null;

    if (!course || !reference) return;

    (adjacency.get(endpointKey(reference.type, reference.id)) || []).forEach((neighbor) => {
      if (neighbor.type === "course" || (neighbor.type === course.type && String(neighbor.id) === String(course.id))) return;
      const next = {
        A: course.id,
        AType: "course",
        B: neighbor.id,
        BType: neighbor.type,
        includeReference: false,
      };
      const key = relationKey(next);
      if (seen.has(key)) return;
      seen.add(key);
      inferred.push(next);
    });
  });

  return [...relationships, ...inferred];
}
