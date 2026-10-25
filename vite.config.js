import { defineConfig } from 'vite';

export default defineConfig({
  build: { chunkSizeWarningLimit: 1200 }, // three.js alone is ~600 kB
});
