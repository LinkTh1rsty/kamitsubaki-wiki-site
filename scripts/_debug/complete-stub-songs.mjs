import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('F:/kamitsubaki-wiki-site/src/content/songs');

function replaceBodyAndDropStub(rel, newBody, creditLines = []) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) {
    console.log('MISSING', rel);
    return;
  }
  let src = fs.readFileSync(file, 'utf8');
  const m = src.match(/^﻿?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!m) {
    console.log('NO FM', rel);
    return;
  }
  let fm = m[1];
  fm = fm.replace(/^contentStatus:\s*.*\r?\n/m, '');
  for (const line of creditLines) {
    if (!fm.includes(line.split(':')[0] + ':')) {
      // insert before closing handled by rebuild
      fm = fm.replace(/\n$/, '\n' + line + '\n');
    } else {
      const key = line.split(':')[0];
      fm = fm.replace(new RegExp(`^${key}:\\s*.*$`, 'm'), line);
    }
  }
  const next = `---\n${fm.replace(/\n+$/, '\n')}---\n${newBody.startsWith('\n') ? newBody : '\n' + newBody}`;
  fs.writeFileSync(file, next, 'utf8');
  console.log('UPDATED', rel);
}

// (A)letheia
for (const loc of ['zh', 'ja', 'en']) {
  const credits = [
    'composer: "Masayoshi Iimori / Native Rapper"',
    'lyricist: "弥之助（AFRO PARKER）"',
  ];
  if (loc === 'zh') {
    replaceBodyAndDropStub(`harusaruhi/originals/a-letheia/${loc}.md`, `## 作品简介

《(A)letheia》是[春猿火](/zh/artists/vwp/harusaruhi)于 2025年8月27日发行的数字单曲，同时作为恐怖冒险游戏《春琉ト怪夜》的主题歌。作词为弥之助（AFRO PARKER），作曲为 Masayoshi Iimori 与 Native Rapper，编曲为 Masayoshi Iimori。本词条按具体录音版本建立；现场、重混与重新编曲版不会与原版混为一项。

## 试听

@[apple-music](https://music.apple.com/jp/album/a-letheia/1830153002?i=1830153009&uo=4 "(A)letheia")

## 歌词

## 来源

- [官方作品页](https://kamitsubaki.jp/discography/harusaruhi/8340/)
- [Apple Music](https://music.apple.com/jp/album/a-letheia/1830153002?i=1830153009&uo=4)
- [VGMdb 春猿火](https://vgmdb.net/artist/48426)
`, credits);
  } else if (loc === 'ja') {
    replaceBodyAndDropStub(`harusaruhi/originals/a-letheia/${loc}.md`, `## 作品概要

「(A)letheia」は[春猿火](/ja/artists/vwp/harusaruhi)が2025年8月27日にリリースしたデジタルシングルで、ホラーADVゲーム『春琉ト怪夜』の主題歌です。作詞は弥之助（AFRO PARKER）、作曲はMasayoshi IimoriとNative Rapper、編曲はMasayoshi Iimoriが担当しています。

## 試聴

@[apple-music](https://music.apple.com/jp/album/a-letheia/1830153002?i=1830153009&uo=4 "(A)letheia")

## 歌詞

## 出典

- [公式ディスコグラフィー](https://kamitsubaki.jp/discography/harusaruhi/8340/)
- [Apple Music](https://music.apple.com/jp/album/a-letheia/1830153002?i=1830153009&uo=4)
- [VGMdb 春猿火](https://vgmdb.net/artist/48426)
`, credits.map((c) => c.replace('弥之助（AFRO PARKER）', '弥之助(AFRO PARKER)')));
  } else {
    replaceBodyAndDropStub(`harusaruhi/originals/a-letheia/${loc}.md`, `## Overview

"(A)letheia" is a digital single by [Harusaruhi](/en/artists/vwp/harusaruhi), released on August 27, 2025. It is the theme song of the horror adventure game *Haruru Tokaya*. Lyrics are by Yunosuke (AFRO PARKER); music is by Masayoshi Iimori and Native Rapper; arrangement is by Masayoshi Iimori.

## Listen

@[apple-music](https://music.apple.com/jp/album/a-letheia/1830153002?i=1830153009&uo=4 "(A)letheia")

## Lyrics

## Sources

- [Official discography](https://kamitsubaki.jp/discography/harusaruhi/8340/)
- [Apple Music](https://music.apple.com/jp/album/a-letheia/1830153002?i=1830153009&uo=4)
- [VGMdb Harusaruhi](https://vgmdb.net/artist/48426)
`, [
      'composer: "Masayoshi Iimori / Native Rapper"',
      'lyricist: "Yunosuke (AFRO PARKER)"',
    ]);
  }
}

