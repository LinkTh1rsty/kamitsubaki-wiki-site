import assert from 'node:assert/strict';
import test from 'node:test';
import { createContributorClient } from '../src/lib/contributorClient.mjs';
const data = { totals: { contributions: 42 }, topContributors: [{ id: 'a' }], recent: [] };
const response = () => Response.json(data);

test('concurrent roster loads share a request and revisits use the saved public records', async () => {
  let requests = 0;
  const client = createContributorClient({ fetchImpl: async () => { requests++; return response(); } });
  await Promise.all([client.load('https://example.com/summary'), client.load('https://example.com/summary')]);
  await client.load('https://example.com/summary');
  assert.equal(requests, 1);
  assert.equal(client.peek('https://example.com/summary').data.totals.contributions, 42);
});

test('reload restores tab cache, failure retains records, retry recovers, and expired records are rejected', async () => {
  let stored;
  const storage = { getItem: () => stored, setItem: (_key, value) => { stored = value; } };
  let time = 1;
  await createContributorClient({ storage, now: () => time, fetchImpl: async () => response() }).load('https://example.com/summary');
  time += 301_000;
  let offline = true;
  const client = createContributorClient({ storage, now: () => time, fetchImpl: async () => {
    if (offline) throw new Error('offline');
    return response();
  } });
  assert.equal(client.peek('https://example.com/summary').stale, true);
  assert.equal((await client.load('https://example.com/summary')).data.totals.contributions, 42);
  offline = false;
  assert.equal((await client.load('https://example.com/summary', { force: true })).stale, false);
  time += 8 * 86400_000;
  offline = true;
  assert.equal(client.peek('https://example.com/summary'), null);
  await assert.rejects(client.load('https://example.com/summary'), /offline/);
});

test('malformed replies never erase cached records and storage failures do not break loading', async () => {
  let invalid = false;
  const client = createContributorClient({ storage: { getItem() { throw new Error('disabled'); } }, fetchImpl: async () => invalid ? Response.json({ error: 'unavailable' }) : response() });
  await client.load('https://example.com/summary');
  invalid = true;
  const result = await client.load('https://example.com/summary', { force: true });
  assert.equal(result.stale, true);
  assert.equal(result.data.totals.contributions, 42);
});
