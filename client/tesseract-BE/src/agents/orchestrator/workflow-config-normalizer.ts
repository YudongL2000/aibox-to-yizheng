/**
 * [INPUT]: 依赖工作流节点元数据工具、标题生成器与 AgentLoopDisposition
 * [OUTPUT]: 对外提供 WorkflowConfigNormalizer 与结构校验/自动修复函数
 * [POS]: orchestrator/ 的工作流配置归一化层，负责 confirm 前的结构清洗与配置对齐
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import type { AgentLoopDisposition } from '../agent-loop';
import { detectNodeCategory } from '../prompts/category-mapping';
import { generateNodeNotes, isNodeCategory } from '../prompts/few-shot-examples';
import { generateNodeName } from '../prompts/node-name-generator';
import { extractSubFields } from '../prompts/sub-field-extractor';
import { generateNodeTitleSubtitle, resolveAdaptiveNodeText } from '../prompts/title-generator';
import { getNodeTypeVersion } from '../node-type-versions';
import type { NodeCategory, NodeSubParams, WorkflowDefinition } from '../types';
import { normalizeNodeNotes } from '../../utils/node-notes';
import { buildExecutableCodeNodeParameters } from '../../utils/code-node-parameters';

const LEGACY_NODE_SUB_KEYS = new Set([
  'ttsVoice',
  'ttsText',
  'confidence',
  'emoConfidence',
  'countdownVoice',
  'resultVoice',
  'audioUrl',
  'audioName',
  'countdownText',
  'resultText',
  'text',
  'n',
]);

const ALLOWED_NODE_SUB_KEYS = new Set([
  'seconds',
  'output',
  'yolov_input',
  'yolov_output',
  'asr_input',
  'asr_output',
  'facenet_input',
  'facenet_output',
  'face_info',
  'TTS_input',
  'audio_name',
  'random_rule',
  'robotGesture',
  'execute_gesture',
  'execute_emoji',
  'expected_screen_emoji',
  'expected_gesture',
  'expected_hand_gesture',
  'expected_emoji',
  'prompt',
  'llm_emo_input',
  'llm_emo_output',
]);

export function buildValidationFailureMessage(
  disposition: AgentLoopDisposition,
  errors: string[]
): string {
  const detail = errors.join('；');
  if (disposition === 'needsUser') {
    return `工作流校验仍未通过：${detail}。这轮问题更偏向缺少用户约束，请补充必要信息后再试。`;
  }
  if (disposition === 'autoFixable') {
    return `工作流校验仍未通过：${detail}。自动修复已经尝试到当前上限，建议继续收紧约束后再试。`;
  }
  return `工作流校验仍未通过：${detail}。当前需要进一步模型修复或改写方案后再试。`;
}

export function validateWorkflowStructure(workflow: WorkflowDefinition): string[] {
  const errors: string[] = [];
  const nodeNames = new Set<string>();
  let hasTrigger = false;

  workflow.nodes.forEach((rawNode, index) => {
    const node = rawNode as Record<string, unknown>;
    const name = typeof node.name === 'string' ? node.name.trim() : '';
    const type = typeof node.type === 'string' ? node.type.trim() : '';

    if (!name) {
      errors.push(`节点 ${index + 1} 缺少 name`);
      return;
    }

    if (nodeNames.has(name)) {
      errors.push(`节点名称重复: ${name}`);
    }
    nodeNames.add(name);

    if (!type) {
      errors.push(`节点 ${name} 缺少 type`);
    }

    if (isTriggerNode(type)) {
      hasTrigger = true;
    }
  });

  if (!hasTrigger) {
    errors.push('工作流缺少触发节点');
  }

  const connections = workflow.connections && typeof workflow.connections === 'object'
    ? workflow.connections
    : {};

  Object.entries(connections).forEach(([sourceName, mapping]) => {
    if (!nodeNames.has(sourceName)) {
      errors.push(`connections 引用了不存在的源节点: ${sourceName}`);
    }

    if (!mapping || typeof mapping !== 'object') {
      return;
    }

    Object.values(mapping as Record<string, unknown>).forEach((groupCollection) => {
      if (!Array.isArray(groupCollection)) {
        return;
      }

      groupCollection.forEach((group) => {
        if (!Array.isArray(group)) {
          return;
        }

        group.forEach((connection) => {
          if (!connection || typeof connection !== 'object') {
            return;
          }

          const target = (connection as { node?: unknown }).node;
          if (typeof target === 'string' && !nodeNames.has(target)) {
            errors.push(`connections 引用了不存在的目标节点: ${target}`);
          }
        });
      });
    });
  });

  return Array.from(new Set(errors));
}

export function autofixWorkflowStructure(workflow: WorkflowDefinition): WorkflowDefinition {
  const nodes = workflow.nodes.map((rawNode) => ({ ...(rawNode as Record<string, unknown>) }));
  const nodeNames = new Set(
    nodes
      .map((node) => (typeof node.name === 'string' ? node.name.trim() : ''))
      .filter(Boolean)
  );
  const connections: Record<string, unknown> = {};

  Object.entries(workflow.connections ?? {}).forEach(([sourceName, mapping]) => {
    if (!nodeNames.has(sourceName) || !mapping || typeof mapping !== 'object') {
      return;
    }

    const nextMapping: Record<string, unknown> = {};
    Object.entries(mapping as Record<string, unknown>).forEach(([key, groups]) => {
      if (!Array.isArray(groups)) {
        nextMapping[key] = groups;
        return;
      }

      nextMapping[key] = groups.map((group) => {
        if (!Array.isArray(group)) {
          return [];
        }

        return group.filter((connection) => {
          if (!connection || typeof connection !== 'object') {
            return false;
          }
          const target = (connection as { node?: unknown }).node;
          return typeof target === 'string' && nodeNames.has(target);
        });
      });
    });

    connections[sourceName] = nextMapping;
  });

  if (Object.keys(connections).length === 0 && nodes.length > 1) {
    for (let index = 0; index < nodes.length - 1; index += 1) {
      const source = String(nodes[index]?.name ?? '');
      const target = String(nodes[index + 1]?.name ?? '');
      if (!source || !target) {
        continue;
      }
      connections[source] = {
        main: [[{ node: target, type: 'main', index: 0 }]],
      };
    }
  }

  return {
    ...workflow,
    connections,
  };
}

export function isSameWorkflow(left: WorkflowDefinition, right: WorkflowDefinition): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export class WorkflowConfigNormalizer {
  normalizeWorkflowForConfig(
    workflow: WorkflowDefinition,
    sessionId: string
  ): WorkflowDefinition {
    const nodes = Array.isArray(workflow.nodes) ? workflow.nodes : [];
    const nameRemap = new Map<string, string>();

    const normalizedNodes = nodes.map((rawNode) => {
      const node = { ...(rawNode as Record<string, unknown>) };
      const existingName = readText(node.name) ?? '';
      const normalizedNotes = normalizeNodeNotes(node.notes);
      const existingCategory = readCategory(normalizedNotes.category);
      const detectedCategory = detectNodeCategory({
        type: node.type,
        name: node.name,
        parameters: node.parameters,
      });
      const nodeType = readText(node.type) ?? '';
      const category = resolveNodeCategory(existingCategory, detectedCategory, existingName, nodeType);
      const inferredSub = extractSubFields({
        type: node.type,
        name: node.name,
        parameters: node.parameters,
      }, category);
      const sub = mergeNodeSub(inferredSub, normalizedNotes.sub as NodeSubParams);
      node.type = nodeType;
      node.typeVersion = getNodeTypeVersion(nodeType) ?? node.typeVersion ?? 1;
      node.name = generateNodeName({
        nodeType,
        currentName: existingName,
        category,
        sub,
      });
      const generatedText = generateNodeTitleSubtitle({ type: node.type, name: node.name, sub }, category);
      const title = pickChineseText(
        normalizeAdaptiveText(normalizedNotes.title, generatedText.title, category, 'title'),
        generatedText.title
      );
      const subtitle = pickChineseText(
        normalizeAdaptiveText(normalizedNotes.subtitle, generatedText.subtitle, category, 'subtitle'),
        generatedText.subtitle
      );
      const notes = generateNodeNotes({
        title,
        subtitle,
        category,
        sessionId,
        nodeType,
        sub,
      });
      notes.extra = resolveExtraStatus(normalizedNotes.extra, nodeType);
      notes.device_ID = normalizedNotes.device_ID ?? notes.device_ID ?? null;
      notes.topology = normalizedNotes.topology ?? notes.topology ?? null;
      node.notes = notes;
      if (nodeType === 'n8n-nodes-base.code') {
        node.parameters = buildExecutableCodeNodeParameters(readObject(node.parameters));
      }

      if (existingName && existingName !== node.name) {
        nameRemap.set(existingName, String(node.name));
      }
      return node;
    });

    ensureUniqueNodeNames(normalizedNodes, nameRemap);

    return {
      ...workflow,
      nodes: normalizedNodes as WorkflowDefinition['nodes'],
      connections: remapConnectionsForNodeRename(workflow.connections, nameRemap),
    };
  }
}

function readObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function mergeNodeSub(
  inferredSub: NodeSubParams,
  existingSub: NodeSubParams | undefined
): NodeSubParams {
  const merged = {
    ...inferredSub,
    ...(existingSub ?? {}),
  } as NodeSubParams;

  LEGACY_NODE_SUB_KEYS.forEach((key) => {
    delete (merged as Record<string, unknown>)[key];
  });

  return sanitizeNodeSub(merged);
}

function sanitizeNodeSub(sub: NodeSubParams): NodeSubParams {
  const next = { ...sub } as Record<string, unknown>;
  const fallbackTtsInput = readText(
    next.TTS_input ?? next.text ?? next.resultText ?? next.countdownText
  );
  if (fallbackTtsInput) {
    next.TTS_input = fallbackTtsInput;
  }

  const fallbackAudioName = readText(next.audio_name ?? next.audioName);
  if (fallbackAudioName) {
    next.audio_name = fallbackAudioName;
  }

  const ramOutputRaw = readText(next.output ?? next.n);
  if (ramOutputRaw) {
    next.output = ramOutputRaw;
  }

  Object.keys(next).forEach((key) => {
    if (!ALLOWED_NODE_SUB_KEYS.has(key)) {
      delete next[key];
    }
  });

  return next as NodeSubParams;
}

function readCategory(value: unknown): string {
  return typeof value === 'string' ? value.trim().toUpperCase() : '';
}

function resolveNodeCategory(
  existingCategory: string,
  detectedCategory: NodeCategory,
  nodeName: string,
  nodeType: string
): NodeCategory {
  const forcedCategory = inferForcedCategoryByName(nodeName, nodeType);
  if (forcedCategory) {
    return forcedCategory;
  }

  if (isNodeCategory(existingCategory)) {
    if (existingCategory === 'BASE' && detectedCategory !== 'BASE') {
      return detectedCategory;
    }
    return existingCategory;
  }

  return detectedCategory;
}

function inferForcedCategoryByName(nodeName: string, nodeType: string): NodeCategory | null {
  const normalizedName = nodeName.toLowerCase();
  const normalizedType = nodeType.toLowerCase();

  if (!normalizedName) {
    return null;
  }

  if (
    normalizedName.startsWith('if_') ||
    normalizedName.includes('condition') ||
    normalizedType.includes('n8n-nodes-base.if')
  ) {
    return 'BASE';
  }

  if (normalizedName.includes('screen') || normalizedName.includes('emoji')) {
    return 'SCREEN';
  }

  if (
    normalizedName.includes('speaker') ||
    (normalizedType.includes('code') && normalizedName.includes('audio'))
  ) {
    return 'SPEAKER';
  }

  if (
    normalizedName.includes('mechanical_hand') ||
    normalizedName.includes('hand_execute') ||
    (normalizedName.includes('hand') && normalizedType.includes('code'))
  ) {
    return 'HAND';
  }

  if (
    normalizedName.includes('face_net') ||
    normalizedName.includes('facenet') ||
    normalizedName.includes('identity')
  ) {
    return 'FACE-NET';
  }

  if (
    normalizedName.includes('microphone') ||
    normalizedName.includes('mic_capture') ||
    normalizedName.includes('mic_')
  ) {
    return 'MIC';
  }

  if (normalizedName.includes('asr_')) {
    return 'ASR';
  }

  if (
    normalizedName.includes('yolov8_expression') ||
    normalizedName.includes('expression') ||
    normalizedName.includes('visionlabel')
  ) {
    return 'YOLO-HAND';
  }

  if (normalizedName.includes('llm_emotion') || normalizedName.includes('structbert')) {
    return 'LLM-EMO';
  }

  return null;
}

function resolveExtraStatus(
  value: unknown,
  nodeType: string
): 'pending' | 'configuring' | 'configured' {
  if (value === 'configuring' || value === 'configured') {
    return value;
  }
  if (nodeType.includes('if') || nodeType.includes('Trigger')) {
    return 'configured';
  }
  return 'pending';
}

function remapConnectionsForNodeRename(
  connections: WorkflowDefinition['connections'],
  nameRemap: Map<string, string>
): WorkflowDefinition['connections'] {
  const nextConnections: WorkflowDefinition['connections'] = {};
  Object.entries(connections ?? {}).forEach(([sourceName, mapping]) => {
    const nextSourceName = nameRemap.get(sourceName) ?? sourceName;
    nextConnections[nextSourceName] = remapConnectionMapping(mapping, nameRemap);
  });
  return nextConnections;
}

function remapConnectionMapping(
  mapping: unknown,
  nameRemap: Map<string, string>
): Record<string, unknown> {
  if (!mapping || typeof mapping !== 'object') {
    return {};
  }

  const nextMapping: Record<string, unknown> = {};
  Object.entries(mapping as Record<string, unknown>).forEach(([key, groups]) => {
    if (!Array.isArray(groups)) {
      nextMapping[key] = groups;
      return;
    }
    nextMapping[key] = groups.map((group) => {
      if (!Array.isArray(group)) {
        return [];
      }
      return group.map((connection) => {
        if (!connection || typeof connection !== 'object') {
          return connection;
        }
        const target = (connection as { node?: unknown }).node;
        if (typeof target !== 'string') {
          return connection;
        }
        return {
          ...(connection as Record<string, unknown>),
          node: nameRemap.get(target) ?? target,
        };
      });
    });
  });
  return nextMapping;
}

function ensureUniqueNodeNames(
  nodes: Array<Record<string, unknown>>,
  nameRemap: Map<string, string>
): void {
  const seen = new Set<string>();
  nodes.forEach((node) => {
    const rawName = readText(node.name) ?? 'node';
    let candidate = rawName;
    let suffix = 2;
    while (seen.has(candidate)) {
      candidate = `${rawName}_${suffix}`;
      suffix += 1;
    }
    seen.add(candidate);
    if (candidate !== rawName) {
      nameRemap.set(rawName, candidate);
      node.name = candidate;
    }
  });
}

function pickChineseText(...values: Array<string | undefined>): string {
  return values.find((value) => typeof value === 'string' && /[\u4e00-\u9fff]/.test(value)) ??
    values.find((value) => typeof value === 'string' && value.trim().length > 0) ??
    '';
}

function normalizeAdaptiveText(
  existingValue: string,
  generatedValue: string,
  category: NodeCategory,
  field: 'title' | 'subtitle'
): string {
  return resolveAdaptiveNodeText(existingValue, generatedValue, category, field);
}

function readText(value: unknown): string | undefined {
  return typeof value === 'string' ? value.trim() || undefined : undefined;
}

function isTriggerNode(nodeType: string): boolean {
  return nodeType.includes('webhook') ||
    nodeType.includes('scheduleTrigger') ||
    nodeType.includes('manualTrigger');
}
