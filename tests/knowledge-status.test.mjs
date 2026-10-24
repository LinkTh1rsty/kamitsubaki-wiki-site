import test from 'node:test';
import assert from 'node:assert/strict';
import { createEntityRegistry } from '../src/lib/entityRegistry.mjs';
import { entityCompleteness } from '../src/lib/entityCompleteness.mjs';
import { buildKnowledgeReport, selectKnowledgeEntries, knowledgeEditorHref, knowledgeIssue } from '../src/lib/knowledgeStatus.mjs';
import { knowledgeCopy } from '../src/lib/knowledgeCopy.mjs';

const person = (id, extra = {}) => ({ schemaVersion: 2, id, locale: 'zh', entityType: 'person', name: id,
  romanizedName: id, roles: ['composer'], lifecycle: { activity: 'active', startedAt: '2020-01-01' },
  summary: 'A sourced creator.', sources: [{ title: 'Official', url: 'https://example.com' }],
  presentation: { image: '/images/artist.jpg' }, officialLinks: [{ url: 'https://example.com' }], ...extra });
const entry = data => ({ data, filePath: `F:\\wiki\\src\\content\\people\\solo\\${data.id}\\${data.locale}.md`, body: 'Private full body must never enter the index.' });

test('only incomplete records enter the board and weighted scores agree with the reader', () => {
  const incomplete = person('missing', { summary: ' ', sources: [], aliases: ['花譜'] });
  const registry = createEntityRegistry([entry(person('complete')), entry(incomplete)]);
  const report = buildKnowledgeReport(registry, 'zh');
  assert.equal(report.summary.total, 2); assert.equal(report.summary.needsWork, 1);
  assert.equal(report.summary.missingFields, 2); assert.equal(report.summary.missingTranslations, 0);
  assert.equal(report.entries[0].score, entityCompleteness(incomplete).score);
  assert.equal(report.summary.averageScore, Math.round((100 + entityCompleteness(incomplete).score) / 2));
  assert.deepEqual(report.fields.map(field => field.field).sort(), ['sources', 'summary']);
  assert.ok(!JSON.stringify(report).includes('Private full body'));
  assert.ok(!JSON.stringify(report).includes('F:\\wiki'));
});

test('fallback translations are visible without lowering metadata coverage or treating generated Chinese as missing', () => {
  const registry = createEntityRegistry([entry(person('kaf'))]);
  const translated = buildKnowledgeReport(registry, 'en');
  assert.equal(translated.entries[0].score, 100);
  assert.deepEqual(translated.entries[0].missing, [{ field: 'translation', weight: 0 }]);
  assert.equal(translated.summary.missingFields, 0); assert.equal(translated.summary.missingTranslations, 1);
  assert.equal(translated.entries[0].sourceLocale, 'zh');
  const target = new URL(translated.entries[0].editHref, 'https://wiki.example').searchParams.get('target');
  assert.equal(target, 'src/content/people/solo/kaf/zh.md');
  for (const locale of ['zh-tw', 'zh-hk']) assert.equal(buildKnowledgeReport(registry, locale).entries.length, 0);
});

test('concert completeness flags absent setlists; exhibitions are not assigned concert-only tasks', () => {
  const base = { entityType: 'live-event', summary: 'Concert', sources: [{ title: 'Official' }],
    presentation: { image: '/images/concert.jpg' }, dateRange: { start: '2024-01-01' }, venue: { name: 'Hall' }, headliners: ['kaf'] };
  assert.deepEqual(entityCompleteness({ ...base, eventType: 'oneman-live' }).missing.map(item => item.field), ['setlist']);
  assert.equal(entityCompleteness({ ...base, eventType: 'exhibition' }).score, 100);
  assert.equal(entityCompleteness({ ...base, eventType: 'oneman-live', setlist: [{ title: 'Song' }] }).score, 100);
  assert.ok(entityCompleteness(person('kaf', { presentation: { image: 'https://placehold.co/1200x800?text=KAF' } })).missing.some(item => item.field === 'presentation.image'));
});

