// Replaces V2 folder/template snapshots with V3 public data and shared-reader contracts.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {z} from 'astro/zod';
import {createEntitySchema} from '../src/lib/entitySchema.mjs';
import {getEntityRegistry,entityLocales} from '../src/lib/entityRegistry.mjs';
import {entityCollections} from '../src/lib/entityContract.mjs';
import {entitySourcePath} from '../src/lib/contentLayout.mjs';
import {buildEntityMusicCatalog} from '../src/lib/entityViews.mjs';
import {getLocalizedSite} from '../src/lib/homeData.mjs';
const source=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
const registry=await getEntityRegistry();
const schema=createEntitySchema(z);
for(const collection of entityCollections)test(`V3 ${collection}: canonical sources validate and retain their identity across languages`,()=>{
 const groups=[...registry.entities.values()].filter(group=>[...group.values()][0].filePath.includes(`/content/${collection}/`));assert.ok(groups.length,collection);
 for(const group of groups)for(const [locale,entry]of group){const parsed=schema.safeParse(entry.data);assert.ok(parsed.success,`${entry.filePath}: ${parsed.error?.message}`);assert.equal(entry.filePath.endsWith(entitySourcePath(entry.data)),true,entry.filePath);assert.equal(entry.data.locale,locale);assert.equal(entry.data.id,group.get('zh')?.data.id||entry.data.id);}
});
for(const locale of entityLocales)test(`V3 ${locale}: stable entities resolve to unique localized routes and every relation resolves`,()=>{
 const entries=registry.list(locale),routes=new Set();for(const entry of entries){assert.ok(entry.url.startsWith('/'+locale+'/'));assert.ok(!routes.has(entry.url),entry.url);routes.add(entry.url);for(const edge of registry.getOutgoingRelations(entry.data.id))assert.ok(registry.resolveEntity(edge.target,locale),`${entry.data.id} -> ${edge.target}`);}
});
test('all migrated V2 aliases still resolve to existing V3 entities',()=>{
 assert.ok(registry.legacyRoutes.size>1000);for(const [route,id]of registry.legacyRoutes){assert.ok(route.startsWith('/'));assert.ok(registry.resolveEntity(id),`${route} -> ${id}`);}
});
test('shared reader retains background, sidebar, sources, license, contributors and editable source routes',async()=>{
 const reader=await source('src/components/EntityArticle.astro');for(const name of ['ReaderRecordList','ReaderDisclosure','ReaderSources','ContentLicenseNotice','ContributorRoster','EntityInfoBox','MorphingSwitcher','MemoryCorridorEntryLink','DatabaseArticleLinks'])assert.match(reader,new RegExp('<'+name+'[\\s/>]'));
 assert.match(reader,/<Reader\b[^>]*backgroundImage=\{/);assert.match(reader,/slot="sidebar"/);assert.match(reader,/contribute\/editor\/\?target=/);assert.match(reader,/wiki-artist-prose/);assert.match(reader,/noindex:d\.contentStatus==='stub'/);
 const styles=await source('src/styles/global.css');assert.match(styles,/html\[data-theme='light'\] \.wiki-theme-shell/);
});
test('homepage keeps the established music sections and shared directory',async()=>{
 const home=await source('src/pages/[locale]/index.astro');assert.match(home,/<HomeDirectory/);assert.match(home,/buildEntityMusicCatalog/);assert.match(home,/sampleRandom/);assert.ok(home.indexOf('<HomeMusicSection')<home.indexOf('<ContributorRoster'));
 const music=await source('src/components/HomeMusicSection.astro');assert.match(music,/>RHYTHM</);assert.match(music,/songs/);assert.match(music,/albums/);
 const sites=await Promise.all(['zh','ja','en'].map(async locale=>({data:JSON.parse(await source(`src/content/site/${locale}.json`))})));
 for(const locale of entityLocales){const site=getLocalizedSite(sites,locale);assert.match(JSON.stringify(site.hero),/3\.1\.0/);assert.ok(site.sections.songs.heading);assert.ok(site.sections.albums.heading);}
});
test('homepage music uses entry artwork first, then performer artwork, with canonical links',()=>{
 const registry={list:()=>[{data:{id:'song',entityType:'work-track',title:'Song',performers:[{entity:'kaf'}]},url:'/zh/database/music/songs/song/'},{data:{id:'album',entityType:'work-release',title:'Album',primaryArtist:'kaf',presentation:{image:'/own.webp'}},url:'/zh/database/music/albums/album/'}],resolveEntity:()=>({data:{name:'花譜',presentation:{image:'/artist.webp'}}})};
 const music=buildEntityMusicCatalog(registry,'zh');assert.equal(music.songs[0].image,'/artist.webp');assert.equal(music.albums[0].image,'/own.webp');assert.equal(music.songs[0].subtitle,'花譜');assert.equal(music.albums[0].href,'/zh/database/music/albums/album/');
});
test('retired music catalog pages are removed and homepage links to canonical catalogs',async()=>{
 for(const [oldPath,component]of [['songs','SongsSection'],['albums','AlbumsSection']]){await assert.rejects(access(new URL(`../src/pages/[locale]/${oldPath}/index.astro`,import.meta.url)),{code:'ENOENT'});assert.ok((await source(`src/components/${component}.astro`)).includes(`/database/music/${oldPath}/`));}
 const catalog=await source('src/components/EntityCatalog.astro');assert.match(catalog,/getEntityRegistry/);assert.match(catalog,/<ClassificationDirectory/);assert.match(catalog,/Workspace/);
});
test('all release tracks resolve to canonical trilingual recordings without duplicate IDs',()=>{
 const releases=registry.list('zh').filter(e=>e.data.entityType==='work-release');assert.ok(releases.length>=56);
 for(const entry of releases)for(const track of entry.data.tracks||[]){if(!track.songId)continue;for(const locale of ['zh','ja','en']){const song=registry.resolveEntity(track.songId,locale);assert.ok(song,`${entry.data.id} -> ${track.songId}`);assert.equal(song.data.entityType,'work-track');assert.equal(song.sourceLocale,locale);}}
});
for(const artist of ['kaf','vwp','rim','harusaruhi','isekaijoucho','koko'])test(`${artist}: migrated music corpus remains complete and artwork exists`,async()=>{
 const songs=registry.list('zh').filter(e=>e.data.entityType==='work-track'&&e.data.performers.some(p=>p.entity===artist));const minimum={kaf:263,vwp:117,rim:132,harusaruhi:169,isekaijoucho:142,koko:76};assert.ok(songs.length>=minimum[artist],`${artist}: ${songs.length}`);
 for(const entry of songs){for(const locale of ['zh','ja','en'])assert.equal(registry.resolveEntity(entry.data.id,locale).sourceLocale,locale);const image=entry.data.presentation?.image;if(image?.startsWith('/images/'))await access(new URL('../public'+image,import.meta.url));}
});
test('schema rejects invalid work dates, durations and unsafe links',()=>{
 const original=registry.list('zh').find(e=>e.data.entityType==='work-track').data;
 for(const patch of [{releaseDate:'tomorrow'},{duration:'three minutes'},{presentation:{image:'javascript:alert(1)'}},{media:[{platform:'custom',type:'link',url:'data:text/html,attack'}]}])assert.equal(schema.safeParse({...original,...patch}).success,false);
});
test('stub metadata, permanent archives and observation forms remain discoverable',()=>{
 assert.equal(schema.safeParse({schemaVersion:2,id:'reserved',locale:'zh',entityType:'lore-concept',name:'Reserved',loreCategory:'concept',contentStatus:'stub'}).success,true);
 assert.equal(registry.resolveEntity('aru').data.lifecycle.archive.mode,'permanent');
 assert.ok(registry.morphs('kaf').length>1);for(const item of registry.morphs('kaf'))assert.ok(item.data.presentation?.image);
});
test('source collections use the compact metadata loader and retain no duplicate prose',async()=>{
 const config=await source('src/content.config.ts');for(const name of entityCollections){assert.match(config,new RegExp(`const ${name} = defineCollection\\(\\{loader: ?metadataOnlyGlob`));}
 const loader=await source('src/lib/metadataOnlyGlob.mjs');assert.match(loader,/retainBody: false/);assert.match(loader,/withoutRenderedContent/);
});
test('homepage intro is bounded without waiting for external assets to finish loading',async()=>{
 const interactions=await source('src/scripts/siteInteractions.js');assert.match(interactions,/let pageLoaded = true/);assert.match(interactions,/animationDuration \+ 1500/);assert.match(interactions,/classList\.remove\('site-intro-enabled'\)/);
});
test('article and encyclopedia editors share one workbench with separate persistence adapters',async()=>{
 for(const file of ['articles/submit.astro','contribute/editor.astro'])assert.match(await source('src/pages/[locale]/'+file),/<NovelWorkbench/);
 const host=await source('prototypes/novel-editor/src/lib/editor-host.ts');assert.match(host,/credentials:'include'/);assert.match(host,/\/api\/editor\/preview/);assert.match(host,/\/api\/admin\/articles/);
});
test('contribution and licensing manuals describe the current maintenance flows in all source languages',async()=>{
 for(const locale of ['zh','ja','en']){
  const chapters=await Promise.all(['start','entry','format','syntax','article','gallery','review','rights'].map(chapter=>source(`docs/manuals/contribute/${chapter}/${locale}.md`)));
  const guide=chapters.join('\n');
  for(const marker of ['GitHub','schemaVersion','presentation','relations','performers'])assert.ok(guide.includes(marker),`${locale}: ${marker}`);
  assert.match(guide,/articles\/submit/);assert.match(guide,/gallery\/manage/);assert.match(chapters.at(-1),/CC BY-NC-SA 4\.0/);
 }
});
test('memory corridor consumes the stable V3 game catalog, including facts and relations',async()=>{
 const catalog=await source('src/pages/[locale]/game-index.json.ts'),runner=await source('public/games/memory-corridor/index.html');assert.match(catalog,/getEntityRegistry/);assert.match(catalog,/facts:/);assert.match(catalog,/connections:/);assert.match(catalog,/href:e.url/);assert.match(runner,/catalog\.items/);assert.match(runner,/sourceKind/);assert.match(runner,/sourceId/);
});
