export const DEFAULT_KARAOKE_TAIL_DURATION = 3.2;

const asFiniteNumber = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

export function resolveKaraokeEndTime(startTime, nextWordTime, lineEndTime) {
  const start = asFiniteNumber(startTime);
  if (start === null) return null;

  const nextWord = asFiniteNumber(nextWordTime);
  if (nextWord !== null && nextWord > start) return nextWord;

  const lineEnd = asFiniteNumber(lineEndTime);
  if (lineEnd !== null && lineEnd > start) return lineEnd;

  return start + DEFAULT_KARAOKE_TAIL_DURATION;
}

export function getKaraokeProgress(currentTime, startTime, endTime) {
  const current = asFiniteNumber(currentTime);
  const start = asFiniteNumber(startTime);
  const end = asFiniteNumber(endTime);

  if (current === null || start === null || end === null) return 0;
  if (end <= start) return current >= start ? 1 : 0;
  return Math.min(1, Math.max(0, (current - start) / (end - start)));
}

export function formatKaraokeProgress(progress) {
  const normalized = Math.min(1, Math.max(0, Number(progress) || 0));
  return `${Math.round(normalized * 1000) / 10}%`;
}
