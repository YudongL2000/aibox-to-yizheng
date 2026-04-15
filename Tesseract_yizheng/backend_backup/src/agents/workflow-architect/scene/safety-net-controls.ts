/**
 * [INPUT]: 依赖 ../../types 的 WorkflowDefinition 与 ../../../../utils/logger 的结构化日志能力
 * [OUTPUT]: 对外提供 WorkflowSceneSafetyNetFlags、默认 flags 与 WorkflowSceneSafetyNetController
 * [POS]: workflow-architect/scene 的安全网控制与观测层，被 workflow-architect.ts 用来统一场景后处理开关与变更日志
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import { WorkflowDefinition } from '../../types';
import { logger } from '../../../utils/logger';

export type WorkflowSceneSafetyNetState = 'enabled' | 'disabled' | 'dormant';

export interface WorkflowSceneSafetyNetFlags {
  ensureGestureIdentityFlow: boolean;
  ensureEmotionInteractionFlow: boolean;
  pruneGestureRedundantTtsNodes: boolean;
  ensureGameHandExecutor: boolean;
  ensureIfDirectExecutorConnections: boolean;
  pruneSpeakerRelayNodes: boolean;
  ensureSpeakerHasTts: boolean;
  ensureResultBranches: boolean;
  ensureHandHasAssign: boolean;
}

export type WorkflowSceneSafetyNetDormantFlags = Partial<
  Record<keyof WorkflowSceneSafetyNetFlags, boolean>
>;

export const WORKFLOW_SCENE_SAFETY_NET_NAMES = [
  'ensureGestureIdentityFlow',
  'ensureEmotionInteractionFlow',
  'pruneGestureRedundantTtsNodes',
  'ensureGameHandExecutor',
  'ensureIfDirectExecutorConnections',
  'pruneSpeakerRelayNodes',
  'ensureSpeakerHasTts',
  'ensureResultBranches',
  'ensureHandHasAssign',
] as const satisfies ReadonlyArray<keyof WorkflowSceneSafetyNetFlags>;

type WorkflowSceneSafetyNetName = (typeof WORKFLOW_SCENE_SAFETY_NET_NAMES)[number];

export const DEFAULT_WORKFLOW_SCENE_SAFETY_NET_FLAGS: WorkflowSceneSafetyNetFlags = {
  ensureGestureIdentityFlow: true,
  ensureEmotionInteractionFlow: true,
  pruneGestureRedundantTtsNodes: true,
  ensureGameHandExecutor: true,
  ensureIfDirectExecutorConnections: true,
  pruneSpeakerRelayNodes: true,
  ensureSpeakerHasTts: true,
  ensureResultBranches: true,
  ensureHandHasAssign: true,
};

interface WorkflowShapeSnapshot {
  signature: string;
  nodeCount: number;
  edgeCount: number;
  nodeNames: string[];
}

export class WorkflowSceneSafetyNetController {
  readonly flags: WorkflowSceneSafetyNetFlags;
  readonly dormantFlags: WorkflowSceneSafetyNetDormantFlags;
  readonly states: Record<WorkflowSceneSafetyNetName, WorkflowSceneSafetyNetState>;

  constructor(
    flags: Partial<WorkflowSceneSafetyNetFlags> = {},
    dormantFlags: WorkflowSceneSafetyNetDormantFlags = {}
  ) {
    this.flags = {
      ...DEFAULT_WORKFLOW_SCENE_SAFETY_NET_FLAGS,
      ...flags,
    };
    this.dormantFlags = dormantFlags;
    this.states = Object.fromEntries(
      WORKFLOW_SCENE_SAFETY_NET_NAMES.map((name) => [
        name,
        !this.flags[name]
          ? 'disabled'
          : this.dormantFlags[name]
            ? 'dormant'
            : 'enabled',
      ])
    ) as Record<WorkflowSceneSafetyNetName, WorkflowSceneSafetyNetState>;
  }

  apply(
    workflow: WorkflowDefinition,
    name: keyof WorkflowSceneSafetyNetFlags,
    apply: () => void
  ): void {
    const state = this.states[name];

    if (state === 'disabled') {
      logger.info('WorkflowArchitect: scene safety net disabled', { safetyNet: name });
      return;
    }

    if (state === 'dormant') {
      const before = this.captureWorkflowShape(workflow);
      const shadow = this.cloneWorkflow(workflow);
      applyToShadowWorkflow(apply, workflow, shadow);
      const after = this.captureWorkflowShape(shadow);
      if (before.signature === after.signature) {
        return;
      }

      logger.warn('WorkflowArchitect: dormant scene safety net would mutate workflow', {
        safetyNet: name,
        nodeDelta: after.nodeCount - before.nodeCount,
        edgeDelta: after.edgeCount - before.edgeCount,
        nodeNamesAdded: after.nodeNames.filter((nodeName) => !before.nodeNames.includes(nodeName)),
        nodeNamesRemoved: before.nodeNames.filter((nodeName) => !after.nodeNames.includes(nodeName)),
      });
      return;
    }

    const before = this.captureWorkflowShape(workflow);
    apply();
    const after = this.captureWorkflowShape(workflow);
    if (before.signature === after.signature) {
      return;
    }

    logger.info('WorkflowArchitect: scene safety net mutated workflow', {
      safetyNet: name,
      nodeDelta: after.nodeCount - before.nodeCount,
      edgeDelta: after.edgeCount - before.edgeCount,
      nodeNamesAdded: after.nodeNames.filter((nodeName) => !before.nodeNames.includes(nodeName)),
      nodeNamesRemoved: before.nodeNames.filter((nodeName) => !after.nodeNames.includes(nodeName)),
    });
  }

  private captureWorkflowShape(workflow: WorkflowDefinition): WorkflowShapeSnapshot {
    const nodeNames = Array.isArray(workflow.nodes)
      ? workflow.nodes.map((node) => String(node?.name || '')).filter(Boolean).sort()
      : [];
    const edgeKeys =
      workflow.connections && typeof workflow.connections === 'object'
        ? Object.entries(workflow.connections as Record<string, any>)
            .flatMap(([sourceName, mapping]) => {
              const main = Array.isArray(mapping?.main) ? mapping.main : [];
              return main.flatMap((group: Array<Record<string, any>>, outputIndex: number) => {
                if (!Array.isArray(group)) {
                  return [];
                }
                return group
                  .map((edge) => {
                    const targetName = typeof edge?.node === 'string' ? edge.node : '';
                    return targetName ? `${sourceName}:${outputIndex}->${targetName}` : '';
                  })
                  .filter(Boolean);
              });
            })
            .sort()
        : [];

    return {
      signature: JSON.stringify({ nodeNames, edgeKeys }),
      nodeCount: nodeNames.length,
      edgeCount: edgeKeys.length,
      nodeNames,
    };
  }

  private cloneWorkflow(workflow: WorkflowDefinition): WorkflowDefinition {
    return JSON.parse(JSON.stringify(workflow)) as WorkflowDefinition;
  }
}

export function parseWorkflowSceneSafetyNetFlags(config: {
  mode?: string;
  disabled?: string;
}): Partial<WorkflowSceneSafetyNetFlags> {
  const mode = (config.mode ?? '').trim();
  const disabled = (config.disabled ?? '').trim();

  const flags =
    mode.toLowerCase() === 'none'
      ? Object.fromEntries(
          WORKFLOW_SCENE_SAFETY_NET_NAMES.map((name) => [name, false])
        )
      : {};

  if (mode && mode.toLowerCase() !== 'all' && mode.toLowerCase() !== 'none') {
    throw new Error(
      `AGENT_SCENE_SAFETY_NETS 只支持 all 或 none，收到: ${mode}`
    );
  }

  if (!disabled) {
    return flags;
  }

  for (const rawName of disabled.split(',')) {
    const name = rawName.trim();
    if (!name) {
      continue;
    }
    if (!isWorkflowSceneSafetyNetName(name)) {
      throw new Error(`AGENT_DISABLE_SCENE_SAFETY_NETS 包含未知 SafetyNet: ${name}`);
    }
    flags[name] = false;
  }

  return flags;
}

export function parseWorkflowSceneSafetyNetDormantFlags(config: {
  dormant?: string;
}): WorkflowSceneSafetyNetDormantFlags {
  const dormant = (config.dormant ?? '').trim();
  if (!dormant || dormant.toLowerCase() === 'none') {
    return {};
  }

  const flags: WorkflowSceneSafetyNetDormantFlags = {};
  for (const rawName of dormant.split(',')) {
    const name = rawName.trim();
    if (!name) {
      continue;
    }
    if (!isWorkflowSceneSafetyNetName(name)) {
      throw new Error(`AGENT_DORMANT_SCENE_SAFETY_NETS 包含未知 SafetyNet: ${name}`);
    }
    flags[name] = true;
  }

  return flags;
}

function isWorkflowSceneSafetyNetName(value: string): value is WorkflowSceneSafetyNetName {
  return (WORKFLOW_SCENE_SAFETY_NET_NAMES as readonly string[]).includes(value);
}

function applyToShadowWorkflow(
  apply: () => void,
  workflow: WorkflowDefinition,
  shadow: WorkflowDefinition
): void {
  const originalNodes = workflow.nodes;
  const originalConnections = workflow.connections;

  workflow.nodes = shadow.nodes;
  workflow.connections = shadow.connections;
  try {
    apply();
  } finally {
    shadow.nodes = workflow.nodes;
    shadow.connections = workflow.connections;
    workflow.nodes = originalNodes;
    workflow.connections = originalConnections;
  }
}
