import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {newDraft,exportMarkdown,importMarkdown} from '../src/lib/visualEditor.mjs';
const require=createRequire(import.meta.url);
const astroRequire=createRequire(require.resolve('astro/package.json'));
const yaml=astroRequire('js-yaml');
const read=s=>yaml.load(s.split('---')[1]);
test('editor dates and YAML-looking strings survive the Astro parser',()=>{
 const draft=newDraft('people','zh');
 draft.meta.lifecycle={activity:'active',startedAt:'2021-11-18'};
 draft.meta.affiliations=[{organization:'pndr',current:true,startDate:'2025-09-12',endDate:'2026-11-04'}];
 draft.meta.aliases=['2021-11-18','2021-11-18T00:00:00Z','0123','0xFF','true','null','.nan','yes','12:34'];
 const parsed=read(exportMarkdown(draft));
 assert.deepEqual(parsed.lifecycle,draft.meta.lifecycle);
 assert.deepEqual(parsed.affiliations,draft.meta.affiliations);
 assert.deepEqual(parsed.aliases,draft.meta.aliases);
});
test('unchanged imported drafts repair ambiguous dates without changing body',()=>{
 const source='---\nschemaVersion: 2\nid: sample\nlocale: zh\nentityType: person\nname: Sample\nromanizedName: Sample\nroles: [vocalist]\nlifecycle:\n  activity: active\n  startedAt: 2021-11-18\n---\n\nKeep this body.\n';
 const result=exportMarkdown(importMarkdown(source,'people'));
 assert.equal(read(result).lifecycle.startedAt,'2021-11-18');
 assert.ok(result.endsWith('Keep this body.\n'));
});

test('canonical ISO timestamps in unchanged imported aliases retain string types',()=>{
 const draft=newDraft('people','zh');draft.meta.name='Sample';draft.meta.romanizedName='Sample';
 const source=exportMarkdown(draft).replace('roles: []','roles: []\naliases: [2021-11-18T00:00:00.000Z]');
 const output=exportMarkdown(importMarkdown(source,'people'));
 assert.equal(read(output).aliases[0],'2021-11-18T00:00:00.000Z');
});
