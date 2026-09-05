export const CONTRIBUTOR_SYNC_BATCH_SIZE = 1000;

export async function syncContributionEvents({
  apiBase,
  syncToken,
  events,
  source = 'git-history',
  batchSize = CONTRIBUTOR_SYNC_BATCH_SIZE,
  fetchImpl = fetch,
}) {
  if (!Array.isArray(events) || events.length === 0) {
    throw new Error('Contributor sync requires at least one contribution event.');
  }
  if (!Number.isSafeInteger(batchSize) || batchSize <= 0 || batchSize > CONTRIBUTOR_SYNC_BATCH_SIZE) {
    throw new Error(`Contributor sync batch size must be between 1 and ${CONTRIBUTOR_SYNC_BATCH_SIZE}.`);
  }

  const batches = [];
  for (let offset = 0; offset < events.length; offset += batchSize) {
    batches.push(events.slice(offset, offset + batchSize));
  }

  let accepted = 0;
  for (const [index, batch] of batches.entries()) {
    const response = await fetchImpl(new URL('/api/admin/contributors/sync', apiBase), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${syncToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source,
        replaceSource: false,
        events: batch,
      }),
    });

    const body = await response.json().catch(() => ({}));
    const batchLabel = `${index + 1}/${batches.length}`;
    if (!response.ok) {
      throw new Error(`Contributor sync batch ${batchLabel} failed with ${response.status}: ${JSON.stringify(body)}`);
    }
    if (Number(body.accepted) !== batch.length) {
      throw new Error(`Contributor sync batch ${batchLabel} accepted ${body.accepted ?? 0} of ${batch.length} events.`);
    }
    accepted += batch.length;
  }

  return { accepted, batches: batches.length };
}
