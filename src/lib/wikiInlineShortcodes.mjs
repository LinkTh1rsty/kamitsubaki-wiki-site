export function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function renderInlineShortcode(name, args) {
  if (name === 'zh-variant' && args.length === 3 && args.every(Boolean)) {
    return { type: 'text', value: args[0] };
  }

  if (name === 'ja' && args.length === 1 && args[0]) {
    return `<span lang="ja">${escapeHtml(args[0])}</span>`;
  }

  const safe = args.map(escapeHtml);
  if (name === 'ruby' && (safe.length === 2 || safe.length === 3) && safe.every(Boolean)) {
    if (safe.length === 3) {
      return `<ruby>${safe[0]}<rt class="furi">${safe[1]}</rt><rt class="roma">${safe[2]}</rt></ruby>`;
    }
    return `<ruby>${safe[0]}<rt>${safe[1]}</rt></ruby>`;
  }
  if (name === 'spoiler' && safe.length === 1 && safe[0]) {
    return `<span class="wiki-spoiler" tabindex="0">${safe[0]}</span>`;
  }
  if (name === 'mark' && safe.length === 1 && safe[0]) return `<mark>${safe[0]}</mark>`;
  if (name === 'abbr' && safe.length === 2 && safe.every(Boolean)) {
    return `<abbr title="${safe[1]}">${safe[0]}</abbr>`;
  }
  if (name === 'kbd' && safe.length === 1 && safe[0]) return `<kbd>${safe[0]}</kbd>`;
  if (name === 'time' && safe.length === 2 && safe.every(Boolean)) {
    return `<time datetime="${safe[1]}">${safe[0]}</time>`;
  }
  if (['small', 'sub', 'sup'].includes(name) && safe.length === 1 && safe[0]) {
    return `<${name}>${safe[0]}</${name}>`;
  }

  return null;
}
