---
book: contribute
chapter: article
locale: en
order: 5
title: Submit and revise articles
summary: Write with the shared editor, save a cloud draft, and submit for publication review.
---

> This flow becomes available with the updated upload workspace and article editor. Maintainers must apply the matching incremental backend migrations before releasing the frontend and this guide. A completed private upload is still private; explicit submission and approval are required.

## Create or revise

Open [Articles](/en/articles/) and its [submission page](/en/articles/submit/). To revise a public article, use its reading page's revision action and compare with the current public version. Articles share the entry body editor, but **articles do not create GitHub PRs**. The site shows cloud drafts, proposals, and public versions as distinct states.

The article reader shows its revision action only to people with edit permission. Other readers see Write an article, which starts a new submission and does not change the article being read.

## Complete and save a draft

Choose a title, content language, category, and body. Summary and linked entries are optional. An article may stand alone or explicitly link to several entries. Select the correct stable IDs for links; a WikiLink or ordinary body link does not automatically create a related-article relationship. Use formatting tools or source mode and preview the title, body, image URLs, and outline. Use Insert image to search the public gallery or upload a new image to private article staging. Add alt text, caption, creator, source and basis for use. Existing Markdown image syntax remains supported.

The browser retains local editing state. After sign-in, changes automatically save to the cloud after a short pause. Local and cloud save states are shown separately; Save draft still syncs manually. Offline changes stay locally and retry when the connection returns. Check the cloud save indicator before leaving. On another device, sign in to the same account and open the draft in Creator Center. Title and body must be ready before submission. Follow validation errors to the affected field or section.

## Submit and follow review

Use Submit for review, wait for the receipt, then open the record in [Creator Center](/en/account/creator/). A pending or returned revision does not replace the existing public article. Publication follows maintainer approval in the article's content language. If returned, read the note, edit, and resubmit. On a version conflict, compare your draft with the newer public version instead of silently overwriting another approved revision.

## Worked editing example

For a standalone research article, choose its actual writing language and category, enter title, summary, and body, and **leave linked entries empty**. If the article discusses two tracks, explicitly select both stable IDs in Properties. A `[[WikiLink]]` in the body gives readers a link but does not put the article in either track's related-articles list. Save a draft, refresh, confirm the cloud version in Creator Center, and then submit.

The article and entry share the visual body editor. Title and category live in Properties; article source mode handles the body only. Use the outline to move around long text and preview headings, links, and images. Public gallery selections reuse existing media. New images are staged privately and inserted as stable references after server confirmation. Approval and successful image publication produce valid links in the public article. Private previews are limited to the author and reviewers. Never save a local `blob:` preview URL as article content.

## Revising a public article

A revision starts from the approved version. Pending changes are visible to the author and reviewer; readers continue to see the old public version. If another revision is approved first, compare against the newer version and resubmit instead of overwriting it. Read a return note on the existing record and correct that document rather than creating a duplicate title.

## Before publication

Check title, body, category, summary, image URLs and grounds for use, and all selected entry IDs. Follow the receipt to the review record. Publication is complete only when the new version opens in the public reader.

## Two windows and image publication failures

If another window saves the same draft, automatic syncing pauses and shows a local/cloud comparison. Save your local content as another proposal or load the cloud version; a local backup is kept before loading. Do not bypass conflicts with repeated clicks. New photos with unfinished source or permission information can stay in a private draft, but must be completed before submission. If image publication fails, the article does not switch to a public version containing broken new image references. Check the review record before a maintainer retries publication.

Choosing a new image starts private staging. Details and retry recovery for images not yet inserted into the body stay on the current device. Before switching devices, complete the details, insert the image and confirm the cloud save. Public gallery selections let you edit alt text and captions while retaining the reviewed source and basis for use.
