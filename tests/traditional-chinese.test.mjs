import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import YAML from 'yaml';

import {
  convertChineseContentValue,
  convertChineseMarkdown,
  convertChineseText,
  convertTraditionalChinese,
  convertTraditionalMarkdown,
  getTraditionalChineseDefinition,
} from '../src/lib/traditionalChinese.mjs';

async function readSource(path) {
  return readFile(new URL(path, import.meta.url), 'utf8');
}

function parseFrontmatter(source) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/u);
  assert.ok(match, 'generated Markdown should have frontmatter');
  return YAML.parse(match[1]);
}

test('protected terms survive conversion and can define explicit regional output', () => {
  const source = '花谱参与神椿市建设中。企划，组合是 V.W.P，平台为 KAMITSUBAKI STUDIO。';
  const tw = convertTraditionalChinese(source, 'zh-tw');
  const hk = convertTraditionalChinese(source, 'zh-hk');

  for (const output of [tw, hk]) {
    assert.match(output, /花譜參與神椿市建設中。企劃/);
    assert.match(output, /V\.W\.P/);
    assert.match(output, /KAMITSUBAKI STUDIO/);
    assert.doesNotMatch(output, /KAMITSUBAKIWIKIPROTECTEDTERM/);
  }

  const definition = getTraditionalChineseDefinition();
  assert.equal(definition.version, 1);
  assert.ok(definition.terms.some((term) => term.source === 'V.W.P' && term.preserve === true));
});

test('mixed Simplified, Taiwan, and Hong Kong Chinese normalize to the reading locale', () => {
  const source = '软件與網絡、資料和檔案，滑鼠與計程車。';

  assert.equal(
    convertChineseText(source, 'zh'),
    '软件与网络、资料和档案，滑鼠与计程车。',
  );
  assert.equal(
    convertChineseText(source, 'zh-tw'),
    '軟體與網路、資料和檔案，滑鼠與計程車。',
  );
  assert.equal(
    convertChineseText(source, 'zh-hk'),
    '軟件與網絡、資料和檔案，滑鼠與計程車。',
  );
});

test('UI conversion applies Taiwan and Hong Kong vocabulary separately', () => {
  const source = '用户登录后搜索网络链接并保存文件';
  assert.equal(
    convertTraditionalChinese(source, 'zh-tw', { ui: true }),
    '使用者登入後搜尋網路連結並儲存檔案',
  );
  assert.equal(
    convertTraditionalChinese(source, 'zh-hk', { ui: true }),
    '用戶登入後搜尋網絡連結並儲存檔案',
  );
});

