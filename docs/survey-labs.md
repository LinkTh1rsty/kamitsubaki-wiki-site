# Survey LABs

Implemented independently on `feature/new-features`, based on `origin/main` at `9bfebdb0`. The archived immersive refactor is not merged or enabled.

## Entry points and scope

Open `/zh/labs/explore/`; the same routes exist for `zh-tw`, `zh-hk`, `ja`, and `en`.

| Survey request          | Labs implementation                                                                                                                                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Activity timeline       | `/labs/timeline/`: year/type/search/order filters, shareable URL, pagination, explicit date precision, separate sourced events and editorial logs.                                                                                                                                |
| Relationships           | `/labs/relations/`: keyboard-operable graph, center selection, credits and affiliations, deduplicated neighbors, source-entry links and paginated full neighbor list.                                                                                                             |
| Worlds and stories      | `/labs/world/`: editorial medium-based reading route, collapsed setting spoilers, project catalog, source links.                                                                                                                                                                  |
| Novel coverage          | New NOVELIZED publication entry, publisher citation and legal reading link. No reproduced novel text.                                                                                                                                                                             |
| Favorites and playlists | Article save buttons, `/labs/library/`, custom named lists, reordering, list removal, backup merge/export, cross-tab updates, explicit storage failures. Browser-local only.                                                                                                      |
| Lyrics practice         | Song page: first/last line range, previous/next, timed repetition, kana/romaji/translation controls, learned-line progress. No claim of media synchronization. Existing karaoke/media controls are retained.                                                                      |
| Lyrics reliability      | Typed `lyricsSources` with provider and checked date; JOYSOUND and UtaTen links on the original 不可解 entry; existing media/source links and correction route on song pages. Checking a link does not verify the full transcription or confer redistribution rights.             |
| Submissions/uploads     | `/labs/submit/`: local draft, .md/.txt import, safe Markdown preview, download, GitHub Issue draft handoff for authenticated submission and review. Larger text is downloaded for attachment. Images can be attached on GitHub. No silent publishing or anonymous upload service. |
| Search                  | Existing global full-text/fuzzy CJK search preserved; additional date/type filters and folded name lookup in exploration tools.                                                                                                                                                   |
| External playback       | Existing embedded players and external links retained; source links are also visible in practice.                                                                                                                                                                                 |
| Games/easter eggs       | Existing Memory Corridor and 404 runner retained, plus random discovery entry point.                                                                                                                                                                                              |
| Mobile/navigation/theme | Labs links in desktop/mobile navigation, horizontal section navigation, responsive graph/forms/lists, theme token reuse, reduced-motion support.                                                                                                                                  |

## Content and data rules

- The compact metadata catalog is warmed when LABs opens and shared by all its panels; it is never loaded on the home page by default. Failed requests remain retryable. Lists render at most 40 timeline records or 30 neighbors at once; the graph displays up to 10 neighbors while retaining the complete list.
- Only structured metadata creates relationships; no inferred private relationships or invented fictional canon.
- Undated entries are not assigned guessed dates. Editorial log dates are not event dates. A log becomes a timeline event only when it has explicit `eventDate`; provide an HTTPS `eventSource` alongside it.
- Dates and source pages for the novel, anime, game and concert were checked on 2026-09-05. This is a sourced starter catalog, not a claim of complete event or story coverage.
- Local storage failures are visible. Corrupted saved data is not silently overwritten. Imported library files are size-limited, schema-checked and restricted to internal article paths; labels render as text.
- Draft Markdown uses micromark's safe default HTML/protocol handling. Nothing is sent externally until the user chooses the GitHub handoff and subsequently publishes there.

## Checks

`node --test tests/labs-features.test.mjs` covers invalid dates, precision, CJK search, explicit event dates, graph deduplication, multi-artist credits, unsafe imports, backup merge semantics and storage errors. Run the normal full test, Astro check and build pipeline as well, then verify the actual UI on desktop and mobile.

`promo-app` and `promo-page` are independent legacy local projects and are excluded from this site's TypeScript check; neither is deleted or changed.

## Shared interface

All localized routes share the same navigation, 8px controls, 12px panels, thin borders, and keyboard focus styling. The feature area is now named LABs at `/[locale]/labs/`. Legacy `/beta/` pages redirect to matching LABs pages and preserve query strings and fragments. Local library, submission draft, and practice storage keys are unchanged.

LABs sections are persistent panels with a sliding tab indicator and a brief directional content transition. Same-locale section links switch in place without requesting another page. Each section retains its URL, timeline filters, graph selection, and unsubmitted form state during tab switching. Browser Back/Forward restores the selected section and URL filters. Direct visits, reloads, language changes, and opening links in another tab still use the independent static routes. Arrow keys, Home/End, visible focus, automatic horizontal tab scrolling, and reduced-motion preferences are supported. `tests/labs-navigation.test.mjs` covers route boundaries, shared catalog loading, and recovery after failures.
