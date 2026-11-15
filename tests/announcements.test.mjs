import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import yaml from 'yaml';

const locales = ['zh', 'ja', 'en'];

async function readAnnouncement(id, locale) {
  const source = await readFile(
    new URL(`../src/content/announcements/2026/${id}/${locale}.md`, import.meta.url),
    'utf8',
  );
  const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  assert.ok(frontmatter);
  return yaml.parse(frontmatter[1]);
}

test('V1.3.3 announcement is complete and superseded in every locale', async () => {
  const announcements = await Promise.all(
    locales.map((locale) => readAnnouncement('2026-07-26-v1-3-3', locale)),
  );

  assert.deepEqual(announcements.map((announcement) => announcement.locale), locales);
  assert.equal(
    announcements.every((announcement) => announcement.translationKey === '2026-07-26-v1-3-3'),
    true,
  );
  assert.equal(announcements.every((announcement) => announcement.pinned === false), true);
  assert.equal(announcements.every((announcement) => announcement.title.includes('V1.3.3')), true);
  assert.equal(announcements.every((announcement) => announcement.summary.length > 300), true);
  assert.equal(announcements.every((announcement) => !announcement.summary.includes('PR #')), true);
});

test('V2.0.0 announcement is superseded in every locale', async () => {
  const announcements = await Promise.all(
    locales.map((locale) => readAnnouncement('2026-09-01-v2-0-0', locale)),
  );

  assert.deepEqual(announcements.map((announcement) => announcement.locale), locales);
  assert.equal(announcements.every((announcement) => announcement.pinned === false), true);
  assert.equal(announcements.every((announcement) => announcement.title.includes('V2.0.0')), true);
});

test('previous V1.3.0 announcement is no longer pinned', async () => {
  const announcements = await Promise.all(
    locales.map((locale) => readAnnouncement('2026-07-22-v1-3-0', locale)),
  );

  assert.equal(announcements.every((announcement) => announcement.pinned === false), true);
});

test('announcement read state is scoped to the current announcement id', async () => {
  const component = await readFile(new URL('../src/components/AnnouncementModal.astro', import.meta.url), 'utf8');

  assert.match(component, /modal\.dataset\.announcementId/);
  assert.match(component, /getItem\(storageKey\) === announcementId/);
  assert.match(component, /setItem\(storageKey, announcementId\)/);
  assert.doesNotMatch(component, /setItem\(storageKey, 'true'\)/);
});

async function entryFor(id, locale = 'zh') {
  return {
    id: `2026/${id}/${locale}`,
    filePath: `src/content/announcements/2026/${id}/${locale}.md`,
    data: await readAnnouncement(id, locale),
  };
}

const { renderAnnouncement, selectFeaturedAnnouncement } = await import('../src/lib/announcements.mjs');

test('drafts are excluded from production selection and visible only when requested', async () => {
  const published = await entryFor('2026-09-06-reading-and-contributing');
  const draft = { id: 'future-draft', data: { ...published.data, draft: true, order: -99 } };
  const entries = [published, draft];
  assert.equal(selectFeaturedAnnouncement(entries), published);
  assert.equal(selectFeaturedAnnouncement(entries, { includeDrafts: true }), draft);
  assert.equal(selectFeaturedAnnouncement([draft]), undefined);
  assert.deepEqual(entries, [published, draft]);
});

