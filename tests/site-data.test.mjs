import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import yaml from 'yaml';

import { buildArtistCategories, buildDatabaseJumpLinks, buildLogCards, buildProjectCards, sortByOrder } from '../src/lib/homeData.mjs';

const artistFolders = new Map([
  ['kaf', 'vwp'],
  ['rim', 'vwp'],
  ['harusaruhi', 'vwp'],
  ['isekaijoucho', 'vwp'],
  ['koko', 'vwp'],
  ['ciel', 'solo'],
  ['albemuth', 'solo'],
  ['kanzaki-iori', 'creators'],
  ['guiano', 'creators'],
  ['palow', 'creators'],
  ['kafu', 'isotopes'],
  ['sekai', 'isotopes'],
]);

const projectFolders = new Map([
  ['kamitsubaki-city', 'arg'],
  ['sinsaekai-studio', 'labels'],
  ['witch-exhibition', 'exhibitions'],
]);

async function readJson(path) {
  return JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
}

async function readMd(path) {
  const content = await readFile(new URL(path, import.meta.url), 'utf8');
  const match = content.match(/---\r?\n([\s\S]*?)\r?\n---/);
  return yaml.parse(match[1]);
}

test('nav items point to the four primary page sections', async () => {
  const { navItems } = await readJson('../src/content/site/zh.json');

  assert.deepEqual(
    navItems.map((item) => item.href),
    ['#about', '#database', '#projects', '#log'],
  );
});

test('artist database keeps the original four categories and key entities', async () => {
  const artistFiles = [
    'kaf',
    'rim',
    'harusaruhi',
    'isekaijoucho',
    'koko',
    'ciel',
    'albemuth',
    'kanzaki-iori',
    'guiano',
    'palow',
    'kafu',
    'sekai',
  ];
  const artistEntries = await Promise.all(
    artistFiles.map(async (id) => ({
      id: `${artistFolders.get(id)}/${id}/zh`,
      data: await readMd(`../src/content/artists/${artistFolders.get(id)}/${id}/zh.md`),
    })),
  );
  const artistCategories = buildArtistCategories(artistEntries);

  assert.deepEqual(
    artistCategories.map((category) => category.id),
    ['cat-vwp', 'cat-solo', 'cat-creators', 'cat-isotopes'],
  );

  const vwp = artistCategories.find((category) => category.id === 'cat-vwp');
  assert.equal(vwp.title, '虚拟世代的魔女们');
  assert.equal(vwp.items.length, 5);
  assert.deepEqual(vwp.items[0], {
    id: 'vwp/kaf',
    code: '01',
    name: '花譜',
    romanizedName: 'KAF',
    meta: 'DEBUT: 2018.10.18',
    statusLabel: 'STATUS',
    status: 'ACTIVE',
    image: 'https://placehold.co/1200x800/111/333?text=KAF',
  });
});

test('artist database derives categories and jump links from folders', async () => {
  const artistCategories = buildArtistCategories([
    {
      id: 'fan-units/example-unit/zh',
      data: {
        name: '示例组合',
        romanizedName: 'Example Unit',
        statusLabel: 'STATUS',
        status: 'ACTIVE',
        image: 'https://example.com/unit.jpg',
      },
    },
    {
      id: 'fan-units/another-unit/zh',
      data: {
        code: 'A2',
        name: '另一个组合',
        romanizedName: 'Another Unit',
        categoryTitle: '自定义组合',
        categorySubtitle: 'CUSTOM GROUP',
        categoryOrder: 12,
        itemOrder: 1,
        statusLabel: 'STATUS',
        status: 'DRAFT',
        image: 'https://example.com/another.jpg',
      },
    },
  ]);

  assert.deepEqual(artistCategories, [
    {
      id: 'cat-fan-units',
      title: '自定义组合',
      subtitle: 'CUSTOM GROUP',
      items: [
        {
          id: 'fan-units/another-unit',
          code: 'A2',
          name: '另一个组合',
          romanizedName: 'Another Unit',
          statusLabel: 'STATUS',
          status: 'DRAFT',
          image: 'https://example.com/another.jpg',
        },
        {
          id: 'fan-units/example-unit',
          code: '02',
          name: '示例组合',
          romanizedName: 'Example Unit',
          statusLabel: 'STATUS',
          status: 'ACTIVE',
          image: 'https://example.com/unit.jpg',
        },
      ],
    },
  ]);

  assert.deepEqual(buildDatabaseJumpLinks(artistCategories), [
    {
      label: '>> 自定义组合',
      href: '#cat-fan-units',
    },
  ]);
});

