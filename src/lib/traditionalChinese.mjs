import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import OpenCC from 'opencc-js';

import { splitShortcodeArguments } from './shortcodeArguments.mjs';

const traditionalDefinitionPath = resolve(process.cwd(), 'public', 'TraditionalChineseConvert.json');
const uiOverridesPath = resolve(process.cwd(), 'src', 'i18n', 'traditional-ui-overrides.json');

const traditionalDefinition = JSON.parse(readFileSync(traditionalDefinitionPath, 'utf8'));
const uiOverrides = JSON.parse(readFileSync(uiOverridesPath, 'utf8'));

const simplifiedNormalizer = OpenCC.Converter({ from: 't', to: 'cn' });

const regionalConverters = Object.freeze({
  'zh-tw': OpenCC.Converter({ from: 'cn', to: 'twp' }),
  'zh-hk': OpenCC.Converter({ from: 'cn', to: 'hkp' }),
});

const targetKeys = Object.freeze({
  zh: 'zh',
  'zh-tw': 'tw',
  'zh-hk': 'hk',
});

const traditionalLocales = Object.freeze(['zh-tw', 'zh-hk']);

const placeholderPrefix = 'KAMITSUBAKIWIKIPROTECTEDTERM';
const placeholderSuffix = 'TOKEN';
const zhVariantShortcode = /^\{\{zh-variant(::(?:\\.|[^{}])*)\}\}/iu;
const jaShortcode = /^\{\{ja::((?:\\.|[^{}])*)\}\}/iu;
const rubyShortcode = /^\{\{ruby(::(?:\\.|[^{}])*)\}\}/iu;
const kanaPattern = /[\u3040-\u30FF\uFF66-\uFF9F]/u;
const cjkPattern = /[\u3400-\u4DBF\u4E00-\u9FFF々〆ヵヶ]/u;

// Japanese shinjitai / kokuji that must not be treated as PRC simplified forms.
// These code points are Japanese orthography and should stay unchanged in zh locales.
const japaneseExclusiveChars = new Set([
  '桜', '気', '帰', '竜', '渋', '薬', '仮', '応', '栄', '経', '転', '芸', '伝', '広', '圧',
  '図', '実', '価', '蛍', '斉', '斎', '塩', '粋', '営', '両', '検', '戦', '拠', '択', '沢',
  '匂', '畳', '弐', '廻', '顕', '験', '薫', '険', '絵', '乗', '呉', '喪', '帯', '癒', '縄',
  '繊', '譲', '壌', '隠', '駅', '騒', '銭', '鍵', '塁', '塚', '埼', '稲', '粧', '働', '辻',
  '峠', '込', '榊', '畑', '畠', '栃', '竃', '戯', '郷', '挙', '聴', '脳', '臓', '舎', '茎',
  '観', '覚', '訳', '詰', '託', '讃', '豊', '輿', '軽', '弾', '涜', '弖', '彅',
]);

function isJapaneseSignalCharacter(character) {
  return japaneseExclusiveChars.has(character);
}

function createPlaceholderFactory(restorations) {
  return (value) => {
    const placeholder = `${placeholderPrefix}${String(restorations.length).padStart(8, '0')}${placeholderSuffix}`;
    restorations.push({ placeholder, value });
    return placeholder;
  };
}

