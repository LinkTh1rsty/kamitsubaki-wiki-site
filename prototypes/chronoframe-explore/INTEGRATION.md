# Wiki entrance and independent Worker

Selected design: `../../docs/design/visual-roam/DESIGN.md` (option 1). Keep existing galleries and management unchanged.

## Routes

The Wiki adds `VisualRoamPortal` after its existing Explore cards. Development links and images use `/visuals/` through the loopback proxy; production links and preview images use `https://kamitsubaki.wiki/visuals/`, including locale subdomains. The independent app owns `/visuals/`, its API and prefixed Nuxt/static assets. Native same-origin document transitions and original animation code remain.

Local Astro: `VISUAL_EXPLORER_LOCAL_ORIGIN=http://127.0.0.1:18360`, port 18362. The proxy matches only `/visuals` and `/visuals/*`, and refuses non-loopback targets and embedded credentials. Main `/api/gallery`, `/zh/gallery` and account routes stay outside it.

## Data and behavior

`/api/catalog?offset=N` returns 24 public records, total and nextOffset. Pagination uses the upstream cursor, deduplicates original IDs and rejects unsafe/stalled pages. Filters/sort obtain all metadata with concurrency four, merge contiguous pages in order, preserve the current viewer ID and retain a bounded wall. Failures keep the cursor at the first missing page and expose retry. Albums paginate the relevant public entity/type query. Deep album photo links load until found or exhausted.

Public JSON has a 15-second cache without stale responses after errors. Re-entering a tab after 60 seconds resets its catalog. Media checks publication again before serving private matching fallback bytes or streaming a fixed-host image. Unknown/withdrawn IDs fail closed; capture files are not a live catalog fallback. This is request-time revalidation, not an assertion that pixels already displayed in a browser can be recalled.

No server/database migration or new credential is required. Existing published-image APIs and storage remain authoritative.

## Fixed release plan

1. Commit/push reviewed source to GitHub and freeze the exact candidate/tree and checks in the workspace manifest.
2. After that exact manifest is approved, release the independent Worker `kamitsubaki-visual-roam` with only two routes: `kamitsubaki.wiki/visuals` and `kamitsubaki.wiki/visuals/*`. Disable workers.dev, preview URLs and optional observability. The app has only its generated ASSETS binding, no new paid product or plan upgrade.
3. Read back `https://kamitsubaki.wiki/visuals/.well-known/visual-roam-release.json`, check pages/catalog/thumbnail/originals and disabled routes. Stop if verification fails.
4. Release the main Wiki entrance through its existing main/Git `node scripts/release-build.mjs` pipeline. Verify its release marker and the entrance on desktop/mobile plus existing gallery/account surfaces.

The live route inventory was read on 2026-10-26: the target name did not exist and these two routes were unclaimed. Recheck immediately before release. Default Worker usage model is standard; billing subscription reads returned 403, so no new paid resource or upgrade is authorized. Do not claim the account plan was independently verified.

Rollback: remove only this new Worker's two routes or activate its prior immutable version, then use an approved revert PR for the additive entrance. Preserve all old services/data. There are no data migrations to reverse.

References: [Cloudflare routes](https://developers.cloudflare.com/workers/configuration/routing/routes/), [current platform limits](https://developers.cloudflare.com/workers/platform/limits/). A local workerd pass/dry-run cannot prove cloud startup, live route attachment or final production delivery.
