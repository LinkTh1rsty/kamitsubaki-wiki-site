import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Readable } from 'node:stream';
import test from 'node:test';

async function readProjectFile(path) {
  return readFile(new URL(path, import.meta.url), 'utf8');
}

test('contributor roster is mounted on the home page and artist entry pages', async () => {
  const homePage = await readProjectFile('../src/pages/[locale]/index.astro');
  const artistPage = await readProjectFile('../src/pages/[locale]/artists/[...id].astro');

  assert.match(homePage, /import ContributorRoster/);
  assert.match(homePage, /<ContributorRoster mode="summary" locale=\{locale\}/);
  assert.match(artistPage, /import ContributorRoster/);
  assert.match(artistPage, /<ContributorRoster mode="entry" locale=\{localeCode\} collection="artists" entryId=\{id\}/);
});

test('contributor roster fetches public summary and entry contribution APIs', async () => {
  const component = await readProjectFile('../src/components/ContributorRoster.astro');
  const script = await readProjectFile('../src/scripts/contributorRoster.js');
  const css = await readProjectFile('../src/styles/global.css');

  assert.match(component, /data-contributor-roster/);
  assert.match(component, /PUBLIC_AI_OBSERVER_API_BASE/);
  assert.match(script, /api\/contributors\/summary/);
  assert.match(script, /api\/contributors\/entry/);
  assert.match(script, /searchParams\.set\('collection'/);
  assert.match(script, /searchParams\.set\('entryId'/);
  assert.match(script, /renderContributor/);
  assert.match(script, /renderActivity/);
  assert.match(script, /contributorRosterStatus/);
  assert.match(script, /astro:page-load/);
  assert.match(script, /status === 'loading' \|\| status === 'loaded'/);
  assert.match(css, /\.contributor-roster/);
  assert.match(css, /\.contributor-roster--entry/);
  assert.match(css, /\.contributor-roster--summary/);
  assert.match(css, /\.contributor-roster__section/);
});

test('contributor sync script derives safe identities from git history', async () => {
  const script = await readProjectFile('../scripts/sync-contributors.mjs');
  const syncClient = await readProjectFile('../scripts/contributor-sync-client.mjs');
  const history = await readProjectFile('../scripts/contributor-history.mjs');
  const packageJson = JSON.parse(await readProjectFile('../package.json'));

  assert.equal(packageJson.scripts['contributors:sync'], 'node scripts/sync-contributors.mjs');
  assert.match(script, /collectRepositoryEvents/);
  assert.match(script, /CONTRIBUTORS_BACKEND_REPO_PATH/);
  assert.match(script, /CONTRIBUTORS_BACKEND_GITHUB_REPOSITORY/);
  assert.match(history, /users\\\.noreply\\\.github\\\.com/);
  assert.match(history, /https:\/\/github\.com\/\$\{githubLogin\}\.png\?size=96/);
  assert.match(history, /emailHash/);
  assert.match(syncClient, /api\/admin\/contributors\/sync/);
  assert.match(script, /spawn\('git'/);
  assert.match(script, /consumeGitLogRecords/);
  assert.doesNotMatch(script, /execFileSync|maxBuffer/);
  assert.doesNotMatch(`${script}\n${history}`, /email:\s*authorEmail/);
});

test('git history streaming handles output larger than the execFileSync buffer', async () => {
  const { consumeGitLogRecords } = await import('../scripts/sync-contributors.mjs');
  const recordCount = 18_000;
  async function* largeGitLog() {
    for (let index = 0; index < recordCount; index += 1) {
      yield `\x1e${String(index).padStart(40, '0')}\x1fContributor\x1fprivate@example.com\x1f2026-07-22T00:00:00.000Z\x1fbulk\n`;
      yield `src/content/songs/example-${index}/zh.md\n`;
    }
  }

  let seen = 0;
  let largestRecord = 0;
  await consumeGitLogRecords(Readable.from(largeGitLog()), (record) => {
    seen += 1;
    largestRecord = Math.max(largestRecord, Buffer.byteLength(record));
  });

  assert.equal(seen, recordCount);
  assert.ok(largestRecord < 1024);
});

test('contributor snapshots are uploaded in API-sized batches after streaming', async () => {
  const { syncContributionEvents } = await import('../scripts/contributor-sync-client.mjs');
  const calls = [];
  const events = Array.from({ length: 2_105 }, (_, index) => ({ commitSha: String(index) }));
  const result = await syncContributionEvents({
    apiBase: 'https://contributors.example',
    syncToken: 'secret',
    events,
    fetchImpl: async (_url, options) => {
      const body = JSON.parse(options.body);
      calls.push(body);
      return {
        ok: true,
        status: 200,
        json: async () => ({ accepted: body.events.length, contributors: 12 }),
      };
    },
  });

  assert.deepEqual(calls.map(({ events: batch }) => batch.length), [1000, 1000, 105]);
  assert.deepEqual(calls.map(({ replaceSource }) => replaceSource), [true, false, false]);
  assert.deepEqual(result, { accepted: 2105, batches: 3 });
});

test('contributor sync uploads only verified GitHub identities', async () => {
  const { filterGithubContributionEvents } = await import('../scripts/sync-contributors.mjs');
  const events = [
    {
      commitSha: 'github-commit',
      contributor: { id: 'github:kirenko', githubLogin: 'KiRenk0' },
      identity: { provider: 'github', providerKey: 'kirenko' },
    },
    {
      commitSha: 'git-commit',
      contributor: { id: 'git:private', displayName: 'KiRenk0' },
      identity: { provider: 'git_email', providerKey: 'hashed' },
    },
    {
      commitSha: 'incomplete-github-commit',
      contributor: { id: 'github:unknown' },
      identity: { provider: 'github', providerKey: 'unknown' },
    },
  ];

  assert.deepEqual(filterGithubContributionEvents(events), [events[0]]);
});

test('contributor data groups locale files from one commit into one contribution', async () => {
  const { normalizeContributorData } = await import('../src/lib/contributorRosterData.mjs');
  const contributor = { id: 'git:link', displayName: 'Link' };
  const recent = ['zh', 'ja', 'en'].map((locale) => ({
    commitSha: 'abc123456789',
    commitUrl: 'https://example.com/commit/abc123456789',
    committedAt: '2026-07-12T00:00:00.000Z',
    summary: 'content: update artist entry',
    collection: 'artists',
    entryId: 'solo/teresa',
    locale,
    contributor,
  }));

  const normalized = normalizeContributorData(
    {
      totals: { contributors: 1, contributions: 3, entries: 1 },
      topContributors: [{ ...contributor, contributionCount: 3, entryCount: 1 }],
      recent,
    },
    { mode: 'summary', recentLimit: 8 },
  );

  assert.equal(normalized.recent.length, 1);
  assert.deepEqual(normalized.recent[0].locales, ['en', 'ja', 'zh']);
  assert.deepEqual(normalized.recent[0].entryIds, ['solo/teresa']);
  assert.equal(normalized.totals.contributions, 1);
  assert.equal(normalized.totals.entries, 1);
  assert.equal(normalized.topContributors[0].contributionCount, 1);
});

test('entry contributor data shows at most three unique recent commits', async () => {
  const { normalizeContributorData } = await import('../src/lib/contributorRosterData.mjs');
  const contributor = { id: 'git:link', displayName: 'Link' };
  const recent = Array.from({ length: 5 }, (_, index) => ({
    commitSha: `commit-${index}`,
    committedAt: `2026-07-${String(12 - index).padStart(2, '0')}T00:00:00.000Z`,
    collection: 'artists',
    entryId: 'solo/teresa',
    locale: 'zh',
    contributor,
  }));

  const normalized = normalizeContributorData(
    { topContributors: [{ ...contributor, contributionCount: 5 }], recent },
    { mode: 'entry', recentLimit: 3 },
  );

  assert.equal(normalized.recent.length, 3);
  assert.deepEqual(normalized.recent.map((event) => event.commitSha), ['commit-0', 'commit-1', 'commit-2']);
});

test('git history collector aggregates locale files without exposing author email', async () => {
  const { collectContributionEvents, contributorFromAuthor } = await import('../scripts/contributor-history.mjs');
  const gitOutput = [
    '\x1eabc123\x1fLink\x1f123+Link@users.noreply.github.com\x1f2026-07-12T00:00:00.000Z\x1fdocs: update teresa',
    'src/content/artists/solo/teresa/zh.md',
    'src/content/artists/solo/teresa/ja.md',
    'src/content/artists/solo/teresa/en.md',
  ].join('\n');

  const events = collectContributionEvents(gitOutput, 'https://example.com/commit');

  assert.equal(events.length, 1);
  assert.deepEqual(events[0].locales, ['en', 'ja', 'zh']);
  assert.deepEqual(events[0].paths, [
    'src/content/artists/solo/teresa/en.md',
    'src/content/artists/solo/teresa/ja.md',
    'src/content/artists/solo/teresa/zh.md',
  ]);
  assert.equal(events[0].contributor.githubLogin, 'link');
  assert.equal(events[0].commitUrl, 'https://example.com/commit/abc123');
  assert.doesNotMatch(JSON.stringify(events), /users\.noreply|authorEmail|@/i);

  const privateAuthor = contributorFromAuthor('Aqaz', 'private@example.com');
  assert.equal(privateAuthor.identity.provider, 'git_email');
  assert.match(privateAuthor.identity.emailHash, /^[a-f0-9]{64}$/);
  assert.doesNotMatch(JSON.stringify(privateAuthor), /private@example\.com/);
});

test('git history collector classifies site and backend feature work', async () => {
  const { parseFunctionalPath } = await import('../scripts/contributor-history.mjs');

  assert.deepEqual(parseFunctionalPath('src/components/ContributorRoster.astro'), {
    collection: 'development', entryId: 'site-experience', locale: null,
  });
  assert.deepEqual(parseFunctionalPath('.github/workflows/ci.yml'), {
    collection: 'development', entryId: 'automation', locale: null,
  });
  assert.deepEqual(parseFunctionalPath('tests/contributors.test.mjs', { repository: 'backend' }), {
    collection: 'development', entryId: 'quality', locale: null,
  });
  assert.deepEqual(parseFunctionalPath('src/storage.js', { repository: 'backend' }), {
    collection: 'development', entryId: 'backend-services', locale: null,
  });
  assert.deepEqual(parseFunctionalPath('docs/architecture.md'), {
    collection: 'documentation', entryId: 'wiki-docs', locale: null,
  });
  assert.deepEqual(parseFunctionalPath('public/images/example.jpg'), {
    collection: 'design', entryId: 'site-assets', locale: null,
  });
});

test('contributor roster exposes localized honor wall copy and contribution routes', async () => {
  const component = await readProjectFile('../src/components/ContributorRoster.astro');

  assert.match(component, /一起建设这座观测站/);
  assert.match(component, /この観測拠点を一緒に築く/);
  assert.match(component, /Build this observatory together/);
  assert.match(component, /rankLabel/);
  assert.match(component, /data-owner-login/);
  assert.match(component, /站长与主理人/);
  assert.match(component, /功能贡献/);
  assert.match(component, /localeLabels/);
  assert.match(component, /retry/);
  assert.match(component, /error/);
  assert.match(component, /data-guide-href/);
  assert.match(component, /data-edit-href/);
  assert.match(component, /contribute\/edit/);
  assert.match(component, /src\/content\/\$\{collection\}/);
});

test('manual collaborators use an independent local data file and summary-only section', async () => {
  const roster = await readProjectFile('../src/components/ContributorRoster.astro');
  const component = await readProjectFile('../src/components/ManualContributors.astro');
  const data = JSON.parse(await readProjectFile('../src/data/manualContributors.json'));

  assert.match(roster, /import ManualContributors/);
  assert.match(roster, /mode === 'summary' && <ManualContributors locale=\{locale\}/);
  assert.match(component, /manualContributorData/);
  assert.match(component, /特别协力者/);
  assert.match(component, /スペシャルサポーター/);
  assert.match(component, /Special collaborators/);
  assert.match(component, /safeContactHref/);
  assert.match(component, /safeAvatarSrc/);
  assert.match(component, /data-manual-contributors/);
  assert.match(component, /data-contributor-card/);
  assert.match(component, /data-contributor-drawer/);
  assert.match(component, /data-list-expanded/);
  assert.match(component, /grid-template-rows: 0fr/);
  assert.doesNotMatch(component, /manual-contributor-hint/);
  assert.match(component, /contacts\.map/);
  assert.equal(Array.isArray(data), true);
  assert.equal(data[0].enabled, true);
  assert.deepEqual(Object.keys(data[0]).sort(), ['avatar', 'collaboration', 'contacts', 'enabled', 'id', 'introduction', 'name', 'quote']);
  assert.equal(typeof data[0].collaboration.zh, 'string');
  assert.equal(typeof data[0].avatar, 'string');
  assert.equal(Array.isArray(data[0].contacts), true);
  assert.equal(data[0].contacts.length, 1);
  assert.equal(typeof data[0].contacts[0].label, 'string');
  assert.equal(typeof data[0].introduction.zh, 'string');
  assert.equal(typeof data[0].quote.zh, 'string');
  assert.match(component, /Math\.random\(\)/);
  assert.match(component, /aspect-ratio: 1 \/ 1/);
  assert.match(component, /object-fit: cover/);

  const inu = data.find((contributor) => contributor.id === 'inu');
  assert.equal(inu.contacts.length, 1);
  assert.deepEqual(new Set(Object.values(inu.introduction)), new Set(['歌を歌うのは寂しいから 目を閉じるのは聞きたいから']));
  assert.deepEqual(new Set(Object.values(inu.quote)), new Set(['要继续喜欢神椿呀！']));

  const xiaochi = data.find((contributor) => contributor.id === 'xiaochi');
  assert.deepEqual(new Set(Object.values(xiaochi.introduction)), new Set(['关注花谱喵关注花谱谢谢喵']));
  assert.deepEqual(new Set(Object.values(xiaochi.quote)), new Set(['世界平和なんて噓だ　皆一人ぼっちだ']));
});

test('contributor renderer builds honor wall cards, readable activity, and retry states', async () => {
  const script = await readProjectFile('../src/scripts/contributorRoster.js');

  assert.match(script, /normalizeContributorData/);
  assert.match(script, /contributor-roster__rank/);
  assert.match(script, /renderOwner/);
  assert.match(script, /contributor-roster__breakdown/);
  assert.match(script, /topLimit', '24/);
  assert.match(script, /contributor-roster__actions/);
  assert.match(script, /contributor-roster__locale/);
  assert.match(script, /contributor-roster__activity/);
  assert.match(script, /recentLimit:\s*mode === 'entry' \? 3 : 10/);
  assert.match(script, /data-contributor-retry/);
  assert.match(script, /addEventListener\('click'/);
  assert.match(script, /delete root\.dataset\.contributorRosterStatus/);
  assert.match(script, /copy\.error/);
  assert.match(script, /prepareRosterMotion/);
  assert.match(script, /IntersectionObserver/);
  assert.match(script, /animateRosterNumbers/);
  assert.match(script, /prefers-reduced-motion/);
});

test('contributor honor wall styles cover cards, actions, activity, focus, and mobile layouts', async () => {
  const css = await readProjectFile('../src/styles/global.css');

  assert.match(css, /\.contributor-roster__rank/);
  assert.match(css, /\.contributor-roster__owner/);
  assert.match(css, /\.contributor-roster__breakdown/);
  assert.match(css, /\.contributor-roster__type/);
  assert.match(css, /\.contributor-roster__actions/);
  assert.match(css, /\.contributor-roster__action--primary/);
  assert.match(css, /\.contributor-roster__locale/);
  assert.match(css, /\.contributor-roster__activity/);
  assert.match(css, /contributor-roster-reveal/);
  assert.match(css, /data-roster-animate/);
  assert.match(css, /\.contributor-roster--entry \.contributor-roster__person/);
  assert.match(css, /\.contributor-roster__action:focus-visible/);
  assert.match(css, /@media \(max-width: 639px\)[\s\S]*\.contributor-roster__actions/);
});

test('contributor workflow fails loudly when sync configuration is missing', async () => {
  const workflow = await readProjectFile('../.github/workflows/sync-contributors.yml');

  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /schedule:[\s\S]*cron:\s*['"]17 3 \* \* \*['"]/);
  assert.match(workflow, /permissions:[\s\S]*contents:\s*read/);
  assert.match(workflow, /::error::CONTRIBUTOR_SYNC_TOKEN/);
  assert.match(workflow, /exit 1/);
  assert.doesNotMatch(workflow, /skipping contributor sync/);
  assert.match(workflow, /GITHUB_TOKEN:\s*\$\{\{ secrets\.GITHUB_TOKEN \}\}/);
  assert.match(workflow, /GITHUB_REPOSITORY:\s*\$\{\{ github\.repository \}\}/);
  assert.doesNotMatch(workflow, /kamitsubaki-wiki-site-backend/);
  assert.doesNotMatch(workflow, /CONTRIBUTORS_BACKEND_REPO_PATH/);
});

test('GitHub identity resolver enriches contributors, caches commits, and falls back safely', async () => {
  const { createGithubIdentityResolver } = await import('../scripts/github-contributor-identity.mjs');
  const calls = [];
  const resolver = createGithubIdentityResolver({
    token: 'token',
    repository: 'owner/repo',
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return {
        ok: true,
        json: async () => ({ author: { login: 'Aqaz', avatar_url: 'https://avatars.example/aqaz', html_url: 'https://github.com/Aqaz' } }),
      };
    },
  });
  const fallback = contributorFromFixture('Aqaz');

  const first = await resolver('abc123', fallback);
  const second = await resolver('abc123', fallback);

  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /repos\/owner\/repo\/commits\/abc123/);
  assert.match(calls[0].options.headers.Authorization, /^Bearer /);
  assert.equal(first.contributor.id, 'github:aqaz');
  assert.equal(first.contributor.githubLogin, 'Aqaz');
  assert.equal(first.contributor.profileUrl, 'https://github.com/Aqaz');
  assert.deepEqual(second, first);
  assert.doesNotMatch(JSON.stringify(first), /@|email/i);

  const failingResolver = createGithubIdentityResolver({
    token: 'token',
    repository: 'owner/repo',
    fetchImpl: async () => ({ ok: false }),
  });
  assert.deepEqual(await failingResolver('missing', fallback), fallback);
});

test('contributor sync submits an enriched snapshot in API-sized batches', async () => {
  const script = await readProjectFile('../scripts/sync-contributors.mjs');
  assert.match(script, /createGithubIdentityResolver/);
  assert.match(script, /syncContributionEvents/);
  assert.match(script, /GITHUB_TOKEN/);
  assert.match(script, /GITHUB_REPOSITORY/);
  assert.match(script, /identityEnriched/);
  assert.match(script, /filterGithubContributionEvents/);
  assert.match(script, /unresolved Git events skipped/);
  assert.doesNotMatch(script, /API limit is 1000/);
});

test('GitHub identity resolver falls back to the associated pull request author', async () => {
  const { createGithubIdentityResolver } = await import('../scripts/github-contributor-identity.mjs');
  const urls = [];
  const resolver = createGithubIdentityResolver({
    token: 'token',
    repository: 'owner/repo',
    fetchImpl: async (url) => {
      urls.push(url);
      if (url.endsWith('/commits/merge123')) return { ok: true, json: async () => ({ author: null }) };
      return {
        ok: true,
        json: async () => ([{ user: { login: 'MoriSakiTsu', avatar_url: 'https://avatars.example/mori', html_url: 'https://github.com/MoriSakiTsu' } }]),
      };
    },
  });

  const resolved = await resolver('merge123', contributorFromFixture('Aqaz'));
  assert.equal(resolved.contributor.id, 'github:morisakitsu');
  assert.equal(resolved.contributor.displayName, 'Aqaz');
  assert.equal(urls.length, 2);
  assert.match(urls[1], /commits\/merge123\/pulls/);
});

function contributorFromFixture(displayName) {
  return {
    contributor: { id: 'git:private', displayName, isBot: false },
    identity: { provider: 'git_email', providerKey: 'hashed', emailHash: 'hashed' },
  };
}
