import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('support page leads with one primary action and keeps the official card secondary',()=>{
 const page=read('src/pages/[locale]/support.astro'),hero=read('src/components/SupportHero.astro'),widget=read('src/components/AfdianWidget.astro');
 assert.ok(page.indexOf('<SupportHero')<page.indexOf('<WorkspaceNavigation'),'hero precedes the detail tabs');
 assert.equal((hero.match(/tone="primary"/g)||[]).length,1,'only one primary call to action');
 assert.match(hero,/data-support-primary/);
 assert.doesNotMatch(page,/<SupportPlans|<AfdianWidget[^>]*\/>\s*<SupportPlans/);
 assert.match(widget,/^<details class="support-afdian"/m,'the third-party iframe stays collapsed until requested');
});

test('support hero offers three recommended plans plus a custom amount for every locale',()=>{
 const hero=read('src/components/SupportHero.astro');
 for(const locale of ['zh','ja','en'])assert.match(hero,new RegExp(` ${locale}:\\{label:`),`${locale} copy`);
 for(const id of ["'observer'","'koko'","'joint'"])assert.ok(hero.includes(`tier(${id})`),`${id} plan card`);
 assert.match(hero,/support-plan--custom/);
});

test('support profile page follows site tokens instead of a private palette',()=>{
 const page=read('src/components/SupporterProfilePage.astro'),style=page.slice(page.indexOf('<style>'));
 assert.doesNotMatch(style,/#(?!d9534f)[0-9a-f]{3,8}\b/i);
 assert.doesNotMatch(style,/system-ui/);
 assert.match(page,/kamitsubaki-theme/,'respects the saved site theme');
});

test('support page hides the redundant floating support button',()=>{
 assert.match(read('src/styles/support.css'),/:has\(\[data-support-page\]\) \.support-float\{display:none\}/);
});
