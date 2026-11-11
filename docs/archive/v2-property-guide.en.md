# V2 historical reference — superseded by Metadata Schema v2

## Property block guide

If you do not understand the properties in an entry's frontmatter block, refer to the explanations below.

### Common properties

The following properties are shared by every entry category:

- `locale`: Identifies the language version of the document. The available values are `zh` for Chinese, `en` for English, and `ja` for Japanese. Enter the value corresponding to the language of the entry you are editing.
- `translationKey`: A shared identifier connecting different language versions of the same entry. The Chinese, Japanese, and English files for the same entry must use the same value.

**Source example:**

```yaml
locale: en
translationKey: kaf-originals-shi
```

**Result:** the file joins the English collection and links to the Japanese and Chinese files that share this `translationKey`.

### Artist properties

**Minimal example:**

```yaml
name: KAF
romanizedName: KAF
statusLabel: Activity status
status: Active
image: /images/artists/kaf.webp
```

**Result:** the artist page uses “KAF” as its heading and displays the status and profile image.

| Property | Type | Required | Purpose and content |
| :---: | :---: | :---: | :--- |
| `locale` | `zh / ja / en` | Yes | Language of the current entry |
| `translationKey` | String | Yes | Shared identifier used by all language versions of the same person |
| `code` | String | No | Artist number, archive number, or internal identifier |
| `name` | String | Yes | Person's name as displayed in the current language |
| `romanizedName` | String | Yes | Romanized, Latin-alphabet, or international display name |
| `categoryTitle` | String | No | Main title of the category to which the artist belongs |
| `categorySubtitle` | String | No | Subtitle or English description of the category |
| `categoryOrder` | Number | No | Sorting value between categories; smaller values are usually displayed first |
| `itemOrder` | Number | No | Sorting value of the current artist within the category |
| `meta` | String | No | Short metadata shown on a list card, such as a role, affiliation, or brief summary |
| `debutDate` | String | No | Debut date. The recommended format is `YYYY-MM-DD`, although the schema does not enforce it |
| `profileTagline` | String | No | Introductory tagline displayed on the artist detail page |
| `designCredits` | String array | No | List of character designers, visual designers, modelers, and other production staff |
| `affiliations` | String array | No | Labels, groups, projects, or organizations with which the artist is affiliated |
| `officialLinks` | Object array | No | Official website and official social-media links |
| `officialLinks[].label` | String | Yes | Link name, such as `Official Site` or `YouTube` |
| `officialLinks[].href` | String | Yes | Official link URL |
| `featuredEntries` | Object array | No | Other entries prominently associated with the artist |
| `featuredEntries[].label` | String | Yes | Display name of the associated content |
| `featuredEntries[].href` | String | Yes | Path to the associated entry |
| `featuredEntries[].kind` | Fixed enum | Yes | Type of associated content. Must be `artist`, `project`, `album`, or `song` |
| `theme` | Shared theme object | No | Customized color theme for the artist detail page |
| `statusLabel` | String | Yes | Heading of the status field, such as `Activity Status` |
| `status` | String | Yes | Actual status, such as `Active` or `Inactive` |
| `inactive` | Boolean | No | Whether the artist is inactive. `true` normally indicates that activities have ended or the entry has been archived |
| `image` | String | Yes | Path to the main image, avatar, or character illustration |
| `seo` | Shared SEO object | No | Search-engine and social-sharing information for the entry |

### Project properties

**Minimal example:**

```yaml
kind: project
title: Kamitsubaki City Under Construction
description: A Kamitsubaki world-building project
order: 10
```

**Result:** the project is sorted by `order` and its title and description form the listing card.

| Property | Type | Required | Purpose and content |
| --- | --- | :---: | --- |
| `locale` | `zh / ja / en` | Yes | Language of the current project entry |
| `translationKey` | String | Yes | Shared identifier used by all language versions of the same project |
| `kind` | String | Yes | Project type, such as `project`, `game`, or `virtual-world`. The schema does not restrict this field to predefined values |
| `title` | String | Yes | Project title |
| `description` | String | Yes | Short description of the project, normally used on list cards or as a page summary |
| `order` | Number | Yes | Sorting value in the project list |
| `seo` | Shared SEO object | No | Search-engine and social-sharing information |

### Log properties

**Minimal example:**

```yaml
date: "2026-07-19"
type: update
title: Site content update
order: 10
```

**Result:** the log page displays its date, type, and title and sorts it by `order`.

