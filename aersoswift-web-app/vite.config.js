import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { config } from 'dotenv';
import { expand } from 'dotenv-expand';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Pre-load shared env into process.env so ${VAR} refs in .env expand correctly
expand(config({ path: resolve(__dirname, '../common-properties/.env') }));

export default defineConfig({
  plugins: [svelte()],
  publicDir: 'static',
  assetsInclude: ['**/*.glb', '**/*.gltf']
});
