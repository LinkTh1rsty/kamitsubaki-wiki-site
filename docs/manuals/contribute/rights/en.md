---
book: contribute
chapter: rights
locale: en
order: 9
title: Sources, rights, and languages
summary: Preserve verifiable evidence and image attribution across language versions.
---

## Evidence and sources

Prefer traceable official announcements, work pages, and interviews. Record the title, publisher, date, and accessible URL. Identify secondary compilations as such; do not present a theory as an official fact. Preserve valid existing text when revising an entry, and separate new information clearly. A source supports a claim; it does not automatically establish an article-to-entry relationship.

## Images and permission

Contributors should be able to explain an image's creator, origin, and grounds for use. A gallery set may provide a shared source; override it on an image when that image has a different source. Entry attachments also need attribution. Uploading a file does not transfer copyright to the site or grant permission for unrestricted reuse. Do not upload private personal data or material without a defensible source. Consult the [site license notice](/en/license/) and ask a maintainer when uncertain.

## Language versions

Simplified Chinese, Japanese, and English are maintained separately. Entry translations share a stable ID and structural identity; Taiwanese and Hong Kong Traditional Chinese are generated from Simplified Chinese. Changing only a title while leaving most of the body in another language is not a completed translation. Submit an article in its actual content language. A separate-language article needs its own checked text. Chronicle events and gallery sets follow their structured models: mentioning a character or date in prose does not create a record automatically.

## License decisions and field examples

### Default Rules

- Unless otherwise marked, original text that the site has authority to license is available under [CC BY-NC-SA 4.0 International](https://creativecommons.org/licenses/by-nc-sa/4.0/).
- Images, cover art, lyrics, audio, video, character designs, logos, trademarks, and other third-party material are excluded from the default text license.
- Text from another site or author keeps its original terms. A license marker is not a substitute for permission and cannot legitimize material that the project has no right to use.
- Program source code and repository software files are outside the content CC license. Do not add a repository-root `LICENSE` containing the content license.
- The contribution interface does not obtain a blanket CC grant. Another contributor's text is covered by 4.0 only when the rightsholder separately gives clear permission or the entry records the applicable license.

## Entry License Field

Artist, project, log, song, and album frontmatter can use these `license.code` values:

| `code` | Use |
| --- | --- |
| `CC-BY-NC-SA-4.0` | Original text that the site has authority to license |
| `CC-BY-NC-SA-3.0-CN` | Third-party text, translations, or adaptations under the 3.0 China Mainland license |
| `rights-reserved` | Material for which the original rightsholder reserves rights |
| `authorized-use` | Material used only within a specific authorization |

An unknown `code` fails `pnpm check` or the production build.

### Site-original text

```yaml
license:
  code: "CC-BY-NC-SA-4.0"
  attribution: "Site original author"
```

### Third-party text under an earlier CC license

Copied, translated, rewritten, or merged third-party text under 3.0 CN must retain its original license version and record all attribution fields:

```yaml
license:
  code: "CC-BY-NC-SA-3.0-CN"
  attribution: "Original author and contributors"
  sourceTitle: "Original entry title"
  sourceUrl: "https://example.com/original-entry"
  modifications: "Reorganized and rewritten from the source entry with additional references."
```

For 3.0 CN, supply `attribution`, `sourceTitle`, `sourceUrl`, and `modifications` so reviewers can verify the original license and changes. The current base schema restricts license codes but does not replace human rights review. Translations derived from the same source must retain the marker in every locale file.

### Reserved rights and specific authorization

```yaml
license:
  code: "rights-reserved"
  attribution: "Original author or rightsholder"
  sourceUrl: "https://example.com/original"
  note: "Copyright remains with the original rightsholder."
```

```yaml
license:
  code: "authorized-use"
  attribution: "Rightsholder name"
  note: "Used on this site within the rightsholder's authorization."
```

Use `authorized-use` only when authorization has actually been obtained. A `rights-reserved` marker does not itself give the site permission to copy material.

## Images And Other Media

Entry pages display a shared media exclusion, so do not mark an entire article `rights-reserved` merely because it includes official artwork. Assess text and media separately.

- Prefer official pages, licensed distribution services, or material covered by explicit permission.
- Record media provenance in the entry's sources and explain the source and basis for use in the PR.
- Do not add unknown-origin files, watermark removals, artificial upscales, or material beyond what an encyclopedia description needs.
- Add full lyrics only when a source clearly permits republication or the project has specific permission.

## Check each gallery photo

[Direct photo uploads](/en/gallery/manage/photos/) need a **creator, verifiable source and basis for use** even when the person and image type are unknown. Shared batch details can be overridden per image. Official public material needs the original page URL; authorized use needs an explanation of the permission. Images discovered in existing entries or articles enter a private review queue first. Finding a file on the site does not automatically publish it in the image archive.

## Review Checklist

- Is the text original, specifically authorized, or governed by a third-party license?
- Does the marker preserve the source license and exact version?
- Are the source page, attribution, and changes recorded?
- Could images, lyrics, or embedded media be mistaken for default CC-licensed text?
- Do all three locales use consistent provenance and license logic?
- Do `pnpm test`, `pnpm check`, and `pnpm build` pass?

## Three upload usage bases

| Choice | Details needed |
| --- | --- |
| Official public material | Original creator or official credit, actual publisher/work and original release page URL |
| Your original work | Confirm you are the original creator; give accurate credit and source name, optionally your original release page |
| Authorized use | Original creator/source plus permission scope, date or verifiable evidence |

The basis for use starts blank. Channel suggestions are not permission verification, and an official release is not a blanket reuse license. Shared details apply to the batch; photos with different credits or terms need individual details. Keep uncertain material in a private draft while checking the source. Reviewers can return each image for more information.
