# 神椿影像馆 — ChronoFrame public reader

An independent, anonymous frontend at `/visuals/`. The Wiki keeps its existing gallery, accounts and management. The selected panorama entrance is additive.

## Run

Node 22.23.4 and pnpm 11.1.1:

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm preview
```

Local workerd: http://127.0.0.1:18360/visuals/ (inspector 18361). Stop preview/dev before rebuilding generated Nuxt output. These commands do not deploy.

## First release scope

- Original ChronoFrame wall, photo animations, WebGL/Swiper viewer, panels and stable v1.0.2 animated album listing. See DESIGN.md and UPSTREAM.md.
- All anonymous published Wiki images, 24 records per upstream page. First paint loads one page; after mounting, the remaining metadata is prepared continuously with four concurrent requests. The original masonry automatically mounts48-card windows1800px before the tail, without a count/load-more footer; metadata preparation is independent from scrolling. Thumbnail images alone are fetched near the viewport (1200px lookahead), and the redundant no-store Image() preload is removed. At local verification: 1830 published records.
- Nine artist/type album projections with independent pagination and canonical slug routes. Original IDs, authors and sources are retained. Direct public photo links can resolve outside the first page.
- Public JSON cache: 15 seconds, no stale-on-error fallback. Every thumbnail/original request rechecks anonymous publication status. Withdrawn images return 404; upstream failure returns 503. Captured fallback thumbnails are private server assets and are used only when live source URL and SHA-256 still match. No static public thumbnail snapshot bypasses that check.
- Browse, tags/text search, sorting, albums and originals. Unconnected login, map, reactions, camera/lens/city/rating filters and capture-date sorting are closed. No fabricated EXIF, GPS or photographic dates. Source dates remain separate.
- No VPS, new database, D1 migration, upload, sign-in or private cookies. Public reads continue through the existing Wiki API. No production service or route has been changed during local preparation.

## Verification and source

```sh
pnpm test
pnpm exec vue-tsc --noEmit -p tsconfig.json
pnpm build
```

Read `design-qa.md`, `INTEGRATION.md`, `UPSTREAM.md` and retained LICENSE/LICENSING.md. The footer links to this corresponding modified source; upstream credits and licenses remain. Image rights are independent of UI licensing.

The capture/cache scripts and data files are historical anonymous test material. They do not supply a live catalog fallback or expose unpublished images. Regenerated thumbnails belong in private server assets.

## Release preparation

After all source changes are committed and the app rebuilt, `node scripts/prepare-release.mjs` prepares local production config and a public revision marker. Dry-run with `pnpm exec wrangler deploy --config .output/server/wrangler.production.json --dry-run`. Actual release requires approval of the fixed workspace release manifest. Never substitute a direct Pages upload for the Wiki's existing Git release entry.
