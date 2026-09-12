import { glob } from 'astro/loaders';
import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { metadataOnlyGlob } from './lib/metadataOnlyGlob.mjs';

const locale = z.enum(['zh', 'zh-tw', 'zh-hk', 'ja', 'en']);
const contentStatus = z.enum(['stub', 'published']).default('published');
const dateString = z.string().regex(
  /^\d{4}(?:-\d{2}(?:-\d{2})?)?$/,
  'Expected YYYY, YYYY-MM, or YYYY-MM-DD',
);
const durationString = z.string().regex(
  /^\d{1,2}:\d{2}(?::\d{2})?$/,
  'Expected MM:SS or HH:MM:SS',
);
const siteRelativeOrHttpUrl = z.string().refine((value) => {
  if (value.startsWith('/') && !value.startsWith('//')) return true;

  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}, 'Must be an HTTP(S) URL or a site-relative path');
const seo = z
  .object({
    title: z.string().optional(),
    description: z.string().optional(),
    image: z.string().optional(),
    keywords: z.array(z.string()).optional(),
    noindex: z.boolean().optional(),
  })
  .optional();

const contentLicense = z
  .object({
    code: z.enum([
      'CC-BY-NC-SA-4.0',
      'CC-BY-NC-SA-3.0-CN',
      'rights-reserved',
      'authorized-use',
    ]),
    attribution: z.string().optional(),
    sourceTitle: z.string().optional(),
    sourceUrl: siteRelativeOrHttpUrl.optional(),
    modifications: z.string().optional(),
    note: z.string().optional(),
  })
  .superRefine((value, context) => {
    if (value.code !== 'CC-BY-NC-SA-3.0-CN') return;

    for (const field of ['attribution', 'sourceTitle', 'sourceUrl', 'modifications'] as const) {
      if (!value[field]) {
        context.addIssue({
          code: 'custom',
          path: [field],
          message: `${field} is required for CC-BY-NC-SA-3.0-CN material`,
        });
      }
    }
  });

const theme = z
  .object({
    name: z.string().optional(),
    accentColor: z.string(),
    mutedColor: z.string().optional(),
    surfaceColor: z.string().optional(),
    highlightColor: z.string().optional(),
    palette: z.array(
      z.object({
        label: z.string(),
        value: z.string(),
      }),
    ),
  })
  .optional();

