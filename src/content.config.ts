import { glob } from 'astro/loaders';
import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';

const locale = z.enum(['zh', 'ja', 'en']);
const seo = z
  .object({
    title: z.string().optional(),
    description: z.string().optional(),
    image: z.string().optional(),
    keywords: z.array(z.string()).optional(),
    noindex: z.boolean().optional(),
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
      copyright: z.string(),
    }),
  }),
});

const artists = defineCollection({
  loader: glob({ pattern: '**/{zh,ja,en}.md', base: './src/content/artists' }),
  schema: z.object({
    locale,
    translationKey: z.string(),
    code: z.string().optional(),
    name: z.string(),
    romanizedName: z.string(),
    categoryTitle: z.string().optional(),
    categorySubtitle: z.string().optional(),
    categoryOrder: z.number().optional(),
    itemOrder: z.number().optional(),
    meta: z.string().optional(),
    statusLabel: z.string(),
    status: z.string(),
    inactive: z.boolean().optional(),
    image: z.string(),
    seo,
  }),
});

const projects = defineCollection({
  loader: glob({ pattern: '**/{zh,ja,en}.md', base: './src/content/projects' }),
  schema: z.object({
    locale,
    translationKey: z.string(),
    kind: z.string(),
    title: z.string(),
    description: z.string(),
    order: z.number(),
    seo,
  }),
});

const logs = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/logs' }),
  schema: z.object({
    locale,
    translationKey: z.string(),
    date: z.string(),
    type: z.string(),
    message: z.string(),
    order: z.number(),
  }),
});

const editGuide = defineCollection({
  loader: glob({ pattern: '{zh,ja,en}.json', base: './src/content/contribute/edit-guide' }),
  schema: z.object({
    locale,
    translationKey: z.literal('edit-guide'),
    eyebrow: z.string(),
    title: z.string(),
    intro: z.string(),
    back: z.string(),
    targetLabel: z.string(),
    invalidTarget: z.string(),
    steps: z.array(
      z.object({
        title: z.string(),
        body: z.string(),
      }),
    ),
    checkbox: z.string(),
    ready: z.string(),
    locked: z.string(),
    docs: z.string(),
    docsPath: z.string(),
  }),
});

export const collections = {
  site,
  artists,
  projects,
  logs,
  editGuide,
};