test('mixed-script Markdown is normalized while protected syntax stays unchanged', () => {
  const source = [
    '# 混合標題与简体正文',
    '',
    '这款軟體连接網絡并管理檔案。',
    '',
    '`繁體代码`、$後 + 发$、[站內連結](/zh/artists/vwp/kaf)',
    '',
    '{{zh-variant::手动简中::人工台繁::人工港繁}}',
  ].join('\n');

  const simplified = convertChineseMarkdown(source, 'zh');
  const tw = convertChineseMarkdown(source, 'zh-tw');
  const hk = convertChineseMarkdown(source, 'zh-hk');

  assert.match(simplified, /^# 混合标题与简体正文/m);
  assert.match(simplified, /这款软体连接网络并管理档案。/);
  assert.match(simplified, /`繁體代码`、\$後 \+ 发\$、\[站内连结\]\(\/zh\/artists\/vwp\/kaf\)/);
  assert.match(simplified, /手动简中$/m);

  assert.match(tw, /^# 混合標題與簡體正文/m);
  assert.match(tw, /這款軟體連線網路並管理檔案。/);
  assert.match(tw, /`繁體代码`、\$後 \+ 发\$、\[站內連結\]\(\/zh-tw\/artists\/vwp\/kaf\)/);
  assert.match(tw, /人工台繁$/m);

  assert.match(hk, /^# 混合標題與簡體正文/m);
  assert.match(hk, /這款軟體連接網絡並管理檔案。/);
  assert.match(hk, /`繁體代码`、\$後 \+ 发\$、\[站內連結\]\(\/zh-hk\/artists\/vwp\/kaf\)/);
  assert.match(hk, /人工港繁$/m);
});

test('mixed-script frontmatter values normalize without modifying identifiers or paths', () => {
  const source = {
    locale: 'zh',
    translationKey: 'traditional-title',
    title: '繁體標題与简体说明',
    href: '/zh/projects/繁體-path',
    romanizedTitle: 'FanTi',
  };

  assert.deepEqual(convertChineseContentValue(source, 'zh'), {
    locale: 'zh',
    translationKey: 'traditional-title',
    title: '繁体标题与简体说明',
    href: '/zh/projects/繁體-path',
    romanizedTitle: 'FanTi',
  });
  assert.deepEqual(convertChineseContentValue(source, 'zh-tw'), {
    locale: 'zh-tw',
    translationKey: 'traditional-title',
    title: '繁體標題與簡體說明',
    href: '/zh-tw/projects/繁體-path',
    romanizedTitle: 'FanTi',
  });
});

test('Markdown conversion changes visible prose but protects syntax and destinations', () => {
  const source = [
    '访问[神椿页面](/zh/artists/vwp/kaf)与 https://example.com/花谱。',
    '',
    '`代码花谱` 与 <span title="花谱">显示花谱</span>，公式 $发 + 后$。',
    '',
    '```js',
    'const name = "花谱";',
    '```',
    '',
    '{{lyrics-controls::zh}}',
  ].join('\n');

  const converted = convertTraditionalMarkdown(source, 'zh-tw');
  assert.match(converted, /\[神椿頁面\]\(\/zh-tw\/artists\/vwp\/kaf\)/);
  assert.match(converted, /https:\/\/example\.com\/花谱/);
  assert.match(converted, /`代码花谱`/);
  assert.match(converted, /<span title="花谱">顯示花譜<\/span>/);
  assert.match(converted, /\$发 \+ 后\$/);
  assert.match(converted, /const name = "花谱";/);
  assert.match(converted, /\{\{lyrics-controls::zh-tw\}\}/);
});

test('Markdown conversion keeps longer fenced code blocks open across shorter markers', () => {
  const source = [
    '````md',
    '```',
    '软件',
    '```',
    '````',
    '软件',
  ].join('\n');

  const converted = convertChineseMarkdown(source, 'zh-tw');
  assert.equal(converted, ['````md', '```', '软件', '```', '````', '軟體'].join('\n'));
});

test('Markdown regional vocabulary overrides select exact Taiwan and Hong Kong text', () => {
  const source = [
    '这款{{zh-variant::软件::軟體::軟件}}保留人工指定词：',
    '{{zh-variant::开发::台發::港发}}。',
    '',
    '`{{zh-variant::软件::軟體::軟件}}`',
    '',
    '```md',
    '{{zh-variant::软件::軟體::軟件}}',
    '```',
  ].join('\n');

  const tw = convertTraditionalMarkdown(source, 'zh-tw');
  const hk = convertTraditionalMarkdown(source, 'zh-hk');

  assert.match(tw, /這款軟體保留人工指定詞：\n台發。/);
  assert.match(hk, /這款軟件保留人工指定詞：\n港发。/);
  for (const output of [tw, hk]) {
    assert.match(output, /`\{\{zh-variant::软件::軟體::軟件\}\}`/);
    assert.match(output, /```md\n\{\{zh-variant::软件::軟體::軟件\}\}\n```/);
  }
});

test('generator emits schema-ready derivative content without committing generated files', async () => {
  const [twSource, hkSource, packageJson, gitignore] = await Promise.all([
    readSource('../src/content/artists/vwp/kaf/zh-tw.md'),
    readSource('../src/content/artists/vwp/kaf/zh-hk.md'),
    readSource('../package.json'),
    readSource('../.gitignore'),
  ]);

  const tw = parseFrontmatter(twSource);
  const hk = parseFrontmatter(hkSource);
  assert.equal(tw.locale, 'zh-tw');
  assert.equal(hk.locale, 'zh-hk');
  assert.equal(tw.translationKey, 'kaf');
  assert.equal(tw.code, '01');
  assert.equal(tw.generated, true);
  assert.equal(hk.generated, true);
  assert.match(twSource, /\]\(\/zh-tw\//);
  assert.match(hkSource, /\]\(\/zh-hk\//);
  assert.doesNotMatch(`${twSource}\n${hkSource}`, /KAMITSUBAKIWIKIPROTECTEDTERM/);

  const scripts = JSON.parse(packageJson).scripts;
  assert.equal(scripts.predev, 'pnpm i18n:generate');
  assert.equal(scripts.precheck, 'pnpm i18n:generate');
  assert.equal(scripts.pretest, 'pnpm i18n:generate');
  assert.equal(scripts.prebuild, 'pnpm i18n:generate');
  assert.match(gitignore, /src\/content\/\*\*\/zh-tw\.md/);
  assert.match(gitignore, /src\/content\/\*\*\/zh-hk\.md/);
});

test('generator validates every maintained zh.md before replacing derivative files', async () => {
  const generator = await readSource('../scripts/generate-traditional-chinese.mjs');
  const validation = generator.lastIndexOf('await validateSourceMarkdownFiles(sourceMarkdownFiles)');
  const replacement = generator.lastIndexOf('await removeStaleGeneratedFiles(allFiles)');

  assert.notEqual(validation, -1);
  assert.notEqual(replacement, -1);
  assert.ok(validation < replacement);
});

test('Japanese original text is preserved while Chinese prose still converts', () => {
  assert.equal(convertTraditionalChinese('赤い洗礼', 'zh-tw'), '赤い洗礼');
  assert.equal(convertTraditionalChinese('眼裏の懐疑', 'zh-tw'), '眼裏の懐疑');
  assert.equal(convertTraditionalChinese('戯れ', 'zh-tw'), '戯れ');
  assert.equal(convertTraditionalChinese('声帯学', 'zh-tw'), '声帯学');
  assert.equal(convertTraditionalChinese('実験の記録', 'zh-tw'), '実験の記録');
  assert.equal(convertTraditionalChinese('软件与网络', 'zh-tw'), '軟體與網路');
});

test('Japanese shortcodes, ruby readings, and jp-lyric HTML blocks skip conversion', () => {
  const source = [
    '{{ja::独白}}和{{ruby::独白::どくはく::dokuhaku}}',
    '',
    '<div class="jp-lyric">',
    '独白と赤い洗礼',
    '</div>',
    '<div class="cn-lyric">独白的中文</div>',
    '',
    '<span lang="ja">戯れ</span>',
  ].join('\n');

  const tw = convertChineseMarkdown(source, 'zh-tw');
  assert.match(tw, /独白和\{\{ruby::独白::どくはく::dokuhaku\}\}/);
  assert.match(tw, /独白と赤い洗礼/);
  assert.match(tw, /獨白的中文/);
  assert.match(tw, /<span lang="ja">戯れ<\/span>/);
});

test('Japanese exclusive shinjitai are not rewritten to Chinese traditional forms', () => {
  assert.equal(convertChineseText('桜餅と気分', 'zh-tw'), '桜餅と気分');
  assert.equal(convertChineseText('帰宅', 'zh'), '帰宅');
  assert.equal(convertChineseText('软件与网络', 'zh-tw'), '軟體與網路');
});

test('syntax and format guides document the conversion workflow in every maintained source', async () => {
  const guides = await Promise.all([
    readSource('../src/content/contribute/syntax-guide/zh.md'),
    readSource('../src/content/contribute/syntax-guide/ja.md'),
    readSource('../src/content/contribute/syntax-guide/en.md'),
    readSource('../src/content/contribute/format-guide/zh.md'),
    readSource('../src/content/contribute/format-guide/ja.md'),
    readSource('../src/content/contribute/format-guide/en.md'),
  ]);

  for (const guide of guides) {
    assert.match(guide, /TraditionalChineseConvert\.json/);
    assert.match(guide, /\{\{zh-variant::/);
    assert.match(guide, /zh-tw/);
    assert.match(guide, /zh-hk/);
  }

  for (const guide of guides.slice(0, 3)) {
    assert.match(guide, /\{\{ja::/);
  }

  assert.match(guides[0], /任意混用简体中文、台湾繁体或香港繁体/);
  assert.match(guides[1], /自由に混在/);
  assert.match(guides[2], /freely mix Simplified, Taiwan Traditional, and Hong Kong Traditional Chinese/);
  assert.match(guides[3], /可混用简体、台繁或港繁/);
  assert.match(guides[4], /簡体字・台湾繁体字・香港繁体字を混在/);
  assert.match(guides[5], /may mix Simplified, Taiwan Traditional, and Hong Kong Traditional forms/);
});