const site = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/site' }),
  schema: z.object({
    locale,
    translationKey: z.string(),
    defaultLocale: locale,
    supportedLocales: z.array(
      z.object({
        code: locale,
        label: z.string(),
        shortLabel: z.string(),
      }),
    ),
    navItems: z.array(
      z.object({
        label: z.string(),
        href: z.string(),
      }),
    ),
    hero: z.object({
      brandLines: z.array(z.string()),
      systemVersion: z.string(),
      coordinates: z.string(),
      status: z.string(),
      leftVertical: z.string(),
      rightVertical: z.string(),
      eyebrow: z.string(),
      title: z.string(),
      marquee: z.string(),
    }),
    sections: z.object({
      about: z.object({
        heading: z.string(),
        subheading: z.string(),
        body: z.array(z.string()),
        note: z.array(z.string()),
      }),
      database: z.object({
        heading: z.string(),
        subheading: z.string(),
        expandLabel: z.string().optional(),
      }),
      projects: z.object({
        heading: z.string(),
        subheading: z.string(),
        viewAllLabel: z.string(),
      }),
      log: z.object({
        heading: z.string(),
        subheading: z.string(),
      }),
      songs: z.object({
        heading: z.string(),
        subheading: z.string(),
        viewAllLabel: z.string().optional(),
      }),
      albums: z.object({
        heading: z.string(),
        subheading: z.string(),
        viewAllLabel: z.string().optional(),
        emptyLabel: z.string().optional(),
      }),
    }),
    footer: z.object({
      tagline: z.string(),
      links: z.array(
        z.object({
          label: z.string(),
          href: z.string(),
        }),
      ),
      disclaimer: z.array(z.string()),
      license: z.object({
        notice: z.string(),
        mediaNotice: z.string(),
        detailsLabel: z.string(),
        detailsHref: z.string(),
        deedLabel: z.string(),
        deedHref: siteRelativeOrHttpUrl.refine((value) => value.startsWith('http'), 'Must be an HTTP(S) URL'),
      }),
      copyright: z.string(),
    }),
    socialContact: z
      .object({
        enabled: z.boolean().optional(),
        eyebrow: z.string(),
        title: z.string(),
        buttonLabel: z.string(),
        closeLabel: z.string(),
        helper: z.string().optional(),
        maxVisible: z.number().int().positive().optional(),
        items: z.array(
          z.object({
            label: z.string(),
            href: z.string(),
            handle: z.string().optional(),
            description: z.string().optional(),
            icon: z.string().optional(),
            enabled: z.boolean().optional(),
            featured: z.boolean().optional(),
          }),
        ),
      })
      .optional(),
    liveEvents: z.object({
      enabled: z.boolean().optional(),
      eyebrow: z.string(),
      title: z.string(),
      buttonLabel: z.string(),
      closeLabel: z.string(),
      todayLabel: z.string(),
      loading: z.string(),
      fallback: z.string(),
      cachedFallback: z.string(),
      emptyToday: z.string(),
      updatedLabel: z.string(),
      cachedUpdatedLabel: z.string(),
      localTimeLabel: z.string(),
      jstTimeLabel: z.string(),
      viewCalendar: z.string(),
      detailsLabel: z.string(),
      allDayLabel: z.string(),
      statusLive: z.string(),
      statusUpcoming: z.string(),
      statusEnded: z.string(),
      statusCancelled: z.string(),
      pageTitle: z.string(),
      pageDescription: z.string(),
      calendarEyebrow: z.string(),
      calendarTitle: z.string(),
      calendarIntro: z.string(),
      previousMonthLabel: z.string(),
      nextMonthLabel: z.string(),
      todayButtonLabel: z.string(),
      selectDateLabel: z.string(),
      emptyDay: z.string(),
      eventCountLabel: z.string(),
      backHomeLabel: z.string(),
      weekdays: z.array(z.string()).length(7),
    }),
    aiChat: z.object({
      title: z.string(),
      status: z.string(),
      buttonLabel: z.string(),
      closeLabel: z.string(),
      minimizeLabel: z.string(),
      settingsLabel: z.string(),
      threadActionsLabel: z.string(),
      cancelLabel: z.string(),
      inputLabel: z.string(),
      inputPlaceholder: z.string(),
      sendLabel: z.string(),
      keyboardHint: z.string(),
      retrievalLabel: z.string(),
      retrievalAutoLabel: z.string(),
      retrievalForcedLabel: z.string(),
      terminalLabel: z.string(),
      bubbleIdle: z.string(),
      bubbleThinking: z.string(),
      thinkingPhrases: z.array(z.string()).min(1),
      greeting: z.string(),
      fallbackOffline: z.string(),
      emptyResponse: z.string(),
      challengeFallback: z.string(),
      streamErrorFallback: z.string(),
      retry: z.string(),
      loginRequiredFallback: z.string(),
      accountAnonymous: z.string(),
      accountLoggedInPrefix: z.string(),
      logoutLabel: z.string(),
      authErrorFallback: z.string(),
      githubLoginLabel: z.string(),
      googleLoginLabel: z.string(),
      historyLabel: z.string(),
      historyEmpty: z.string(),
      newThreadLabel: z.string(),
      renameThreadLabel: z.string().optional(),
      deleteThreadLabel: z.string().optional(),
      clearHistoryLabel: z.string().optional(),
      renameThreadPrompt: z.string().optional(),
      deleteThreadConfirm: z.string().optional(),
      clearHistoryConfirm: z.string().optional(),
      quickPrompts: z.array(z.string()).min(1),
    }),
  }),
});

