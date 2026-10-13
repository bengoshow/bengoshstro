import { defineCollection, z } from 'astro:content';
import { tailLoader } from './loaders/tail-loader.mjs';

const learned = defineCollection({
  loader: tailLoader(),
  schema: z.object({
    date: z.coerce.date(),
    description: z.string(),
    sourceUrl: z.string().url(),
    tags: z.array(z.string()),
    title: z.string(),
  }),
});

export const collections = { learned };
