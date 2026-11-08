---
locale: en
translationKey: edit-guide
title: Leave what you know for the next KAMITSUBAKI fan.
intro: "A corrected word, a reliable source, a more accurate translation: each makes the next visit a little better. Start with one small change to an article you know."
ui:
  eyebrow: Written together
  start: Make your first edit
  openEditor: Open the editor
  back: Back to home
  choose: Choose one small contribution
  chooseHint: Pick a direction you know, then follow the six steps. Times are approximate; save a draft and return whenever you need.
  route: Your starting point
  journey: Your first contribution, in six steps
  journeyHint: Open a step and try it. Completion marks are your own checklist; they never submit an edit.
  progress: Learning progress
  continue: Continue to the next step
  complete: I have completed this step
  completed: Completed · undo
  reset: Reset progress
  resetConfirm: Reset this guide’s learning progress? Your editor draft will not change.
  storage: Progress stays in this browser. Clearing browser data removes it.
  storageFailed: Progress could not be saved. You can still continue this visit.
  allDone: All six steps complete. Check your PR for results and reviewer feedback.
  target: The file you are editing
  targetHint: The article source path is included. Check its title and language after loading.
  unsupported: Edit this file on GitHub. The editor supports artists, songs, albums, projects and event records.
  invalidTarget: This file path is not recognized. Return through the article’s Edit source link, or search inside the editor.
  github: Edit this file on GitHub
  mapTitle: Find your way around the editor
  mapHint: These are the controls in the current article editor. Write beside the preview on desktop; switch panels as needed on smaller screens.
  workshops: Learn more when your edit needs it
  workshopsHint: New articles, translations and lyrics have different checks. You do not have to learn them all at once.
  reference: Look up as you work
  syntax: Syntax and properties
  syntaxHint: Headings, tables, media, ruby, lyric timing and fields for each article type.
  format: Content and style
  formatHint: Sources, neutral writing, names, dates, attribution and language conventions.
  review: One last check before review
  pr: A PR description you can fill in
  prHint: Replace the bracketed prompts with your actual work. Only claim checks you performed.
  copy: Copy PR template
  copied: Copied
  copyFailed: Could not copy automatically. Select and copy the text below.
  faq: If you get stuck
  finish: Next time, you can start with the article.
  finishBody: Bookmark this guide. Make a change you can verify, and describe anything unclear in your PR. Your sources and explanations also help the next editor.
  issues: Report a problem first
  issuesHint: Not ready to edit? Open a repository issue with the article URL, the specific error and a supporting source. Search existing issues first.
  guide: Contribution guide
  example: Browse the song directory
  taskAction: See the relevant steps
tasks:
  - id: fix
    title: Correct some text
    time: About 5–10 min
    description: Fix a typo, broken link or unclear sentence in an article you know.
    next: Read the original first and change only what is needed. A factual correction also needs a source.
  - id: source
    title: Add a source
    time: About 10–20 min
    description: Make a date, credit or event detail verifiable.
    next: Find the passage on an official release page or announcement that supports the claim, then link it.
  - id: translate
    title: Improve a translation
    time: About 15–30 min
    description: Refine a name, phrase or meaning without translating a whole article.
    next: Load the existing language file and compare it with the original. Keep the shared entry key.
  - id: new-entry
    title: Develop an article
    time: Across several sessions
    description: Bring official sources; expanding an existing article is a good first step too.
    next: Search for duplicates, then read the new-article workshop. Gather facts before creating sections.
map:
  - title: Left · Find your place
    body: Articles searches titles and paths. Outline jumps to headings. Properties holds article type, language and details.
  - title: Center · Write
    body: Edit text directly. Select words for formatting; press / in an empty paragraph or choose Insert content for blocks.
  - title: Right · Preview and adjust
    body: Preview shows the result. Select a block and use Properties to adjust images, tables or lyrics.
  - title: Bottom and top right · Check and export
    body: Check autosave and Before you export at the bottom. Export Markdown copies the full file or downloads a .md draft.
