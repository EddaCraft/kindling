/**
 * Content filtering tests for Claude Code adapter
 */

import { describe, it, expect } from 'vitest';
import {
  truncateContent,
  containsSecrets,
  maskSecrets,
  filterContent,
  isExcludedPath,
  shouldCaptureToolResult,
  filterToolResult,
} from '../claude-code/filter.js';

describe('truncateContent', () => {
  it('should not truncate content under limit', () => {
    const content = 'short content';
    const result = truncateContent(content, { maxLength: 100 });
    expect(result).toBe(content);
  });

  it('should truncate content over limit', () => {
    const content = 'a'.repeat(100);
    const result = truncateContent(content, { maxLength: 50 });
    expect(result).toContain('[Truncated 50 characters]');
    expect(result.length).toBeLessThan(100);
  });

  it('should not show notice when disabled', () => {
    const content = 'a'.repeat(100);
    const result = truncateContent(content, { maxLength: 50, showTruncationNotice: false });
    expect(result).not.toContain('[Truncated');
    expect(result.length).toBe(50);
  });

  it('should use default max length', () => {
    const content = 'short';
    const result = truncateContent(content);
    expect(result).toBe(content);
  });
});

describe('containsSecrets', () => {
  it('should detect API key patterns', () => {
    expect(containsSecrets('api_key=abc123def456')).toBe(true);
    expect(containsSecrets('apikey: "secret123"')).toBe(true);
    expect(containsSecrets('token = xyz789')).toBe(true);
  });

  it('should detect Bearer tokens', () => {
    expect(containsSecrets('Authorization: Bearer eyJhbGciOiJIUzI1NiIs')).toBe(true);
  });

  it('should detect Basic auth', () => {
    expect(containsSecrets('Authorization: Basic dXNlcjpwYXNz')).toBe(true);
  });

  it('should detect Anthropic API keys', () => {
    const anthropicKey = 'sk-ant-' + 'a'.repeat(95);
    expect(containsSecrets(anthropicKey)).toBe(true);
  });

  it('should detect OpenAI API keys', () => {
    const openaiKey = 'sk-' + 'a'.repeat(50);
    expect(containsSecrets(openaiKey)).toBe(true);
  });

  it('should not flag normal content', () => {
    expect(containsSecrets('This is normal text')).toBe(false);
    expect(containsSecrets('const value = getValue()')).toBe(false);
    expect(containsSecrets('function process() { return data; }')).toBe(false);
  });
});

describe('maskSecrets', () => {
  it('should mask API key values', () => {
    const content = 'api_key=secret123';
    const result = maskSecrets(content);
    expect(result).toContain('[REDACTED]');
    expect(result).not.toContain('secret123');
  });

  it('should mask Bearer tokens', () => {
    const content = 'Bearer eyJhbGciOiJIUzI1NiIs';
    const result = maskSecrets(content);
    expect(result).toBe('[REDACTED]');
  });

  it('should preserve non-secret content', () => {
    const content = 'This is normal text\napi_key=secret\nMore text';
    const result = maskSecrets(content);
    expect(result).toContain('This is normal text');
    expect(result).toContain('More text');
    expect(result).not.toContain('secret');
  });
});

describe('filterContent', () => {
  it('should apply both masking and truncation', () => {
    const longSecret = 'password=' + 'a'.repeat(100);
    const result = filterContent(longSecret, { maxLength: 50, maskSecrets: true });
    expect(result).toContain('[REDACTED]');
  });

  it('should skip masking when disabled', () => {
    const content = 'api_key=secret123';
    const result = filterContent(content, { maskSecrets: false });
    expect(result).toContain('secret123');
  });

  it('should mask by default', () => {
    const content = 'api_key=secret123';
    const result = filterContent(content);
    expect(result).not.toContain('secret123');
  });
});

describe('isExcludedPath', () => {
  it('should exclude node_modules', () => {
    expect(isExcludedPath('/project/node_modules/package/index.js')).toBe(true);
  });

  it('should exclude .git directory', () => {
    expect(isExcludedPath('/project/.git/config')).toBe(true);
  });

  it('should exclude .env files', () => {
    expect(isExcludedPath('/project/.env')).toBe(true);
  });

  it('should exclude .pem files', () => {
    expect(isExcludedPath('/secrets/key.pem')).toBe(true);
  });

  it('should exclude credentials paths', () => {
    expect(isExcludedPath('/home/user/.credentials/token')).toBe(true);
  });

  it('should not exclude normal paths', () => {
    expect(isExcludedPath('/project/src/index.ts')).toBe(false);
    expect(isExcludedPath('/project/package.json')).toBe(false);
  });
});

describe('shouldCaptureToolResult', () => {
  it('should capture Read results', () => {
    expect(shouldCaptureToolResult('Read')).toBe(true);
  });

  it('should capture Bash results', () => {
    expect(shouldCaptureToolResult('Bash')).toBe(true);
  });

  it('should not capture WebSearch results', () => {
    expect(shouldCaptureToolResult('WebSearch')).toBe(false);
  });
});

describe('filterToolResult', () => {
  it('should return null for undefined result', () => {
    expect(filterToolResult('Read', undefined)).toBe(null);
  });

  it('should return null for null result', () => {
    expect(filterToolResult('Read', null)).toBe(null);
  });

  it('should return placeholder for skipped tools', () => {
    expect(filterToolResult('WebSearch', { results: [] })).toBe('[Result not captured]');
  });

  it('should stringify object results', () => {
    const result = filterToolResult('Bash', { exitCode: 0, stdout: 'ok' });
    expect(result).toContain('exitCode');
    expect(result).toContain('stdout');
  });

  it('should truncate long results', () => {
    const longResult = 'a'.repeat(20000);
    const result = filterToolResult('Read', longResult, 100);
    expect(result).toContain('[Truncated');
  });

  it('should mask secrets in results', () => {
    const result = filterToolResult('Bash', 'api_key=secret123');
    expect(result).not.toContain('secret123');
    expect(result).toContain('[REDACTED]');
  });
});
