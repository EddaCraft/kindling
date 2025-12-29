/**
 * Provenance extraction and validation helpers
 */

import type { ObservationKind } from '../types/index.js';

/**
 * Provenance schema for tool_call observations
 */
export interface ToolCallProvenance {
  toolName: string;
  args?: unknown[];
  result?: unknown;
}

/**
 * Provenance schema for command observations
 */
export interface CommandProvenance {
  cmd: string;
  exitCode?: number;
  workingDir?: string;
}

/**
 * Provenance schema for file_diff observations
 */
export interface FileDiffProvenance {
  paths: string[];
  operation?: 'create' | 'update' | 'delete';
}

/**
 * Provenance schema for error observations
 */
export interface ErrorProvenance {
  stack?: string;
  code?: string;
  source?: string;
}

/**
 * Provenance schema for node observations
 */
export interface NodeProvenance {
  nodeId?: string;
  nodeName?: string;
  intent?: string;
}

/**
 * Extract and validate provenance based on observation kind
 */
export function extractProvenance(
  kind: ObservationKind,
  raw: Record<string, unknown>
): Record<string, unknown> {
  switch (kind) {
    case 'tool_call':
      return extractToolCallProvenance(raw);
    case 'command':
      return extractCommandProvenance(raw);
    case 'file_diff':
      return extractFileDiffProvenance(raw);
    case 'error':
      return extractErrorProvenance(raw);
    case 'node_start':
    case 'node_end':
    case 'node_output':
    case 'node_error':
      return extractNodeProvenance(raw);
    case 'message':
      return raw; // Messages have no special provenance requirements
    default:
      return raw;
  }
}

function extractToolCallProvenance(
  raw: Record<string, unknown>
): Record<string, unknown> {
  const { toolName, args, result } = raw;

  if (!toolName || typeof toolName !== 'string') {
    throw new Error('tool_call provenance requires toolName');
  }

  const provenance: Record<string, unknown> = {
    toolName,
  };

  if (args !== undefined) {
    provenance.args = args;
  }

  if (result !== undefined) {
    provenance.result = result;
  }

  return provenance;
}

function extractCommandProvenance(
  raw: Record<string, unknown>
): Record<string, unknown> {
  const { cmd, exitCode, workingDir } = raw;

  if (!cmd || typeof cmd !== 'string') {
    throw new Error('command provenance requires cmd');
  }

  const provenance: Record<string, unknown> = {
    cmd,
  };

  if (typeof exitCode === 'number') {
    provenance.exitCode = exitCode;
  }

  if (typeof workingDir === 'string') {
    provenance.workingDir = workingDir;
  }

  return provenance;
}

function extractFileDiffProvenance(
  raw: Record<string, unknown>
): Record<string, unknown> {
  const { paths, operation } = raw;

  if (!Array.isArray(paths)) {
    throw new Error('file_diff provenance requires paths array');
  }

  const validPaths = paths.filter((p) => typeof p === 'string');
  if (validPaths.length === 0) {
    throw new Error('file_diff provenance requires at least one valid path');
  }

  const provenance: Record<string, unknown> = {
    paths: validPaths,
  };

  if (
    operation === 'create' ||
    operation === 'update' ||
    operation === 'delete'
  ) {
    provenance.operation = operation;
  }

  return provenance;
}

function extractErrorProvenance(
  raw: Record<string, unknown>
): Record<string, unknown> {
  const { stack, code, source } = raw;

  const provenance: Record<string, unknown> = {};

  if (typeof stack === 'string') {
    provenance.stack = stack;
  }

  if (typeof code === 'string') {
    provenance.code = code;
  }

  if (typeof source === 'string') {
    provenance.source = source;
  }

  return provenance;
}

function extractNodeProvenance(
  raw: Record<string, unknown>
): Record<string, unknown> {
  const { nodeId, nodeName, intent } = raw;

  const provenance: Record<string, unknown> = {};

  if (typeof nodeId === 'string') {
    provenance.nodeId = nodeId;
  }

  if (typeof nodeName === 'string') {
    provenance.nodeName = nodeName;
  }

  if (typeof intent === 'string') {
    provenance.intent = intent;
  }

  return provenance;
}

/**
 * Validate that provenance has required fields for the kind
 */
export function validateProvenance(
  kind: ObservationKind,
  provenance: Record<string, unknown>
): boolean {
  try {
    extractProvenance(kind, provenance);
    return true;
  } catch {
    return false;
  }
}
