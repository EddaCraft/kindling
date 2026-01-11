# @kindling/adapter-pocketflow

PocketFlow adapter for Kindling - captures workflow executions with intent and confidence.

## Installation

```bash
npm install @kindling/adapter-pocketflow
```

## Overview

`@kindling/adapter-pocketflow` integrates PocketFlow workflow nodes with Kindling's memory system. It automatically captures workflow executions, determines intent from node names, and calculates confidence based on success patterns.

## Features

- **Automatic Capsule Creation** - Each workflow node execution creates a capsule
- **Intent Detection** - Infers intent (test, build, deploy, etc.) from node names
- **Confidence Calculation** - Tracks success history to compute confidence scores
- **High-Signal Filtering** - Captures meaningful workflow events only
- **Provenance Tracking** - Full workflow context preserved

## Usage

### Basic Integration

```typescript
import { NodeAdapter, NodeStatus } from '@kindling/adapter-pocketflow';
import { KindlingService } from '@kindling/core';

// Initialize adapter
const adapter = new NodeAdapter({
  service: kindlingService,
  repoId: '/home/user/my-project',
});

// Node execution starts
adapter.onNodeStart({
  node: { id: 'test-1', name: 'run-integration-tests' },
  status: NodeStatus.Running,
  timestamp: Date.now(),
});

// Node produces output
adapter.onNodeOutput({
  node: { id: 'test-1', name: 'run-integration-tests' },
  output: { passed: 42, failed: 0, duration: '12.5s' },
  timestamp: Date.now(),
});

// Node execution completes
adapter.onNodeEnd({
  node: { id: 'test-1', name: 'run-integration-tests' },
  status: NodeStatus.Success,
  timestamp: Date.now(),
});
```

### Handling Errors

```typescript
// Node error
adapter.onNodeError({
  node: { id: 'deploy-1', name: 'deploy-to-staging' },
  error: {
    message: 'Connection timeout',
    stack: 'Error: Connection timeout\n  at deploy.ts:42',
  },
  timestamp: Date.now(),
});

// Node ends with failure
adapter.onNodeEnd({
  node: { id: 'deploy-1', name: 'deploy-to-staging' },
  status: NodeStatus.Failed,
  timestamp: Date.now(),
});
```

## Intent Detection

The adapter automatically detects intent from node names:

### Test Intent
Patterns: `test`, `spec`, `jest`, `vitest`, `pytest`, `check`

```typescript
// Detected as intent: 'test'
{ node: { name: 'run-unit-tests' } }
{ node: { name: 'integration-spec' } }
{ node: { name: 'pytest-validation' } }
```

### Build Intent
Patterns: `build`, `compile`, `bundle`, `webpack`, `tsc`

```typescript
// Detected as intent: 'build'
{ node: { name: 'build-production' } }
{ node: { name: 'compile-typescript' } }
{ node: { name: 'webpack-bundle' } }
```

### Deploy Intent
Patterns: `deploy`, `release`, `publish`, `ship`

```typescript
// Detected as intent: 'deploy'
{ node: { name: 'deploy-to-production' } }
{ node: { name: 'publish-package' } }
{ node: { name: 'ship-release' } }
```

### Lint Intent
Patterns: `lint`, `format`, `prettier`, `eslint`

```typescript
// Detected as intent: 'lint'
{ node: { name: 'run-eslint' } }
{ node: { name: 'format-check' } }
```

### Debug Intent
Patterns: `debug`, `investigate`, `diagnose`, `trace`

```typescript
// Detected as intent: 'debug'
{ node: { name: 'debug-memory-leak' } }
{ node: { name: 'trace-performance' } }
```

### Default Intent
If no pattern matches, intent is set to `'workflow'`.

## Confidence Calculation

Confidence is calculated based on historical success rates for similar workflows:

### Success Tracking
- **Success**: Node completes with `NodeStatus.Success`
- **Failure**: Node completes with `NodeStatus.Failed` or has errors

### Confidence Formula

```
confidence = successCount / totalCount
```

- **High confidence (0.8+)**: Reliable, well-tested workflow
- **Medium confidence (0.5-0.8)**: Somewhat reliable
- **Low confidence (<0.5)**: Unreliable or new workflow

### Example

```typescript
// First run: no history, confidence = 0.5 (default)
adapter.onNodeEnd({
  node: { name: 'deploy-app' },
  status: NodeStatus.Success,
});
// confidence = 0.5

// Second run: 1 success, confidence increases
adapter.onNodeEnd({
  node: { name: 'deploy-app' },
  status: NodeStatus.Success,
});
// confidence = 0.75

// Third run: success again
adapter.onNodeEnd({
  node: { name: 'deploy-app' },
  status: NodeStatus.Success,
});
// confidence = 0.9
```

## Captured Observations

The adapter captures these observation types:

### NodeStart
When workflow node execution begins.

```typescript
{
  kind: ObservationKind.NodeStart,
  content: 'run-integration-tests',
  provenance: {
    nodeId: 'test-1',
    nodeName: 'run-integration-tests',
    status: NodeStatus.Running,
  },
}
```

### NodeOutput
When workflow node produces output.

```typescript
{
  kind: ObservationKind.NodeOutput,
  content: JSON.stringify(output),
  provenance: {
    nodeId: 'test-1',
    nodeName: 'run-integration-tests',
    output: { passed: 42, failed: 0 },
  },
}
```

### NodeError
When workflow node encounters an error.

```typescript
{
  kind: ObservationKind.NodeError,
  content: 'Connection timeout',
  provenance: {
    nodeId: 'deploy-1',
    nodeName: 'deploy-to-staging',
    error: { message: '...', stack: '...' },
  },
}
```

### NodeEnd
When workflow node execution completes.

```typescript
{
  kind: ObservationKind.NodeEnd,
  content: 'run-integration-tests completed: Success',
  provenance: {
    nodeId: 'test-1',
    nodeName: 'run-integration-tests',
    status: NodeStatus.Success,
    confidence: 0.9,
  },
}
```

## Capsule Lifecycle

Each workflow node execution creates a capsule:

1. **onNodeStart** - Opens a capsule with detected intent
2. **onNodeOutput/onNodeError** - Appends observations to capsule
3. **onNodeEnd** - Closes capsule with summary and confidence

### Summary Generation

On capsule close, a summary observation is automatically created:

```typescript
{
  kind: ObservationKind.Message,
  content: 'Workflow: run-integration-tests (Success)',
  provenance: {
    confidence: 0.9,
    intent: 'test',
    status: NodeStatus.Success,
  },
}
```

## Configuration

### Adapter Options

```typescript
interface NodeAdapterOptions {
  service: KindlingService;  // Kindling service instance
  repoId: string;            // Repository identifier
  agentId?: string;          // Optional agent identifier
  userId?: string;           // Optional user identifier
}
```

## Privacy & Filtering

The adapter respects safety filters:

- **Large outputs** are truncated to prevent excessive storage
- **Sensitive data** in output is automatically redacted (if configured)
- **Failed nodes** are still captured for debugging

## Related Packages

- **[@kindling/core](../kindling-core)** - Core domain model
- **[@kindling/adapter-opencode](../kindling-adapter-opencode)** - OpenCode integration
- **[@kindling/cli](../kindling-cli)** - CLI for inspection

## License

Apache-2.0
