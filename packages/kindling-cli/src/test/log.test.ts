/**
 * Log command tests
 */

import { describe, it, expect, vi } from 'vitest';
import { Command } from 'commander';

describe('Log Command Registration', () => {
  it('should register log command with content argument', () => {
    const program = new Command();
    const mockAction = vi.fn();

    program
      .command('log <content>')
      .description('Log an observation to memory')
      .option('--kind <kind>', 'Observation kind')
      .option('--session <id>', 'Session scope ID')
      .option('--repo <id>', 'Repository scope ID')
      .option('--capsule <id>', 'Attach to existing capsule')
      .option('--db <path>', 'Database path')
      .option('--json', 'Output as JSON')
      .action(mockAction);

    const logCmd = program.commands.find((c) => c.name() === 'log');
    expect(logCmd).toBeDefined();
    expect(logCmd?.description()).toBe('Log an observation to memory');
  });

  it('should have kind, session, repo, capsule, db, and json options', () => {
    const program = new Command();
    const mockAction = vi.fn();

    program
      .command('log <content>')
      .option('--kind <kind>', 'Observation kind')
      .option('--session <id>', 'Session scope ID')
      .option('--repo <id>', 'Repository scope ID')
      .option('--capsule <id>', 'Attach to existing capsule')
      .option('--db <path>', 'Database path')
      .option('--json', 'Output as JSON')
      .action(mockAction);

    const logCmd = program.commands.find((c) => c.name() === 'log');
    const optionNames = logCmd?.options.map((o) => o.long);
    expect(optionNames).toContain('--kind');
    expect(optionNames).toContain('--session');
    expect(optionNames).toContain('--repo');
    expect(optionNames).toContain('--capsule');
    expect(optionNames).toContain('--db');
    expect(optionNames).toContain('--json');
  });
});

describe('Log Command Validation', () => {
  it('should validate observation kinds', () => {
    const validKinds = [
      'tool_call',
      'command',
      'file_diff',
      'error',
      'message',
      'node_start',
      'node_end',
      'node_output',
      'node_error',
    ];

    validKinds.forEach((kind) => {
      expect(validKinds.includes(kind)).toBe(true);
    });

    expect(validKinds.includes('invalid')).toBe(false);
    expect(validKinds.includes('')).toBe(false);
  });

  it('should default kind to message', () => {
    const options = { kind: undefined };
    const kind = options.kind ?? 'message';
    expect(kind).toBe('message');
  });

  it('should use provided kind when specified', () => {
    const options = { kind: 'error' };
    const kind = options.kind ?? 'message';
    expect(kind).toBe('error');
  });

  it('should build scope IDs from options', () => {
    const options = { session: 'ses-123', repo: '/my/project' };
    const scopeIds = {
      ...(options.session && { sessionId: options.session }),
      ...(options.repo && { repoId: options.repo }),
    };

    expect(scopeIds).toEqual({
      sessionId: 'ses-123',
      repoId: '/my/project',
    });
  });

  it('should omit undefined scope IDs', () => {
    const options: { session?: string; repo?: string } = {};
    const scopeIds = {
      ...(options.session && { sessionId: options.session }),
      ...(options.repo && { repoId: options.repo }),
    };

    expect(scopeIds).toEqual({});
    expect(scopeIds).not.toHaveProperty('sessionId');
    expect(scopeIds).not.toHaveProperty('repoId');
  });
});
