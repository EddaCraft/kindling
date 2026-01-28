#!/usr/bin/env node
/**
 * PostToolUse hook handler
 *
 * Captures tool calls as observations.
 */

import {
  appendObservation,
  getOpenCapsuleForSession,
  incrementCapsuleObservationCount,
} from './lib/db.js';
import { filterContent, filterToolResult, shouldCaptureTool } from './lib/filter.js';

// Read hook context from stdin
let input = '';
process.stdin.setEncoding('utf8');

process.stdin.on('data', (chunk) => {
  input += chunk;
});

process.stdin.on('end', () => {
  try {
    const context = JSON.parse(input);

    const sessionId = context.session_id || context.sessionId || 'unknown';
    const cwd = context.cwd || process.cwd();
    const toolName = context.tool_name || context.toolName || 'unknown';
    const toolInput = context.tool_input || context.toolInput || {};
    const toolResult = context.tool_result || context.toolResult;
    const toolError = context.tool_error || context.toolError;

    // Skip noisy tools
    if (!shouldCaptureTool(toolName)) {
      console.log(JSON.stringify({ continue: true }));
      return;
    }

    // Get current capsule
    const capsule = getOpenCapsuleForSession(sessionId);

    // Determine observation kind
    let kind = 'tool_call';
    if (toolName === 'Write' || toolName === 'Edit') {
      kind = 'file_diff';
    } else if (toolName === 'Bash') {
      kind = 'command';
    }

    // Format content
    const content = formatToolContent(toolName, toolInput, toolResult, toolError);

    // Extract provenance
    const provenance = extractProvenance(toolName, toolInput, toolResult, toolError);

    // Create observation
    const observation = appendObservation({
      kind,
      content: filterContent(content),
      provenance,
      scopeIds: {
        sessionId,
        repoId: cwd,
      },
      capsuleId: capsule?.id,
    });

    // Update capsule count
    if (capsule) {
      incrementCapsuleObservationCount(capsule.id);
    }

    // Log for debugging
    console.error(`[kindling] Captured ${toolName} -> ${observation.id.slice(0, 8)}`);

    // Return continue signal
    console.log(JSON.stringify({ continue: true }));
  } catch (error) {
    console.error(`[kindling] PostToolUse error: ${error.message}`);
    console.log(JSON.stringify({ continue: true }));
  }
});

/**
 * Format tool content for readability
 */
function formatToolContent(toolName, input, result, error) {
  const parts = [`Tool: ${toolName}`];

  switch (toolName) {
    case 'Read':
      if (input.file_path) parts.push(`File: ${input.file_path}`);
      break;

    case 'Write':
      if (input.file_path) parts.push(`File: ${input.file_path}`);
      parts.push('Action: Created/overwrote file');
      break;

    case 'Edit':
      if (input.file_path) parts.push(`File: ${input.file_path}`);
      parts.push('Action: Edited file');
      break;

    case 'Bash':
      if (input.command) parts.push(`$ ${input.command}`);
      if (result) {
        const resultStr = filterToolResult(toolName, result);
        if (resultStr) parts.push(resultStr);
      }
      break;

    case 'Glob':
      if (input.pattern) parts.push(`Pattern: ${input.pattern}`);
      break;

    case 'Grep':
      if (input.pattern) parts.push(`Pattern: ${input.pattern}`);
      break;

    case 'Task':
      if (input.subagent_type) parts.push(`Agent: ${input.subagent_type}`);
      if (input.description) parts.push(`Task: ${input.description}`);
      break;

    default:
      if (input && Object.keys(input).length > 0) {
        parts.push(`Input: ${Object.keys(input).join(', ')}`);
      }
  }

  if (error) {
    parts.push(`Error: ${error}`);
  }

  return parts.join('\n');
}

/**
 * Extract provenance metadata
 */
function extractProvenance(toolName, input, result, error) {
  const provenance = {
    toolName,
    hasError: !!error,
  };

  switch (toolName) {
    case 'Read':
    case 'Write':
    case 'Edit':
      provenance.filePath = input.file_path;
      break;

    case 'Bash':
      provenance.command = input.command?.split(' ')[0];
      if (result?.exitCode !== undefined) {
        provenance.exitCode = result.exitCode;
      }
      break;

    case 'Glob':
    case 'Grep':
      provenance.pattern = input.pattern;
      break;

    case 'Task':
      provenance.agentType = input.subagent_type;
      break;
  }

  return provenance;
}
