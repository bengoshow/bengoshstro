import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import mdx from '@astrojs/mdx'

export default defineConfig({
  // ...
  integrations: [
    mdx(),
    tailwind({
      applyBaseStyles: false,
    }),
  ],
})
