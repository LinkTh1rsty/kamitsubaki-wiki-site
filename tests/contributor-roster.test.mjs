import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
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
  assert.match(script, /new IntersectionObserver/);
  assert.match(script, /rootMargin:\s*'600px 0px'/);
  assert.match(script, /contributorRosterObserver\.observe\(root\)/);
  assert.doesNotMatch(script, /for \(const root of document\.querySelectorAll\('\[data-contributor-roster\]'\)\) loadRoster\(root\)/);
  assert.match(css, /\.contributor-roster/);
  assert.match(css, /\.contributor-roster--entry/);
  assert.match(css, /\.contributor-roster--summary/);
  assert.match(css, /\.contributor-roster__section/);
});

test('contributor sync script derives safe identities from git history', async () => {
  const script = await readProjectFile('../scripts/sync-contributors.mjs');
  const history = await readProjectFile('../scripts/contributor-history.mjs');
  const packageJson = JSON.parse(await readProjectFile('../package.json'));

  assert.equal(packageJson.scripts['contributors:sync'], 'node scripts/sync-contributors.mjs');
  assert.match(script, /src\/content\/artists/);
  assert.match(script, /src\/content\/site/);
  assert.match(history, /users\\\.noreply\\\.github\\\.com/);
  assert.match(history, /https:\/\/github\.com\/\$\{githubLogin\}\.png\?size=96/);
  assert.match(history, /emailHash/);
  assert.match(script, /api\/admin\/contributors\/sync/);
  assert.doesNotMatch(`${script}\n${history}`, /email:\s*authorEmail/);
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

test('contributor roster exposes localized honor wall copy and contribution routes', async () => {
  const component = await readProjectFile('../src/components/ContributorRoster.astro');

  assert.match(component, /一起维护这座观测站/);
  assert.match(component, /この観測記録を一緒に育てる/);
  assert.match(component, /Build this fan archive together/);
  assert.match(component, /rankLabel/);
  assert.match(component, /localeLabels/);
  assert.match(component, /retry/);
  assert.match(component, /error/);
  assert.match(component, /data-guide-href/);
  assert.match(component, /data-edit-href/);
  assert.match(component, /contribute\/edit/);
  assert.match(component, /src\/content\/artists/);
});

test('contributor renderer builds honor wall cards, readable activity, and retry states', async () => {
  const script = await readProjectFile('../src/scripts/contributorRoster.js');

  assert.match(script, /normalizeContributorData/);
  assert.match(script, /contributor-roster__rank/);
  assert.match(script, /contributor-roster__actions/);
  assert.match(script, /contributor-roster__locale/);
  assert.match(script, /contributor-roster__activity/);
  assert.match(script, /recentLimit:\s*mode === 'entry' \? 3 : 8/);
  assert.match(script, /data-contributor-retry/);
  assert.match(script, /addEventListener\('click'/);
  assert.match(script, /delete root\.dataset\.contributorRosterStatus/);
  assert.match(script, /copy\.error/);
});

test('contributor honor wall styles cover cards, actions, activity, focus, and mobile layouts', async () => {
  const css = await readProjectFile('../src/styles/global.css');

  assert.match(css, /\.contributor-roster__rank/);
  assert.match(css, /\.contributor-roster__actions/);
  assert.match(css, /\.contributor-roster__action--primary/);
  assert.match(css, /\.contributor-roster__locale/);
  assert.match(css, /\.contributor-roster__activity/);
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

test('contributor sync submits an enriched replacement snapshot', async () => {
  const script = await readProjectFile('../scripts/sync-contributors.mjs');
  assert.match(script, /createGithubIdentityResolver/);
  assert.match(script, /replaceSource:\s*true/);
  assert.match(script, /GITHUB_TOKEN/);
  assert.match(script, /GITHUB_REPOSITORY/);
  assert.match(script, /identityEnriched/);
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