lessons:
  - id: choose
    title: Choose one change
    summary: Set a small goal and find evidence for it.
    body: |-
      Read the relevant paragraph in an artist, song, album, project or event article. Describe your proposed change in one sentence.

      A typo, an official link or a sourced date is a good first contribution. A complete rewrite or a synchronized lyric timeline can wait. Replacing “recently released” with a confirmed release date needs the actual announcement; a punctuation fix does not need an unrelated citation.

      If you have no article in mind, browse the song directory. You can also report a specific problem through Issues at the bottom of this page.
    checkpoint: You can describe the change in one sentence and support any factual change with a source.
  - id: load
    title: Load the existing article
    summary: Keep its original details and content.
    body: |-
      1. Select **Edit source** on an article. This guide will show its file path above.
      2. Choose **Open the editor** to load supported article types. If there is an existing draft, back it up before agreeing to replace it.
      3. Alternatively, choose **Edit existing article** in the editor, search by title or path, then **Load original**.
      4. Check the title, content and language: `zh.md`, `ja.md` and `en.md` mean Simplified Chinese, Japanese and English.

      If loading fails, retry or get the complete Raw file from GitHub. **Import source** accepts pasted source or a .md file up to 1 MB. Include the information between both `---` lines.

      Guides, announcements and homepage copy are outside the editor’s five supported collections. Use the GitHub link for those files.
    checkpoint: The editor contains the correct article and language, not a blank replacement for an existing file.
  - id: write
    title: Make the edit visually
    summary: Use familiar text tools; insert other content when needed.
    body: |-
      Click a paragraph and type. Body headings start at level 2; the page title has its own field.

      | Your goal | Control |
      | --- | --- |
      | Bold, italic or a link | Select text and use the top or floating toolbar |
      | Highlight, ruby or a spoiler | Use the corresponding toolbar item and fill any requested details |
      | Heading, list, image or table | Press `/` in an empty paragraph, or choose Insert content |
      | Adjust a block | Select it and open its Properties |
      | Reorder content | Use the block’s move up/down controls or drag handle |
      | Find text or a chapter | Use Find in document or Outline |
      | Change title, date or other details | Article details in the left Properties panel |

      Try adding a source: select the words “official announcement”, choose **Add link**, enter the real URL and apply it. Check the result in Preview.

      A **Preserved source** block contains complex markup. Keep it unless you need to edit that section. Use Source and the syntax reference for a narrow change; fix any YAML parsing error before returning to Visual. Do not delete unknown details to dismiss an error.
    checkpoint: Preview shows only the intended change, with the heading structure and complex content intact.
  - id: sources
    title: Keep the evidence beside the fact
    summary: Make it possible for another reader to verify your work.
    body: |-
      Use official work pages, announcements, published interviews or publications for dates, credits and event details. Link the specific page supporting the nearby sentence, not just a homepage.

      Keep opinions attributed: “I love this song” does not support “critically acclaimed.” Search snippets, AI answers and fan speculation are not substitutes for sources.

      - Check names and dates against the source.
      - Check image sources and permission, and preserve existing license fields. An image URL in the editor **does not upload an image file**.
      - Preserve the original, translator credits and attribution for quotes, translations and lyrics.
      - Leave uncertain facts out and explain missing evidence in the PR.

      AI may help clarify writing, organize sources you supply or explain an error. You still need to verify each claim; do not ask it to invent credits, interpretations or lyric timings.
    checkpoint: Every new factual claim has direct support, and attribution and license details remain intact.
  - id: review
    title: Preview, check and export
    summary: A browser draft has not been submitted to the site.
    body: |-
      1. Read **Preview** from beginning to end. Check headings, links, captions, tables and disclosures. On smaller screens, use the bottom Preview control.
      2. Open **Before you export** and complete required fields. Field validation cannot determine factual accuracy.
      3. Check the autosave status. A draft saved in this browser is not synced to other devices; download important work.
      4. Choose **Export Markdown → Copy complete Markdown** or **Download .md**. The export includes the article details at the top.
      5. With a valid path, the same menu provides **Open file location on GitHub**. Paste the complete file into the correct editor, preserving its metadata.

      Review **Preview / Changes** or the diff on GitHub. GitHub may not render this site’s ruby, media or lyric syntax; use the site preview for those and let the build checks verify the final file.

      You can download an unfinished draft and return later. Do not invent required information just to clear a warning.
    checkpoint: You have a backup, the complete metadata, and a diff containing only your intended changes.
  - id: submit
    title: Send the change for review
    summary: A Commit saves work; a Pull Request asks for review.
    body: |-
      **New to GitHub?** [Create an account](https://github.com/signup) and verify your email when you are ready to submit. A free account is sufficient for public contributions; you can practice in the editor first.

      1. Without write access, GitHub guides you to a **Fork**, a copy under your account.
      2. Paste and inspect the change, then choose **Commit changes… / Propose changes**. Write a short description of the actual edit. A Commit is a saved change, not the PR itself.
      3. Continue to **Compare & pull request / Create pull request**. The base repository should be `LinkTh1rsty/kamitsubaki-wiki-site`, using the development branch currently designated by the maintainers; the comparison comes from your edited branch.
      4. Add a clear title and describe changes, sources and checks with the template below. Create the PR. A numbered Pull Request page confirms it has been submitted.

      Checks run automatically. Wait while they run; open the error details if they fail. Passing checks still leaves human review. If a reviewer requests changes, edit the **same branch in your Fork** and Commit again; the existing PR updates automatically.

      Merge adds the change to the main branch; the live site still needs a successful deployment. PRs and commits retain contribution history, while on-site contributor information may update later.

      Button wording may change. See GitHub’s [web editing guide](https://docs.github.com/en/repositories/working-with-files/managing-files/editing-files) and [PRs from a Fork](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-a-pull-request-from-a-fork).
    checkpoint: You have a numbered PR with a clear explanation and sources, and know where to read feedback.
workshops:
  - id: new-entry
    title: Create a song, album or another article
    summary: Search first, then prepare the evidence and location.
    body: |-
      Search titles and aliases on the site and in the editor. Expand an existing article if possible. For a missing entry, use **New article** at the top of Outline, then select type and language in Properties. Download any draft before replacing it.

      Required fields differ across the five types; use Before you export. Set the title and entry key, gather sources, then add sections with actual content rather than empty headings.

      - Songs use `src/content/songs/<primary performer or collaborations>/<id>/<locale>.md`, derived from `performers`.
      - Releases use `src/content/releases/<releaseType category>/<id>/<locale>.md`.
      - People, units and projects derive their paths from entity type and the approved classification map. Do not copy retired `artists/` or `albums/` templates or guess a directory.

      These names are examples; replace them with real IDs before submitting. Verify song artist, category and credits; verify album release details, track order and song references. Upload repository images separately and use the corresponding URL.

      Expand GitHub file path (optional) in the left Properties panel and enter the full path, including the language filename. The export menu can then open GitHub’s new-file location; entering the path alone does not create a file.

      Language files share one stable `id` and consistent entity/relationship fields. Prepare `zh.md`, `ja.md` and `en.md`; if a version needs help, explain that in the PR instead of presenting untranslated text as complete. Let the editor derive an uncertain path from metadata or consult the content directory guide.
  - id: translation
    title: Translations and Traditional Chinese
    summary: Keep identity, meaning and attribution aligned.
    body: |-
      Load the existing target-language file and compare it with the original. The language selector **does not translate the text**. Do not change only the locale and overwrite another version.

      Keep the same stable `id`, `entityType` and relationship identities across versions, with consistent dates and catalog numbers. Prefer official names and explain uncertain translations in your PR.

      Traditional Chinese is generated from Simplified Chinese. Edit `zh.md`, not generated `zh-tw.md` or `zh-hk.md`. For regional wording, consult the conversion section of the syntax reference or **Chinese variant wording** in the toolbar’s “···” menu.

      Preserve original lyrics, translator credits and license details. Improving one phrase is enough for a first edit.
  - id: lyrics
    title: Lyrics, ruby and practice mode
    summary: Align one line before adding a timeline.
    body: |-
      Insert **Bilingual lyrics** and use Properties for the original, kana, romaji and translation. Preview a single line first, then continue. Ruby text can annotate words in ordinary prose.

      For synchronized lyrics, listen to the matching recording and enter the line’s start time, such as `00:03.50`. Add timed units only when you can verify each timestamp. Times must increase and translations must match the original lines. Without accurate timings, leave them blank for untimed lyrics; never divide the duration evenly or ask AI to guess.

      Reader practice can switch kana, romaji and translations and step through lines. Correct source structure makes those views work. After merge, check the reader and audio synchronization too; an editor preview is not full playback verification.

      Complex lyric HTML is preserved. Back it up before a source edit and follow the synchronized lyric reference without removing credits or copyright notes.
  - id: advanced
    title: Source, media and local development
    summary: Go further only when your change needs it.
    body: |-
      Source contains a complete Markdown file: YAML information between the two `---` lines, then the body. Keep unknown fields and preserved complex markup intact.

      Use Media or Media switcher with real links from supported platforms. Adding an image URL does not upload a file. Insert content also offers tables, disclosures, code and equations; consult the reference when needed.

      Experienced Git users can Fork, create a branch and edit locally. Follow the repository README for setup, then run `pnpm check`, `pnpm test` and `pnpm build`, and inspect the actual page. Browser contributors do not need these tools; report honestly which checks you performed.

      Edit the guides themselves through their GitHub source link, preserving YAML and updating the relevant language editions.
checklist:
  - Correct article, language and scope
  - Sources and working links; credits and licenses intact
  - Preview checked; original fields and complex content preserved
  - Draft backed up and GitHub diff reviewed
  - PR describes actual checks and unresolved questions
prTemplate: |-
  ## Changes
  [Which article and passage changed, and why]

  ## Sources
  [Direct supporting URLs; explain if this is only a typo fix]

  ## Language and checks
  - Language: [zh / ja / en]
  - Checked: [Preview, links, or other checks actually performed]
  - Help needed: [None, or remaining questions and checks not run]
faqs:
  - question: What can I do without a GitHub account?
    answer: You can sign in to the Wiki with Google and submit existing-article edits in-site. A GitHub account is needed only for the direct GitHub workflow. You can also edit and download a local draft without signing in.
  - question: My draft is saved. Why has the website not changed?
    answer: Saving a draft does not publish it. Submit for review in-site, or create a PR through GitHub. Both require review, merge and deployment. Browser drafts stay on this device; cloud drafts are saved manually in the submission panel.
  - question: I cannot find or load the file.
    answer: Check the language and path, then search Edit existing article. You can import the complete Raw file from GitHub. Guides, announcements and homepage copy must be edited on GitHub. Back up your current draft before retrying.
  - question: Checks failed or a reviewer requested changes.
    answer: Read the specific error or comment and address the first issue. Commit changes to the existing PR’s branch. If unclear, describe the public error, file and steps you tried in that PR.
  - question: Is a tiny edit worth submitting?
    answer: A small, focused correction with clear evidence is useful. Explain what you do not know instead of guessing. Complete the part you can verify and discuss the rest in the PR.
---
