/**
 * PocketFlow node lifecycle adapter
 *
 * Captures workflow node execution as high-signal memory capsules.
 */

import {
  KindlingService,
  CapsuleType,
  ObservationKind,
  type Capsule,
  type CreateObservationInput,
} from '@kindling/core';

/**
 * Node execution status
 */
export enum NodeStatus {
  Running = 'running',
  Success = 'success',
  Failed = 'failed',
}

/**
 * Workflow node metadata
 */
export interface WorkflowNode {
  id: string;
  name: string;
  type?: string;
  flowId?: string;
}

/**
 * Node execution event
 */
export interface NodeExecutionEvent {
  node: WorkflowNode;
  status: NodeStatus;
  input?: any;
  output?: any;
  error?: Error;
  startTimeMs?: number;
  endTimeMs?: number;
}

/**
 * Intent derivation rules
 */
interface IntentRule {
  pattern: RegExp;
  intent: string;
}

const INTENT_RULES: IntentRule[] = [
  { pattern: /test|spec|validate/i, intent: 'test' },
  { pattern: /build|compile|bundle/i, intent: 'build' },
  { pattern: /deploy|publish|release/i, intent: 'deploy' },
  { pattern: /analyze|check|lint/i, intent: 'analyze' },
  { pattern: /debug|investigate|diagnose/i, intent: 'debug' },
  { pattern: /implement|create|develop/i, intent: 'implement' },
  { pattern: /refactor|improve|optimize/i, intent: 'refactor' },
];

export interface NodeAdapterConfig {
  service: KindlingService;
  repoId?: string;
  agentId?: string;
}

/**
 * Adapts PocketFlow workflow execution to Kindling capsules.
 *
 * Each node execution creates a capsule with:
 * - Intent derived from node name/type
 * - Confidence based on success/failure
 * - Bounded output capture
 */
export class NodeAdapter {
  private service: KindlingService;
  private repoId?: string;
  private agentId?: string;
  private activeNodes = new Map<string, string>(); // nodeId -> capsuleId
  private nodeSuccessCounts = new Map<string, number>(); // nodeId -> success count
  private nodeFailureCounts = new Map<string, number>(); // nodeId -> failure count

  constructor(config: NodeAdapterConfig) {
    this.service = config.service;
    this.repoId = config.repoId;
    this.agentId = config.agentId;
  }

  /**
   * Called when a workflow node starts executing.
   */
  onNodeStart(event: NodeExecutionEvent): Capsule {
    const { node, input, startTimeMs } = event;

    // Derive intent from node name/type
    const intent = this.deriveIntent(node);

    // Create a capsule for this node execution
    const capsule = this.service.openCapsule({
      type: CapsuleType.PocketFlowNode,
      intent,
      scope: {
        repoId: this.repoId,
        agentId: this.agentId,
      },
      openedAtMs: startTimeMs,
    });

    this.activeNodes.set(node.id, capsule.id);

    // Capture node start observation
    const startObs: CreateObservationInput = {
      kind: ObservationKind.NodeStart,
      content: `Node started: ${node.name}`,
      provenance: {
        nodeName: node.name,
        nodeId: node.id,
        nodeType: node.type,
        flowId: node.flowId,
        input: this.boundOutput(input),
      },
      tsMs: startTimeMs,
      scope: {
        repoId: this.repoId,
        agentId: this.agentId,
      },
    };

    this.service.appendObservation(startObs, { capsuleId: capsule.id });

    return capsule;
  }

