import test from 'node:test';
import assert from 'node:assert/strict';
import {buildHomePortal,homeUpdates} from '../src/lib/homePortal.mjs';

test('home collections cover actual database records while reading starts stay bounded and deduplicated',()=>{
  const people=Array.from({length:9},(_,i)=>({url:`/zh/database/people/p${i}/`,data:{id:`p${i}`,entityType:'person',name:`Person ${i}`}}));
  const entries=[...people,{url:'/zh/database/music/s/',data:{id:'s',entityType:'work-track',title:'Song'}},{url:'/zh/articles/a/',data:{id:'a',entityType:'editorial-article',title:'Article'}}];
  const portal=buildHomePortal(entries,[people[0],people[0],...people.slice(1),entries.at(-1)]);
  assert.equal(portal.total,10);
  assert.deepEqual(portal.collections,[{id:'people',count:9},{id:'music',count:1}]);
  assert.equal(portal.people.length,6);assert.equal(new Set(portal.people.map(entry=>entry.data.id)).size,6);
});

test('homepage updates exclude drafts, preserve real dates and link to the published announcement identity',()=>{
  const entries=[{data:{translationKey:'older',title:'Older',date:'2026.09.30',draft:false}},{data:{translationKey:'private',title:'Not published',date:'2026.10.20',draft:true}},{data:{translationKey:'new / key',title:'Newer',date:'2026.10.14',draft:false}}];
  const rows=homeUpdates(entries,'ja');
  assert.deepEqual(rows.map(row=>row.title),['Newer','Older']);
  assert.equal(rows[0].datetime,'2026-10-14');assert.equal(rows[0].href,'/ja/announcements/#new%20%2F%20key');
  assert.equal(entries[0].data.title,'Older');
});
