import test from 'node:test';
import assert from 'node:assert/strict';
import {getArchiveSnapshot} from '../src/lib/archiveSnapshot.mjs';

test('the real archive indexes authored media directives without requiring duplicate frontmatter',async()=>{
 const snapshot=await getArchiveSnapshot(),song=snapshot.entities.find(row=>row.id==='kaf-majo');
 assert.equal(song.media.find(item=>item.platform==='youtube').embed.provider,'youtube');
 assert.equal(song.media.find(item=>item.platform==='youtube').embed.src,'https://www.youtube-nocookie.com/embed/AqwFHfsAlx0');
 assert.match(song.media.find(item=>item.platform==='bilibili').embed.src,/bvid=BV1FJ41187QY/);
 assert.ok(song.media.find(item=>item.platform==='netease'));
 assert.ok(song.narratives.en && song.narratives.ja);
});
