# Archive community service

This service handles only `/api/archive/community/*` on the existing API hostname. The central account service remains responsible for authentication. Using the API hostname lets browsers send existing host-scoped account cookies with `credentials: include`; the frontend cannot forward an HttpOnly cookie from another hostname.

The frontend-only archive modules work without this service. Public collections, authenticated synchronization, contribution review and rooms return a clear unavailable state until configuration and online acceptance are complete.

## Configuration

Copy `wrangler.example.jsonc` to `wrangler.local.jsonc` (ignored by Git). Replace the placeholder database UUID and account service name with verified values. Bind a **dedicated** D1 database as `ARCHIVE_DB`; never apply these migrations to the account or gallery database. Bind the existing central account Worker as `ARCHIVE_ACCOUNT`. Its `/api/account-auth/me` response must contain a verified `viewer.kind = user` and `viewer.userId`.

Use `ARCHIVE_ALLOWED_ORIGINS` for explicit frontend origins and `ARCHIVE_FRONTEND_ORIGIN` for the public archive JSON origin. `ARCHIVE_REVIEWER_IDS` is a server-managed comma-separated allowlist; verified central `archive-reviewer` or `admin` roles also authorize review. Clients cannot grant themselves roles. Authors cannot review their own work.

The route must stay limited to the archive path. Do not replace the account/gallery Worker, add a broad `api.kamitsubaki.wiki/*` route, or copy authentication logic into this service. The online frontend build explicitly uses the existing production API hostname. `PUBLIC_ARCHIVE_API_BASE` is available for local integration.

Public archive JSON is served as static Pages assets. Its cross-origin and cache headers are defined in `public/_headers`, because prerendered endpoint response headers do not replace the hosting configuration. Community responses attach their own strict credential CORS headers. See [Pages headers](https://developers.cloudflare.com/pages/configuration/headers/) for the distinction between static assets and Functions responses.

Apply `migrations/archive/0001_community.sql` only after checking the dedicated database identifier. Review the compiled service with `wrangler deploy --dry-run --config <local-config>` before a separate authorized deployment. Main-site publication continues through [the release runbook](../docs/operations/release-runbook.md) and its guarded build; no direct Pages deployment is part of this implementation.

## Verification

`node --test tests/archive-community.test.mjs tests/archive-service.test.mjs` checks authentication boundaries, CSRF, revision conflicts, public opt-in, ownership, edition matching, claims, review and rooms using an in-memory SQLite adapter and an explicit local identity fixture.

For an actual local workerd/D1 check, install Wrangler and Miniflare in an ignored QA environment, compile Pages functions into `.local/archive-functions-build`, then run `node scripts/check-archive-edge.mjs`. `ARCHIVE_QA_RUNTIME` can specify the directory containing the QA `miniflare` package. The default is `.local/browser-qa/node_modules`; Miniflare 5's legacy option converter is used. This test executes the migration against D1 and checks concurrent claims, host synchronization, privacy and revisions. Authentication is still a local fixture.

Before declaring shared features live, use normal signed-in accounts to verify synchronization, withdrawal of public witness/passport data, follow/fork, independent exhibition review, task submission/review, two-user room following and account switching. Verify the existing avatar/menu, account library and gallery upload/review flows in the same release. Record local fixtures and real service results separately. No production resource has been created or deployed by this implementation.

## State and retention

Personal records are private by default. A public passport only includes individually public records. Public live witnesses expose only records whose owner selected public visibility; names and passport links additionally require a published passport. Changes in consent take effect on the next read. Personal records and passport publication can be cleared and synchronized from the observatory; collection deletion removes follows. Closed rooms reject future joins. Record revisions and collection revisions use compare-and-swap, and task claims use conditional inserts so a competing claim cannot replace an active one.

The audit table records actual review actions. A submitted task becomes a completed contribution only after independent review of its contribution proof. It does not automatically edit archive content. Merge reviewed source changes through the existing contribution process and regenerate the public snapshot.