// 人生は映画じゃない
for (const loc of ['zh', 'ja', 'en']) {
  const credits = ['composer: "Guiano"', 'lyricist: "Guiano"'];
  if (loc === 'zh') {
    replaceBodyAndDropStub(`rim/originals/人生は映画じゃない-life-isnt-a-movie/${loc}.md`, `## 作品简介

《人生は映画じゃない》是 Guiano 与[理芽](/zh/artists/vwp/rim)合作专辑《[imagine](/zh/albums/rim/imagine)》的第 5 轨，发行日为 2023年9月20日。官方资料标注该曲作词・作曲・编曲均由 Guiano 担当，吉他演奏为伊藤翔真。

## 试听

@[apple-music](https://music.apple.com/jp/album/%E4%BA%BA%E7%94%9F%E3%81%AF%E6%98%A0%E7%94%BB%E3%81%98%E3%82%83%E3%81%AA%E3%81%84/1706455950?i=1706455956&uo=4 "人生は映画じゃない")

## 歌词

## 来源

- [官方作品页](https://kamitsubaki.jp/discography/rim/2646/)
- [Apple Music](https://music.apple.com/jp/album/%E4%BA%BA%E7%94%9F%E3%81%AF%E6%98%A0%E7%94%BB%E3%81%98%E3%82%83%E3%81%AA%E3%81%84/1706455950?i=1706455956&uo=4)
- [VGMdb 理芽](https://vgmdb.net/artist/53598)
`, credits);
  } else if (loc === 'ja') {
    replaceBodyAndDropStub(`rim/originals/人生は映画じゃない-life-isnt-a-movie/${loc}.md`, `## 作品概要

「人生は映画じゃない」は、Guiano×[理芽](/ja/artists/vwp/rim)のアルバム『[imagine](/ja/albums/rim/imagine)』の5曲目で、2023年9月20日リリースです。公式情報では作詞・作曲・編曲をすべてGuianoが担当し、ギターは伊藤翔真が演奏しています。

## 試聴

@[apple-music](https://music.apple.com/jp/album/%E4%BA%BA%E7%94%9F%E3%81%AF%E6%98%A0%E7%94%BB%E3%81%98%E3%82%83%E3%81%AA%E3%81%84/1706455950?i=1706455956&uo=4 "人生は映画じゃない")

## 歌詞

## 出典

- [公式ディスコグラフィー](https://kamitsubaki.jp/discography/rim/2646/)
- [Apple Music](https://music.apple.com/jp/album/%E4%BA%BA%E7%94%9F%E3%81%AF%E6%98%A0%E7%94%BB%E3%81%98%E3%82%83%E3%81%AA%E3%81%84/1706455950?i=1706455956&uo=4)
- [VGMdb 理芽](https://vgmdb.net/artist/53598)
`, credits);
  } else {
    replaceBodyAndDropStub(`rim/originals/人生は映画じゃない-life-isnt-a-movie/${loc}.md`, `## Overview

"Life Isn't a Movie" (人生は映画じゃない) is track 5 on Guiano and [RIM](/en/artists/vwp/rim)'s album *[imagine](/en/albums/rim/imagine)*, released on September 20, 2023. Official credits list Guiano for lyrics, music, and arrangement; guitar by Shoma Ito.

## Listen

@[apple-music](https://music.apple.com/jp/album/%E4%BA%BA%E7%94%9F%E3%81%AF%E6%98%A0%E7%94%BB%E3%81%98%E3%82%83%E3%81%AA%E3%81%84/1706455950?i=1706455956&uo=4 "人生は映画じゃない")

## Lyrics

## Sources

- [Official discography](https://kamitsubaki.jp/discography/rim/2646/)
- [Apple Music](https://music.apple.com/jp/album/%E4%BA%BA%E7%94%9F%E3%81%AF%E6%98%A0%E7%94%BB%E3%81%98%E3%82%83%E3%81%AA%E3%81%84/1706455950?i=1706455956&uo=4)
- [VGMdb RIM](https://vgmdb.net/artist/53598)
`, credits);
  }
}

