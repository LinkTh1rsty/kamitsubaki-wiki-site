export const SHEET_FRAME_SIZE = 362;

export const SPRITE_FOOT_PIXELS = [310, 308, 312, 313, 303, 302, 296, 244, 261, 267, 267, 271];

export const TERRAIN_REGIONS = {
  ground: { x: 71, y: 91, width: 195, height: 157, surfaceY: 18 },
  platform: { x: 691, y: 428, width: 189, height: 94, surfaceY: 1 },
};

export function getSpriteDrawY(worldFootY, frameIndex, drawHeight) {
  const footPixel = SPRITE_FOOT_PIXELS[frameIndex] ?? SPRITE_FOOT_PIXELS[0];
  return worldFootY - (footPixel / SHEET_FRAME_SIZE) * drawHeight;
}

export function getTerrainTileGeometry(kind, worldSurfaceY, drawWidth) {
  const source = TERRAIN_REGIONS[kind];
  if (!source) throw new TypeError(`Unknown terrain kind: ${kind}`);
  const scale = drawWidth / source.width;
  const drawHeight = source.height * scale;
  const surfaceOffset = source.surfaceY * scale;
  return {
    source: { ...source },
    drawWidth,
    drawHeight,
    drawY: worldSurfaceY - surfaceOffset,
    surfaceOffset,
  };
}

export function archiveKey(item) {
  return `${item.kind}:${item.id}`;
}

export function isDirectConnection(left, right) {
  if (!left || !right) return false;
  const leftKey = archiveKey(left);
  const rightKey = archiveKey(right);
  return Boolean(left.connections?.includes(rightKey) || right.connections?.includes(leftKey));
}

const nextKindOrder = {
  artist: ['song', 'album', 'project', 'artist'],
  song: ['album', 'artist', 'song', 'project'],
  album: ['song', 'artist', 'album', 'project'],
  project: ['artist', 'project', 'song', 'album'],
};

export function selectGraphPath(anchor, catalog, edgeCount = 3) {
  if (!anchor) return [];
  const path = [anchor];
  const visited = new Set([archiveKey(anchor)]);
  let current = anchor;
  while (path.length <= edgeCount) {
    const order = nextKindOrder[current.kind] ?? ['song', 'album', 'artist', 'project'];
    const candidates = catalog
      .filter((candidate) => !visited.has(archiveKey(candidate)) && isDirectConnection(current, candidate))
      .sort((left, right) => {
        const kindDifference = order.indexOf(left.kind) - order.indexOf(right.kind);
        if (kindDifference) return kindDifference;
        return left.title.localeCompare(right.title);
      });
    const next = candidates[0];
    if (!next) break;
    path.push(next);
    visited.add(archiveKey(next));
    current = next;
  }
  return path;
}

function relationFact(from, to) {
  const facts = [...(from.facts ?? []), ...(to.facts ?? [])];
  const preferredPattern = from.kind === 'song' && to.kind === 'album'
    ? /收录|収録|Collection/i
    : (from.kind === 'artist' && to.kind === 'song') || (from.kind === 'song' && to.kind === 'artist')
      ? /演唱|アーティスト|Artist/i
      : /收录|収録|Collection|演唱|アーティスト|Artist|分类|分類|Category/i;
  const specific = facts.find((fact) => preferredPattern.test(fact))
    ?? facts.find((fact) => !/档案类型|記録種別|Archive type/i.test(fact));
  return specific ?? `${from.kind.toUpperCase()} / ${to.kind.toUpperCase()}`;
}

export function buildGraphQuestion(path, edgeIndex, catalog) {
  const predecessor = path[edgeIndex];
  const correct = path[edgeIndex + 1];
  if (!predecessor || !correct || !isDirectConnection(predecessor, correct)) {
    throw new TypeError('Graph question requires a real consecutive path edge.');
  }
  const contextStart = Math.max(0, edgeIndex - 1);
  const pathLabel = `${path.slice(contextStart, edgeIndex + 1).map((item) => item.title).join(' → ')} → ?`;
  const distractors = catalog
    .filter((candidate) => candidate.kind === correct.kind && archiveKey(candidate) !== archiveKey(correct) && !isDirectConnection(predecessor, candidate))
    .sort((left, right) => {
      const leftAffinity = Number(left.relatedKey === correct.relatedKey);
      const rightAffinity = Number(right.relatedKey === correct.relatedKey);
      if (leftAffinity !== rightAffinity) return rightAffinity - leftAffinity;
      return left.title.localeCompare(right.title);
    })
    .slice(0, 2);
  const options = [correct, ...distractors];
  while (options.length < 3) {
    const fallback = catalog.find((candidate) => (
      candidate.kind === correct.kind
      && !isDirectConnection(predecessor, candidate)
      && !options.some((item) => archiveKey(item) === archiveKey(candidate))
    ));
    if (!fallback) break;
    options.push(fallback);
  }
  const shift = edgeIndex % Math.max(1, options.length);
  const rotatedOptions = [...options.slice(shift), ...options.slice(0, shift)];
  const clue = (correct.facts ?? [])
    .filter((fact) => !/档案类型|記録種別|Archive type/i.test(fact) && !fact.includes(correct.title))
    .slice(0, 2)
    .join(' · ');
  return {
    predecessor,
    correct,
    pathLabel,
    clue,
    prompt: '哪一项能完成这条真实 Wiki 关系链？',
    hint: `真实关联：${predecessor.title} → ${correct.title} · ${relationFact(predecessor, correct)}`,
    options: rotatedOptions,
  };
}

export function resolveGraphAnswer(state, choice, question) {
  const correct = archiveKey(choice) === archiveKey(question.correct);
  return {
    correct,
    health: correct ? state.health : Math.max(0, state.health - 1),
    awardFragment: correct,
    hint: question.hint,
  };
}
