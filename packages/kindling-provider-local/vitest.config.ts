import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
  },
  resolve: {
    alias: {
      '@eddacraft/kindling-core': resolve(__dirname, '../kindling-core/src/index.ts'),
      '@eddacraft/kindling-store-sqlite': resolve(
        __dirname,
        '../kindling-store-sqlite/src/index.ts',
      ),
    },
  },
});
