import test from 'node:test';
import assert from 'node:assert/strict';
import {entitySourceFiles} from '../src/lib/entityRegistry.mjs';
test('entity discovery accepts native Windows paths and excludes generated translations and nonentities',()=>{
 const root='C:\\wiki\\src\\content';
 const paths=['C:\\wiki\\src\\content\\people\\solo\\kaf\\zh.md','C:\\wiki\\src\\content\\songs\\kaf\\a\\en.md','C:\\wiki\\src\\content\\people\\solo\\kaf\\zh-tw.md','C:\\wiki\\src\\content\\site\\zh.md','C:\\wiki\\elsewhere\\people\\zh.md'];
 assert.deepEqual(entitySourceFiles(paths,root),['C:/wiki/src/content/people/solo/kaf/zh.md','C:/wiki/src/content/songs/kaf/a/en.md']);
 assert.deepEqual(entitySourceFiles(['/wiki/src/content/people/solo/kaf/ja.md'],'/wiki/src/content'),['/wiki/src/content/people/solo/kaf/ja.md']);
});