const artists = defineCollection({
  loader: metadataOnlyGlob({ pattern: '**/{zh,zh-tw,zh-hk,ja,en}.md', base: './src/content/artists', retainBody: false }),
  schema: z.object({
    locale,
    translationKey: z.string(),
    contentStatus,
    code: z.string().optional(),
    name: z.string(),
    romanizedName: z.string(),
    categoryTitle: z.string().optional(),
    categorySubtitle: z.string().optional(),
    categoryOrder: z.number().optional(),
    itemOrder: z.number().optional(),
    meta: z.string().optional(),
    debutDate: z.string().optional(),
    profileTagline: z.string().optional(),
    designCredits: z.array(z.string()).optional(),
    affiliations: z.array(z.string()).optional(),
    officialLinks: z
      .array(
        z.object({
          label: z.string(),
          href: siteRelativeOrHttpUrl,
        }),
      )
      .optional(),
    featuredEntries: z
      .array(
        z.object({
          label: z.string(),
          href: siteRelativeOrHttpUrl,
          kind: z.enum(['artist', 'project', 'album', 'song']),
        }),
      )
      .optional(),
    theme,
    statusLabel: z.string(),
    status: z.string(),
    inactive: z.boolean().optional(),
    image: z.string(),
    license: contentLicense.optional(),
    seo,
  }),
});

const projects = defineCollection({
  loader: metadataOnlyGlob({ pattern: '**/{zh,zh-tw,zh-hk,ja,en}.md', base: './src/content/projects', retainBody: false }),
  schema: z.object({
    locale,
    translationKey: z.string(),
    kind: z.string(),
    title: z.string(),
    description: z.string(),
    order: z.number(),
    releaseDate: dateString.optional(),
    officialLinks: z.array(z.object({ label: z.string(), href: siteRelativeOrHttpUrl })).optional(),
    license: contentLicense.optional(),
    seo,
  }),
});

const logs = defineCollection({
  loader: metadataOnlyGlob({ pattern: '**/{zh,zh-tw,zh-hk,ja,en}.md', base: './src/content/logs', retainBody: false }),
  schema: z.object({
    locale,
    translationKey: z.string(),
    date: z.string(),
    eventDate: dateString.optional(),
    eventSource: siteRelativeOrHttpUrl.optional(),
    type: z.string(),
    title: z.string(),
    summary: z.string().optional(),
    order: z.number(),
    license: contentLicense.optional(),
    seo,
  }),
});

const workBaseSchema = z.object({
    locale,
    translationKey: z.string(),
    title: z.string(),
    artist: z.string(),
    releaseDate: dateString.optional(),
    code: z.string().optional(),
    categoryTitle: z.string().optional(),
    categorySubtitle: z.string().optional(),
    categoryOrder: z.number().optional(),
    itemOrder: z.number().optional(),
    image: z.string().optional(),
    theme,
    license: contentLicense.optional(),
    seo,
});

const artistSlug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Expected a lowercase URL slug');

const songSchema = workBaseSchema.extend({
  lyricsSources: z.array(z.object({
    label: z.string(),
    href: siteRelativeOrHttpUrl.refine(value => value.startsWith('https://'), 'Use an HTTPS lyrics source'),
    provider: z.enum(['official', 'publisher', 'lyrics-service']),
    checkedAt: dateString,
  })).optional(),
  artistId: artistSlug,
  artistIds: z.array(artistSlug).min(1).optional(),
  composer: z.string().optional(),
  lyricist: z.string().optional(),
  album: z.string().optional(),
  duration: durationString.optional(),
}).superRefine((song, context) => {
  if (!song.artistIds) return;

  if (!song.artistIds.includes(song.artistId)) {
    context.addIssue({
      code: 'custom',
      message: 'artistIds must include the canonical artistId',
      path: ['artistIds'],
    });
  }

  if (new Set(song.artistIds).size !== song.artistIds.length) {
    context.addIssue({
      code: 'custom',
      message: 'artistIds must not contain duplicates',
      path: ['artistIds'],
    });
  }
});