test('field, type and multiword folded search filters combine without changing the source list', () => {
  const source = [
    { id: 'b', title: 'B', entityType: 'work-track', score: 20, search: '花谱 kaf song', missing: [{ field: 'credits' }, { field: 'sources' }] },
    { id: 'a', title: 'A', entityType: 'person', score: 70, search: '花谱 kaf creator', missing: [{ field: 'sources' }] },
    { id: 'c', title: 'C', entityType: 'work-track', score: 10, search: '理芽 rim song', missing: [{ field: 'credits' }] },
  ];
  const before = JSON.stringify(source);
  assert.deepEqual(selectKnowledgeEntries(source, { query: '花譜 KAF', type: 'work-track', field: 'credits' }).map(e => e.id), ['b']);
  assert.deepEqual(selectKnowledgeEntries(source, { sort: 'score' }).map(e => e.id), ['c', 'b', 'a']);
  assert.deepEqual(selectKnowledgeEntries(source, { sort: 'title' }).map(e => e.id), ['a', 'b', 'c']);
  assert.equal(selectKnowledgeEntries(source, { query: 'unknown' }).length, 0);
  assert.equal(JSON.stringify(source), before);
});

test('an artist name finds incomplete participating works through explicit performer IDs', () => {
  const registry = createEntityRegistry([entry(person('kaf', { name: '花譜', romanizedName: 'KAF' })), entry({ schemaVersion: 2,
    id: 'song', locale: 'zh', entityType: 'work-track', title: '魔女', romanizedTitle: 'Majo',
    performers: [{ entity: 'kaf', role: 'lead-vocal' }], credits: [] })]);
  const report = buildKnowledgeReport(registry, 'zh');
  assert.deepEqual(selectKnowledgeEntries(report.entries, { query: '花谱', type: 'work-track', field: 'credits' }).map(item => item.id), ['song']);
});

test('the JSON contract retains existing issue kinds and marks newly covered fields explicitly', () => {
  assert.deepEqual(knowledgeIssue({ field: 'credits' }, 'ja'), { kind: 'missing-credits' });
  assert.deepEqual(knowledgeIssue({ field: 'summary' }, 'zh'), { kind: 'missing-summary' });
  assert.deepEqual(knowledgeIssue({ field: 'sources' }, 'zh'), { kind: 'missing-sources' });
  assert.deepEqual(knowledgeIssue({ field: 'translation' }, 'ja'), { kind: 'missing-translation', refs: ['ja'] });
  assert.deepEqual(knowledgeIssue({ field: 'setlist' }, 'zh'), { kind: 'missing-field', refs: ['setlist'] });
});

test('missing or unsafe source paths never produce an invented editor destination', () => {
  assert.equal(knowledgeEditorHref({}, 'zh'), null);
  assert.equal(knowledgeEditorHref({ filePath: 'src/content/../outside/zh.md' }, 'zh'), null);
  const href = knowledgeEditorHref({ filePath: 'src/content/people/kaf/zh-tw.md' }, 'zh-tw');
  assert.equal(new URL(href, 'https://wiki.example').searchParams.get('target'), 'src/content/people/kaf/zh.md');
});

test('every completeness field has a translated label and empty archives produce finite summaries', () => {
  const empty = buildKnowledgeReport({ list: () => [] });
  assert.equal(empty.summary.averageScore, 0); assert.deepEqual(empty.entries, []);
  for (const locale of ['zh', 'zh-tw', 'zh-hk', 'ja', 'en']) {
    const copy = knowledgeCopy(locale);
    assert.ok(copy.fields.credits && copy.fields.setlist && copy.fields.translation);
    assert.ok(copy.types['work-track'] && copy.sorts.missing && copy.results.includes('{total}'));
  }
});
