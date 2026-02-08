#!/usr/bin/env node
/**
 * SessionStart hook handler
 *
 * Opens a new capsule when a Claude Code session begins.
 * Optionally injects prior context for the current project.
 * Exit 0 = success (never blocks session startup).
 */

const { init, cleanup, readStdin } = require('./lib/init.js');

async function main() {
  const context = await readStdin();

  const sessionId = context.session_id || `session-${Date.now()}`;
  const cwd = context.cwd || process.cwd();

  const { db, handlers, service, dbPath } = init(cwd);

  try {
    // Open capsule for this session
    handlers.onSessionStart({ sessionId, cwd });

    // Context injection: query prior observations for this project
    const injectContext = process.env.KINDLING_INJECT_CONTEXT !== 'false';
    if (injectContext) {
      try {
        const maxResults = parseInt(process.env.KINDLING_MAX_CONTEXT || '10', 10);
        const results = await service.retrieve({
          query: '',
          scopeIds: { repoId: cwd },
          maxCandidates: maxResults,
        });

        const items = [];

        // Include pins
        if (results.pins && results.pins.length > 0) {
          items.push('## Pinned Items');
          for (const pin of results.pins) {
            const preview = pin.content ? pin.content.substring(0, 200) : '(no content)';
            items.push(`- **${pin.note || 'Pin'}**: ${preview}`);
          }
        }

        // Include recent candidates (observations from prior sessions)
        if (results.candidates && results.candidates.length > 0) {
          items.push('## Recent Activity');
          for (const candidate of results.candidates) {
            const entity = candidate.entity || candidate;
            const content = entity.content || '';
            const kind = entity.kind || 'unknown';
            const ts = entity.ts ? new Date(entity.ts).toLocaleString() : '';
            const preview = content.substring(0, 300).replace(/\n/g, ' ');
            items.push(`- [${ts}] ${kind}: ${preview}`);
          }
        }

        if (items.length > 0) {
          // Output context via stdout (Claude Code reads hook stdout)
          const header = `# Prior Context (from Kindling)\n\nThe following is prior session context for this project:\n`;
          console.log(header + items.join('\n'));
        }
      } catch (err) {
        // Context injection is best-effort; don't fail the session
        console.error(`[kindling] Context injection error: ${err.message}`);
      }
    }

    console.error(`[kindling] Session started (db: ${dbPath})`);
  } finally {
    cleanup(db);
  }
}

main().catch((err) => {
  console.error(`[kindling] SessionStart error: ${err.message}`);
}).finally(() => {
  process.exit(0);
});
