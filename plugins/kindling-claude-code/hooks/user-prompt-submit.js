#!/usr/bin/env node
/**
 * UserPromptSubmit hook handler
 *
 * Captures user messages as observations.
 * Exit 0 = success (never blocks user input).
 */

const { init, cleanup, readStdin } = require('./lib/init.js');

async function main() {
  const context = await readStdin();

  const sessionId = context.session_id || 'unknown';
  const cwd = context.cwd || process.cwd();
  const content = context.content || context.prompt || '';

  if (!content.trim()) {
    return;
  }

  const { db, handlers } = init(cwd);

  try {
    handlers.onUserPromptSubmit({
      sessionId,
      cwd,
      content,
    });

    console.error(`[kindling] Captured user message`);
  } finally {
    cleanup(db);
  }
}

main().catch((err) => {
  console.error(`[kindling] UserPromptSubmit error: ${err.message}`);
}).finally(() => {
  process.exit(0);
});
