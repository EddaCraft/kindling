import { describe, it, expect } from 'vitest';

describe('@eddacraft/kindling barrel exports', () => {
  it('re-exports core symbols', async () => {
    const barrel = await import('../src/index.js');
    // KindlingService from core
    expect(barrel.KindlingService).toBeDefined();
    expect(typeof barrel.KindlingService).toBe('function');
  });

  it('re-exports store symbols', async () => {
    const barrel = await import('../src/index.js');
    expect(barrel.openDatabase).toBeDefined();
    expect(barrel.closeDatabase).toBeDefined();
    expect(barrel.SqliteKindlingStore).toBeDefined();
    expect(barrel.runMigrations).toBeDefined();
    expect(barrel.getMigrationStatus).toBeDefined();
    expect(barrel.exportDatabase).toBeDefined();
    expect(barrel.importDatabase).toBeDefined();
  });

  it('re-exports provider symbols', async () => {
    const barrel = await import('../src/index.js');
    expect(barrel.LocalFtsProvider).toBeDefined();
    expect(typeof barrel.LocalFtsProvider).toBe('function');
  });
});

describe('@eddacraft/kindling/server subpath exports', () => {
  it('exports server symbols', async () => {
    const server = await import('../src/server.js');
    expect(server.createServer).toBeDefined();
    expect(server.startServer).toBeDefined();
  });
});

describe('@eddacraft/kindling/client subpath exports', () => {
  it('exports client symbols', async () => {
    const client = await import('../src/client/index.js');
    expect(client.KindlingApiClient).toBeDefined();
    expect(typeof client.KindlingApiClient).toBe('function');
  });
});