// 顕在
for (const loc of ['zh', 'ja', 'en']) {
  const credits = ['composer: "カンザキイオリ"', 'lyricist: "カンザキイオリ"'];
  if (loc === 'zh') {
    replaceBodyAndDropStub(`vwp/genealogy/顕在-actual/${loc}.md`, `## 作品简介

《顕在 (feat. [花譜](/zh/artists/vwp/kaf), [理芽](/zh/artists/vwp/rim), [春猿火](/zh/artists/vwp/harusaruhi), [ヰ世界情緒](/zh/artists/vwp/isekaijoucho) & [幸祜](/zh/artists/vwp/koko))》是 [V.W.P](/zh/artists/vwp/vwp) 专辑《[覚醒](/zh/albums/vwp/awakening)》的第 15 轨，发行日为 2024年3月27日。官方将 V.W.P 系谱曲描述为沿袭早期代表作《魔女》、由カンザキイオリ作词作曲的乐曲群。

## 试听

@[apple-music](https://music.apple.com/jp/album/%E9%A1%95%E5%9C%A8-feat-%E8%8A%B1%E8%AD%9C-%E7%90%86%E8%8A%BD-%E6%98%A5%E7%8C%BF%E7%81%AB-%E3%83%B0%E4%B8%96%E7%95%8C%E6%83%85%E7%B7%92-%E5%B9%B8%E7%A5%9C/1735849258?i=1735849457&uo=4 "顕在 (feat. 花譜, 理芽, 春猿火, ヰ世界情緒 & 幸祜)")

## 歌词

## 来源

- [V.W.P 官方艺人页](https://kamitsubaki.jp/artist/v-w-p/)
- [Apple Music](https://music.apple.com/jp/album/%E9%A1%95%E5%9C%A8-feat-%E8%8A%B1%E8%AD%9C-%E7%90%86%E8%8A%BD-%E6%98%A5%E7%8C%BF%E7%81%AB-%E3%83%B0%E4%B8%96%E7%95%8C%E6%83%85%E7%B7%92-%E5%B9%B8%E7%A5%9C/1735849258?i=1735849457&uo=4)
- [VGMdb V.W.P](https://vgmdb.net/artist/47724)
`, credits);
  } else if (loc === 'ja') {
    replaceBodyAndDropStub(`vwp/genealogy/顕在-actual/${loc}.md`, `## 作品概要

「顕在 (feat. [花譜](/ja/artists/vwp/kaf), [理芽](/ja/artists/vwp/rim), [春猿火](/ja/artists/vwp/harusaruhi), [ヰ世界情緒](/ja/artists/vwp/isekaijoucho) & [幸祜](/ja/artists/vwp/koko))」は、[V.W.P](/ja/artists/vwp/vwp)のアルバム『[覚醒](/ja/albums/vwp/awakening)』の15曲目で、2024年3月27日リリースです。公式では、初期代表曲「魔女」に連なるカンザキイオリ作詞・作曲の楽曲群を“系譜曲”として紹介しています。

## 試聴

@[apple-music](https://music.apple.com/jp/album/%E9%A1%95%E5%9C%A8-feat-%E8%8A%B1%E8%AD%9C-%E7%90%86%E8%8A%BD-%E6%98%A5%E7%8C%BF%E7%81%AB-%E3%83%B0%E4%B8%96%E7%95%8C%E6%83%85%E7%B7%92-%E5%B9%B8%E7%A5%9C/1735849258?i=1735849457&uo=4 "顕在 (feat. 花譜, 理芽, 春猿火, ヰ世界情緒 & 幸祜)")

## 歌詞

## 出典

- [V.W.P 公式サイト](https://kamitsubaki.jp/artist/v-w-p/)
- [Apple Music](https://music.apple.com/jp/album/%E9%A1%95%E5%9C%A8-feat-%E8%8A%B1%E8%AD%9C-%E7%90%86%E8%8A%BD-%E6%98%A5%E7%8C%BF%E7%81%AB-%E3%83%B0%E4%B8%96%E7%95%8C%E6%83%85%E7%B7%92-%E5%B9%B8%E7%A5%9C/1735849258?i=1735849457&uo=4)
- [VGMdb V.W.P](https://vgmdb.net/artist/47724)
`, credits);
  } else {
    replaceBodyAndDropStub(`vwp/genealogy/顕在-actual/${loc}.md`, `## Overview

"Kenzai" (顕在, feat. [KAF](/en/artists/vwp/kaf), [RIM](/en/artists/vwp/rim), [Harusaruhi](/en/artists/vwp/harusaruhi), [Isekaijoucho](/en/artists/vwp/isekaijoucho) & [KOKO](/en/artists/vwp/koko)) is track 15 on [V.W.P](/en/artists/vwp/vwp)'s album *[Kakusei](/en/albums/vwp/awakening)*, released on March 27, 2024. Officially, V.W.P's genealogy songs are described as a series written and composed by Kanzaki Iori, following the early representative track "Majo".

## Listen

@[apple-music](https://music.apple.com/jp/album/%E9%A1%95%E5%9C%A8-feat-%E8%8A%B1%E8%AD%9C-%E7%90%86%E8%8A%BD-%E6%98%A5%E7%8C%BF%E7%81%AB-%E3%83%B0%E4%B8%96%E7%95%8C%E6%83%85%E7%B7%92-%E5%B9%B8%E7%A5%9C/1735849258?i=1735849457&uo=4 "顕在 (feat. 花譜, 理芽, 春猿火, ヰ世界情緒 & 幸祜)")

## Lyrics

## Sources

- [V.W.P Official Page](https://kamitsubaki.jp/artist/v-w-p/)
- [Apple Music](https://music.apple.com/jp/album/%E9%A1%95%E5%9C%A8-feat-%E8%8A%B1%E8%AD%9C-%E7%90%86%E8%8A%BD-%E6%98%A5%E7%8C%BF%E7%81%AB-%E3%83%B0%E4%B8%96%E7%95%8C%E6%83%85%E7%B7%92-%E5%B9%B8%E7%A5%9C/1735849258?i=1735849457&uo=4)
- [VGMdb V.W.P](https://vgmdb.net/artist/47724)
`, credits);
  }
}