function protectJapaneseSpans(text) {
  const restorations = [];
  const placeholder = createPlaceholderFactory(restorations);
  let protectedText = '';
  let index = 0;

  while (index < text.length) {
    const character = text[index];

    if (kanaPattern.test(character) || cjkPattern.test(character)) {
      let end = index;
      let hasKana = false;
      let hasExclusive = false;

      while (end < text.length) {
        const current = text[end];
        if (kanaPattern.test(current)) hasKana = true;
        else if (isJapaneseSignalCharacter(current)) hasExclusive = true;
        else if (!cjkPattern.test(current)) break;
        end += 1;
      }

      if (hasKana || hasExclusive) {
        protectedText += placeholder(text.slice(index, end).normalize('NFC'));
      } else {
        protectedText += text.slice(index, end);
      }
      index = end;
      continue;
    }

    protectedText += character;
    index += 1;
  }

  return { protectedText, restorations };
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

function buildProtectedTokens(locale) {
  const targetKey = targetKeys[locale];
  const tokens = [];

  for (const term of traditionalDefinition.terms ?? []) {
    const source = term.source?.normalize('NFC');
    if (!source) continue;

    const target = (
      term.preserve
        ? source
        : term[targetKey] ?? term.target ?? source
    ).normalize('NFC');

    for (const candidate of [source, ...(term.aliases ?? [])]) {
      if (typeof candidate !== 'string' || !candidate) continue;
      tokens.push({
        value: candidate.normalize('NFC'),
        target,
        caseSensitive: term.caseSensitive !== false,
      });
    }
  }

  return tokens.sort((left, right) => right.value.length - left.value.length);
}

const protectedTokens = Object.freeze({
  zh: buildProtectedTokens('zh'),
  'zh-tw': buildProtectedTokens('zh-tw'),
  'zh-hk': buildProtectedTokens('zh-hk'),
});

function protectTerms(text, locale) {
  const restorations = [];
  let protectedText = text;

  for (const token of protectedTokens[locale]) {
    const pattern = new RegExp(
      escapeRegExp(token.value),
      token.caseSensitive ? 'gu' : 'giu',
    );

    protectedText = protectedText.replace(pattern, () => {
      const placeholder = `${placeholderPrefix}${String(restorations.length).padStart(8, '0')}${placeholderSuffix}`;
      restorations.push({ placeholder, value: token.target });
      return placeholder;
    });
  }

  return { protectedText, restorations };
}

function applyUiOverrides(text, locale) {
  let output = text;
  const replacements = Object.entries(uiOverrides[locale] ?? {})
    .sort(([left], [right]) => right.length - left.length);

  for (const [source, target] of replacements) {
    output = output.split(source).join(target);
  }

  return output;
}

function restoreTerms(text, restorations) {
  let output = text;

  for (const { placeholder, value } of restorations) {
    output = output.split(placeholder).join(value);
  }

  if (output.includes(placeholderPrefix)) {
    throw new Error('Chinese conversion left an unrestored protected-term placeholder.');
  }

  return output;
}

export function isTraditionalChineseLocale(locale) {
  return traditionalLocales.includes(locale);
}

export function isChineseContentLocale(locale) {
  return Object.hasOwn(targetKeys, locale);
}

function normalizeToSimplified(text) {
  return simplifiedNormalizer(text);
}

export function convertChineseText(text, locale, options = {}) {
  if (!isChineseContentLocale(locale) || typeof text !== 'string' || !text) return text;

  const normalized = text.normalize('NFC');
  const japanese = protectJapaneseSpans(normalized);
  const terms = protectTerms(japanese.protectedText, locale);
  const restorations = [...japanese.restorations, ...terms.restorations];
  const simplified = normalizeToSimplified(terms.protectedText);
  const converted = regionalConverters[locale]?.(simplified) ?? simplified;
  const localized = options.ui ? applyUiOverrides(converted, locale) : converted;
  return restoreTerms(localized, restorations);
}

export function convertTraditionalChinese(text, locale, options = {}) {
  if (!isTraditionalChineseLocale(locale)) return text;
  return convertChineseText(text, locale, options);
}

export function convertChineseValue(value, locale, options = {}) {
  if (typeof value === 'string') return convertChineseText(value, locale, options);
  if (Array.isArray(value)) {
    return value.map((item) => convertChineseValue(item, locale, options));
  }
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      convertChineseValue(item, locale, options),
    ]),
  );
}

export function convertTraditionalValue(value, locale, options = {}) {
  if (!isTraditionalChineseLocale(locale)) return value;
  return convertChineseValue(value, locale, options);
}

const nonConvertibleKeys = new Set([
  'translationKey',
  'code',
  'slug',
  'id',
  'artistId',
  'artistIds',
  'songId',
  'romanizedName',
  'romanizedTitle',
  'catalogNumber',
  'releaseDate',
  'debutDate',
  'date',
  'duration',
  'accentColor',
  'mutedColor',
  'surfaceColor',
  'highlightColor',
  'value',
]);

const linkKeys = new Set([
  'href',
  'image',
  'sourceUrl',
  'detailsHref',
  'deedHref',
  'docsPath',
]);

