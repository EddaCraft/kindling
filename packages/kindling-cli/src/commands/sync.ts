/**
 * GitHub Sync Command - Sync Kindling memory to GitHub repo
 *
 * Enables Claude Code Web integration by using GitHub as a bridge.
 */

import { openDatabase } from '@kindling/store-sqlite';
import { SqliteKindlingStore } from '@kindling/store-sqlite';
import { LocalFtsProvider } from '@kindling/provider-local';
import { KindlingService } from '@kindling/core';
import { getDefaultDbPath } from '../utils.js';
import { execSync } from 'child_process';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

export interface SyncOptions {
  db?: string;
  repo?: string;
  branch?: string;
  interval?: string;
  scope?: string; // 'all' | '7d' | '30d'
}

/**
 * Initialize GitHub sync
 */
export async function syncInitCommand(options: SyncOptions): Promise<void> {
  console.log('🔄 Initializing Kindling GitHub Sync...\n');

  const repoUrl = options.repo || prompt('GitHub repo (username/repo): ');
  if (!repoUrl) {
    console.error('Error: Repository required');
    process.exit(1);
  }

  // Clone or create repo structure
  const syncDir = join(process.cwd(), '.kindling-sync');

  if (!existsSync(syncDir)) {
    console.log(`📁 Creating sync directory: ${syncDir}`);
    mkdirSync(syncDir, { recursive: true });

    // Initialize git repo
    execSync('git init', { cwd: syncDir });
    execSync(`git remote add origin https://github.com/${repoUrl}.git`, { cwd: syncDir });

    // Create .kindling directory structure
    mkdirSync(join(syncDir, '.kindling', 'capsules'), { recursive: true });
    mkdirSync(join(syncDir, '.kindling', 'pins'), { recursive: true });
    mkdirSync(join(syncDir, '.kindling', 'observations'), { recursive: true });

    // Create README
    writeFileSync(join(syncDir, 'README.md'),
`# Kindling Memory Sync

This repository contains synced Kindling memory for integration with Claude Code Web and other remote agents.

## Structure

- \`.kindling/index.json\` - Memory index with pins and summaries
- \`.kindling/capsules/\` - Capsule data
- \`.kindling/observations/\` - Recent observations
- \`.kindling/pins/\` - Active pins

## Usage with Claude Code Web

When Claude Code Web connects to this repo, it can:
1. Read \`.kindling/index.json\` to find relevant context
2. Query pins and summaries for the current task
3. Browse observation history

## Security

⚠️ This repo should be PRIVATE. It contains your development history.
Redacted observations are excluded from sync.
`);

    console.log('✅ Sync directory initialized');
    console.log(`\n📝 Next steps:`);
    console.log(`   1. Create private GitHub repo: https://github.com/new`);
    console.log(`   2. Run: kindling sync push --repo ${repoUrl}`);
    console.log(`   3. Connect repo in Claude Code Web`);
  } else {
    console.log('✅ Sync directory already exists');
  }
}

/**
 * Push current Kindling state to GitHub
 */
export async function syncPushCommand(options: SyncOptions): Promise<void> {
  const dbPath = options.db || getDefaultDbPath();
  const syncDir = join(process.cwd(), '.kindling-sync');

  if (!existsSync(syncDir)) {
    console.error('Error: Run `kindling sync init` first');
    process.exit(1);
  }

  console.log('🔄 Syncing Kindling memory to GitHub...\n');

  const db = openDatabase({ path: dbPath });
  const store = new SqliteKindlingStore(db);
  const provider = new LocalFtsProvider(db);
  const service = new KindlingService({ store, provider });

  // Export Kindling data
  const bundle = service.export({
    includeRedacted: false, // Never sync redacted data
  });

  // Build index
  const index = {
    version: '1.0',
    syncedAt: new Date().toISOString(),
    stats: {
      observations: bundle.observations.length,
      capsules: bundle.capsules.length,
      summaries: bundle.summaries.length,
      pins: bundle.pins.length,
    },
    pins: bundle.pins.map(pin => ({
      id: pin.id,
      targetType: pin.targetType,
      targetId: pin.targetId,
      reason: pin.reason,
      scopeIds: pin.scopeIds,
      createdAt: pin.createdAt,
    })),
    recentCapsules: bundle.capsules
      .sort((a, b) => (b.closedAt || b.openedAt) - (a.closedAt || a.openedAt))
      .slice(0, 20)
      .map(c => ({
        id: c.id,
        type: c.type,
        intent: c.intent,
        status: c.status,
        openedAt: c.openedAt,
        closedAt: c.closedAt,
        scopeIds: c.scopeIds,
        summaryId: c.summaryId,
      })),
    summaries: bundle.summaries.map(s => ({
      id: s.id,
      capsuleId: s.capsuleId,
      content: s.content,
      confidence: s.confidence,
      createdAt: s.createdAt,
    })),
  };

  // Write index
  writeFileSync(
    join(syncDir, '.kindling', 'index.json'),
    JSON.stringify(index, null, 2)
  );

  // Write individual capsule files (for easy browsing)
  for (const capsule of bundle.capsules.slice(-50)) {
    writeFileSync(
      join(syncDir, '.kindling', 'capsules', `${capsule.id}.json`),
      JSON.stringify(capsule, null, 2)
    );
  }

  // Write pins
  for (const pin of bundle.pins) {
    writeFileSync(
      join(syncDir, '.kindling', 'pins', `${pin.id}.json`),
      JSON.stringify(pin, null, 2)
    );
  }

  console.log('✅ Memory exported to sync directory');

  // Git commit and push
  try {
    execSync('git add .', { cwd: syncDir });
    execSync(`git commit -m "Sync Kindling memory at ${new Date().toISOString()}"`, {
      cwd: syncDir,
      stdio: 'pipe',
    });
    execSync(`git push origin ${options.branch || 'main'}`, { cwd: syncDir });
    console.log('✅ Pushed to GitHub');
  } catch (error: any) {
    if (error.message.includes('nothing to commit')) {
      console.log('ℹ️  No changes to sync');
    } else {
      console.error('Error pushing to GitHub:', error.message);
      process.exit(1);
    }
  }

  db.close();
  console.log('\n🎉 Sync complete!');
}

/**
 * Pull changes from GitHub (for bidirectional sync)
 */
export async function syncPullCommand(options: SyncOptions): Promise<void> {
  const syncDir = join(process.cwd(), '.kindling-sync');

  console.log('🔄 Pulling changes from GitHub...\n');

  try {
    execSync(`git pull origin ${options.branch || 'main'}`, { cwd: syncDir });
    console.log('✅ Pulled latest changes');

    // TODO: Parse .kindling/pending/ for observations created by Claude Code Web
    // and import them into local Kindling database

    console.log('ℹ️  Bidirectional sync not yet implemented');
  } catch (error: any) {
    console.error('Error pulling from GitHub:', error.message);
    process.exit(1);
  }
}
