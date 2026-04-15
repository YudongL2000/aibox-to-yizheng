/**
 * [INPUT]: 依赖 ConfigAgentState/ConfigurableNode/NodeCategory 与 DialogueModeHardwareSnapshot，消费配置阶段节点状态和对话模式硬件快照。
 * [OUTPUT]: 对外提供 digital twin scene 构造器、接口选项清单、builtin top controls 与接口归一化 helper，统一把 backend 状态折叠成 frontend 可直接消费的 digital twin scene，并优先复用 MQTT runtime 的物理端口别名规范化。
 * [POS]: agents 的数字孪生运行时投影层，被 agent-service 与 config-state/dialogue-mode 路由复用，避免前后端各自猜组件-接口映射或把 mic/speaker 误当外接口模型。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import type {
  ConfigAgentState,
  ConfigurableNode,
  DialogueModeHardwareComponent,
  DialogueModeHardwareSnapshot,
  NodeCategory,
} from './types';
import { normalizeHardwarePortId } from './mqtt-hardware-runtime';

type Vector3 = [number, number, number];

type InterfacePreset = {
  id: string;
  label: string;
  kind: 'side' | 'top' | 'bottom';
  position: Vector3;
  rotation: Vector3;
};

type ModelPreset = {
  modelId: string;
  url: string;
  defaultDeviceId: string;
  defaultInterfaceId: string;
  mountPositionOffset: Vector3;
  mountRotationOffset: Vector3;
  scale: Vector3;
};

type BuiltinTopControl = {
  id: string;
  label: string;
  role: 'microphone' | 'speaker';
  status: 'idle' | 'connected';
  device_id?: string;
};

const DIGITAL_TWIN_BASE_MODEL = {
  id: 'model_5',
  url: '/assets/assets/models/base.glb',
  position: [0, 0, 0] as Vector3,
  rotation: [0, 0, 0] as Vector3,
  scale: [2.4, 2.4, 2.4] as Vector3,
  mountPositionOffset: [0, 0, 0] as Vector3,
  mountRotationOffset: [0, 0, 0] as Vector3,
  deviceId: 'device-001',
};

const CANONICAL_INTERFACES: InterfacePreset[] = [
  {
    id: 'port_1',
    label: '接口1 · 3-1.2',
    kind: 'side',
    position: [0, 0, 1.62],
    rotation: [0, 0, 0],
  },
  {
    id: 'port_2',
    label: '接口2 · 3-1.3',
    kind: 'side',
    position: [1.4, 0, 0.81],
    rotation: [0, 60, 0],
  },
  {
    id: 'port_3',
    label: '接口3 · 3-1.4',
    kind: 'side',
    position: [1.4, 0, -0.81],
    rotation: [0, 120, 0],
  },
  {
    id: 'port_4',
    label: '接口4 · 3-1.6',
    kind: 'side',
    position: [0, 0, -1.62],
    rotation: [0, 180, 0],
  },
  {
    id: 'port_hdmi',
    label: 'HDMI · 侧面E',
    kind: 'side',
    position: [-1.4, 0, 0.81],
    rotation: [0, 300, 0],
  },
  {
    id: 'port_7',
    label: '接口7 · 3-1.7',
    kind: 'bottom',
    position: [0, -1.72, 0],
    rotation: [90, 0, 0],
  },
];

const CANONICAL_INTERFACE_IDS = new Set(CANONICAL_INTERFACES.map((preset) => preset.id));

const CATEGORY_MODEL_PRESETS: Partial<Record<NodeCategory, ModelPreset>> = {
  WHEEL: {
    modelId: 'model_1',
    url: '/assets/assets/models/car.glb',
    defaultDeviceId: 'car-001',
    defaultInterfaceId: 'port_1',
    mountPositionOffset: [0, -1.23, -0.52],
    mountRotationOffset: [90, 0, 0],
    scale: [3, 3, 3],
  },
  SCREEN: {
    modelId: 'model_2',
    url: '/assets/assets/models/screen.glb',
    defaultDeviceId: 'screen-001',
    defaultInterfaceId: 'port_hdmi',
    mountPositionOffset: [0, 0, 0],
    mountRotationOffset: [0, 0, 90],
    scale: [2.16, 2.16, 2.16],
  },
  CAM: {
    modelId: 'model_3',
    url: '/assets/assets/models/cam.glb',
    defaultDeviceId: 'cam-001',
    defaultInterfaceId: 'port_3',
    mountPositionOffset: [0, -0.6, -0.05],
    mountRotationOffset: [0, 0, 0],
    scale: [2.16, 2.16, 2.16],
  },
  HAND: {
    modelId: 'model_4',
    url: '/assets/assets/models/hand.glb',
    defaultDeviceId: 'hand-001',
    defaultInterfaceId: 'port_4',
    mountPositionOffset: [0, -1, 0],
    mountRotationOffset: [85, 0, 0],
    scale: [2.16, 2.16, 2.16],
  },
};

const TOPOLOGY_ALIASES: Record<string, string> = {
  a: 'port_1',
  sidea: 'port_1',
  '侧面a': 'port_1',
  b: 'port_2',
  sideb: 'port_2',
  '侧面b': 'port_2',
  c: 'port_3',
  sidec: 'port_3',
  '侧面c': 'port_3',
  d: 'port_4',
  sided: 'port_4',
  '侧面d': 'port_4',
  e: 'port_hdmi',
  sidee: 'port_hdmi',
  '侧面e': 'port_hdmi',
  f: 'port_2',
  sidef: 'port_2',
  '侧面f': 'port_2',
  hdmi: 'port_hdmi',
  porthdmi: 'port_hdmi',
  bottom: 'port_7',
  'bottom-port': 'port_7',
  'port-bottom': 'port_7',
  '底部': 'port_7',
};

const DIALOGUE_COMPONENT_MODEL_PRESETS: Record<string, ModelPreset> = {
  camera: CATEGORY_MODEL_PRESETS.CAM!,
  cam: CATEGORY_MODEL_PRESETS.CAM!,
  mechanicalhand: CATEGORY_MODEL_PRESETS.HAND!,
  hand: CATEGORY_MODEL_PRESETS.HAND!,
  car: CATEGORY_MODEL_PRESETS.WHEEL!,
  wheel: CATEGORY_MODEL_PRESETS.WHEEL!,
  chassis: CATEGORY_MODEL_PRESETS.WHEEL!,
  screen: CATEGORY_MODEL_PRESETS.SCREEN!,
  display: CATEGORY_MODEL_PRESETS.SCREEN!,
};

export function buildDigitalTwinSceneFromConfigState(
  configState: ConfigAgentState | null | undefined
): Record<string, unknown> | null {
  if (!configState) {
    return null;
  }

  // 物理组件是单实例真相源：同一 category 下的多个逻辑节点只映射为一个挂载模型。
  const mountedModels = collectMountedHardwareNodes(configState)
    .map((node) => buildMountedModel(node))
    .filter((item): item is Record<string, unknown> => Boolean(item));

  return {
    display_mode: 'multi_scene',
    base_model_id: DIGITAL_TWIN_BASE_MODEL.id,
    interfaces: CANONICAL_INTERFACES.map((preset) => ({
      id: preset.id,
      label: preset.label,
      kind: preset.kind,
      position: [...preset.position],
      rotation: [...preset.rotation],
    })),
    top_controls: buildBuiltinTopControlsFromConfigState(configState),
    models: [
      {
        id: DIGITAL_TWIN_BASE_MODEL.id,
        url: DIGITAL_TWIN_BASE_MODEL.url,
        position: [...DIGITAL_TWIN_BASE_MODEL.position],
        rotation: [...DIGITAL_TWIN_BASE_MODEL.rotation],
        scale: [...DIGITAL_TWIN_BASE_MODEL.scale],
        mount_position_offset: [...DIGITAL_TWIN_BASE_MODEL.mountPositionOffset],
        mount_rotation_offset: [...DIGITAL_TWIN_BASE_MODEL.mountRotationOffset],
        device_id: DIGITAL_TWIN_BASE_MODEL.deviceId,
      },
      ...mountedModels,
    ],
  };
}

function collectMountedHardwareNodes(configState: ConfigAgentState): ConfigurableNode[] {
  const mountedNodes = new Map<string, ConfigurableNode>();

  configState.configurableNodes.forEach((node) => {
    if (node.status !== 'configured') {
      return;
    }

    const mountKey = getMountedNodeKey(node);
    if (!mountKey) {
      return;
    }

    const previous = mountedNodes.get(mountKey);
    if (!previous) {
      mountedNodes.set(mountKey, node);
      return;
    }

    mountedNodes.set(mountKey, selectPreferredMountedNode(previous, node));
  });

  return Array.from(mountedNodes.values());
}

function getMountedNodeKey(node: ConfigurableNode): string {
  const preset = node.category ? CATEGORY_MODEL_PRESETS[node.category] : undefined;
  if (!preset) {
    return '';
  }

  return node.category || node.name;
}

function selectPreferredMountedNode(
  current: ConfigurableNode,
  candidate: ConfigurableNode
): ConfigurableNode {
  return scoreMountedNode(candidate) >= scoreMountedNode(current)
    ? candidate
    : current;
}

function scoreMountedNode(node: ConfigurableNode): number {
  const hasExplicitInterface = normalizeInterfaceId(
    node.configValues?.portId ?? node.configValues?.topology,
    ''
  ).length > 0;
  const hasExplicitDeviceId = typeof node.configValues?.device_ID === 'string'
    && node.configValues.device_ID.trim().length > 0;

  return Number(hasExplicitInterface) * 10 + Number(hasExplicitDeviceId);
}

export function buildDigitalTwinSceneFromDialogueHardware(
  snapshot: DialogueModeHardwareSnapshot | null | undefined
): Record<string, unknown> | null {
  if (!snapshot) {
    return null;
  }

  const mountedModels = snapshot.connectedComponents
    .filter((component) => component.status !== 'removed')
    .map((component) => buildMountedDialogueModel(component))
    .filter((item): item is Record<string, unknown> => Boolean(item));

  return {
    display_mode: 'multi_scene',
    base_model_id: DIGITAL_TWIN_BASE_MODEL.id,
    interfaces: CANONICAL_INTERFACES.map((preset) => ({
      id: preset.id,
      label: preset.label,
      kind: preset.kind,
      position: [...preset.position],
      rotation: [...preset.rotation],
    })),
    top_controls: buildBuiltinTopControlsFromHardwareSnapshot(snapshot),
    models: [
      {
        id: DIGITAL_TWIN_BASE_MODEL.id,
        url: DIGITAL_TWIN_BASE_MODEL.url,
        position: [...DIGITAL_TWIN_BASE_MODEL.position],
        rotation: [...DIGITAL_TWIN_BASE_MODEL.rotation],
        scale: [...DIGITAL_TWIN_BASE_MODEL.scale],
        mount_position_offset: [...DIGITAL_TWIN_BASE_MODEL.mountPositionOffset],
        mount_rotation_offset: [...DIGITAL_TWIN_BASE_MODEL.mountRotationOffset],
        device_id: DIGITAL_TWIN_BASE_MODEL.deviceId,
      },
      ...mountedModels,
    ],
  };
}

export function listDigitalTwinInterfaceOptions(): Array<{ label: string; value: string }> {
  return CANONICAL_INTERFACES.map((preset) => ({
    label: preset.label,
    value: preset.id,
  }));
}

export function listHardwareRuntimeInterfaceOptions(): Array<{ label: string; value: string }> {
  return CANONICAL_INTERFACES.map((preset) => ({
    label: preset.label,
    value: preset.id,
  }));
}

export function getDigitalTwinDefaultInterfaceId(category?: NodeCategory): string {
  const preset = category ? CATEGORY_MODEL_PRESETS[category] : undefined;
  return preset?.defaultInterfaceId ?? 'port_1';
}

export function normalizeDigitalTwinInterfaceId(raw: unknown, fallback = ''): string {
  return normalizeInterfaceId(raw, fallback);
}

function buildMountedModel(
  node: ConfigurableNode
): Record<string, unknown> | null {
  const preset = node.category ? CATEGORY_MODEL_PRESETS[node.category] : undefined;
  if (!preset) {
    return null;
  }

  return {
    id: preset.modelId,
    url: preset.url,
    interface_id: resolveInterfaceId(node, preset.defaultInterfaceId),
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: [...preset.scale],
    mount_position_offset: [...preset.mountPositionOffset],
    mount_rotation_offset: [...preset.mountRotationOffset],
    device_id: resolveDeviceId(node, preset.defaultDeviceId),
  };
}

function buildMountedDialogueModel(
  component: DialogueModeHardwareComponent
): Record<string, unknown> | null {
  const preset = resolveDialogueModelPreset(component);
  if (!preset) {
    return null;
  }
  const interfaceId = normalizeInterfaceId(component.portId, '');
  if (!interfaceId) {
    return null;
  }

  return {
    id: component.modelId || preset.modelId,
    url: preset.url,
    interface_id: interfaceId,
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: [...preset.scale],
    mount_position_offset: [...preset.mountPositionOffset],
    mount_rotation_offset: [...preset.mountRotationOffset],
    device_id: component.deviceId || preset.defaultDeviceId,
  };
}

function buildBuiltinTopControlsFromConfigState(
  configState: ConfigAgentState
): BuiltinTopControl[] {
  return [
    buildBuiltinTopControl(
      'microphone',
      configState.configurableNodes,
      findBuiltinControlDeviceId('microphone', configState.configurableNodes)
    ),
    buildBuiltinTopControl(
      'speaker',
      configState.configurableNodes,
      findBuiltinControlDeviceId('speaker', configState.configurableNodes)
    ),
  ];
}

function buildBuiltinTopControlsFromHardwareSnapshot(
  snapshot: DialogueModeHardwareSnapshot
): BuiltinTopControl[] {
  return [
    buildBuiltinTopControl(
      'microphone',
      snapshot.connectedComponents,
      findBuiltinControlDeviceId('microphone', snapshot.connectedComponents)
    ),
    buildBuiltinTopControl(
      'speaker',
      snapshot.connectedComponents,
      findBuiltinControlDeviceId('speaker', snapshot.connectedComponents)
    ),
  ];
}

function buildBuiltinTopControl(
  role: BuiltinTopControl['role'],
  entries: Array<
    Pick<DialogueModeHardwareComponent, 'componentId' | 'deviceId' | 'displayName' | 'status'> |
    Pick<ConfigurableNode, 'category' | 'name' | 'displayName' | 'status'>
  >,
  deviceId?: string
): BuiltinTopControl {
  const isPresent = entries.some((entry) => {
    if ('componentId' in entry) {
      return isBuiltinRoleComponent(role, entry.componentId);
    }
    return isBuiltinRoleCategory(role, entry.category);
  });

  return {
    id: `builtin_${role}`,
    label: role === 'microphone' ? '麦克风' : '喇叭',
    role,
    status: isPresent ? 'connected' : 'idle',
    device_id: deviceId || undefined,
  };
}

function findBuiltinControlDeviceId(
  role: BuiltinTopControl['role'],
  entries: Array<
    Pick<DialogueModeHardwareComponent, 'componentId' | 'deviceId' | 'displayName' | 'status'> |
    Pick<ConfigurableNode, 'category' | 'name' | 'displayName' | 'status' | 'configValues'>
  >
): string | undefined {
  for (const entry of entries) {
    if ('componentId' in entry) {
      if (isBuiltinRoleComponent(role, entry.componentId)) {
        return entry.deviceId;
      }
      continue;
    }

    if (isBuiltinRoleCategory(role, entry.category)) {
      return entry.configValues?.device_ID?.trim() || undefined;
    }
  }

  return undefined;
}

function resolveDeviceId(
  node: ConfigurableNode,
  fallback: string
): string {
  const rawDeviceId = node.configValues?.device_ID;
  if (typeof rawDeviceId !== 'string') {
    return fallback;
  }
  const normalized = rawDeviceId.trim();
  return normalized || fallback;
}

function resolveInterfaceId(
  node: ConfigurableNode,
  fallback: string
): string {
  return normalizeInterfaceId(node.configValues?.portId ?? node.configValues?.topology, fallback);
}

function normalizeInterfaceId(raw: unknown, fallback: string): string {
  if (typeof raw !== 'string') {
    return fallback;
  }

  const normalized = raw.trim().toLowerCase();
  if (!normalized) {
    return fallback;
  }

  const normalizedHardwarePortId = normalizeHardwarePortId(normalized);
  if (CANONICAL_INTERFACE_IDS.has(normalizedHardwarePortId)) {
    return normalizedHardwarePortId;
  }

  const compact = normalized.replace(/[\s·._-]+/g, '');
  const portMatch = compact.match(/^(?:port|接口|usb)?([1-8])$/i);
  if (portMatch?.[1]) {
    const portId = `port_${portMatch[1]}`;
    if (CANONICAL_INTERFACE_IDS.has(portId)) {
      return portId;
    }
    return fallback;
  }

  if (TOPOLOGY_ALIASES[compact]) {
    return TOPOLOGY_ALIASES[compact];
  }

  if (compact.includes('hdmi')) {
    return 'port_hdmi';
  }

  if (compact.includes('底部')) {
    return 'port_7';
  }

  return fallback;
}

function resolveDialogueModelPreset(
  component: DialogueModeHardwareComponent
): ModelPreset | undefined {
  const candidates = [
    component.componentId,
    component.modelId,
    component.displayName,
  ];

  for (const candidate of candidates) {
    const normalized = candidate.trim().toLowerCase();
    if (!normalized) {
      continue;
    }
    const compact = normalized.replace(/[\s·._-]+/g, '');
    if (DIALOGUE_COMPONENT_MODEL_PRESETS[compact]) {
      return DIALOGUE_COMPONENT_MODEL_PRESETS[compact];
    }
    if (DIALOGUE_COMPONENT_MODEL_PRESETS[normalized]) {
      return DIALOGUE_COMPONENT_MODEL_PRESETS[normalized];
    }
  }

  return undefined;
}

function isBuiltinRoleComponent(role: BuiltinTopControl['role'], componentId: string): boolean {
  const normalized = componentId.trim().toLowerCase();
  if (role === 'microphone') {
    return normalized === 'microphone' || normalized === 'mic';
  }
  return normalized === 'speaker';
}

function isBuiltinRoleCategory(role: BuiltinTopControl['role'], category?: NodeCategory): boolean {
  if (!category) {
    return false;
  }
  if (role === 'microphone') {
    return category === 'MIC';
  }
  return category === 'SPEAKER';
}
