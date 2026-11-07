import { defineConfig } from 'vite';
import { getDefaultStore } from './server/store.js';
import { createApiMiddleware } from './server/handler.js';
import { attachWebSocketServer } from './server/ws.js';

function stupaMultiplayerDevPlugin() {
  const store = getDefaultStore();
  const apiMiddleware = createApiMiddleware(store, null);

  function mountMultiplayer(server) {
    if (server.httpServer) {
      const wsHub = attachWebSocketServer(server.httpServer, store, '/ws/multiplayer');
      apiMiddleware.setWsHub(wsHub);
    }
    server.middlewares.use(apiMiddleware);
  }

  return {
    name: 'stupa-multiplayer-dev',
    configureServer(server) {
      mountMultiplayer(server);
    },
    configurePreviewServer(server) {
      mountMultiplayer(server);
    },
  };
}

export default defineConfig({
  plugins: [stupaMultiplayerDevPlugin()],
  build: {
    chunkSizeWarningLimit: 1200, // three.js alone is ~600 kB
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'story-data', test: /src[\\/](data[\\/]story[\\/]|i18n[\\/]story)/, priority: 40 },
            { name: 'story-ui', test: /src[\\/]ui[\\/]story[\\/]/, priority: 40 },
            { name: 'story-world-data', test: /src[\\/](data[\\/]maps[\\/]pharping|i18n[\\/]ch1)/, priority: 40 },
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
