import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

// Navigation, prose, and whole-card links are not action controls. This check
// catches unstyled direct links to contribution workflows in Astro UI surfaces.
const actionRoute = /contribute\/editor|articles\/submit|gallery\/manage|account\/creator|docs\/contribute/;
const intentionalNavigation = [
  /^src\/components\/ContributionNav\.astro$/,
  /^src\/components\/editor\/EditorEntry\.astro$/,
  /^src\/components\/editor\/EditorWorkbench\.astro$/,
  /^src\/components\/editor\/NovelWorkbench\.astro$/,
  /^src\/pages\/\[locale\]\/account\.astro$/,
  /^src\/pages\/\[locale\]\/contribute\/edit\.astro$/,
];
const files = [];
for (const base of ['src/components', 'src/pages/[locale]']) {
  const visit = directory => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (path.endsWith('.astro')) files.push(path);
    }
  };
  visit(base);
}

const errors = [];
for (const file of files) {
  const source = readFileSync(file, 'utf8');
  const name = relative('.', file).replace(/\\/g, '/');
  for (const match of source.matchAll(/<a\b[^>]*>/g)) {
    const tag = match[0];
    if (!actionRoute.test(tag) || /\bclass(?::list)?=/.test(tag)) continue;
    if (intentionalNavigation.some(pattern => pattern.test(name))) continue;
    const line = source.slice(0, match.index).split('\n').length;
    errors.push(`${name}:${line}: action link needs ContextAction, WorkspaceButton, or a documented navigation/card treatment`);
  }
}
for (const file of ['src/scripts/creatorCenter.js', 'src/scripts/articleSubmission.js']) {
  const source = readFileSync(file, 'utf8');
  if (/createElement\(['"]a['"]\)|text\(['"]a['"]/.test(source)) {
    errors.push(`${file}: dynamic workflow links should use createContextAction`);
  }
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Checked contribution action links in ${files.length} Astro files.`);
}