function rewriteStructuredLocalePath(value, locale) {
  if (typeof value !== 'string' || locale === 'zh') return value;
  return value.replace(/^\/zh(?=\/|[?#]|$)/u, `/${locale}`);
}

export function convertChineseContentValue(value, locale, key = '', options = {}) {
  if (!isChineseContentLocale(locale)) return value;
  if (key === 'locale') return locale;
  if (nonConvertibleKeys.has(key)) return value;
  if (linkKeys.has(key)) return rewriteStructuredLocalePath(value, locale);
  if (typeof value === 'string') return convertChineseText(value, locale, options);
  if (Array.isArray(value)) {
    return value.map((item) => convertChineseContentValue(item, locale, key, options));
  }
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value).map(([childKey, item]) => [
      childKey,
      convertChineseContentValue(item, locale, childKey, options),
    ]),
  );
}

function rewriteLocalePrefix(value, locale) {
  return value.replace(/(^|[\s(<])\/zh(?=\/|[?#\s)>]|$)/gu, `$1/${locale}`);
}

function findHtmlTagEnd(line, start) {
  let quote = '';

  for (let index = start + 1; index < line.length; index += 1) {
    const character = line[index];
    if (quote) {
      if (character === quote && line[index - 1] !== '\\') quote = '';
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (character === '>') return index;
  }

  return -1;
}

function findBalancedDestinationEnd(line, start, opening, closing) {
  let depth = 0;
  let quote = '';

  for (let index = start; index < line.length; index += 1) {
    const character = line[index];
    if (quote) {
      if (character === quote && line[index - 1] !== '\\') quote = '';
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (character === opening) depth += 1;
    if (character === closing) {
      depth -= 1;
      if (depth === 0) return index;
    }
  }

  return -1;
}

function findUrlEnd(line, start) {
  let index = start;
  while (index < line.length && !/[\s<>]/u.test(line[index])) index += 1;
  return index;
}

function readZhVariantShortcode(line, start, locale) {
  if (line[start] !== '{') return null;

  const match = line.slice(start).match(zhVariantShortcode);
  if (!match) return null;

  const args = splitShortcodeArguments(match[1]);
  if (args.length !== 3 || !args.every(Boolean)) return null;

  return {
    length: match[0].length,
    value: locale === 'zh' ? args[0] : locale === 'zh-tw' ? args[1] : args[2],
  };
}

function readPreservedShortcode(line, start) {
  if (line[start] !== '{') return null;

  const slice = line.slice(start);
  const jaMatch = slice.match(jaShortcode);
  if (jaMatch && jaMatch[1]) {
    return {
      length: jaMatch[0].length,
      value: jaMatch[1],
    };
  }

  const rubyMatch = slice.match(rubyShortcode);
  if (rubyMatch) {
    const args = splitShortcodeArguments(rubyMatch[1]);
    // Kana in the reading marks the base as Japanese original orthography.
    if (args.some((arg) => kanaPattern.test(arg))) {
      return {
        length: rubyMatch[0].length,
        value: rubyMatch[0],
      };
    }
  }

  return null;
}

function isJapaneseHtmlOpenTag(tag) {
  return /\bclass\s*=\s*["'][^"']*\bjp-lyric\b/iu.test(tag)
    || /\blang\s*=\s*["']ja(?:-JP)?["']/iu.test(tag);
}

function lineOpensJapaneseHtml(line) {
  for (let index = 0; index < line.length;) {
    if (line[index] !== '<') {
      index += 1;
      continue;
    }
    const endIndex = findHtmlTagEnd(line, index);
    if (endIndex === -1) return false;
    if (isJapaneseHtmlOpenTag(line.slice(index, endIndex + 1))) return true;
    index = endIndex + 1;
  }
  return false;
}

function convertMarkdownLine(line, locale) {
  let output = '';
  let plainText = '';

  const flushPlainText = () => {
    output += convertChineseText(plainText, locale);
    plainText = '';
  };

  for (let index = 0; index < line.length;) {
    const character = line[index];

    if (character === '\\' && index + 1 < line.length) {
      flushPlainText();
      output += line.slice(index, index + 2);
      index += 2;
      continue;
    }

    if (character === '`') {
      flushPlainText();
      const marker = line.slice(index).match(/^`+/u)?.[0] ?? '`';
      const closingIndex = line.indexOf(marker, index + marker.length);
      const end = closingIndex === -1 ? line.length : closingIndex + marker.length;
      output += line.slice(index, end);
      index = end;
      continue;
    }

    if (character === '$') {
      const marker = line[index + 1] === '$' ? '$$' : '$';
      const closingIndex = line.indexOf(marker, index + marker.length);
      if (closingIndex !== -1) {
        flushPlainText();
        const end = closingIndex + marker.length;
        output += line.slice(index, end);
        index = end;
        continue;
      }
    }

    const zhVariant = readZhVariantShortcode(line, index, locale);
    if (zhVariant) {
      flushPlainText();
      output += zhVariant.value;
      index += zhVariant.length;
      continue;
    }

    const preserved = readPreservedShortcode(line, index);
    if (preserved) {
      flushPlainText();
      output += preserved.value;
      index += preserved.length;
      continue;
    }

    if (character === '<') {
      const endIndex = findHtmlTagEnd(line, index);
      if (endIndex !== -1) {
        flushPlainText();
        const tag = line.slice(index, endIndex + 1);
        output += rewriteLocalePrefix(tag, locale);
        index = endIndex + 1;
        if (isJapaneseHtmlOpenTag(tag)) {
          output += line.slice(index);
          return output;
        }
        continue;
      }
    }

    if (
      line.startsWith('https://', index)
      || line.startsWith('http://', index)
      || line.startsWith('mailto:', index)
    ) {
      flushPlainText();
      const end = findUrlEnd(line, index);
      output += line.slice(index, end);
      index = end;
      continue;
    }

    if (character === ']' && (line[index + 1] === '(' || line[index + 1] === '[')) {
      plainText += character;
      flushPlainText();
      const opening = line[index + 1];
      const closing = opening === '(' ? ')' : ']';
      const endIndex = findBalancedDestinationEnd(line, index + 1, opening, closing);
      if (endIndex !== -1) {
        output += rewriteLocalePrefix(line.slice(index + 1, endIndex + 1), locale);
        index = endIndex + 1;
        continue;
      }
    }

    plainText += character;
    index += 1;
  }

  flushPlainText();
  return output;
}

export function convertChineseMarkdown(markdown, locale) {
  if (!isChineseContentLocale(locale) || typeof markdown !== 'string' || !markdown) {
    return markdown;
  }

  const newline = markdown.includes('\r\n') ? '\r\n' : '\n';
  const lines = markdown.split(/\r?\n/u);
  let fence;
  let mathBlock = false;
  let japaneseHtmlBlock = false;

  const converted = lines.map((line) => {
    const fenceMatch = line.match(/^\s{0,3}(`{3,}|~{3,})(.*)$/u);
    if (fenceMatch) {
      const marker = fenceMatch[1];
      if (!fence) {
        fence = { character: marker[0], length: marker.length };
      } else if (
        fence.character === marker[0]
        && marker.length >= fence.length
        && /^\s*$/u.test(fenceMatch[2])
      ) {
        fence = undefined;
      }
      return line;
    }

    if (!fence && /^\s*\$\$\s*$/u.test(line)) {
      mathBlock = !mathBlock;
      return line;
    }

    if (fence || mathBlock) return line;

    if (japaneseHtmlBlock) {
      if (/<\/(?:div|span)>/iu.test(line)) japaneseHtmlBlock = false;
      return line;
    }

    const convertedLine = convertMarkdownLine(line, locale);
    if (lineOpensJapaneseHtml(line)) {
      const openIndex = line.search(/jp-lyric|lang=["']ja/iu);
      const afterOpen = openIndex === -1 ? line : line.slice(openIndex);
      japaneseHtmlBlock = !afterOpen.includes('</div>') && !afterOpen.includes('</span>');
    }

    return convertedLine;
  });

  return converted
    .join(newline)
    .replaceAll('{{lyrics-controls::zh}}', `{{lyrics-controls::${locale}}}`);
}

export function convertTraditionalMarkdown(markdown, locale) {
  if (!isTraditionalChineseLocale(locale)) return markdown;
  return convertChineseMarkdown(markdown, locale);
}

export function getTraditionalChineseDefinition() {
  return structuredClone(traditionalDefinition);
}
