---
book: contribute
chapter: entry
locale: en
order: 2
title: Edit and create encyclopedia entries
summary: Open the right source, complete properties and evidence, then submit a GitHub PR.
---

## Open the right entry

For a correction, open the entry in the intended content language and use its reader edit action; the editor receives the real source path. To create a record, open the [entry editor](/en/contribute/editor/) from [Contribute](/en/contribute/), then choose New entry from the top File menu. Select the entity type and source language. Simplified Chinese, Japanese, and English are maintained sources; Taiwanese and Hong Kong Traditional Chinese are generated from Simplified Chinese.

“Improve this entry,” the stub notice, and the missing-detail list in the reader open that same entry in the editor; they are not separate submission routes. You can also start a new record from the [encyclopedia directory](/en/database/). Clear filters and check aliases before creating one, since an empty search result does not prove the record is absent.

## Find missing details

The [contribution board](/en/contribute/missing/) lists entries with missing structured fields. Search names or aliases, combine entry-type and field filters, or start with a Sources, Credits or Image chip. It displays 24 entries at a time and preserves filters in the URL. **Add details** opens the actual source file. For a translation gap, check the displayed source language before using the multilingual translation workflow.

The board and reader share metadata coverage rules. Placeholder artwork does not count as an image; concerts check setlists, while exhibitions do not require them. Coverage measures filled fields; facts and sources still need verification. The public board updates after review, merge and site publication.

## Write content and properties

Keep the [complete content and style guide](/en/docs/contribute/format/) open while writing. It preserves the detailed rules for structure, names, prose, sources, dates, media, privacy, multilingual content, recommended entry outlines, and the final checklist. Use the [complete syntax and properties guide](/en/docs/contribute/syntax/) for Markdown, frontmatter, media syntax, and field examples. These are full references, not abbreviated by this chapter.

Search aliases first to avoid duplicate entities. A new stable ID uses lowercase Latin letters, digits, and hyphens and remains the same across languages; display names may differ. Complete the editor's required properties for the chosen type before writing prose. Cover, relationships, performers, and credits belong in Entry properties. A page URL is not a repository file path. A placeholder still needs verified facts and sources; do not fill gaps by guessing.

Use the side-by-side preview and outline to inspect sections and anchors. Insert content with the button or `/` menu; source mode preserves extended syntax. When editing an existing entry, keep valid facts, citations, and unfamiliar markup. Review the diff, image rendering, relationships, and sources before submission.

## Images and attachments

Entry text is reviewed through **GitHub PRs**; new entry images are reviewed through the **site image library**, with separate submission records.

1. Open the editor’s image library or the [image library page](/en/media/). Published images can be reused directly.
2. For new images, choose Inline images, add the creator, source and basis for use, then upload and submit for review. PNG/JPEG/WebP/GIF are supported, up to 100 files and 20 MiB per file. Staging is not publication.
3. Track per-image feedback in [Creator Center](/en/account/creator/). Revise returned images without re-uploading staged files. After approval, insert the image in the entry or use it as a cover.
4. Entry Markdown references the public image URL. Submitting the text PR does not upload that image again; text still requires review, merge and deployment.

Unfinished library uploads are saved locally per account and can be explicitly restored after reloading. Keep the page open if local saving fails. Legacy draft attachments remain compatible; existing /images/ references need no changes.

## Check and submit

Complete required fields, evidence, preview, relationships, language, and a change explanation. When signed in and the service is available, use **Submit via GitHub PR** and keep the receipt. If submission is marked unavailable, save or export the draft rather than assuming local storage sent it. Review, GitHub merge, and site deployment must all finish before the public entry changes. See [Review and revision](/en/docs/contribute/review/) for returned proposals.

## How metadata affects the site

The former contribution guide's field map still applies in V3. `schemaVersion: 2` is the **metadata protocol**, not the site release number. Choose the entity type in the editor, then supply fields supported by that type; prose alone does not create structured relationships.

| Field | Site behavior | Check before submission |
| --- | --- | --- |
| `id`, `locale`, `entityType` | Identity, language, and canonical route | Reuse the same ID across source languages; never reuse another entity's ID. |
| `name` or `title` | Heading and directory label | Use a verifiable official name and identify translated names separately. |
| `presentation.image`, `presentation.theme` | Cover, reader background, and local theme | Verify the image URL resolves; color is not evidence. |
| `presentation.morphing` | Image-and-name form selector | Use only for real, separate records in one lineage. |
| `classification.primary`, `classification.additional` | Canonical category and extra discovery paths | Extra categories must not duplicate the article body. |
| `relations`, `performers`, `credits` | Related records and reverse credits | Use stable target IDs and the correct relationship type. |
| `sources`, `license` | Evidence and text license | A text license does not grant rights to media. |
| `contentStatus`, `lifecycle` | Stub/publication and activity state | Leave uncertain dates unknown rather than guessing. |

Use the [classification maintenance guide](/en/docs/develop/content/) and current category data. An entity may have several category entrances but only one canonical entry per language. A new unit member needs a real unit record and `member-of` relationship; membership does not automatically put the person into the individual tier. Use `performers` for track performers and `credits` for production roles. Changing a canonical category or source path needs a redirect review, not just a file move.

## Originals that exceed the in-site attachment limit

Use the [image library](/en/media/) for new images. If a file exceeds 20 MiB, contact a maintainer before proceeding instead of adding the large binary to the text PR. Manual GitHub contributions remain supported: reference approved public image URLs in Markdown and preserve attribution and permission details. Existing repository public/images/ files keep their /images/ URLs; this workflow does not require moving or deleting them.

## Final submission checklist

- Search aliases and other language versions; compare the primary category with the detailed map.
- Verify factual claims, dates, quotes, and images against traceable sources; mark uncertainty explicitly.
- Preserve correct old prose, unfamiliar syntax, and citations; inspect the diff for accidental removal.
- Preview headings, anchors, image URLs, target IDs, and multilingual identity.
- Keep the receipt ID. If none appears, check Creator Center before opening another PR.
