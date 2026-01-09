import { randomUUID } from 'node:crypto';
import type {
  CapsuleStore,
  Observation,
  ObservationInput,
  CapsuleInput,
  ScopeIds,
  ID,
} from '@kindling/core';

export interface PocketFlowStore extends CapsuleStore {
  insertObservation(observation: ObservationInput): Observation;
  attachObservationToCapsule(capsuleId: ID, observationId: ID): void;
}

export interface KindlingNodeContext {
  store: PocketFlowStore;
  scopeIds: ScopeIds;
  capsuleId?: string;
}

export interface NodeMetadata {
  name: string;
  intent?: string;
}

type NonIterableObject = Partial<Record<string, unknown>> & { [Symbol.iterator]?: never };

function truncateOutput(output: unknown, maxLength: number = 2000): string {
  let str: string;
  if (output === undefined) {
    str = 'undefined';
  } else if (typeof output === 'string') {
    str = output;
  } else if (typeof output === 'bigint') {
    str = output.toString();
  } else {
    try {
      str = JSON.stringify(output) ?? 'undefined';
    } catch {
      str = '[unserializable]';
    }
  }
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength) + '... [truncated]';
}

export class BaseNode<S = unknown, P extends NonIterableObject = NonIterableObject> {
  protected _params: P = {} as P;
  protected _successors: Map<string, BaseNode> = new Map();

  async prep(_shared: S): Promise<unknown> {
    return undefined;
  }

  async exec(_prepRes: unknown): Promise<unknown> {
    return undefined;
  }

  async post(_shared: S, _prepRes: unknown, _execRes: unknown): Promise<string | undefined> {
    return undefined;
  }

  protected async _exec(prepRes: unknown): Promise<unknown> {
    return await this.exec(prepRes);
  }

  async _run(shared: S): Promise<string | undefined> {
    const p = await this.prep(shared);
    const e = await this._exec(p);
    return await this.post(shared, p, e);
  }

  async run(shared: S): Promise<string | undefined> {
    if (this._successors.size > 0) {
      console.warn("Node won't run successors. Use Flow.");
    }
    return await this._run(shared);
  }

  setParams(params: P): this {
    this._params = params;
    return this;
  }

  next<T extends BaseNode>(node: T): T {
    this.on('default', node);
    return node;
  }

  on(action: string, node: BaseNode): this {
    if (this._successors.has(action)) {
      console.warn(`Overwriting successor for action '${action}'`);
    }
    this._successors.set(action, node);
    return this;
  }

  getNextNode(action: string = 'default'): BaseNode | undefined {
    const nextAction = action || 'default';
    const next = this._successors.get(nextAction);
    if (!next && this._successors.size > 0) {
      console.warn(`Flow ends: '${nextAction}' not found in [${Array.from(this._successors.keys())}]`);
    }
    return next;
  }

  clone(): this {
    const clonedNode = Object.create(Object.getPrototypeOf(this));
    Object.assign(clonedNode, this);
    clonedNode._params = { ...this._params };
    clonedNode._successors = new Map(this._successors);
    return clonedNode;
  }
}

export class Node<S = unknown, P extends NonIterableObject = NonIterableObject> extends BaseNode<S, P> {
  maxRetries: number;
  wait: number;
  currentRetry: number = 0;

  constructor(maxRetries: number = 1, wait: number = 0) {
    super();
    this.maxRetries = maxRetries;
    this.wait = wait;
  }

  async execFallback(_prepRes: unknown, error: Error): Promise<unknown> {
    throw error;
  }

  protected override async _exec(prepRes: unknown): Promise<unknown> {
    for (this.currentRetry = 0; this.currentRetry < this.maxRetries; this.currentRetry++) {
      try {
        return await this.exec(prepRes);
      } catch (e) {
        if (this.currentRetry === this.maxRetries - 1) {
          return await this.execFallback(prepRes, e as Error);
        }
        if (this.wait > 0) {
          await new Promise(resolve => setTimeout(resolve, this.wait * 1000));
        }
      }
    }
    return undefined;
  }
}

export class Flow<S = unknown, P extends NonIterableObject = NonIterableObject> extends BaseNode<S, P> {
  start: BaseNode;

  constructor(start: BaseNode) {
    super();
    this.start = start;
  }

  protected async _orchestrate(shared: S, params?: P): Promise<void> {
    let current: BaseNode | undefined = this.start.clone();
    const p = params || this._params;
    while (current) {
      current.setParams(p);
      const action = await current._run(shared);
      current = current.getNextNode(action ?? 'default');
      current = current?.clone();
    }
  }

  override async _run(shared: S): Promise<string | undefined> {
    const pr = await this.prep(shared);
    await this._orchestrate(shared);
    return await this.post(shared, pr, undefined);
  }

  override async exec(_prepRes: unknown): Promise<unknown> {
    throw new Error("Flow can't exec.");
  }
}

export class KindlingNode<
  S extends KindlingNodeContext = KindlingNodeContext,
  P extends NonIterableObject = NonIterableObject
