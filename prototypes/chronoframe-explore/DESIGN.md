# 神椿影像馆 — upstream UI fidelity

The user explicitly requires the original open-source ChronoFrame UI and animations (2026-10-26 follow-up). Do not redesign or add Wiki-specific visual controls.

- Source: HoshinoSuzumi/chronoframe `016ac44f38aeb7ed30b2899870484f6b352ae59f`, original shared gallery layer. Album listing directly uses stable v1.0.2 source at commit `730eaddc511662741f48c2fa80108847d24325ce`, with template, styles, hover motion, random timing and waterfall keyframes unchanged. Only type import and API transport change.
- Official visual reference: https://lens.bh8.ga/ and its albums page. Screenshots in the owning task evidence directory.
- Keep original photo wall, embedded header, spacing, colors, fonts, filters, sort menu, albums and viewer templates. The approved first-release exceptions below may change functional conditions; preserve geometry, styles and motion.
- Keep original motion-v transitions/springs/stagger, album card hover movement, infinite alternating waterfall animation, viewer opening/closing, thumbnail strip and WebGL zoom behavior. Do not replace animation with static images or globally disable motion.
- Identity text/avatar and data/runtime adaptations differ. No extra Wiki navigation row, custom empty-state panel, source-button row, or replacement sort UI.
- Native server processing and dynamic OG are outside this host; their transport/runtime replacements must not alter gallery presentation.
- Keep the original control styling. Close unconnected controls under the confirmed first-release scope; account operations remain on the Wiki.
- List uses local 480px public derivatives. Viewer streams originals on demand. Never invent EXIF, GPS or capture dates.
- Desktop verification: 1440 x 900. Mobile: 390 x 844. Compare the same route/state against official source and verify animation running state as well as screenshots.

## Selected entrance integration, 2026-10-26

The user selected entrance concept 1. Its design belongs to ../../docs/design/visual-roam/DESIGN.md; the original gallery UI inside this app remains unchanged. The app now mounts at /visuals/, including all API/media/assets. Host CSS opts into the Wiki native document-navigation transition, respecting reduced motion, without changing internal gallery motion. Live data uses the full published catalog with batched loading; query time and album-projection creation time are not photographic capture dates.

## Original identity asset, 2026-10-26

Use public/wiki-avatar.svg, an unchanged copy of the owning Wiki public/brand/kamitsubakiwiki-square.svg vector original (400×400 viewBox). Avatar, loading identity and favicon reference this original; no redraw, sharpening or artificial enlargement. Source SHA-256 is recorded in design/wiki-avatar-source.json. Preserve the upstream avatar size/shape and intentionally blurred backdrop.

## Confirmed first-release exceptions

The user explicitly chose browse/albums/filter/originals and closing unfinished functionality. Keep original wall/viewer/album layouts and motion. Loading feedback and error/retry use the original control styling; the normal count/load-more footer has been removed per the latest user correction. Hide sign-in/map/reaction controls, filter tabs without real metadata and photographic-date sorting. Use published modification time by default; source dates are not capture dates. Full metadata filtering must not eagerly render the entire wall. Footer source link offers the corresponding modified source while retaining upstream credit.

## User correction — continuous original loading, 2026-10-27

User rejects the added count/load-more footer and asks for the original loading feel. Pinned upstream fetches the complete metadata list; original cards preload thumbnails and ThumbImage displays lazily. Wiki's public API is fixed24/page, so prepare ordered metadata with four concurrent reads after mount, independently of scroll. Albums automatically complete metadata too, sharing in-flight pages with deep links.

Keep original wall/viewer geometry, animations and controls. Browser pressure testing full1830-card mounting while metadata arrives blocked the page. Retain48-card mount windows, extend automatically1800px before the tail, and pause while hidden, in the viewer, on error or awaiting metadata. This is invisible progressive mounting; no normal counter, load-more button or per-page stop. Errors retain explicit retry. ThumbImage alone preloads1200px ahead; remove separate Image() preload because the proxy's no-store response cannot warm a reusable browser response. Preserve fresh publication checks and no-store headers. Prior manual-loading footer instructions above are superseded.

Background metadata outside the visible window must preserve the same visible array identity. Upstream masonry watches item-array identity and reconstructs columns/restores its captured scroll position on redraw. Only actual visible membership/order/metadata changes or expanding the window should redraw. Apply the same stable window to albums.
