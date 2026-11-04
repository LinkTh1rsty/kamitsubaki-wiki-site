import test from 'node:test'
import assert from 'node:assert/strict'
import { photos, albums, sourceItems, toPhoto } from '../server/utils/wiki-gallery.mjs'

test('public image identity, provenance and thumbnail/original separation survive adaptation', () => {
  for (const item of sourceItems) {
    const photo = toPhoto(item)
    assert.equal(photo.id, item.id)
    assert.equal(photo.wiki.sourceUrl, item.sourceUrl || '')
    assert.equal(photo.wiki.author, item.author || '')
    assert.equal(photo.dateTaken, null)
    assert.equal(photo.wiki.sourceDate, item.date || null)
    assert.equal(photo.exif, null)
    assert.equal(photo.latitude, null)
    assert.notEqual(photo.thumbnailUrl, photo.originalUrl)
    assert.match(photo.originalUrl, /^\/api\/media\/[\w-]+\/original$/)
    assert.match(item.src, /^https:\/\/images\.kamitsubaki\.wiki\/gallery\//)
  }
})

test('album projections contain only existing public photos and valid covers', () => {
  const ids = new Set(photos.map(photo => photo.id))
  assert.equal(ids.size, photos.length)
  assert.ok(albums.length >= 5)
  for (const album of albums) {
    assert.ok(album.photoIds.length)
    assert.ok(album.photoIds.includes(album.coverPhotoId))
    for (const id of album.photoIds) assert.ok(ids.has(id))
    assert.equal(album.photos.length, album.photoIds.length)
    if (!['portraits', 'visuals', 'covers'].includes(album.slug)) {
      for (const photo of album.photos) assert.ok(photo.wiki.entityIds.includes(album.slug))
    }
  }
})