> extends Node<S, P> {
  protected metadata: NodeMetadata;
  private nodeStartTime?: number;
  private capsuleId?: string;
  private sharedContext?: S;

  constructor(metadata: NodeMetadata, maxRetries: number = 1, wait: number = 0) {
    super(maxRetries, wait);
    this.metadata = metadata;
  }

  override async prep(shared: S): Promise<unknown> {
    this.nodeStartTime = Date.now();
    this.sharedContext = shared;

    const capsuleInput: CapsuleInput = {
      type: 'pocketflow_node',
      intent: this.metadata.intent || 'general',
      scopeIds: shared.scopeIds,
    };

    const capsuleId = randomUUID();
    const now = Date.now();

    const capsule = {
      id: capsuleId,
      type: capsuleInput.type,
      intent: capsuleInput.intent,
      status: 'open' as const,
      openedAt: now,
      scopeIds: capsuleInput.scopeIds,
      observationIds: [],
    };

    shared.store.createCapsule(capsule);
    this.capsuleId = capsuleId;
    shared.capsuleId = capsuleId;

    const observation: ObservationInput = {
      kind: 'node_start',
      content: `Node "${this.metadata.name}" started`,
      provenance: {
        nodeName: this.metadata.name,
        intent: this.metadata.intent,
        params: this._params,
      },
      scopeIds: shared.scopeIds,
    };

    const obs = shared.store.insertObservation(observation);
    shared.store.attachObservationToCapsule(this.capsuleId, obs.id);

    return undefined;
  }

  override async post(shared: S, _prepRes: unknown, execRes: unknown): Promise<string | undefined> {
    const duration = this.nodeStartTime ? Date.now() - this.nodeStartTime : 0;

    if (this.capsuleId) {
      const outputObs: ObservationInput = {
        kind: 'node_output',
        content: truncateOutput(execRes),
        provenance: {
          nodeName: this.metadata.name,
          outputType: typeof execRes,
          duration,
        },
        scopeIds: shared.scopeIds,
      };

      const obs = shared.store.insertObservation(outputObs);
      shared.store.attachObservationToCapsule(this.capsuleId, obs.id);

      const endObs: ObservationInput = {
        kind: 'node_end',
        content: `Node "${this.metadata.name}" completed successfully`,
        provenance: {
          nodeName: this.metadata.name,
          duration,
          status: 'success',
        },
        scopeIds: shared.scopeIds,
      };

      const endObsResult = shared.store.insertObservation(endObs);
      shared.store.attachObservationToCapsule(this.capsuleId, endObsResult.id);

      shared.store.closeCapsule(this.capsuleId, Date.now());
    }

    return undefined;
  }

  override async execFallback(_prepRes: unknown, error: Error): Promise<unknown> {
    if (this.capsuleId && this.sharedContext) {
      const duration = this.nodeStartTime ? Date.now() - this.nodeStartTime : 0;
      const shared = this.sharedContext;

      const errorObs: ObservationInput = {
        kind: 'node_error',
        content: `Node "${this.metadata.name}" failed: ${error.message}`,
        provenance: {
          nodeName: this.metadata.name,
          errorType: error.name,
          errorMessage: error.message,
          stack: error.stack,
          retryCount: this.currentRetry,
        },
        scopeIds: shared.scopeIds,
      };

      const obs = shared.store.insertObservation(errorObs);
      shared.store.attachObservationToCapsule(this.capsuleId, obs.id);

      const endObs: ObservationInput = {
        kind: 'node_end',
        content: `Node "${this.metadata.name}" failed after ${this.currentRetry + 1} attempt(s)`,
        provenance: {
          nodeName: this.metadata.name,
          duration,
          status: 'error',
        },
        scopeIds: shared.scopeIds,
      };

      const endObsResult = shared.store.insertObservation(endObs);
      shared.store.attachObservationToCapsule(this.capsuleId, endObsResult.id);

      shared.store.closeCapsule(this.capsuleId, Date.now());
    }

    throw error;
  }
}

export class KindlingFlow<
  S extends KindlingNodeContext = KindlingNodeContext,
  P extends NonIterableObject = NonIterableObject
> extends Flow<S, P> {
  protected flowMetadata: NodeMetadata;
  private flowCapsuleId?: string;
  private flowStartTime?: number;

  constructor(start: KindlingNode<S, P>, metadata: NodeMetadata) {
    super(start);
    this.flowMetadata = metadata;
  }

  override async prep(shared: S): Promise<unknown> {
    this.flowStartTime = Date.now();

    const capsuleId = randomUUID();
    const now = Date.now();

    const capsule = {
      id: capsuleId,
      type: 'pocketflow_node' as const,
      intent: this.flowMetadata.intent || 'workflow',
      status: 'open' as const,
      openedAt: now,
      scopeIds: shared.scopeIds,
      observationIds: [],
    };

    shared.store.createCapsule(capsule);
    this.flowCapsuleId = capsuleId;

    const observation: ObservationInput = {
      kind: 'node_start',
      content: `Flow "${this.flowMetadata.name}" started`,
      provenance: {
        nodeName: this.flowMetadata.name,
        nodeType: 'flow',
        intent: this.flowMetadata.intent,
      },
      scopeIds: shared.scopeIds,
    };

    const obs = shared.store.insertObservation(observation);
    shared.store.attachObservationToCapsule(this.flowCapsuleId, obs.id);

    return undefined;
  }

  override async post(shared: S, _prepRes: unknown, _execRes: unknown): Promise<string | undefined> {
    const duration = this.flowStartTime ? Date.now() - this.flowStartTime : 0;

    if (this.flowCapsuleId) {
      const endObs: ObservationInput = {
        kind: 'node_end',
        content: `Flow "${this.flowMetadata.name}" completed`,
        provenance: {
          nodeName: this.flowMetadata.name,
          nodeType: 'flow',
          duration,
          status: 'success',
        },
        scopeIds: shared.scopeIds,
      };

      const obs = shared.store.insertObservation(endObs);
      shared.store.attachObservationToCapsule(this.flowCapsuleId, obs.id);

      shared.store.closeCapsule(this.flowCapsuleId, Date.now());
    }

    return undefined;
  }
}