test('artist database creates readable fallback labels from folder names', () => {
  const artistCategories = buildArtistCategories([
    {
      id: 'vwp/test-entry/zh',
      data: {
        name: '测试条目',
        romanizedName: 'Test Entry',
        statusLabel: 'STATUS',
        status: 'ACTIVE',
        image: 'https://example.com/test.jpg',
      },
    },
    {
      id: 'fan-units/test-entry/zh',
      data: {
        name: '测试组合',
        romanizedName: 'Test Unit',
        statusLabel: 'STATUS',
        status: 'ACTIVE',
        image: 'https://example.com/unit.jpg',
      },
    },
  ]);

  assert.deepEqual(
    artistCategories.map((category) => ({
      id: category.id,
      title: category.title,
      subtitle: category.subtitle,
    })),
    [
      {
        id: 'cat-fan-units',
        title: 'Fan Units',
        subtitle: 'FAN UNITS',
      },
      {
        id: 'cat-vwp',
        title: 'VWP',
        subtitle: 'VWP',
      },
    ],
  );
});

test('projects and log entries preserve the static page content', async () => {
  const projectFiles = ['kamitsubaki-city', 'sinsaekai-studio', 'witch-exhibition'];
  const projects = sortByOrder(
    await Promise.all(
      projectFiles.map(async (id) => ({
        id: `${projectFolders.get(id)}/${id}/zh`,
        data: await readMd(`../src/content/projects/${projectFolders.get(id)}/${id}/zh.md`),
      })),
    ),
  ).map((entry) => entry.data);
  const logFiles = ['2024-06-01-vwp-live', '2024-05-15-city-timeline', '2024-04-30-rim-album'];
  const logEntries = buildLogCards(
    await Promise.all(
      logFiles.map(async (id) => ({
        id: `2024/${id}/zh`,
        data: await readMd(`../src/content/logs/2024/${id}/zh.md`),
      })),
    ),
    'zh',
  );

  assert.equal(projects.length, 3);
  assert.equal(projects[0].title, '神椿市建设中。');
  assert.equal(projects[1].title, 'SINSEKAI RECORD');
  assert.equal(projects[2].title, '魔女展');

  assert.deepEqual(
    logEntries.map((entry) => entry.date),
    ['2024.06.01', '2024.05.15', '2024.04.30'],
  );
  assert.equal(logEntries[0].title, 'V.W.P 现场观测更新');
  assert.equal(logEntries[1].href, '/zh/logs/2024/2024-05-15-city-timeline');
});

test('project cards derive routes and category labels from folders', () => {
  const projectCards = buildProjectCards(
    [
      {
        id: 'arg/kamitsubaki-city/zh',
        data: {
          kind: 'PROJECT_ARG',
          title: '神椿市建设中。',
          description: '一项叙事驱动的观测计划。',
          order: 1,
        },
      },
      {
        id: 'fan-events/archive-room/zh',
        data: {
          kind: 'PROJECT_EVENT',
          title: '档案室',
          description: '测试项目',
          order: 4,
        },
      },
    ],
    'zh',
  );

  assert.deepEqual(projectCards, [
    {
      id: 'arg/kamitsubaki-city',
      href: '/zh/projects/arg/kamitsubaki-city',
      kind: 'PROJECT_ARG',
      title: '神椿市建设中。',
      description: '一项叙事驱动的观测计划。',
      categorySlug: 'arg',
      categoryTitle: 'ARG',
    },
    {
      id: 'fan-events/archive-room',
      href: '/zh/projects/fan-events/archive-room',
      kind: 'PROJECT_EVENT',
      title: '档案室',
      description: '测试项目',
      categorySlug: 'fan-events',
      categoryTitle: 'Fan Events',
    },
  ]);
});