// kaf instrumental
for (const loc of ['zh', 'ja', 'en']) {
  if (loc === 'zh') {
    replaceBodyAndDropStub(`kaf/instrumentals/the-end-of-prologue-instrumental/${loc}.md`, `## 作品简介

《The end of prologue(Instrumental)》是[花譜](/zh/artists/vwp/kaf)首张专辑《[観測](/zh/albums/kaf/kansoku)》（観測α）的第 15 轨，发行日为 2019年9月11日。官方说明该专辑全曲的作词・作曲・编曲均由カンザキイオリ担当。本轨为纯音乐／伴奏作品。

## 试听

{{media-switcher::The end of prologue(Instrumental)}}
@[apple-music](https://music.apple.com/jp/album/the-end-of-prologue-instrumental/1688351143?i=1688351159&uo=4 "The end of prologue(Instrumental)")
@[netease](1399849874 "The end of prologue(Instrumental)")
{{/media-switcher}}

## 歌词

本轨为纯音乐／伴奏作品，不含歌词。

## 来源

- [花譜官方网站](https://kaf.kamitsubaki.jp/discography/20190911/107/)
- [Apple Music](https://music.apple.com/jp/album/the-end-of-prologue-instrumental/1688351143?i=1688151159&uo=4)
`);
  }
}

