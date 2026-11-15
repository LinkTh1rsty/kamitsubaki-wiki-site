---
book: develop
chapter: features
locale: en
order: 5
title: Feature maintenance
summary: Check the activity center, observer dashboard, article reader, and shared editor against current behavior.
---

## Prepare a change

Reproduce the problem and record the URL, language, viewport, theme, and data source. Use task-local origins and data to check lists, details, actions, and state after refresh. Do not test with production accounts or records.

## Activity center

The entry point is `/{locale}/events/`, defaulting to community projects; `?source=official` selects official events. Preserve old entry points. Source, month, view, filters, and selected date are stored in the URL and should survive refresh and sharing.

The calendar uses standard FullCalendar plugins, with Tom Select for regions, Floating UI for popovers, and PhotoSwipe for posters. Check multi-day events, overflow popovers, empty states, and failures. Do not timezone-shift all-day dates, invent an end time, or generate date positioning or individual calendar files for undated events.

Public activities come from `/api/activity-center`. Desktop defaults to a month calendar and phones to a list. Mobile filters retain the same form state. Show complete posters and retain text and details when images fail. Shared text must omit attribution-only entry parameters.

## Observer dashboard and announcements

BaseLayout mounts one ObserverDashboard with overview, announcements, AI, and tools. Support remains a separate entry point. Keep community and official records distinct; impressions and clicks do not establish registrations.

Announcements live in `src/content/announcements`, using translationKey, pinned, autoOpen, and order. Increment `reminderVersion` only when an important revision warrants another reminder. Typo fixes and language switching should not trigger repeated reminders.

Initialize AI on first selection. Preserve drafts and requests when switching sections or closing the panel; cancel old requests and clear the conversation when accounts change. Check Esc, background isolation, restored focus, and ordinary links without JavaScript.

## Article reader

`articleReaderPresentation.mjs` is shared by the client and Pages Function to keep initial and refreshed presentation consistent. author retains the original byline; avatars use existing account mappings. Use the existing icon for missing or unsafe avatars, without guessing identity from a nickname.

Retain titles and prose when refresh fails and offer retry. Avoid duplicate outlines or click handlers. Related entries come from explicit IDs; links in prose do not create that relation.

## Editor and speech blocks

Entries and articles share `prototypes/novel-editor`. Preserve round trips through Insert, properties, source, and preview. Manage speakers while editing a speech block. Avatars, colors, and entity bindings are optional and separate from the document author.

Bulk import presents a preview first. Unlabelled passages stay ordinary prose. Insertion can be undone and should not acquire repeated confirmation steps. Preserve source text, citations, and unknown syntax. See the [Syntax reference](/en/docs/contribute/syntax/) for author instructions.

## Results and limitations

Check loading, empty states, failures, recovery, and mobile focus. Find relevant tests by feature name and run the full gates in [Checks and release](/en/docs/develop/operations/). Local fixtures do not establish provider connectivity, production permissions, or deployment success.
