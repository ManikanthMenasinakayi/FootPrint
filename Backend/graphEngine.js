// 1. Cycle Detection (DFS) when adding edge: source -> target
// Checks if there is already a path from target -> ... -> source
export function detectCycle(edges, sourceId, targetId, titleMap) {
  const src = sourceId.toString();
  const tgt = targetId.toString();

  if (src === tgt) {
    const name = titleMap[src] || src;
    return [name, name];
  }

  // Build adjacency list: u -> [v1, v2]
  const adj = {};
  for (const e of edges) {
    const u = e.source.toString();
    const v = e.target.toString();
    if (!adj[u]) adj[u] = [];
    adj[u].push(v);
  }

  const visited = new Set();
  const path = [];

  function dfs(curr) {
    visited.add(curr);
    path.push(curr);

    if (curr === src) return true; // Cycle found!

    for (const next of adj[curr] || []) {
      if (!visited.has(next)) {
        if (dfs(next)) return true;
      }
    }

    path.pop();
    return false;
  }

  if (dfs(tgt)) {
    // Full loop: source -> target -> ... -> source
    const cycleIds = [src, ...path];
    return cycleIds.map((id) => titleMap[id] || id);
  }

  return null; // No cycle
}

// 2. Dynamic Mastery-Based Unlocking
export function computeConceptStates(concepts, edges, masteredSet, titleMap) {
  // Incoming prerequisites per concept: target -> [source1, source2]
  const prereqsMap = {};
  for (const c of concepts) prereqsMap[c._id.toString()] = [];
  for (const e of edges) {
    const tgt = e.target.toString();
    if (prereqsMap[tgt]) prereqsMap[tgt].push(e.source.toString());
  }

  return concepts.map((c) => {
    const id = c._id.toString();
    const isMastered = masteredSet.has(id);
    const requiredIds = prereqsMap[id] || [];
    const missingPrereqs = requiredIds
      .filter((reqId) => !masteredSet.has(reqId))
      .map((reqId) => ({ id: reqId, title: titleMap[reqId] || 'Unknown' }));

    let status = 'locked';
    if (isMastered) status = 'mastered';
    else if (missingPrereqs.length === 0) status = 'unlocked';

    return {
      ...c.toObject(),
      status,
      missingPrereqs
    };
  });
}

// 3. Personalized Shortest Valid Learning Path (Backward BFS + Kahn's Topological Sort)
export function computeTargetPath(concepts, edges, targetId, masteredSet) {
  const tgt = targetId.toString();
  const conceptMap = {};
  for (const c of concepts) conceptMap[c._id.toString()] = c;

  if (!conceptMap[tgt]) return { steps: [], totalDurationMins: 0 };

  // Build reverse edges (child -> [parents]) and forward edges (parent -> [children])
  const parentsMap = {};
  for (const e of edges) {
    const u = e.source.toString();
    const v = e.target.toString();
    if (!parentsMap[v]) parentsMap[v] = [];
    parentsMap[v].push(u);
  }

  // Backward BFS from targetId to collect all required unmastered ancestors
  const needed = new Set();
  const queue = [tgt];
  while (queue.length > 0) {
    const curr = queue.shift();
    if (masteredSet.has(curr) || needed.has(curr)) continue;
    needed.add(curr);
    for (const p of parentsMap[curr] || []) {
      if (!masteredSet.has(p) && !needed.has(p)) {
        queue.push(p);
      }
    }
  }

  // Kahn's Topological Sort on the `needed` subgraph
  const inDegree = {};
  const subAdj = {};
  for (const id of needed) {
    inDegree[id] = 0;
    subAdj[id] = [];
  }

  for (const e of edges) {
    const u = e.source.toString();
    const v = e.target.toString();
    if (needed.has(u) && needed.has(v)) {
      subAdj[u].push(v);
      inDegree[v]++;
    }
  }

  const topoQueue = [];
  for (const id of needed) {
    if (inDegree[id] === 0) topoQueue.push(id);
  }

  const orderedIds = [];
  while (topoQueue.length > 0) {
    const curr = topoQueue.shift();
    orderedIds.push(curr);
    for (const next of subAdj[curr]) {
      inDegree[next]--;
      if (inDegree[next] === 0) topoQueue.push(next);
    }
  }

  let totalDurationMins = 0;
  const steps = orderedIds.map((id) => {
    const c = conceptMap[id];
    const conceptMins = (c.lessons || []).reduce((sum, l) => sum + (l.durationMins || 0), 0);
    totalDurationMins += conceptMins;
    return {
      _id: c._id,
      title: c.title,
      durationMins: conceptMins
    };
  });

  return { steps, totalDurationMins };
}