// Fix: I accidentally typed wrong apple URL for kaf - rewrite correctly
for (const loc of ['zh']) {
  replaceBodyAndDropStub(`kaf/instrumentals/the-end-of-prologue-instrumental/${loc}.md`, `## 作品简介

《The end of prologue(Instrumental)》是[花譜](/zh/artists/vwp/kaf)首张专辑《[観測](/zh/albums/kaf/kansoku)》（観測α）的第 15 轨，发行日为 2019年9月11日。官方说明该专辑全曲的作词・作曲・编曲均由カンザキイオリ担当。本轨为纯音乐／伴奏作品。

## 试听

{{media-switcher::The end of prologue(Instrumental)}}
@[apple-music](https://music.apple.com/jp/album/the-end-of-prologue-instrumental/1688351143?i=1688351159&uo=4 "The end of prologue(Instrumental)")
@[netease](1399849874 "The end of prologue(Instrumental)")
{{/media-switcher}}

## 歌词

本轨为纯音乐／伴奏作品，不含歌词。

## 来源

- [花譜官方网站](https://kaf.kamitsubaki.jp/discography/20190911/107/)
- [Apple Music](https://music.apple.com/jp/album/the-end-of-prologue-instrumental/1688351143?i=1688351159&uo=4)
`);
}

// INTRODUCTION / OUTRODUCTION
{
  const items = [
    {
      folder: 'harusaruhi/originals/INTRODUCTION-目-introduction-eye',
      n: 1,
      apple: 'https://music.apple.com/jp/album/introduction-%E7%9B%AE/1688156578?i=1688156579&uo=4',
      titleJa: 'INTRODUCTION -目-',
    },
    {
      folder: 'harusaruhi/originals/OUTRODUCTION-眼-outroduction-eye',
      n: 12,
      apple: 'https://music.apple.com/jp/album/outroduction-%E7%9C%BC/1688156578?i=1688156591&uo=4',
      titleJa: 'OUTRODUCTION -眼-',
    },
  ];
  for (const item of items) {
    replaceBodyAndDropStub(`${item.folder}/zh.md`, `## 作品简介

《${item.titleJa}》是[春猿火](/zh/artists/vwp/harusaruhi)首张专辑《[心眼](/zh/albums/harusaruhi/shingan)》的第 ${item.n} 轨，发行日为 2021年10月6日。官方介绍将该曲与 1st ONE-MAN LIVE「シャーマニズム」同场披露，并说明专辑主作词作曲由メインコンポーザーたかやん担当。本词条按具体录音版本建立。

## 试听

@[apple-music](${item.apple} "${item.titleJa}")

## 歌词

## 来源

- [官方作品页](https://kamitsubaki.jp/discography/harusaruhi/824/)
- [Apple Music](${item.apple})
- [VGMdb 春猿火](https://vgmdb.net/artist/48426)
`);
    replaceBodyAndDropStub(`${item.folder}/ja.md`, `## 作品概要

「${item.titleJa}」は[春猿火](/ja/artists/vwp/harusaruhi)の1st Album『[心眼](/ja/albums/harusaruhi/shingan)』の${item.n}曲目で、2021年10月6日リリースです。公式では、1st ONE-MAN LIVE「シャーマニズム」でも披露された楽曲として紹介し、アルバムの主な作詞作曲はメインコンポーザーたかやんが担当したと記載しています。

## 試聴

@[apple-music](${item.apple} "${item.titleJa}")

## 歌詞

## 出典

- [公式ディスコグラフィー](https://kamitsubaki.jp/discography/harusaruhi/824/)
- [Apple Music](${item.apple})
- [VGMdb 春猿火](https://vgmdb.net/artist/48426)
`);
    replaceBodyAndDropStub(`${item.folder}/en.md`, `## Overview

"${item.titleJa}" is track ${item.n} on [Harusaruhi](/en/artists/vwp/harusaruhi)'s first album *[Shingan](/en/albums/harusaruhi/shingan)*, released on October 6, 2021. Official notes introduce it as a track also performed at the 1st ONE-MAN LIVE "Shamanism", and state that the album's main lyrics and music were handled by main composer Takayan.

## Listen

@[apple-music](${item.apple} "${item.titleJa}")

## Lyrics

## Sources

- [Official discography](https://kamitsubaki.jp/discography/harusaruhi/824/)
- [Apple Music](${item.apple})
- [VGMdb Harusaruhi](https://vgmdb.net/artist/48426)
`);
  }
}

