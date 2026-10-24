/** Deterministic component placement and Barnes–Hut repulsion. No browser or DOM dependencies. */
export function createGraphLayout(nodes, edges) {
  const ids = new Map(nodes.map((node, index) => [node.id, index]));
  const links = edges.filter(edge => ids.has(edge.source) && ids.has(edge.target)).map(edge => [ids.get(edge.source), ids.get(edge.target)]);
  const neighbors = nodes.map(() => new Set());
  for (const [a, b] of links) { neighbors[a].add(b); neighbors[b].add(a); }
  const seen = new Set(), groups = [];
  for (let index = 0; index < nodes.length; index++) {
    if (seen.has(index)) continue;
    const group = [index]; seen.add(index);
    for (let cursor = 0; cursor < group.length; cursor++) for (const next of neighbors[group[cursor]]) if (!seen.has(next)) { seen.add(next); group.push(next); }
    groups.push(group.sort((a, b) => neighbors[b].size - neighbors[a].size || nodes[a].id.localeCompare(nodes[b].id)));
  }
  groups.sort((a, b) => b.length - a.length || nodes[a[0]].id.localeCompare(nodes[b[0]].id));
  const positions = new Float32Array(nodes.length * 2), velocity = new Float32Array(nodes.length * 2), centers = new Float32Array(nodes.length * 2);
  const pins = new Map();
  const golden = Math.PI * (3 - Math.sqrt(5));
  let shelfX = 0, shelfY = 0, shelfHeight = 0;
  const shelfWidth = Math.max(700, Math.sqrt(nodes.length) * 85);
  for (const group of groups) {
    const radius = Math.max(30, Math.sqrt(group.length) * 23), size = radius * 2 + 80;
    if (shelfX + size > shelfWidth && shelfX) { shelfY += shelfHeight; shelfX = 0; shelfHeight = 0; }
    const cx = shelfX + size / 2, cy = shelfY + size / 2;
    group.forEach((index, order) => {
      const r = order ? radius * Math.sqrt(order / group.length) : 0, angle = order * golden;
      positions[index * 2] = cx + Math.cos(angle) * r; positions[index * 2 + 1] = cy + Math.sin(angle) * r;
      centers[index * 2] = cx; centers[index * 2 + 1] = cy;
    });
    shelfX += size; shelfHeight = Math.max(shelfHeight, size);
  }
  let tick = 0;
  function tree() {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let i = 0; i < nodes.length; i++) { const x = positions[i * 2], y = positions[i * 2 + 1]; minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); }
    const cell = (x, y, size) => ({ x, y, size, mass: 0, cx: 0, cy: 0, point: -1, children: null });
    const root = cell(minX - 1, minY - 1, Math.max(maxX - minX, maxY - minY, 1) + 2);
    function insert(q, index, depth = 0) {
      const x = positions[index * 2], y = positions[index * 2 + 1];
      const mass = q.mass + 1; q.cx = (q.cx * q.mass + x) / mass; q.cy = (q.cy * q.mass + y) / mass; q.mass = mass;
      if (q.point === -1 && !q.children) { q.point = index; return; }
      if (depth > 24) return;
      if (!q.children) {
        const half = q.size / 2;
        q.children = [cell(q.x, q.y, half), cell(q.x + half, q.y, half), cell(q.x, q.y + half, half), cell(q.x + half, q.y + half, half)];
        const old = q.point; q.point = -1;
        const ox = positions[old * 2], oy = positions[old * 2 + 1];
        insert(q.children[(ox >= q.x + half ? 1 : 0) + (oy >= q.y + half ? 2 : 0)], old, depth + 1);
      }
      const half = q.size / 2;
      insert(q.children[(x >= q.x + half ? 1 : 0) + (y >= q.y + half ? 2 : 0)], index, depth + 1);
    }
    for (let i = 0; i < nodes.length; i++) insert(root, i);
    return root;
  }
  function step(iterations = 1) {
    if (!nodes.length) return positions;
    for (let iteration = 0; iteration < iterations; iteration++) {
      const alpha = Math.max(0.025, Math.pow(0.975, tick++)), root = tree();
      for (let i = 0; i < nodes.length; i++) {
        const x = positions[i * 2], y = positions[i * 2 + 1], stack = [root];
        let fx = (centers[i * 2] - x) * 0.012, fy = (centers[i * 2 + 1] - y) * 0.012;
        while (stack.length) {
          const q = stack.pop();
          if (!q.mass || (!q.children && q.point === i)) continue;
          let dx = x - q.cx, dy = y - q.cy;
          if (Math.abs(dx) + Math.abs(dy) < 0.001) { dx = 0.1; dy = (i % 2 ? 1 : -1) * 0.1; }
          const distance2 = dx * dx + dy * dy + 30;
          const contains = x >= q.x && x <= q.x + q.size && y >= q.y && y <= q.y + q.size;
          if (!q.children || (!contains && q.size * q.size < distance2 * 0.7)) {
            const force = 55 * q.mass / distance2;
            fx += dx * force; fy += dy * force;
          } else stack.push(...q.children);
        }
        velocity[i * 2] += fx * alpha; velocity[i * 2 + 1] += fy * alpha;
      }
      for (const [a, b] of links) {
        const dx = positions[b * 2] - positions[a * 2], dy = positions[b * 2 + 1] - positions[a * 2 + 1];
        const distance = Math.hypot(dx, dy) || 1;
        const target = 38 + Math.min(75, Math.sqrt(Math.max(neighbors[a].size, neighbors[b].size)) * 3);
        const force = (distance - target) / distance * 0.035 * alpha;
        const aWeight = 1 / Math.sqrt(neighbors[a].size || 1), bWeight = 1 / Math.sqrt(neighbors[b].size || 1);
        velocity[a * 2] += dx * force * aWeight; velocity[a * 2 + 1] += dy * force * aWeight;
        velocity[b * 2] -= dx * force * bWeight; velocity[b * 2 + 1] -= dy * force * bWeight;
      }
      for (let i = 0; i < nodes.length; i++) {
        if (pins.has(i)) { positions.set(pins.get(i), i * 2); velocity[i * 2] = 0; velocity[i * 2 + 1] = 0; continue; }
        for (let axis = 0; axis < 2; axis++) {
          const offset = i * 2 + axis;
          velocity[offset] = Math.max(-12, Math.min(12, velocity[offset] * 0.72));
          positions[offset] += velocity[offset];
        }
      }
    }
    return positions;
  }
  return { positions, step, pin(id, x, y) { const index = ids.get(id); if (index !== undefined) pins.set(index, [x, y]); } };
}
