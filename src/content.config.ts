import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const articles = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/articles' }),
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    date: z.coerce.date(),
    excerpt: z.string().default(''),
    image: z.string().default('/images/editorial-placeholder.svg'),
    imageAlt: z.string().default('Imagen editorial'),
    subtitle: z.string().optional(),
    category: z.string().default('Análisis'),
    tags: z.array(z.string()).default([]),
    subject: z.string().optional(),
    season: z.string().optional(),
    featured: z.boolean().default(false),
    evergreen: z.boolean().default(false),
    draft: z.boolean().default(false),
    readingTime: z.number().optional(),
    archive: z.string().optional(),
    imageFit: z.enum(['contain', 'cover']).default('contain'),
    imagePosition: z.string().default('center'),
    canonical: z.boolean().default(false),
    publishedBase: z.boolean().default(false),
    sourceTweetIds: z.array(z.string()).default([]),
    sourceTweetUrls: z.array(z.string().url()).default([]),
    legacyVisuals: z.array(z.string()).default([]),
    migrationStatus: z.string().optional(),
    redirectTo: z.string().optional(),
  }),
});

export const collections = { articles };
