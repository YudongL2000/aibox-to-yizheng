/**
 * [INPUT]: 依赖 dialogue-mode 技能需求与硬件事件模型
 * [OUTPUT]: 对外提供硬件事件归一化与 readiness 计算
 * [POS]: dialogue-mode 的硬件真相裁判，统一插拔、快照与缺失项推断
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import type {
  DialogueModeHardwareComponent,
  DialogueModeHardwareEventInput,
  DialogueModeHardwareRequirement,
  DialogueModeHardwareSnapshot,
  DialogueModeHardwareValidationStatus,
} from '../types';

export interface HardwareReadinessResult {
  snapshot: DialogueModeHardwareSnapshot;
  missingRequirements: DialogueModeHardwareRequirement[];
  isReady: boolean;
}

export function createEmptyHardwareSnapshot(
  source: DialogueModeHardwareSnapshot['source'] = 'backend_cache'
): DialogueModeHardwareSnapshot {
  return {
    source,
    connectedComponents: [],
    missingRequirements: [],
    validationStatus: 'idle',
    lastEventType: 'snapshot',
    lastEventAt: new Date().toISOString(),
  };
}

export function applyHardwareEvent(
  current: DialogueModeHardwareSnapshot | null,
  event: DialogueModeHardwareEventInput
): DialogueModeHardwareSnapshot {
  const snapshot = cloneSnapshot(current ?? createEmptyHardwareSnapshot(event.source));
  snapshot.source = event.source;
  snapshot.lastEventType = event.eventType;
  snapshot.lastEventAt = event.timestamp ?? new Date().toISOString();

  if (hasConnectedComponents(event) || event.eventType === 'snapshot') {
    snapshot.connectedComponents = normalizeConnectedComponents(
      event.connectedComponents ?? []
    ).filter((component) => component.status !== 'removed');
    snapshot.validationStatus = isFailureEvent(event.eventType) ? 'failure' : 'pending';
    return snapshot;
  }

  if (event.eventType === 'device_removed') {
    snapshot.connectedComponents = snapshot.connectedComponents.filter(
      (component) => !matchesEventComponent(component, event.component)
    );
    snapshot.validationStatus = 'pending';
    return snapshot;
  }

  if (event.component) {
    upsertConnectedComponent(snapshot.connectedComponents, {
      componentId: event.component.componentId ?? event.component.deviceId ?? 'unknown_component',
      deviceId: event.component.deviceId ?? event.component.componentId ?? 'unknown_device',
      modelId: event.component.modelId ?? '',
      displayName: event.component.displayName ?? '',
      portId: event.component.portId ?? '',
      status: event.component.status ?? 'connected',
    });
  }

  snapshot.validationStatus = isFailureEvent(event.eventType) ? 'failure' : 'pending';
  return snapshot;
}

export function evaluateHardwareReadiness(
  requirements: DialogueModeHardwareRequirement[],
  snapshot: DialogueModeHardwareSnapshot | null
): HardwareReadinessResult {
  const workingSnapshot = cloneSnapshot(snapshot ?? createEmptyHardwareSnapshot());
  const missingRequirements = requirements.filter(
    (requirement) => !isRequirementSatisfied(requirement, workingSnapshot.connectedComponents)
  );

  workingSnapshot.missingRequirements = missingRequirements;
  workingSnapshot.validationStatus = missingRequirements.length === 0 ? 'success' : 'pending';
  if (missingRequirements.length === 0) {
    workingSnapshot.failureReason = undefined;
  }

  return {
    snapshot: workingSnapshot,
    missingRequirements,
    isReady: missingRequirements.length === 0,
  };
}

export function markHardwareValidationStatus(
  snapshot: DialogueModeHardwareSnapshot,
  status: DialogueModeHardwareValidationStatus,
  failureReason?: string
): DialogueModeHardwareSnapshot {
  return {
    ...cloneSnapshot(snapshot),
    validationStatus: status,
    failureReason,
    lastEventAt: new Date().toISOString(),
  };
}

export function describeMissingRequirements(
  missingRequirements: DialogueModeHardwareRequirement[]
): string {
  return missingRequirements.map((item) => item.displayName).join('、');
}

function isRequirementSatisfied(
  requirement: DialogueModeHardwareRequirement,
  connectedComponents: DialogueModeHardwareComponent[]
): boolean {
  if (requirement.isOptional) {
    return true;
  }

  return connectedComponents.some((component) => {
    if (component.componentId !== requirement.componentId) {
      return false;
    }
    if (requirement.acceptablePorts.length > 0 && !requirement.acceptablePorts.includes(component.portId)) {
      return false;
    }
    if (requirement.requiredModelIds.length > 0 && component.modelId) {
      return requirement.requiredModelIds.includes(component.modelId);
    }
    return true;
  });
}

function matchesEventComponent(
  component: DialogueModeHardwareComponent,
  eventComponent?: Partial<DialogueModeHardwareEventInput['component']>
): boolean {
  if (!eventComponent) return false;
  if (eventComponent.deviceId && component.deviceId === eventComponent.deviceId) {
    return true;
  }
  if (
    eventComponent.componentId
    && eventComponent.portId
    && component.componentId === eventComponent.componentId
    && component.portId === eventComponent.portId
  ) {
    return true;
  }
  if (eventComponent.componentId && component.componentId === eventComponent.componentId) {
    return true;
  }
  return false;
}

function upsertConnectedComponent(
  components: DialogueModeHardwareComponent[],
  next: DialogueModeHardwareComponent
): void {
  const index = components.findIndex(
    (component) =>
      (next.deviceId && component.deviceId === next.deviceId)
      || (
        next.componentId
        && next.portId
        && component.componentId === next.componentId
        && component.portId === next.portId
      )
  );
  if (index >= 0) {
    components[index] = next;
    return;
  }
  components.push(next);
}

function hasConnectedComponents(event: DialogueModeHardwareEventInput): boolean {
  return Object.prototype.hasOwnProperty.call(event, 'connectedComponents')
    && Array.isArray(event.connectedComponents);
}

function isFailureEvent(eventType: DialogueModeHardwareEventInput['eventType']): boolean {
  return eventType === 'error' || eventType === 'device_error';
}

function normalizeConnectedComponents(
  components: DialogueModeHardwareEventInput['connectedComponents']
): DialogueModeHardwareComponent[] {
  const nextComponents: DialogueModeHardwareComponent[] = [];
  for (const component of components ?? []) {
    if (!component) {
      continue;
    }

    const normalized: DialogueModeHardwareComponent = {
      componentId: component.componentId ?? component.deviceId ?? 'unknown_component',
      deviceId: component.deviceId ?? component.componentId ?? 'unknown_device',
      modelId: component.modelId ?? '',
      displayName: component.displayName ?? '',
      portId: component.portId ?? '',
      status: component.status ?? 'connected',
    };
    upsertConnectedComponent(nextComponents, normalized);
  }
  return nextComponents;
}

function cloneSnapshot(snapshot: DialogueModeHardwareSnapshot): DialogueModeHardwareSnapshot {
  return {
    ...snapshot,
    connectedComponents: snapshot.connectedComponents.map((component) => ({ ...component })),
    missingRequirements: snapshot.missingRequirements.map((requirement) => ({ ...requirement })),
  };
}
