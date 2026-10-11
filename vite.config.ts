import { fileURLToPath } from 'node:url';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: 'src/site',
  base: './',
  publicDir: '../../public',
  plugins: [svelte({ configFile: fileURLToPath(new URL('./svelte.config.js', import.meta.url)) })],
  build: {
    outDir: '../../dist',
    emptyOutDir: true,
  },
  test: {
    root: '.',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
  },
});