// Covers with official live-album context only
const covers = [
  {
    folder: 'harusaruhi/covers/愛があれば-ai-ga-areba',
    display: '愛があれば。',
    album: 'CREAM PUFF LIVE 2',
    albumSlug: 'cream-puff-live-2',
    live: '2022年8月6日',
    official: 'https://kamitsubaki.jp/discography/harusaruhi/2773/',
    apple: 'https://music.apple.com/jp/album/%E6%84%9B%E3%81%8C%E3%81%82%E3%82%8C%E3%81%B0/1688520470?i=1688520476&uo=4',
  },
  {
    folder: 'harusaruhi/covers/快晴-at-CREAM-PUFF-LIVE-3(Cover)-kaisei-cover',
    display: '快晴 at CREAM PUFF LIVE 3(Cover)',
    album: 'CREAM PUFF LIVE 3',
    albumSlug: 'cream-puff-live-3',
    live: '2023年8月6日',
    official: 'https://kamitsubaki.jp/discography/harusaruhi/2710/',
    apple: 'https://music.apple.com/jp/album/%E5%BF%AB%E6%99%B4-at-cream-puff-live-3-cover/1709945211?i=1709945272&uo=4',
  },
  {
    folder: 'harusaruhi/covers/季節は次々死んでいく-at-CREAM-PUFF-LIVE-3(Cover)-kisetsu-wa-tsugitsugi-shindeiku-cover',
    display: '季節は次々死んでいく at CREAM PUFF LIVE 3(Cover)',
    album: 'CREAM PUFF LIVE 3',
    albumSlug: 'cream-puff-live-3',
    live: '2023年8月6日',
    official: 'https://kamitsubaki.jp/discography/harusaruhi/2710/',
    apple: 'https://music.apple.com/jp/album/%E5%AD%A3%E7%AF%80%E3%81%AF%E6%AC%A1%E3%80%85%E6%AD%BB%E3%82%93%E3%81%A7%E3%81%84%E3%81%8F-at-cream-puff-live-3-cover/1709945211?i=1709945235&uo=4',
  },
  {
    folder: 'harusaruhi/covers/曖昧なBEACH(Cover-Live)-aimaina-beach-cover-live',
    display: '曖昧なBEACH (Cover Live)',
    album: 'CREAM PUFF LIVE 4 (Cover Live)',
    albumSlug: 'cream-puff-live-4',
    live: null,
    official: 'https://kamitsubaki.jp/discography/harusaruhi/',
    apple: 'https://music.apple.com/jp/album/%E6%9B%96%E6%98%A7%E3%81%AAbeach-cover-live/1833427142?i=1833427305&uo=4',
  },
  {
    folder: 'harusaruhi/covers/春猿火自由律-05-iのアンサー-harusaruhi-jiyuuritsu-05-i-no-ansaa',
    display: '春猿火自由律#05「iのアンサー」',
    album: 'CREAM PUFF LIVE',
    albumSlug: 'cream-puff-live',
    live: null,
    official: 'https://kamitsubaki.jp/discography/harusaruhi/378/',
    apple: null,
  },
];

