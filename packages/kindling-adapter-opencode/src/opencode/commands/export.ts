/**
 * /memory export command
 *
 * Exports memory to a portable bundle
 */

import type { ScopeIds, ExportBundle } from '@eddacraft/kindling-core';
import { writeFileSync } from 'fs';
import { join } from 'path';

/**
 * Export service interface
 */
export interface ExportService {
  createExportBundle(options?: {
    scope?: Partial<ScopeIds>;
    includeRedacted?: boolean;
    limit?: number;
    metadata?: {
      description?: string;
      tags?: string[];
      [key: string]: unknown;
    };
  }): ExportBundle;

  serializeBundle(bundle: ExportBundle, pretty?: boolean): string;
}

/**
 * Export options
 */
export interface ExportOptions {
  /** Optional scope filter */
  scope?: Partial<ScopeIds>;
  /** Include redacted observations */
  includeRedacted?: boolean;
  /** Output file path (default: auto-generated) */
  outputPath?: string;
  /** Export description */
  description?: string;
}

/**
 * Export result
 */
export interface ExportResult {
  /** Path to exported file */
  filePath: string;
  /** Number of entities exported */
  stats: {
    observations: number;
    capsules: number;
    summaries: number;
    pins: number;
  };
  /** Error if any */
  error?: string;
}

/**
 * Execute /memory export command
 *
 * @param service - Export service
 * @param options - Export options
 * @returns Export result
 */
export function memoryExport(service: ExportService, options: ExportOptions = {}): ExportResult {
  const { scope, includeRedacted = false, outputPath, description } = options;

  try {
    // Create export bundle
    const bundle = service.createExportBundle({
      scope,
      includeRedacted,
      metadata: description ? { description } : undefined,
    });

    // Generate file path if not provided
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const defaultPath = join(process.cwd(), `kindling-export-${timestamp}.json`);
    const filePath = outputPath || defaultPath;

    // Serialize and write bundle
    const json = service.serializeBundle(bundle, true);
    writeFileSync(filePath, json, 'utf-8');

    return {
      filePath,
      stats: {
        observations: bundle.dataset.observations.length,
        capsules: bundle.dataset.capsules.length,
        summaries: bundle.dataset.summaries.length,
        pins: bundle.dataset.pins.length,
      },
    };
  } catch (err) {
    return {
      filePath: '',
      stats: {
        observations: 0,
        capsules: 0,
        summaries: 0,
        pins: 0,
      },
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Format export result as human-readable text
 *
 * @param result - Export result
 * @returns Formatted export result
 */
export function formatExportResult(result: ExportResult): string {
  if (result.error) {
    return `❌ Export failed: ${result.error}`;
  }

  const lines: string[] = [];

  lines.push('📦 Export complete');
  lines.push('');
  lines.push(`File: ${result.filePath}`);
  lines.push('');
  lines.push('Exported:');
  lines.push(`  ${result.stats.observations} observations`);
  lines.push(`  ${result.stats.capsules} capsules`);
  lines.push(`  ${result.stats.summaries} summaries`);
  lines.push(`  ${result.stats.pins} pins`);

  return lines.join('\n');
}
