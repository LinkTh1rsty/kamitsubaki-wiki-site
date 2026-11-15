---
locale: "en"
translationKey: "2026-09-30-v3-0-0"
date: "2026.09.30"
type: "SITE UPDATE"
title: "V3.0.0: The image archive, timeline and contribution experience"
summary: "Introducing the image archive and contributor timeline, with a shared image library, clearer review workflows, safer drafts and consistent interfaces."
order: -8
pinned: false
draft: false
autoOpen: true
---
Hello, observers.

**V3.0.0 adds two collections we can build together: the KAMITSUBAKI image archive and the timeline.** Photos can be added and classified one at a time; events can be submitted and revised on the site. Site announcements now have a browsable history of their own.

## 01 · The KAMITSUBAKI image archive

The [image archive](/en/gallery/) opens on a grid of public photos. Filter by person or group, image type, tag, or design set. Galleries on person and group entries collect their related photos; the same photo can appear in more than one gallery.

“Design image” is now an image type, while a design set holds material that belongs together. Photos can also stand alone. Select a photo to see it clearly, move between neighboring images, read its source and credit details, or download it. Images used elsewhere on the site have been added to the archive; some older images still need fuller creator credits or usage information, and their status is indicated.

## 02 · Upload photos, then classify them

[Contribute images](/en/gallery/manage/) offers two paths: **upload photos directly** or **create a design set**. You can upload a batch, enter shared creator, source, and usage details, then override them for individual photos. Choosing a person or image type is optional at upload.

If a public photo needs better organization, signed-in contributors can suggest links to one or more people, an image type, tags, or a design set. Suggestions go through review while the existing public photo remains visible. Check the result in the [Creator Center](/en/account/creator/).

## 03 · A timeline you can move and contribute to

The [KAMITSUBAKI timeline](/en/chronicle/) uses horizontal tracks and event blocks. Drag to move through time, zoom in on crowded periods, or switch to a list ordered by date. The width of a continuing event reflects its actual duration; dates known only to a year or month show an uncertain range.

Signed-in contributors can [add an event or revise one](/en/chronicle/submit/). Enter its date precision, category, related entries, and verifiable sources; preview it, then save a draft or submit it for review. You can start in Chinese, Japanese, or English. When a translation is missing, the original language is identified. Approved changes appear when the corresponding site version is published.

## 04 · Site timeline and announcement history

The [site timeline](/en/chronicle/?scope=site) gives each site announcement an update event. Drag through the history and select an event to open it in the new [announcement reader](/en/announcements/), where previous notices remain available.

## 05 · Where to contribute

- **Wiki entries**: use the [site editor](/en/contribute/editor/). Submission creates a GitHub PR for review; changes appear after merging and deploying the site.
- **Images**: upload and select files in the [image library](/en/media/). Files are stored by the site's image hosting service and can illustrate entries or be submitted to the public archive with supporting details. Uploading a file does not publish it in the archive.
- **Archive photos and sets**: use [photo contributions](/en/gallery/manage/) to provide sources, credits and classification, then submit for review. Public images can receive classification suggestions.
- **Articles**: the [article editor](/en/articles/submit/) continues to use cloud drafts and site moderation, separately from wiki PRs.

## 06 · Drafts and review actions

The [Creator Center](/en/account/creator/) brings together progress, reviewer feedback and available actions. Revise, withdraw and delete controls depend on the contribution's current state and appear in consistent locations.

Article drafts now check their cloud version. If another tab or device saves a newer version, the editor preserves local edits and reports the conflict instead of silently overwriting it. Login return paths, account switching and API error messages have also been corrected.

[My Space](/en/account/) and the Creator Center distinguish local drafts, saved drafts, items needing attention, reviews in progress, items awaiting site publication, and public work. The [documentation center](/en/docs/) explains both the on-site editor and GitHub paths, including preparation, saving, submission, review, and common problems.

## 07 · A more compact, consistent interface

Archive search and filters can collapse; mobile filters share one panel. Active conditions can be removed directly and remain consistent when navigating back. The people and groups section initially shows 8 entries, using shared expansion controls and animation.

Selection actions and popovers in the editor have been refined. Moderation uses a queue beside the selected record; content management offers a denser card layout. Account information is consolidated under Site accounts. Logs, record identifiers, times and diffs use JetBrains Mono, while prose retains its reading fonts.

The public archive now uses a version-checked cache. Refreshing or reopening the archive after approval retrieves the latest public content. Private drafts and review states are excluded from this cache.

When reporting a problem, please include the page URL, steps and the message shown.
