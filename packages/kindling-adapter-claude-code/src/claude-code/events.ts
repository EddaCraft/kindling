/**
 * Claude Code hook event type definitions
 *
 * These represent events emitted by Claude Code hooks during sessions.
 * Based on Claude Code hooks documentation.
 */

/**
 * Base context provided to all hooks
 */
export interface HookContext {
  /** Current working directory */
  cwd: string;
  /** Session ID */
  sessionId: string;
  /** Transcript path (readonly) */
  transcriptPath?: string;
}

/**
 * Tool use input/output for PreToolUse and PostToolUse hooks
 */
export interface ToolUseContext extends HookContext {
  /** Tool name (Read, Write, Edit, Bash, Glob, Grep, etc.) */
  toolName: string;
  /** Tool input parameters */
  toolInput: Record<string, unknown>;
}

/**
 * PostToolUse hook context with result
 */
export interface PostToolUseContext extends ToolUseContext {
  /** Tool result (success case) */
  toolResult?: unknown;
  /** Tool error (failure case) */
  toolError?: string;
}

/**
 * SessionStart hook context
 */
export interface SessionStartContext extends HookContext {
  /** Optional project name derived from cwd */
  projectName?: string;
}

/**
 * Stop hook context
 */
export interface StopContext extends HookContext {
  /** Stop reason */
  reason?: 'user' | 'complete' | 'error' | 'interrupt';
  /** Final transcript summary if available */
  summary?: string;
}

/**
 * SubagentStop hook context
 */
export interface SubagentStopContext extends HookContext {
  /** Subagent type */
  agentType: string;
  /** Subagent task description */
  task?: string;
  /** Subagent output */
  output?: string;
}

/**
 * UserPromptSubmit hook context
 */
export interface UserPromptSubmitContext extends HookContext {
  /** User's message content */
  content: string;
}

/**
 * PreCompact hook context
 */
export interface PreCompactContext extends HookContext {
  /** Token count before compaction */
  tokenCount?: number;
}

/**
 * Claude Code hook event - unified type for all hook events
 */
export interface ClaudeCodeEvent {
  /** Hook type */
  type:
    | 'session_start'
    | 'pre_tool_use'
    | 'post_tool_use'
    | 'stop'
    | 'subagent_stop'
    | 'user_prompt'
    | 'pre_compact';
  /** Event timestamp */
  timestamp: number;
  /** Session ID */
  sessionId: string;
  /** Working directory (used as repoId) */
  cwd: string;
  /** Tool name (for tool use events) */
  toolName?: string;
  /** Tool input parameters */
  toolInput?: Record<string, unknown>;
  /** Tool result */
  toolResult?: unknown;
  /** Tool error */
  toolError?: string;
  /** User message content */
  userContent?: string;
  /** Subagent type */
  agentType?: string;
  /** Subagent output */
  agentOutput?: string;
  /** Stop reason */
  stopReason?: string;
}

/**
 * Create event from SessionStart hook
 */
export function createSessionStartEvent(ctx: SessionStartContext): ClaudeCodeEvent {
  return {
    type: 'session_start',
    timestamp: Date.now(),
    sessionId: ctx.sessionId,
    cwd: ctx.cwd,
  };
}

/**
 * Create event from PostToolUse hook
 */
export function createPostToolUseEvent(ctx: PostToolUseContext): ClaudeCodeEvent {
  return {
    type: 'post_tool_use',
    timestamp: Date.now(),
    sessionId: ctx.sessionId,
    cwd: ctx.cwd,
    toolName: ctx.toolName,
    toolInput: ctx.toolInput,
    toolResult: ctx.toolResult,
    toolError: ctx.toolError,
  };
}

/**
 * Create event from Stop hook
 */
export function createStopEvent(ctx: StopContext): ClaudeCodeEvent {
  return {
    type: 'stop',
    timestamp: Date.now(),
    sessionId: ctx.sessionId,
    cwd: ctx.cwd,
    stopReason: ctx.reason,
  };
}

/**
 * Create event from SubagentStop hook
 */
export function createSubagentStopEvent(ctx: SubagentStopContext): ClaudeCodeEvent {
  return {
    type: 'subagent_stop',
    timestamp: Date.now(),
    sessionId: ctx.sessionId,
    cwd: ctx.cwd,
    agentType: ctx.agentType,
    agentOutput: ctx.output,
  };
}

/**
 * Create event from UserPromptSubmit hook
 */
export function createUserPromptEvent(ctx: UserPromptSubmitContext): ClaudeCodeEvent {
  return {
    type: 'user_prompt',
    timestamp: Date.now(),
    sessionId: ctx.sessionId,
    cwd: ctx.cwd,
    userContent: ctx.content,
  };
}

/**
 * Create event from PreCompact hook
 */
export function createPreCompactEvent(ctx: PreCompactContext): ClaudeCodeEvent {
  return {
    type: 'pre_compact',
    timestamp: Date.now(),
    sessionId: ctx.sessionId,
    cwd: ctx.cwd,
  };
}

/**
 * Type guard for Claude Code events
 */
export function isClaudeCodeEvent(event: unknown): event is ClaudeCodeEvent {
  if (typeof event !== 'object' || event === null) {
    return false;
  }

  const e = event as Record<string, unknown>;
  return (
    typeof e.type === 'string' &&
    typeof e.timestamp === 'number' &&
    typeof e.sessionId === 'string' &&
    typeof e.cwd === 'string'
  );
}
