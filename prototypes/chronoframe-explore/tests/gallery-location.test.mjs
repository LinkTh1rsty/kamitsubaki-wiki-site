import test from 'node:test'
import assert from 'node:assert/strict'
import {galleryURL} from '../app/utils/gallery-location.mjs'
test('photo sharing, album navigation and canonical links retain the mounted namespace',()=>{
 assert.equal(galleryURL('https://kamitsubaki.wiki','/visuals/','/public-id'),'https://kamitsubaki.wiki/visuals/public-id')
 assert.equal(galleryURL('http://127.0.0.1:18362','/visuals/','/albums/kaf?photo=public-id'),'http://127.0.0.1:18362/visuals/albums/kaf?photo=public-id')
 assert.equal(galleryURL('https://kamitsubaki.wiki','/visuals','/albums/kaf'),'https://kamitsubaki.wiki/visuals/albums/kaf')
 assert.equal(galleryURL('https://gallery.example','/','/albums/kaf'),'https://gallery.example/albums/kaf')
 assert.throws(()=>galleryURL('https://kamitsubaki.wiki','/visuals/','../gallery/'))
})
