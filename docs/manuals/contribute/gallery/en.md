---
book: contribute
chapter: gallery
locale: en
order: 6
title: Contribute photos, design sets and classifications
summary: Upload photos without a category, build a design set, or suggest changes to a published photo.
---

> This flow becomes available with the updated upload workspace and article editor. Maintainers must apply the matching incremental backend database migrations before releasing the frontend and this guide. A completed private upload is still private; explicit submission and approval are required.

## Choose a task

The [image archive](/en/gallery/) includes every approved public photo, including photos awaiting classification. Start at the [upload workspace](/en/gallery/manage/):

| Your task | Where to start | What readers see after approval |
| --- | --- | --- |
| Upload photos whose person, type or set is unknown | [Upload photos](/en/gallery/manage/photos/) | Each approved image appears in All photos; a blank type also appears under Unclassified |
| Submit a coherent group with a cover and sequence | [Create a design set](/en/gallery/manage/?mode=sets) | Photos appear both in the grid and in the ordered set |
| Add people, types, tags or an existing set to public photos | Open a photo or select several and [suggest classification](/en/gallery/classify/) | The public version stays visible until each suggestion passes review |

**Setting art is an image type; it does not require a set.** One stored photo can be linked to several people or groups and appear in each album. Do not upload duplicate files to achieve this.

## Upload photos directly

1. Sign in, open [Upload photos](/en/gallery/manage/photos/), then select or drop files. Supported formats are PNG, JPEG, WebP and GIF. A batch holds up to 100 images, with a 20 MiB limit per image. People and image type are optional.
2. Enter the shared **creator, verifiable source, original source URL and basis for use**. Choose official public material, your original work or authorized use. Official material requires the original page URL; authorized material requires an explanation. Select a thumbnail to edit the actual photo’s details when its source or creator differs. Close the inspector to return to the same place in the grid.
3. Choosing files creates a batch draft and starts private staging automatically. You can enter details during upload. Save draft manually syncs your changes; Stage photos privately retries unfinished files. A transfer reaching 100% only means the bytes arrived; wait for the server’s Staged result. `?batch=ID` can restore a cloud batch, though a file saved only in this browser may need to be selected again.
4. Once every file is staged, separately submit the batch for review. Follow its receipt in [Creator Center](/en/account/creator/). Reviewers accept or return each image; only accepted photos join the public archive.

If a photo is returned, open the batch in Creator Center, read its individual reason, and choose Revise. Only returned photos and their private originals are copied into a new draft. Approved siblings do not need another submission, and the copied files do not use the daily new-upload quota. Correct the creator, source or description and resubmit. If a private original is no longer available, select the file again as the page instructs.

**Example:** Three concert photos share one official announcement. Enter the announcement and creator once. If the second photo has a different photographer, override only that photo’s creator. You may leave people and type blank and suggest them after publication.

## Suggest a classification

Open a photo in the [gallery](/en/gallery/) and choose “Classify this photo,” or use Select photos to submit a batch. Link one or more people or groups, choose from setting art, portrait, cover art, promotional image or live/event, add tags, and optionally choose an existing design set. Batch suggestions add links and tags to each selected photo; check that the shared changes fit every image.

You can choose Setting art without creating a set. A classification suggestion never replaces the file, creator or source. During review, readers continue to see the previous public details. If another change updates the photo or set first, a version conflict leaves the suggestion pending so you can compare the latest version and submit a corrected proposal. Reviewers can merge synonymous tags; old tag searches still resolve to the approved label. Person and group albums update only from approved links.

## Create a set

From the [gallery](/en/gallery/), open the [upload workspace](/en/gallery/manage/) and sign in. Create one set for one group of images. You can add files first. **Choose a character and complete creator, source and basis for use before submitting for review.** Set name, form, date, tags, publisher and notes can be added later. Shared information is entered once for the set. Create another set for a different group: there is no need to add images to a global queue and move them afterward.

The workspace shows the **character / form** where the set will appear. Choose a form already used for that character, enter a new name for review, or leave it blank for **Unclassified**. One form may contain multiple sets; similar names are never merged automatically. The public gallery opens in the all-photos grid. Switch to Design sets to filter by character and form, with one cover card per set. Open a set to browse its published images in order. The selected cover and image order are retained. Maintainers can standardize a form name by editing the whole set in content management.

