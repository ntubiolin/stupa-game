import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    chunkSizeWarningLimit: 1200, // three.js alone is ~600 kB
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'vendor-three', test: /node_modules[\\/]three/, priority: 30 },
            { name: 'game-data', test: /src[\\/](i18n|data)[\\/]/, priority: 20 },
            { name: 'game-ui', test: /src[\\/]ui[\\/]/, priority: 15 },
            { name: 'game-combat', test: /src[\\/]gameplay[\\/](bosses|dungeon)/, priority: 10 },
          ],
        },
      },
    },
  },
});


