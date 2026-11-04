# Upstream source and adapter boundary

The user explicitly requires the original ChronoFrame UI and animations.

## Source

- Shared gallery, contracts and WebGL source: https://github.com/HoshinoSuzumi/chronoframe at `016ac44f38aeb7ed30b2899870484f6b352ae59f`.
- Album listing: original stable `v1.0.2:app/pages/albums/index.vue`, commit `730eaddc511662741f48c2fa80108847d24325ce`, used as the layer's `album/Listing.vue`.
- Official visual reference: https://lens.bh8.ga/ and https://lens.bh8.ga/albums .

The album template and scoped CSS are byte-identical to v1.0.2. Original hover transforms, stacked images, alternating scroll-up/down keyframes and randomized 60–150 second timing are retained. Only its type import and `$fetch` transport call change. The original file and original release license are retained in design/.

The original layouts, scoped CSS, tile motion, WebGL renderer and stable album animation remain. `design/upstream-ui-integrity.json` distinguishes unchanged source from functional exceptions; it does not claim all adapted components are byte-identical.

## Functional adaptations

- Anonymous published-data transport, full-catalog/album pagination, visible card limits, full metadata filtering and viewer scope updates.
- Close unconnected login/map/reactions and metadata filters with no real data. Use modification-time sorting instead of invented photographic dates.
- Prefix share/document/canonical links with the mounted base; close the disabled OG preview/download. Direct-photo lookups honor refresh generations. Album deep-link resolution starts after mounting and keeps metadata paging separate from rendered card batches, with an explicit timeout/retry. Original avatar/loading fallbacks use the same SVG.
- Invisible accessibility labels in viewer/actions. Footer source URL points to the corresponding modified source, with ChronoFrame credit retained.
- Type-only compatibility fixes for TypeScript 5.9/Vue (callback/tuple/Blob/predicate/import typing).
- Host base `/visuals/`, fixed original SVG Wiki avatar, local fonts, disabled remote OG renderer/tracking and optional observability. No user authentication state is inherited.

The WebGL package builds with Vite 7.3.1/rollupOptions so Vue remains external. Renderer source is unchanged.

## Licenses

The shared gallery is AGPL-3.0-only. Contracts and WebGL retain MIT. Root LICENSE/LICENSING.md, each package LICENSE, and the stable release license are retained. This directory contains the corresponding modified source. Image ownership/attribution remains as recorded in the public snapshot; the UI license does not relicense images.

The host's albums route renders the original Listing inside ClientOnly. The stable component randomizes photos/timing and chooses three/eight background columns by viewport; client rendering avoids an SSR desktop tree hydrating into a mobile tree. Its visible template, styles and animations remain unchanged.

## Integration revision

NuxtLink inherits `/visuals/`; API/media/static URLs use the same prefix. The host opts into native document transitions. Cache freshness and publication checks are documented in INTEGRATION.md. Album createdAt is the projection creation timestamp, not a photo date.