| Property | Type | Required | Purpose and content |
| --- | --- | :---: | --- |
| `locale` | `zh / ja / en` | Yes | Language of the current log entry |
| `translationKey` | String | Yes | Shared identifier used by all language versions of the same log |
| `date` | String | Yes | Date of the log. The recommended format is `YYYY-MM-DD`, although the schema does not validate it |
| `type` | String | Yes | Log type, such as `update`, `notice`, or `maintenance` |
| `title` | String | Yes | Log title |
| `summary` | String | No | Short summary of the log |
| `order` | Number | Yes | Sorting value of the log |
| `seo` | Shared SEO object | No | Search-engine and social-sharing information |

### Song properties

Store song files as `artist ID / category / song ID / locale.md`, for example `songs/kaf/originals/shi/en.md`. The first artist folder is the entry's canonical storage location, while its category folder is reused in every associated artist catalog. Recommended folders are `originals`, `covers`, `genealogy`, `suites`, `collaborations`, and `projects`; any additional folder automatically becomes a new category.

**Minimal example:**

```yaml
title: Ito
artist: KAF
artistId: kaf
releaseDate: "2018-12-06"
duration: "03:52"
```

**Sharing one entry between artists:** create only one song folder for the same recording. Choose one primary artist as the canonical location, keep `artistId` equal to the first path folder, and put every artist catalog that should include the recording in `artistIds`. For example, keep “古傷” only at `songs/harusaruhi/collaborations/古傷-furukizu/`:

```yaml
title: 古傷
artist: 幸祜×春猿火
artistId: harusaruhi
artistIds:
  - harusaruhi
  - koko
code: apple-1678038919
```

You now maintain only `zh.md`, `ja.md`, and `en.md` in that folder. The same entry appears under Collaborations for both Harusaruhi and KOKO, and both catalog items link to the same canonical page. Do not copy the body, `translationKey`, or artwork metadata into `songs/koko/`. `artistIds` must include `artistId` and must not contain duplicates; putting `artistId` first is recommended. When present, `code` must identify one unique recording and must not be reused by another song folder.

**Result:** the song page displays its title, artist, release date, and duration and appears in every artist list named by `artistIds`. If `artistIds` is omitted, it appears only under `artistId`.

| Property | Type | Required | Purpose and content |
| --- | --- | :---: | --- |
| `locale` | `zh / ja / en` | Yes | Language of the current song entry |
| `translationKey` | String | Yes | Shared identifier used by all language versions of the same song |
| `title` | String | Yes | Song title |
| `artist` | String | Yes | Main performer or artist name |
| `artistId` | Lowercase slug | Yes | Canonical storage artist, such as `kaf`; it must match the first folder in the song path |
| `artistIds` | List of lowercase slugs | No | Every artist catalog that should include this same entry; required for multi-artist songs, must include `artistId`, and must not contain duplicates |
| `composer` | String | No | Composer |
| `lyricist` | String | No | Lyricist |
| `album` | String | No | Album containing the song |
| `duration` | String | No | Song duration. The recommended format is `03:45`, although the schema does not validate it |
| `releaseDate` | String | No | Release date. The recommended format is `YYYY-MM-DD` |
| `code` | String | No | Unique recording, archive, or internal identifier; it must not be repeated in another song folder |
| `categoryTitle` | String | No | Title of the category to which the song belongs |
| `categorySubtitle` | String | No | Subtitle of the category |
| `categoryOrder` | Number | No | Sorting value between categories |
| `itemOrder` | Number | No | Sorting value of the song within its category |
| `image` | String | No | Path to the song artwork, single cover, or album cover |
| `seo` | Shared SEO object | No | Search-engine and social-sharing information |

### Album properties

**Minimal example:**

```yaml
title: Observation α
artist: KAF
type: Album
releaseDate: "2019-09-11"
tracks:
  - number: 1
    title: Ito
    songId: kaf/originals/shi
```

**Result:** the album page builds its metadata and track list; a track with `songId` links to the corresponding song page.

| Property | Type | Required | Purpose and content |
| --- | --- | :---: | --- |
| `locale` | `zh / ja / en` | Yes | Language of the current album entry |
| `translationKey` | String | Yes | Shared identifier used by all language versions of the same album |
| `title` | String | Yes | Album title |
| `romanizedTitle` | String | No | Romanized, Latin-script, or international display title |
| `artist` | String | Yes | Main album artist |
| `type` | String | No | Release type, such as `Album`, `EP`, or `Mini Album` |
| `description` | String | No | Short description shown near the detail-page heading |
| `releaseDate` | String | No | Release date. The recommended format is `YYYY-MM-DD` |
| `label` | String | No | Releasing label |
| `catalogNumber` | String | No | Catalog or product number |
| `trackCount` | Number | No | Total number of tracks |
| `duration` | String | No | Total album duration |
| `code` | String | No | List number, archive number, or internal identifier |
| `categoryTitle` | String | No | Title of the album category |
| `categorySubtitle` | String | No | Subtitle of the album category |
| `categoryOrder` | Number | No | Sorting value between categories |
| `itemOrder` | Number | No | Sorting value of the album within its category |
| `image` | String | No | Path or URL for the album cover |
| `officialLinks` | Object array | No | Official, purchase, or streaming links; each item uses `label` and `href` |
| `tracks` | Object array | No | Track list. Each item requires `title` and may include `disc`, `number`, `artist`, `duration`, and `songId` |
| `tracks[].songId` | String | No | Path of a related song entry on this site, such as `kaf/originals/shi` |
| `theme` | Shared theme object | No | Custom color theme for the album detail page |
| `seo` | Shared SEO object | No | Search-engine and social-sharing information |