const songs = defineCollection({
  loader: metadataOnlyGlob({ pattern: '**/{zh,zh-tw,zh-hk,ja,en}.md', base: './src/content/songs', retainBody: false }),
  schema: songSchema,
});

const albums = defineCollection({
  loader: metadataOnlyGlob({ pattern: '**/{zh,zh-tw,zh-hk,ja,en}.md', base: './src/content/albums', retainBody: false }),
  schema: workBaseSchema.extend({
    romanizedTitle: z.string().optional(),
    type: z.string().optional(),
    description: z.string().optional(),
    label: z.string().optional(),
    catalogNumber: z.string().optional(),
    trackCount: z.number().int().nonnegative().optional(),
    duration: durationString.optional(),
    officialLinks: z
      .array(
        z.object({
          label: z.string(),
          href: siteRelativeOrHttpUrl,
        }),
      )
      .optional(),
    tracks: z
      .array(
        z.object({
          disc: z.number().int().positive().optional(),
          number: z.string().optional(),
          title: z.string(),
          artist: z.string().optional(),
          duration: durationString.optional(),
          songId: z.string().optional(),
        }),
      )
      .optional(),
  }),
});

const announcements = defineCollection({
  loader: metadataOnlyGlob({ pattern: '**/{zh,zh-tw,zh-hk,ja,en}.md', base: './src/content/announcements', retainBody: false }),
  schema: z.object({
    locale,
    translationKey: z.string(),
    date: z.string(),
    type: z.string(),
    title: z.string(),
    summary: z.string(),
    order: z.number().optional(),
    pinned: z.boolean().default(false),
    draft: z.boolean().default(false),
    license: contentLicense.optional(),
  }),
});

const syntaxGuide = defineCollection({
  loader: metadataOnlyGlob({
    pattern: ['zh.md', 'zh-tw.md', 'zh-hk.md', 'ja.md', 'en.md'],
    base: new URL('./content/contribute/syntax-guide/', import.meta.url),
    retainBody: false,
  }),
  schema: z.object({
    locale,
    translationKey: z.string(),
    title: z.string(),
    description: z.string().optional(),
    license: contentLicense.optional(),
    seo,
  }),
});

const formatGuide = defineCollection({
  loader: metadataOnlyGlob({
    pattern: ['zh.md', 'zh-tw.md', 'zh-hk.md', 'ja.md', 'en.md'],
    base: new URL('./content/contribute/format-guide/', import.meta.url),
    retainBody: false,
  }),
  schema: z.object({
    locale,
    translationKey: z.literal('format-guide'),
    title: z.string(),
    description: z.string().optional(),
    license: contentLicense.optional(),
    seo,
  }),
});

const editGuide = defineCollection({
  loader: metadataOnlyGlob({
    pattern: '{zh,zh-tw,zh-hk,ja,en}.md',
    base: './src/content/contribute/edit-guide',
    retainBody: false,
  }),
  schema: z.object({
    locale,
    translationKey: z.literal('edit-guide'),
    title: z.string(),
    intro: z.string(),
    ui: z.record(z.string(), z.string()),
    tasks: z.array(z.object({id: z.enum(['fix', 'source', 'translate', 'new-entry']), title: z.string(), time: z.string(), description: z.string(), next: z.string()})).length(4),
    map: z.array(z.object({title: z.string(), body: z.string()})),
    lessons: z.array(z.object({id: z.enum(['choose', 'load', 'write', 'sources', 'review', 'submit']), title: z.string(), summary: z.string(), body: z.string(), checkpoint: z.string()})).length(6),
    workshops: z.array(z.object({id: z.string(), title: z.string(), summary: z.string(), body: z.string()})),
    checklist: z.array(z.string()),
    prTemplate: z.string(),
    faqs: z.array(z.object({question: z.string(), answer: z.string()})),
  }),
});

export const collections = {
  site,
  artists,
  projects,
  logs,
  announcements,
  editGuide,
  songs,
  albums,
  syntaxGuide,
  formatGuide,
};