test('announcement body renders article headings, links, emphasis and Wiki details in every locale', async () => {
  for (const locale of [...locales, 'zh-tw', 'zh-hk']) {
    const entry = await entryFor('2026-09-06-reading-and-contributing', locale);
    const rendered = await renderAnnouncement(entry);
    assert.equal(rendered.id, '2026-09-06-reading-and-contributing');
    assert.equal(rendered.draft, false);
    assert.match(rendered.html, /<h2\b/);
    assert.match(rendered.html, /<strong>/);
    assert.match(rendered.html, /<details\b/);
    assert.match(rendered.html, /<summary>/);
    assert.match(rendered.html, new RegExp(`href="/${locale}/contribute/edit/"`));
    assert.doesNotMatch(rendered.html, /\{\{\/?details/);
  }
});

test('legacy summary-only notices still render in simplified and generated traditional Chinese', async () => {
  for (const locale of ['zh', 'zh-tw', 'zh-hk']) {
    const rendered = await renderAnnouncement(await entryFor('2026-09-01-v2-0-0', locale));
    assert.match(rendered.html, /<p>/);
    assert.match(rendered.html, /v2\.0\.0/);
    assert.match(rendered.html, /<a href="https:\/\/kamitsubaki.wiki/);
  }
});

test('announcement rendering preserves reader features and sanitizes authored HTML', async (t) => {
  const { mkdtemp, writeFile, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const dir = await mkdtemp(join(tmpdir(), 'wiki-announcement-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const filePath = join(dir, 'zh.md');
  await writeFile(filePath, `---\nlocale: zh\n---\n## Heading

- **Item**

| Feature | State |
| --- | --- |
| Markdown | Ready |

{{ruby::花譜::かふ}}

{{spoiler::Hidden text}}

$E=mc^2$

<script>alert('unsafe')</script>
<img src="/safe.png" onerror="alert(1)">
<a href="javascript:alert(1)">unsafe link</a>
`);
  const { html } = await renderAnnouncement({ filePath, id: 'fixture', data: { locale: 'zh', summary: 'Fallback should not appear' } });
  for (const pattern of [/<h2\b/, /<ul>/, /<table>/, /<ruby>/, /wiki-spoiler/, /class="katex"/]) assert.match(html, pattern);
  assert.doesNotMatch(html, /<script|onerror=|javascript:|Fallback should not appear/);
});


test('V2.4.0 renders its navigation and account links in every locale',async()=>{
  for(const locale of [...locales,'zh-tw','zh-hk']){
    const rendered=await renderAnnouncement(await entryFor('2026-09-14-v2-4-0',locale));
    assert.match(rendered.html,/<h2\b/);
    for(const route of ['contribute/','contribute/editor/','account/','#social-contact'])assert.ok(rendered.html.includes(`href="/${locale}/${route}"`));
    assert.doesNotMatch(rendered.html,/href="[^"]*\/contact\//);
  }
});

test('V3.1.1 through V3.3.0 announcements render localized routes and pin only V3.3.0', async () => {
  for (const archivedId of [
    '2026-09-30-v3-0-0',
    '2026-10-15-v3-1-0',
    '2026-10-20-v3-1-1',
    '2026-10-26-v3-1-2',
    '2026-10-27-v3-2-0',
  ]) {
    const items = await Promise.all(locales.map((locale) => readAnnouncement(archivedId, locale)));
    assert.equal(items.every((item) => item.pinned === false && item.draft === false), true, archivedId);
  }

  for (const backfillId of ['2026-10-20-v3-1-1', '2026-10-26-v3-1-2', '2026-10-27-v3-2-0']) {
    const items = await Promise.all(locales.map((locale) => readAnnouncement(backfillId, locale)));
    assert.equal(items.every((item) => item.autoOpen === false), true, backfillId);
  }

  const latestItems = await Promise.all(locales.map((locale) => readAnnouncement('2026-11-05-v3-3-0', locale)));
  assert.equal(
    latestItems.every((item) => item.pinned === true && item.autoOpen === true && item.draft === false),
    true,
  );

  const v3Entries = await Promise.all(
    [
      '2026-09-30-v3-0-0',
      '2026-10-15-v3-1-0',
      '2026-10-20-v3-1-1',
      '2026-10-26-v3-1-2',
      '2026-10-27-v3-2-0',
      '2026-11-05-v3-3-0',
    ].map((id) => entryFor(id, 'zh')),
  );
  assert.equal(selectFeaturedAnnouncement(v3Entries)?.id, '2026/2026-11-05-v3-3-0/zh');

  const routeExpectations = [
    ['2026-10-20-v3-1-1', ['account/', 'support/', 'contribute/review/', 'database/isotopes/kafu/']],
    ['2026-10-26-v3-1-2', ['', 'events/', 'community/activities/']],
    ['2026-10-27-v3-2-0', ['explore/#visual-roam', 'gallery/', 'gallery/manage/']],
    [
      '2026-11-05-v3-3-0',
      [
        'contribute/editor/',
        'articles/submit/',
        'articles/',
        'database/artists/solo/local-486b0763-fb4c-4598-a4b0-670297287b00/',
      ],
    ],
  ];

  for (const locale of [...locales, 'zh-tw', 'zh-hk']) {
    for (const [id, routes] of routeExpectations) {
      const rendered = await renderAnnouncement(await entryFor(id, locale));
      assert.equal(rendered.id, id);
      assert.match(rendered.html, /<h2\b/);
      for (const route of routes) {
        assert.ok(rendered.html.includes(`href="/${locale}/${route}"`), `${id} (${locale}): missing /${locale}/${route}`);
      }
      if (id === '2026-10-27-v3-2-0') {
        assert.ok(rendered.html.includes('href="/visuals/"'), `${id} (${locale}): missing /visuals/`);
        assert.ok(rendered.html.includes('href="/visuals/albums"'), `${id} (${locale}): missing /visuals/albums`);
      }
    }
  }
});
