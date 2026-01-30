/**
 * Event mapping tests for Claude Code adapter
 */

import { describe, it, expect } from 'vitest';
import { mapEvent, mapEvents } from '../claude-code/mapping.js';
import type { ClaudeCodeEvent } from '../claude-code/events.js';

describe('mapEvent', () => {
  const baseEvent = {
    timestamp: Date.now(),
    sessionId: 'session-123',
    cwd: '/home/user/project',
  };

  describe('post_tool_use events', () => {
    it('should map Read tool to tool_call observation', () => {
      const event: ClaudeCodeEvent = {
        ...baseEvent,
        type: 'post_tool_use',
        toolName: 'Read',
        toolInput: { file_path: '/src/index.ts' },
        toolResult: 'file contents...',
      };

      const result = mapEvent(event);

      expect(result.observation).toBeDefined();
      expect(result.observation?.kind).toBe('tool_call');
      expect(result.observation?.content).toContain('Tool: Read');
      expect(result.observation?.content).toContain('File: /src/index.ts');
    });

    it('should map Write tool to file_diff observation', () => {
      const event: ClaudeCodeEvent = {
        ...baseEvent,
        type: 'post_tool_use',
        toolName: 'Write',
        toolInput: { file_path: '/src/new-file.ts', content: 'code' },
      };

      const result = mapEvent(event);

      expect(result.observation).toBeDefined();
      expect(result.observation?.kind).toBe('file_diff');
      expect(result.observation?.content).toContain('Tool: Write');
    });

    it('should map Edit tool to file_diff observation', () => {
      const event: ClaudeCodeEvent = {
        ...baseEvent,
        type: 'post_tool_use',
        toolName: 'Edit',
        toolInput: { file_path: '/src/app.ts', old_string: 'old', new_string: 'new' },
      };

      const result = mapEvent(event);

      expect(result.observation).toBeDefined();
      expect(result.observation?.kind).toBe('file_diff');
    });

    it('should map Bash tool to command observation', () => {
      const event: ClaudeCodeEvent = {
        ...baseEvent,
        type: 'post_tool_use',
        toolName: 'Bash',
        toolInput: { command: 'npm test' },
        toolResult: { exitCode: 0, stdout: 'All tests passed' },
      };

      const result = mapEvent(event);

      expect(result.observation).toBeDefined();
      expect(result.observation?.kind).toBe('command');
      expect(result.observation?.content).toContain('$ npm test');
    });

    it('should map Glob tool to tool_call observation', () => {
      const event: ClaudeCodeEvent = {
        ...baseEvent,
        type: 'post_tool_use',
        toolName: 'Glob',
        toolInput: { pattern: '**/*.ts', path: '/src' },
      };

      const result = mapEvent(event);

      expect(result.observation).toBeDefined();
      expect(result.observation?.kind).toBe('tool_call');
      expect(result.observation?.content).toContain('Pattern: **/*.ts');
    });

    it('should map Grep tool to tool_call observation', () => {
      const event: ClaudeCodeEvent = {
        ...baseEvent,
        type: 'post_tool_use',
        toolName: 'Grep',
        toolInput: { pattern: 'TODO', path: '/src' },
      };

      const result = mapEvent(event);

      expect(result.observation).toBeDefined();
      expect(result.observation?.kind).toBe('tool_call');
      expect(result.observation?.content).toContain('Pattern: TODO');
    });

    it('should map Task tool to tool_call observation', () => {
      const event: ClaudeCodeEvent = {
        ...baseEvent,
        type: 'post_tool_use',
        toolName: 'Task',
        toolInput: { subagent_type: 'Explore', description: 'Find auth files' },
      };

      const result = mapEvent(event);

      expect(result.observation).toBeDefined();
      expect(result.observation?.kind).toBe('tool_call');
      expect(result.observation?.content).toContain('Agent: Explore');
      expect(result.observation?.content).toContain('Task: Find auth files');
    });

    it('should include error in content when tool fails', () => {
      const event: ClaudeCodeEvent = {
        ...baseEvent,
        type: 'post_tool_use',
        toolName: 'Read',
        toolInput: { file_path: '/nonexistent.ts' },
        toolError: 'File not found',
      };

      const result = mapEvent(event);

      expect(result.observation).toBeDefined();
      expect(result.observation?.content).toContain('Error: File not found');
    });

    it('should return error for missing toolName', () => {
      const event: ClaudeCodeEvent = {
        ...baseEvent,
        type: 'post_tool_use',
        toolInput: {},
      } as ClaudeCodeEvent;

      const result = mapEvent(event);

      expect(result.error).toBe('Tool use event missing toolName');
    });

    it('should include scopeIds with sessionId and repoId', () => {
      const event: ClaudeCodeEvent = {
        ...baseEvent,
        type: 'post_tool_use',
        toolName: 'Read',
        toolInput: { file_path: '/src/index.ts' },
      };

      const result = mapEvent(event);

      expect(result.observation?.scopeIds).toEqual({
        sessionId: 'session-123',
        repoId: '/home/user/project',
      });
    });
  });

  describe('user_prompt events', () => {
    it('should map user prompt to message observation', () => {
      const event: ClaudeCodeEvent = {
        ...baseEvent,
        type: 'user_prompt',
        userContent: 'Please fix the bug in auth.ts',
      };

      const result = mapEvent(event);

      expect(result.observation).toBeDefined();
      expect(result.observation?.kind).toBe('message');
      expect(result.observation?.content).toContain('Please fix the bug');
    });

    it('should return error for missing content', () => {
      const event: ClaudeCodeEvent = {
        ...baseEvent,
        type: 'user_prompt',
      };

      const result = mapEvent(event);

      expect(result.error).toBe('User prompt event missing content');
    });
  });

  describe('subagent_stop events', () => {
    it('should map subagent stop to node_end observation', () => {
      const event: ClaudeCodeEvent = {
        ...baseEvent,
        type: 'subagent_stop',
        agentType: 'Explore',
        agentOutput: 'Found 3 relevant files',
      };

      const result = mapEvent(event);

      expect(result.observation).toBeDefined();
      expect(result.observation?.kind).toBe('node_end');
      expect(result.observation?.content).toContain('Subagent: Explore');
      expect(result.observation?.content).toContain('Found 3 relevant files');
    });
  });

  describe('skipped events', () => {
    it('should skip session_start events', () => {
      const event: ClaudeCodeEvent = {
        ...baseEvent,
        type: 'session_start',
      };

      const result = mapEvent(event);

      expect(result.skip).toBe(true);
      expect(result.observation).toBeUndefined();
    });

    it('should skip stop events', () => {
      const event: ClaudeCodeEvent = {
        ...baseEvent,
        type: 'stop',
        stopReason: 'complete',
      };

      const result = mapEvent(event);

      expect(result.skip).toBe(true);
    });

    it('should skip pre_compact events', () => {
      const event: ClaudeCodeEvent = {
        ...baseEvent,
        type: 'pre_compact',
      };

      const result = mapEvent(event);

      expect(result.skip).toBe(true);
    });
  });
});

describe('mapEvents', () => {
  it('should map multiple events and filter skipped ones', () => {
    const events: ClaudeCodeEvent[] = [
      {
        type: 'session_start',
        timestamp: Date.now(),
        sessionId: 'session-1',
        cwd: '/project',
      },
      {
        type: 'post_tool_use',
        timestamp: Date.now(),
        sessionId: 'session-1',
        cwd: '/project',
        toolName: 'Read',
        toolInput: { file_path: '/src/index.ts' },
      },
      {
        type: 'user_prompt',
        timestamp: Date.now(),
        sessionId: 'session-1',
        cwd: '/project',
        userContent: 'Hello',
      },
      {
        type: 'stop',
        timestamp: Date.now(),
        sessionId: 'session-1',
        cwd: '/project',
      },
    ];

    const observations = mapEvents(events);

    // Should only include tool_use and user_prompt (2 out of 4)
    expect(observations).toHaveLength(2);
    expect(observations[0].kind).toBe('tool_call');
    expect(observations[1].kind).toBe('message');
  });

  it('should return empty array for empty input', () => {
    const observations = mapEvents([]);
    expect(observations).toHaveLength(0);
  });
});
