/**
 * Search command
 *
 * Searches for observations and summaries matching a query.
 */

import type { KindlingService } from '@kindling/core';
import type { RetrievalResult } from '@kindling/core';

export interface SearchOptions {
  query?: string;
  sessionId?: string;
  repoId?: string;
  limit?: number;
}

export function searchCommand(
  service: KindlingService,
  options: SearchOptions
): RetrievalResult {
  return service.retrieve({
    query: options.query,
    scope: {
      sessionId: options.sessionId,
      repoId: options.repoId,
    },
    limit: options.limit ?? 20,
  });
}

export function formatSearchResults(result: RetrievalResult): string {
  const lines = ['Search Results', '==============', ''];

  // Pins
  if (result.pins.length > 0) {
    lines.push('📌 Pinned Items:');
    result.pins.forEach(pin => {
      lines.push(`  [${pin.id}] ${pin.targetType}: ${pin.targetId}`);
      if (pin.note) {
        lines.push(`    Note: ${pin.note}`);
      }
    });
    lines.push('');
  }

  // Summaries
  if (result.summaries.length > 0) {
    lines.push('📝 Summaries:');
    result.summaries.forEach(summary => {
      lines.push(`  [${summary.id}]`);
      lines.push(`    ${summary.content}`);
      if (summary.confidence !== null) {
        lines.push(`    Confidence: ${(summary.confidence * 100).toFixed(0)}%`);
      }
    });
    lines.push('');
  }

  // Provider hits
  if (result.providerHits.length > 0) {
    lines.push('🔍 Matched Results:');
    result.providerHits.slice(0, 10).forEach(hit => {
      const score = (hit.score * 100).toFixed(0);
      lines.push(`  [${hit.targetId}] ${hit.targetType} (score: ${score}%)`);
      lines.push(`    ${hit.why}`);

      // Find evidence snippet
      const snippet = result.evidenceSnippets.find(
        s => s.observationId === hit.targetId
      );
      if (snippet) {
        const preview = snippet.snippet.substring(0, 100);
        lines.push(`    Preview: ${preview}${snippet.truncated ? '...' : ''}`);
      }
    });

    if (result.providerHits.length > 10) {
      lines.push(`  ... and ${result.providerHits.length - 10} more results`);
    }
  }

  if (
    result.pins.length === 0 &&
    result.summaries.length === 0 &&
    result.providerHits.length === 0
  ) {
    lines.push('No results found.');
  }

  return lines.join('\n');
}
