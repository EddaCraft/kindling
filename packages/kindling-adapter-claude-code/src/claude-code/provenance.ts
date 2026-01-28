/**
 * Provenance extraction for Claude Code events
 *
 * Extracts structured metadata from events for queryability and explainability.
 */

import type { ClaudeCodeEvent } from './events.js';

/**
 * Extract provenance from a tool use event
 */
export function extractToolUseProvenance(event: ClaudeCodeEvent): Record<string, unknown> {
  if (event.type !== 'post_tool_use') {
    return {};
  }

  const provenance: Record<string, unknown> = {
    toolName: event.toolName,
    hasError: !!event.toolError,
  };

  // Extract tool-specific provenance
  switch (event.toolName) {
    case 'Read':
      provenance.filePath = event.toolInput?.file_path;
      break;

    case 'Write':
      provenance.filePath = event.toolInput?.file_path;
      break;

    case 'Edit':
      provenance.filePath = event.toolInput?.file_path;
      provenance.hasOldString = !!event.toolInput?.old_string;
      break;

    case 'Bash':
      provenance.command = extractCommandName(event.toolInput?.command as string);
      provenance.exitCode = extractExitCode(event.toolResult);
      break;

    case 'Glob':
      provenance.pattern = event.toolInput?.pattern;
      provenance.path = event.toolInput?.path;
      break;

    case 'Grep':
      provenance.pattern = event.toolInput?.pattern;
      provenance.path = event.toolInput?.path;
      break;

    case 'Task':
      provenance.subagentType = event.toolInput?.subagent_type;
      provenance.description = event.toolInput?.description;
      break;

    case 'WebFetch':
      provenance.url = event.toolInput?.url;
      break;

    case 'WebSearch':
      provenance.query = event.toolInput?.query;
      break;

    default:
      // For unknown tools, include sanitized input keys
      if (event.toolInput) {
        provenance.inputKeys = Object.keys(event.toolInput);
      }
  }

  return provenance;
}

/**
 * Extract provenance from a user prompt event
 */
export function extractUserPromptProvenance(event: ClaudeCodeEvent): Record<string, unknown> {
  if (event.type !== 'user_prompt') {
    return {};
  }

  return {
    role: 'user',
    length: event.userContent?.length ?? 0,
  };
}

/**
 * Extract provenance from a subagent stop event
 */
export function extractSubagentProvenance(event: ClaudeCodeEvent): Record<string, unknown> {
  if (event.type !== 'subagent_stop') {
    return {};
  }

  return {
    agentType: event.agentType,
    hasOutput: !!event.agentOutput,
    outputLength: event.agentOutput?.length ?? 0,
  };
}

/**
 * Extract provenance from a stop event
 */
export function extractStopProvenance(event: ClaudeCodeEvent): Record<string, unknown> {
  if (event.type !== 'stop') {
    return {};
  }

  return {
    reason: event.stopReason ?? 'unknown',
  };
}

/**
 * Extract the command name from a full command string
 */
function extractCommandName(command: string | undefined): string | undefined {
  if (!command) return undefined;
  const parts = command.trim().split(/\s+/);
  return parts[0] || undefined;
}

/**
 * Extract exit code from bash tool result
 */
function extractExitCode(result: unknown): number | undefined {
  if (typeof result === 'object' && result !== null) {
    const r = result as Record<string, unknown>;
    if (typeof r.exitCode === 'number') return r.exitCode;
    if (typeof r.exit_code === 'number') return r.exit_code;
  }
  return undefined;
}

/**
 * Extract provenance based on event type
 */
export function extractProvenance(event: ClaudeCodeEvent): Record<string, unknown> {
  switch (event.type) {
    case 'post_tool_use':
      return extractToolUseProvenance(event);

    case 'user_prompt':
      return extractUserPromptProvenance(event);

    case 'subagent_stop':
      return extractSubagentProvenance(event);

    case 'stop':
      return extractStopProvenance(event);

    default:
      return {};
  }
}
