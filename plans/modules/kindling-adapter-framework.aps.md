# kindling-adapter-framework

## Purpose

Provide a standard adapter contract and base implementation so that adding support for new AI coding platforms (Claude Code, Cursor, Aider, Windsurf, etc.) requires minimal code—just platform-specific event mapping and content formatting.

## Goals

- Define a platform-agnostic event model (`AdapterEvent`)
- Provide a `BaseSessionAdapter` abstract class with shared lifecycle logic
- Standardize event ingestion (HTTP, stdin, file watch)
- Reduce per-platform adapter code to ~50-100 lines
- Document adapter development for contributors

## Non-Goals

- Platform-specific features beyond observation capture
- Real-time streaming or WebSocket support (v1)
- Authentication or multi-tenant concerns

## Design

### Standard Event Model

```typescript
export interface AdapterEvent {
  type: AdapterEventType;
  sessionId: string;
  timestamp: number;
  data: Record<string, unknown>;
}

export type AdapterEventType =
  | 'session_start'
  | 'session_end'
  | 'tool_call'
  | 'command'
  | 'error'
  | 'message'
  | 'file_diff';
```

### Base Adapter Interface

```typescript
export interface BaseAdapter {
  handleEvent(event: AdapterEvent): void;
  getSessionCapsuleId(sessionId: string): string | undefined;
}
```

### BaseSessionAdapter Abstract Class

Lives in `@eddacraft/kindling-core/src/adapter/base-adapter.ts`:

- Manages session → capsule mapping
- Implements `handleEvent()` dispatch
- Provides `onSessionStart()`, `onObservation()`, `onSessionEnd()` methods
- Subclasses override:
  - `formatContent(event): string` — platform-specific content formatting
  - `mapEventToKind(type): ObservationKind` — optional override for custom mapping

> **Boundary note:** Intent inference is out of scope for adapters. Adapters capture raw observations with provenance; interpretation belongs to downstream systems.

### Event Receiver

Shared utility for receiving events from external sources:

```typescript
export function createEventReceiver(
  adapter: BaseAdapter,
  options: EventReceiverOptions,
): EventReceiver;

export interface EventReceiverOptions {
  mode: 'http' | 'stdin' | 'file';
  port?: number; // for HTTP mode
  path?: string; // for file watch mode
}

export interface EventReceiver {
  start(): Promise<void>;
  stop(): Promise<void>;
}
```

### Platform Adapter Example

```typescript
// packages/kindling-adapter-claude-code/src/adapter.ts
export class ClaudeCodeAdapter extends BaseSessionAdapter {
  protected formatContent(event: AdapterEvent): string {
    if (event.type === 'tool_call') {
      const { toolName, result } = event.data;
      return `${toolName}: ${truncate(String(result))}`;
    }
    return String(event.data.content || '');
  }
}
```

## Tasks

### ADAPTER-FW-001: Define AdapterEvent types

- Create `@eddacraft/kindling-core/src/adapter/types.ts`
- Define `AdapterEvent`, `AdapterEventType`, `BaseAdapter` interface
- Export from core index

### ADAPTER-FW-002: Implement BaseSessionAdapter

- Create `@eddacraft/kindling-core/src/adapter/base-adapter.ts`
- Implement session lifecycle management
- Implement event dispatch and observation creation
- Add override points for platform-specific logic (formatContent, mapEventToKind)
- No intent inference — adapters capture raw observations with provenance

### ADAPTER-FW-003: Create event receiver utility

- Create `@eddacraft/kindling-core/src/adapter/event-receiver.ts`
- Implement HTTP mode (simple JSON POST endpoint)
- Implement stdin mode (newline-delimited JSON)
- Implement file watch mode (tail -f style)

### ADAPTER-FW-004: Create Claude Code adapter

- Create `packages/kindling-adapter-claude-code/`
- Extend BaseSessionAdapter
- Map Claude Code hook events to AdapterEvent
- Document hook configuration

### ADAPTER-FW-005: Create Cursor adapter

- Create `packages/kindling-adapter-cursor/`
- Extend BaseSessionAdapter
- Map Cursor events to AdapterEvent

### ADAPTER-FW-006: Adapter development documentation

- Add `docs/adapter-development.md`
- Document event model and mapping
- Provide step-by-step guide for new adapters
- Include example hook configurations

## Dependencies

- kindling-core (types, KindlingService)

## Open Questions

- Should event receiver live in core or a separate `@kindling/adapter-common` package?
- What's the best integration method for Claude Code? (hooks.toml → file → adapter, or direct plugin?)
- Should we support batched event ingestion for performance?
