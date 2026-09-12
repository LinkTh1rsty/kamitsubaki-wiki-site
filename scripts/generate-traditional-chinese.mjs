import { access, readFile, readdir, unlink, writeFile } from 'node:fs/promises';
import { basename, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

import {
  convertChineseContentValue,
  convertTraditionalMarkdown,
} from '../src/lib/traditionalChinese.mjs';
import { localeProfiles } from '../src/lib/i18n.mjs';

const workspaceRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const contentRoot = join(workspaceRoot, 'src', 'content');
const siteRoot = join(contentRoot, 'site');
const targetLocales = ['zh-tw', 'zh-hk'];
const generatedMarker = '<!-- AUTO-GENERATED FROM zh; DO NOT EDIT DIRECTLY. -->';

function parseMarkdownDocument(source, filePath) {
  const match = source.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/u);
  if (!match) throw new Error(`Missing YAML frontmatter: ${filePath}`);

  return {
    data: YAML.parse(match[1]),
    body: source.slice(match[0].length),
  };
}

async function pathExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function canReplaceGeneratedFile(filePath, type) {
  if (!(await pathExists(filePath))) return true;
  const source = await readFile(filePath, 'utf8');

  try {
    const data = type === 'json' ? JSON.parse(source) : parseMarkdownDocument(source, filePath).data;
    return data.generated === true;
  } catch {
    return false;
  }
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const filePath = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walk(filePath));
    } else {
      files.push(filePath);
    }
  }

  return files;
}

async function removeStaleGeneratedFiles(files) {
  for (const filePath of files) {
    const fileName = basename(filePath);
    const isGeneratedMarkdown = targetLocales.some((locale) => fileName === `${locale}.md`);
    const isGeneratedSite = targetLocales.some(
      (locale) => filePath === join(siteRoot, `${locale}.json`),
    );
    if (!isGeneratedMarkdown && !isGeneratedSite) continue;

    const type = isGeneratedSite ? 'json' : 'markdown';
    if (await canReplaceGeneratedFile(filePath, type)) await unlink(filePath);
  }
}

async function validateSourceMarkdownFiles(sourceFiles) {
  for (const sourcePath of sourceFiles) {
    const source = await readFile(sourcePath, 'utf8');
    parseMarkdownDocument(source, sourcePath);
  }
}

function serializeGeneratedMarkdown(data, body, locale) {
  const frontmatter = YAML.stringify(
    {
      ...data,
      locale,
      generated: true,
      generatedFrom: 'zh',
    },
    {
      lineWidth: 0,
      defaultKeyType: 'PLAIN',
      defaultStringType: 'QUOTE_DOUBLE',
    },
  ).trimEnd();

  const convertedBody = convertTraditionalMarkdown(body, locale).trim();
  return `---\n${frontmatter}\n---\n\n${generatedMarker}\n\n${convertedBody}\n`;
}

async function loadJapaneseWorkTitles(sourcePath) {
  const jaPath = join(sourcePath.slice(0, -'zh.md'.length), 'ja.md');
  if (!(await pathExists(jaPath))) return new Set();

  try {
    const { data } = parseMarkdownDocument(await readFile(jaPath, 'utf8'), jaPath);
    const titles = new Set();
    if (typeof data?.title === 'string' && data.title) titles.add(data.title.normalize('NFC'));
    if (Array.isArray(data?.tracks)) {
      for (const track of data.tracks) {
        if (typeof track?.title === 'string' && track.title) {
          titles.add(track.title.normalize('NFC'));
        }
      }
    }
    return titles;
  } catch {
    return new Set();
  }
}

function restoreJapaneseWorkTitles(source, converted, japaneseTitles) {
  if (!japaneseTitles.size) return converted;
  if (Array.isArray(source) && Array.isArray(converted)) {
    return converted.map((item, index) => restoreJapaneseWorkTitles(source[index], item, japaneseTitles));
  }
  if (!source || typeof source !== 'object' || !converted || typeof converted !== 'object') {
    return converted;
  }

  return Object.fromEntries(
    Object.entries(converted).map(([key, item]) => {
      const original = source[key];
      if (
        key === 'title'
        && typeof original === 'string'
        && typeof item === 'string'
        && japaneseTitles.has(original.normalize('NFC'))
      ) {
        return [key, original];
      }
      return [key, restoreJapaneseWorkTitles(original, item, japaneseTitles)];
    }),
  );
}

async function generateMarkdownFiles(sourceFiles) {
  let generatedCount = 0;

  for (const sourcePath of sourceFiles) {
    const source = await readFile(sourcePath, 'utf8');
    const { data, body } = parseMarkdownDocument(source, sourcePath);
    const japaneseTitles = await loadJapaneseWorkTitles(sourcePath);

    for (const locale of targetLocales) {
      const targetPath = join(sourcePath.slice(0, -'zh.md'.length), `${locale}.md`);
      if (!(await canReplaceGeneratedFile(targetPath, 'markdown'))) {
        console.warn(`Skipped manual Traditional Chinese file: ${relative(workspaceRoot, targetPath)}`);
        continue;
      }

      const convertedData = restoreJapaneseWorkTitles(
        data,
        convertChineseContentValue(data, locale),
        japaneseTitles,
      );
      await writeFile(
        targetPath,
        serializeGeneratedMarkdown(convertedData, body, locale),
        'utf8',
      );
      generatedCount += 1;
    }
  }

  return generatedCount;
}

function localizedLanguageOptions() {
  return Object.values(localeProfiles).map((profile) => ({
    code: profile.code,
    label: profile.label,
    shortLabel: profile.shortLabel,
  }));
}

async function generateSiteFiles() {
  const sourcePath = join(siteRoot, 'zh.json');
  const source = JSON.parse(await readFile(sourcePath, 'utf8'));

  for (const locale of targetLocales) {
    const targetPath = join(siteRoot, `${locale}.json`);
    if (!(await canReplaceGeneratedFile(targetPath, 'json'))) {
      console.warn(`Skipped manual Traditional Chinese site config: ${relative(workspaceRoot, targetPath)}`);
      continue;
    }

    const converted = convertChineseContentValue(source, locale, '', { ui: true });
    converted.locale = locale;
    converted.supportedLocales = localizedLanguageOptions();
    converted.generated = true;
    converted.generatedFrom = 'zh';
    await writeFile(targetPath, `${JSON.stringify(converted, null, 2)}\n`, 'utf8');
  }
}

const allFiles = await walk(contentRoot);
const sourceMarkdownFiles = allFiles.filter(
  (filePath) => filePath.endsWith(`${join('', 'zh.md')}`),
);
await validateSourceMarkdownFiles(sourceMarkdownFiles);
await removeStaleGeneratedFiles(allFiles);

const generatedCount = await generateMarkdownFiles(sourceMarkdownFiles);
await generateSiteFiles();

console.log(`Generated ${generatedCount} Traditional Chinese Markdown files and 2 site configs.`);
