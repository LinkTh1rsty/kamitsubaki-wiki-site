import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {articleMetaHTML,articleAvatarURL,enhanceArticleAvatars} from '../src/lib/articleReaderPresentation.mjs';

test('article metadata separates category, author, provenance and publication/update dates and escapes content',()=>{
 const html=articleMetaHTML({category:'profile',origin:'user-submission',author:'Name <script>',authorAvatarUrl:'https://wiki.example/avatar.png',publishedAt:'2026-11-03 12:00:00',updatedAt:'2026-11-04 17:50:14'},'zh');
 const dom=new JSDOM(html),d=dom.window.document;
 assert.equal(d.querySelector('script'),null);assert.equal(d.querySelector('.article-author-name').textContent,'Name <script>');
 assert.equal(d.querySelector('.article-category').textContent,'人物专访');assert.equal(d.querySelector('.article-category').getAttribute('href'),'/zh/articles/?category=profile');
 assert.equal(d.querySelector('.article-author time').dateTime,'2026-11-03');assert.equal(d.querySelector('.article-updated time').dateTime,'2026-11-04');
 assert.equal(d.querySelector('.article-origin').textContent,'来源用户投稿');
 const image=d.querySelector('img');enhanceArticleAvatars(d);image.dispatchEvent(new dom.window.Event('error'));assert.equal(d.querySelector('img'),null);assert.ok(d.querySelector('.article-avatar .site-icon'));
 dom.window.close();
});
test('unsafe avatars cannot become executable or credential-bearing URLs',()=>{
 for(const value of ['javascript:alert(1)','data:image/svg+xml,evil','//evil.example/a','https://name:secret@evil.example/a','/\\evil.example/a','https://evil.example/ a'])assert.equal(articleAvatarURL(value),'',value);
 assert.equal(articleAvatarURL('/account-avatars/preset-1.svg'),'/account-avatars/preset-1.svg');
});