for (const c of covers) {
  const liveNote = c.live
    ? `在 ${c.live} 举办的流媒体翻唱 Live「シュークリームライブ」中的翻唱录音`
    : `收录于 Cover Live Album 的翻唱录音`;
  replaceBodyAndDropStub(`${c.folder}/zh.md`, `## 作品简介

《${c.display}》是[春猿火](/zh/artists/vwp/harusaruhi)${liveNote}，收录于《[${c.album}](/zh/albums/harusaruhi/${c.albumSlug})》。本词条按该录音版本建立，不与原唱录音混为一项。原曲词曲作者以官方或原唱发行信息为准，本页不臆测填写。

${c.apple ? `## 试听\n\n@[apple-music](${c.apple} "${c.display}")\n\n` : ''}## 歌词

## 来源

- [官方作品页](${c.official})
- [VGMdb 春猿火](https://vgmdb.net/artist/48426)
`);
  replaceBodyAndDropStub(`${c.folder}/ja.md`, `## 作品概要

「${c.display}」は[春猿火](/ja/artists/vwp/harusaruhi)の${c.live ? `${c.live}開催のストリーミングカバーライブ「シュークリームライブ」でのカバー音源` : 'カバーライブ音源'}で、『[${c.album}](/ja/albums/harusaruhi/${c.albumSlug})』に収録されています。このページは当該録音バージョン単位で作成しています。原曲の作詞作曲は公式または原曲リリース情報を優先します。

${c.apple ? `## 試聴\n\n@[apple-music](${c.apple} "${c.display}")\n\n` : ''}## 歌詞

## 出典

- [公式ディスコグラフィー](${c.official})
- [VGMdb 春猿火](https://vgmdb.net/artist/48426)
`);
  replaceBodyAndDropStub(`${c.folder}/en.md`, `## Overview

"${c.display}" is a cover recording by [Harusaruhi](/en/artists/vwp/harusaruhi) included on *[${c.album}](/en/albums/harusaruhi/${c.albumSlug})*. This entry is version-specific to that recording and is not merged with the original song page. Original song credits should follow official or original-release information; this page does not invent them.

${c.apple ? `## Listen\n\n@[apple-music](${c.apple} "${c.display}")\n\n` : ''}## Lyrics

## Sources

- [Official discography](${c.official})
- [VGMdb Harusaruhi](https://vgmdb.net/artist/48426)
`);
}

// isekaijoucho chaining-intentoin
replaceBodyAndDropStub('isekaijoucho/covers/chaining-intentoin/zh.md', `## 作品简介

《Chaining Intentoin》是[ヰ世界情緒](/zh/artists/vwp/isekaijoucho)于 2020年12月26日举办的流媒体翻唱 Live「キャンディライブ」中的翻唱录音，收录于 Cover Live Album《[CANDY LIVE](/zh/albums/isekaijoucho/candy-live)》（2021年3月31日发行）。本词条按该现场录音版本建立。原曲词曲作者以官方或原唱发行信息为准，本页不臆测填写。

## 歌词

## 来源

- [官方作品页](https://kamitsubaki.jp/discography/isekaijoucho/382/)
- [VGMdb ヰ世界情緒](https://vgmdb.net/artist/53599)
`);
replaceBodyAndDropStub('isekaijoucho/covers/chaining-intentoin/ja.md', `## 作品概要

「Chaining Intentoin」は[ヰ世界情緒](/ja/artists/vwp/isekaijoucho)が2020年12月26日に開催したストリーミングカバーライブ「キャンディライブ」でのカバー音源で、Cover Live Album『[CANDY LIVE](/ja/albums/isekaijoucho/candy-live)』（2021年3月31日リリース）に収録されています。このページはライブ録音バージョン単位で作成しています。原曲の作詞作曲は公式または原曲リリース情報を優先します。

## 歌詞

## 出典

- [公式ディスコグラフィー](https://kamitsubaki.jp/discography/isekaijoucho/382/)
- [VGMdb ヰ世界情緒](https://vgmdb.net/artist/53599)
`);
replaceBodyAndDropStub('isekaijoucho/covers/chaining-intentoin/en.md', `## Overview

"Chaining Intentoin" is a cover performed by [Isekaijoucho](/en/artists/vwp/isekaijoucho) during the streaming cover live "Candy Live" held on December 26, 2020, and included on the cover live album *[CANDY LIVE](/en/albums/isekaijoucho/candy-live)* (released March 31, 2021). This entry is version-specific to that live recording. Original song credits should follow official or original-release information; this page does not invent them.

## Lyrics

## Sources

- [Official discography](https://kamitsubaki.jp/discography/isekaijoucho/382/)
- [VGMdb Isekaijoucho](https://vgmdb.net/artist/53599)
`);

console.log('done');
