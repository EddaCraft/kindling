import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
  },
  resolve: {
    alias: [
      {
        find: '@eddacraft/kindling-server/client',
        replacement: resolve(__dirname, '../kindling-api-server/src/client/index.ts'),
      },
      {
        find: '@eddacraft/kindling-server',
        replacement: resolve(__dirname, '../kindling-api-server/src/index.ts'),
      },
      {
        find: '@eddacraft/kindling-core',
        replacement: resolve(__dirname, '../kindling-core/src/index.ts'),
      },
      {
        find: '@eddacraft/kindling-store-sqlite',
        replacement: resolve(__dirname, '../kindling-store-sqlite/src/index.ts'),
      },
      {
        find: '@eddacraft/kindling-provider-local',
        replacement: resolve(__dirname, '../kindling-provider-local/src/index.ts'),
      },
    ],
  },
});
