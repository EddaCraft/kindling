/**
 * Search command - Search for relevant context in memory
 */

import { initializeService, handleError, formatJson, formatTimestamp, truncate } from '../utils.js';

interface SearchOptions {
  db?: string;
  session?: string;
  repo?: string;
  max?: string;
  json?: boolean;
}

export async function searchCommand(query: string, options: SearchOptions): Promise<void> {
  try {
    const { service, db } = initializeService(options.db);

    const maxResults = parseInt(options.max || '10', 10);

    const result = await service.retrieve({
      query,
      scopeIds: {
        sessionId: options.session,
        repoId: options.repo,
      },
      maxCandidates: maxResults,
    });

    if (options.json) {
      console.log(formatJson(result, true));
    } else {
      console.log(`\nSearch Results for: "${query}"`);
      console.log('='.repeat(50) + '\n');

      // Display pins
      if (result.pins.length > 0) {
        console.log(`Pins (${result.pins.length}):`);
        result.pins.forEach((pin, i) => {
          const target = pin.target;
          console.log(`\n${i + 1}. [PIN] ${target.id}`);
          console.log(`   Type: ${'kind' in target ? target.kind : 'summary'}`);
          console.log(`   Content: ${truncate(target.content, 100)}`);
          if (pin.pin.reason) {
            console.log(`   Note: ${pin.pin.reason}`);
          }
        });
        console.log('');
      }

      // Display current summary
      if (result.currentSummary) {
        console.log('Current Summary:');
        console.log(`  ${truncate(result.currentSummary.content, 200)}`);
        console.log(`  Confidence: ${result.currentSummary.confidence}`);
        console.log('');
      }

      // Display candidates
      if (result.candidates.length > 0) {
        console.log(`Candidates (${result.candidates.length}):`);
        result.candidates.forEach((candidate, i) => {
          const entity = candidate.entity;
          console.log(`\n${i + 1}. ${entity.id} (score: ${candidate.score.toFixed(2)})`);
          console.log(`   Type: ${'kind' in entity ? entity.kind : 'summary'}`);
          console.log(`   Content: ${truncate(entity.content, 100)}`);
          if ('ts' in entity) {
            console.log(`   Time: ${formatTimestamp(entity.ts)}`);
          }
        });
      } else if (result.pins.length === 0 && !result.currentSummary) {
        console.log('No results found.');
      }

      console.log('');
    }

    db.close();
  } catch (error) {
    handleError(error, options.json);
  }
}