#### Song and album backfill standard

Backfill work has two independently reviewable levels:

- **Catalog-ready:** paths, required metadata, official sources, local high-resolution artwork, official links, and a minimal body are reliable. Track links, lyrics, or long-form text may still be incomplete if the missing scope is stated clearly.
- **Complete entry:** adds verified tracks, internal song links, body copy, usable lyric material, and all three locales. Completeness never means filling uncertain fields.

##### Directory code syntax

```md
songs/<artistId>/<category>/<songId>/<locale>.md
albums/<artistId>/<albumId>/<locale>.md
```

##### Authoring

Group songs by artist and then song category. Group albums only by artist and album ID; do not reproduce the artist-category UI as album folders. Use stable lowercase slugs for `artistId`, `songId`, and `albumId`, and share one `translationKey` across locales.

##### Example

```md
src/content/songs/kaf/originals/shi/
├── zh.md
├── ja.md
└── en.md

src/content/albums/kaf/kansoku-alpha/
├── zh.md
├── ja.md
└── en.md
```

##### Song acceptance criteria

- The path's `artistId`, category, and `songId` agree with the metadata. Reuse `originals`, `covers`, `genealogy`, `suites`, `collaborations`, or `projects` when applicable.
- Titles, dates, and credits are supported by official sites, official upload descriptions, legitimate release pages, or reliable interviews. AI output is not a source.
- `categoryOrder` and `itemOrder` do not conflict with existing entries and preserve a stable public or site order.
- `image` resolves to a real repository asset, not an expiring URL, search thumbnail, placeholder, or unnecessary duplicate.
- Use controlled media syntax such as `@[bilibili](BV...)`; do not add raw `<iframe>` markup, autoplay, or unofficial reuploads.
- The body identifies the work and cites traceable sources. Lyrics are optional. If added, distinguish original, translation, and romanization, reuse the lyric controls, and verify provenance and copyright boundaries.
- Prefer `zh.md`, `ja.md`, and `en.md` together. List missing translations or facts in the PR instead of inventing text or adding placeholder prose.

##### Album acceptance criteria

- **Catalog-ready minimum:** title, artist, type, verified release information, official artwork, at least one official or licensed streaming link, a shared three-locale `translationKey`, and a short source-backed body.
- Prefer the highest-quality artwork available from Apple Music or another licensed service or official product page. Use a square image of at least `1500 × 1500` when available; reject search thumbnails, screenshots, placeholders, and artificial upscales.
- Store artwork at `public/images/albums/<artistId>/<albumId>.jpg` and reference `/images/albums/<artistId>/<albumId>.jpg` in frontmatter rather than relying on a third-party image URL.
- `trackCount` matches the verified total. When `tracks` is present, check disc number, sequence, title, artist, and duration against the official track list.
- Add `tracks[].songId` only when the target song entry exists. A track without a page keeps its `title` and must not create a broken link.
- Separate standard, reissue, remix, and live editions only when they are officially distinct releases; never mix dates or track lists from different editions.
- If tracks or body copy are incomplete, state the scope in both the entry and PR. Do not fabricate data or imply that coverage is complete.
- Structural metadata, sequence, artwork, and links remain aligned across locales; localize display text and prose only.

##### Body code syntax

```md
## About the release

Describe the work, release context, and verified production information.

## Official media

@[bilibili](BVxxxxxxxxxx)

## Backfill status

Core metadata and official links are complete; track links will be added as song entries become available.

## Sources

- [Official release page](https://example.com/official)
- [Apple Music](https://music.apple.com/example)
```

##### Authoring

Make only claims supported by sources. The status note should tell reviewers and future editors what is complete and what remains, without presenting plans or guesses as encyclopedia facts.

##### Example

Use `src/content/songs/kaf/`, `src/content/albums/kaf/`, and `public/images/albums/kaf/` as current references. Before submitting, run:

```md
pnpm check
pnpm test
pnpm build
```

Passing checks is the minimum technical bar; it does not replace source, track-order, link, or artwork-quality review.

