import { defaultSchema } from 'rehype-sanitize';

const allowedDivClasses = [
  'wiki-fact-grid',
  'wiki-fact-card',
  'wiki-fact-card__label',
  'wiki-fact-card__value',
  'wiki-embed-stack',
  'my-lyric-controls',
  'my-lyric-box',
  'lyric-line',
  'jp-lyric',
  'cn-lyric',
  'trans-lyric',
];

const allowedSpanClasses = ['wiki-spoiler', 'lrc-tag'];
const allowedLyricButtonClasses = ['sync-play-btn', 'sync-reset-btn'];

export const wikiHtmlSchema = {
  ...defaultSchema,
  clobberPrefix: 'wiki-content-',
  tagNames: [
    ...defaultSchema.tagNames,
    'abbr',
    'button',
    'cite',
    'figcaption',
    'figure',
    'mark',
    'small',
    'time',
    'u',
    'wiki-media-embed',
    'wiki-media-switcher',
  ],
  strip: [...(defaultSchema.strip || []), 'style', 'iframe', 'object', 'embed', 'form'],
  attributes: {
    ...defaultSchema.attributes,
    code: [
      ...(defaultSchema.attributes?.code || []),
      ['className', /^language-./, 'math-inline', 'math-display'],
    ],
    div: [
      ...(defaultSchema.attributes?.div || []),
      ['className', ...allowedDivClasses],
      'dataMediaEmbedStack',
    ],
    span: [
      ['className', ...allowedSpanClasses],
      'dataTime',
      'hidden',
    ],
    rt: [['className', 'furi', 'roma']],
    button: [
      ['type', 'button'],
      ['className', ...allowedLyricButtonClasses],
      ['dataLyricAction', 'ruby', 'translation', 'phonetic', 'sync-lyrics', 'sync-play-pause', 'sync-reset'],
      'dataShowLabel',
      'dataHideLabel',
      'dataPrimaryLabel',
      'dataAlternateLabel',
      'ariaPressed',
      'hidden',
    ],
    img: [
      ...(defaultSchema.attributes?.img || []),
      'alt',
      'title',
      ['loading', 'lazy', 'eager'],
      ['decoding', 'async', 'sync', 'auto'],
    ],
    'wiki-media-embed': ['dataProvider', 'dataTarget', 'dataCaption'],
    'wiki-media-switcher': ['dataLabel'],
  },
};