  /**
   * Called when a workflow node completes.
   */
  onNodeEnd(event: NodeExecutionEvent): Capsule | null {
    const { node, status, output, error, endTimeMs } = event;

    const capsuleId = this.activeNodes.get(node.id);
    if (!capsuleId) {
      console.warn(`[NodeAdapter] onNodeEnd: no active capsule for node "${node.name}" (${node.id})`);
      return null;
    }

    // Update success/failure counts
    if (status === NodeStatus.Success) {
      const count = this.nodeSuccessCounts.get(node.id) || 0;
      this.nodeSuccessCounts.set(node.id, count + 1);
    } else if (status === NodeStatus.Failed) {
      const count = this.nodeFailureCounts.get(node.id) || 0;
      this.nodeFailureCounts.set(node.id, count + 1);
    }

    // Capture appropriate observation based on status
    if (status === NodeStatus.Success) {
      const outputObs: CreateObservationInput = {
        kind: ObservationKind.NodeOutput,
        content: this.boundOutput(output),
        provenance: {
          nodeName: node.name,
          nodeId: node.id,
          status: 'success',
        },
        tsMs: endTimeMs,
        scope: {
          repoId: this.repoId,
          agentId: this.agentId,
        },
      };
      this.service.appendObservation(outputObs, { capsuleId });
    } else if (status === NodeStatus.Failed && error) {
      const errorObs: CreateObservationInput = {
        kind: ObservationKind.NodeError,
        content: error.message,
        provenance: {
          nodeName: node.name,
          nodeId: node.id,
          status: 'failed',
          stack: error.stack,
        },
        tsMs: endTimeMs,
        scope: {
          repoId: this.repoId,
          agentId: this.agentId,
        },
      };
      this.service.appendObservation(errorObs, { capsuleId });
    }

    // Capture node end observation
    const endObs: CreateObservationInput = {
      kind: ObservationKind.NodeEnd,
      content: `Node ${status}: ${node.name}`,
      provenance: {
        nodeName: node.name,
        nodeId: node.id,
        status,
      },
      tsMs: endTimeMs,
      scope: {
        repoId: this.repoId,
        agentId: this.agentId,
      },
    };

    this.service.appendObservation(endObs, { capsuleId });

    // Calculate confidence based on success/failure history
    const confidence = this.calculateConfidence(node.id, status);

    // Generate summary with confidence
    const summaryContent = this.generateSummary(node, status, output, error);

    // Close capsule with summary
    const closed = this.service.closeCapsule(capsuleId, {
      closedAtMs: endTimeMs,
      generateSummary: true,
      summaryContent,
    });

    // Update summary confidence
    const summary = this.service.getLatestSummaryForCapsule(capsuleId);
    if (summary && confidence !== null) {
      // Note: In a real implementation, we'd update the summary's confidence field
      // For now, this is captured in the summary content
    }

    this.activeNodes.delete(node.id);

    return closed;
  }

  /**
   * Derives intent from node name/type using pattern matching.
   */
  private deriveIntent(node: WorkflowNode): string {
    const searchText = `${node.name} ${node.type || ''}`;

    for (const rule of INTENT_RULES) {
      if (rule.pattern.test(searchText)) {
        return rule.intent;
      }
    }

    return 'general';
  }

  /**
   * Calculates confidence based on node execution history.
   *
   * Confidence increases with success, decreases with failure.
   */
  private calculateConfidence(nodeId: string, status: NodeStatus): number | null {
    const successes = this.nodeSuccessCounts.get(nodeId) || 0;
    const failures = this.nodeFailureCounts.get(nodeId) || 0;
    const total = successes + failures;

    if (total === 0) return null;

    // Simple confidence calculation
    let confidence = successes / total;

    // Recent failure reduces confidence more significantly
    if (status === NodeStatus.Failed) {
      confidence *= 0.7;
    }

    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Bounds output to prevent huge content from polluting storage.
   */
  private boundOutput(output: any, maxChars: number = 500): string {
    if (output === null || output === undefined) {
      return '';
    }

    const str = typeof output === 'string' ? output : JSON.stringify(output);

    if (str.length <= maxChars) {
      return str;
    }

    return str.substring(0, maxChars) + '... [truncated]';
  }

  /**
   * Generates a summary of the node execution.
   */
  private generateSummary(
    node: WorkflowNode,
    status: NodeStatus,
    output: any,
    error?: Error
  ): string {
    const intent = this.deriveIntent(node);
    const confidence = this.calculateConfidence(node.id, status);

    let summary = `Node '${node.name}' (${intent})`;

    if (status === NodeStatus.Success) {
      summary += ' completed successfully';
      if (output) {
        const boundedOutput = this.boundOutput(output, 200);
        summary += `: ${boundedOutput}`;
      }
    } else if (status === NodeStatus.Failed && error) {
      summary += ` failed: ${error.message}`;
    }

    if (confidence !== null) {
      summary += ` [confidence: ${(confidence * 100).toFixed(0)}%]`;
    }

    return summary;
  }

  /**
   * Gets the active capsule for a node.
   */
  getNodeCapsule(nodeId: string): Capsule | null {
    const capsuleId = this.activeNodes.get(nodeId);
    if (!capsuleId) return null;

    return this.service.getCapsule(capsuleId);
  }
}
