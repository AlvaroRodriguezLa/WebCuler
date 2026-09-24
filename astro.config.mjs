import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: process.env.PUBLIC_SITE_URL || 'https://example.github.io',
  base: process.env.BASE_PATH || '',
  output: 'static',
  integrations: [sitemap()],
  build: {
    format: 'directory',
  },
});