## Add photos to that set

Use Add photos to this set, select multiple files, or drop/paste into that set. PNG, JPEG, WebP, and GIF are supported. One batch holds up to 100 images, **20 MiB per image**. Each image row displays a thumbnail, file size, format, resolution, and upload state. Reorder images, select a cover, and add an individual title, description, or source. An empty image source inherits the set source. Verify the character and set for each image before uploading.

## Upload and stage

Choosing files starts private staging with up to three simultaneous transfers. Upload all photos manually continues or retries unfinished files. The percentage represents bytes transmitted; after 100%, wait for server validation and the **Staged** response. Retry a failed file individually. Retrying a batch does not resend already staged files. The interface reads the remaining daily quota from the server. A standard account defaults to 100 new images per day, subject to the current configuration, resetting at 00:00 UTC. Updating an existing image without replacing its file does not count as a new upload.

## Submit, restore, and revise

After checking every set and image, separately use **Submit all sets for review**. Staged files are private and unavailable through the public gallery or image URL. A successful submission returns a receipt and batch ID; follow it in [Creator Center](/en/account/creator/). Unsubmitted batches are retained for 30 days, with an expiry time in the workspace. The current account's browser stores the queue. If it warns that files were not backed up, reselect files that were not staged. A `?batch=` link restores a cloud batch. Changes to a public set require review; the original public version remains visible, and a partially returned set can be corrected image by image.

## Example: two sets in one batch

For three images of Character A's default outfit and three of a stage outfit, create **two sets**, select the same character in each, and give each set its own name. Add the three files inside each set. Put a shared source on the set; override one image's source if it came from a different official page. This keeps set identity and image-level review clear.

File size is the original file size; resolution is decoded pixel width and height. Preview scaling does not alter the original. Check order and cover before submission; title and description can be added later. Adding a file starts private staging; 100% transfer is neither server confirmation nor approval. Wait for each file's server-confirmed **Staged** status, then submit the **set batch** for review.

## Connection failures and quota

Do not create repeated batches after a connection error. Inspect individual file states, retry failures, and check the `?batch=` link and Creator Center for an existing record. A staged file should not consume quota again. If the browser says a queued file was not backed up locally, reselect the original during recovery. Daily remaining quota comes from the server; it is not a fixed per-set capacity.

## After partial approval

Open the batch detail and separate shared-metadata review from each image result. A set stays private if shared metadata fails or no image is approved. With partial approval, only approved images appear publicly. Correct the returned image's title, description, source, or file as requested; do not reupload approved originals. A public set retains its old public version while a change awaits review.

## Standards for sources and classification

| Field | Consistent format | If unsure |
| --- | --- | --- |
| Creator | Original illustrator, photographer or official credit; not the uploader by default | Check the original release; keep a draft if unverified |
| Source name | Start with a suggested channel, then add the actual account or work, e.g. “KAF official X · release post” | Keep the actual verifiable name; do not guess |
| Original URL | Specific original post, work page or creator page | Avoid reposts, search results and cached images |
| Basis for use | Explicitly choose official material, your own work or authorized use | Describe the scope and evidence of authorization; do not submit before checking |
| People and type | Choose existing stable candidates; tags do not replace entity links | Standalone photos may remain unclassified; sets need a person before submission |
| Form and tags | Prefer existing names; preserve original terminology and source for new names | Reviewers reconcile synonyms |

Source-channel suggestions only standardize wording. They do not fill a creator, source URL or permission declaration. Public access alone is not permission to repost. See [Sources and basis for use](/en/docs/contribute/rights/).

## Save and upload states

Local saved means this device retains a draft; cloud saved means the server confirmed that version. Each photo moves through queued, uploading, server-confirmed private staging, pending review and public. Retry a failed photo; successful files do not upload again. Thumbnails show the state; select one to edit only that photo, then close the inspector to return to the grid.

A cloud version conflict pauses syncing when another window changes the same draft. Both versions are kept. Compare them, then keep and sync your local changes or load the cloud version. Do not repeatedly submit around a conflict. Offline edits remain local; reconnect to continue syncing and staging. Before moving to another device, confirm the cloud save and open the same batch link or Creator Center record.
