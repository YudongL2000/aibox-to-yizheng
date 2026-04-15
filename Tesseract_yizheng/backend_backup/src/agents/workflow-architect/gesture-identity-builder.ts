/**
 * [INPUT]: 依赖工作流节点列表、实体信息与节点模板配置
 * [OUTPUT]: 提供多人物 FACE-NET/IF 身份分支的生成与规范化能力
 * [POS]: workflow-architect 子模块的手势身份分支构建器
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENT.md
 */

import { randomUUID } from 'crypto';
import { normalizeNodeNotes } from '../../utils/node-notes';
import { getNodeTypeVersion } from '../node-type-versions';
import { getNodeParameterTemplate } from '../prompts/node-templates';

export interface IdentityProfile {
  alias: string;
  displayName: string;
  matchValue: string;
}

export function normalizeIdentityAlias(raw: string): string | null {
  const value = String(raw || '').trim().toLowerCase();
  if (!value) {
    return null;
  }
  if (value.includes('老刘') || value === '刘' || value === 'liu') {
    return 'liu';
  }
  if (value.includes('老付') || value === '付' || value === 'fu') {
    return 'fu';
  }
  if (value.includes('老王') || value === '王' || value === 'wang') {
    return 'wang';
  }
  if (/^person_\d+$/.test(value)) {
    return value;
  }
  const cleaned = value.replace(/[^a-z0-9_]/g, '');
  return cleaned || null;
}

export function aliasToPersonName(alias: string, fallback: string): string {
  if (alias === 'liu') {
    return '老刘';
  }
  if (alias === 'fu') {
    return '老付';
  }
  if (alias === 'wang') {
    return '老王';
  }
  return fallback;
}

export function inferIdentityAliasFromIfNode(node: Record<string, any>): string | null {
  const nodeName = String(node.name || '');
  const nameMatch = nodeName.match(/if_identity_is_([a-z0-9_]+)/i);
  if (nameMatch?.[1]) {
    return normalizeIdentityAlias(nameMatch[1]);
  }

  const conditions = (node.parameters as Record<string, any>)?.conditions?.conditions;
  if (!Array.isArray(conditions)) {
    return null;
  }
  for (const condition of conditions) {
    const rightValue = condition?.rightValue;
    if (typeof rightValue !== 'string' || !rightValue.trim()) {
      continue;
    }
    const normalized = normalizeIdentityAlias(rightValue);
    if (normalized) {
      return normalized;
    }
  }
  return null;
}

export function resolveExpectedIdentityProfiles(
  nodes: Array<Record<string, any>>,
  activeEntities: Record<string, string> | undefined
): IdentityProfile[] {
  const profiles: IdentityProfile[] = [];
  const personName = activeEntities?.person_name;
  if (personName && typeof personName === 'string') {
    const names = personName
      .split(/[，,、\s]+/)
      .map((name) => name.trim())
      .filter(Boolean);
    names.forEach((rawName) => {
      const alias = normalizeIdentityAlias(rawName);
      if (!alias) {
        return;
      }
      const displayName = aliasToPersonName(alias, rawName);
      const matchValue = ['liu', 'fu', 'wang'].includes(alias) ? alias : displayName;
      profiles.push({ alias, displayName, matchValue });
    });
  }

  if (profiles.length > 0) {
    const deduped = new Map<string, IdentityProfile>();
    profiles.forEach((profile) => {
      if (!deduped.has(profile.alias)) {
        deduped.set(profile.alias, profile);
      }
    });
    return Array.from(deduped.values());
  }

  const aliasesFromIf = nodes
    .filter((node) => node.type === 'n8n-nodes-base.if')
    .map((node) => inferIdentityAliasFromIfNode(node))
    .filter((alias): alias is string => Boolean(alias));
  const dedupedAliases = Array.from(new Set(aliasesFromIf));
  if (dedupedAliases.length > 0) {
    return dedupedAliases.map((alias) => {
      const displayName = aliasToPersonName(alias, alias);
      return {
        alias,
        displayName,
        matchValue: ['liu', 'fu', 'wang'].includes(alias) ? alias : displayName,
      };
    });
  }

  return [{ alias: 'liu', displayName: '老刘', matchValue: 'liu' }];
}

export function inferFaceAliasFromFaceNode(node: Record<string, any>, index: number): string {
  const nodeName = String(node.name || '').toLowerCase();
  const byName = nodeName.match(/set_face_net_recognition_([a-z0-9_]+)/i);
  if (byName?.[1]) {
    return byName[1];
  }
  const notes = normalizeNodeNotes(node.notes);
  const faceInfo = typeof notes.sub?.face_info === 'string' ? notes.sub.face_info : '';
  const alias = normalizeIdentityAlias(faceInfo);
  if (alias) {
    return alias;
  }
  return index === 0 ? 'liu' : `person_${index + 1}`;
}

export function normalizeFaceNetNodeForAlias(
  node: Record<string, any>,
  nodeName: string,
  displayName: string,
  x: number,
  y: number
): void {
  const notes = normalizeNodeNotes(node.notes);
  const sub = notes.sub && typeof notes.sub === 'object' ? { ...(notes.sub as Record<string, unknown>) } : {};
  sub.face_info = displayName;

  node.name = nodeName;
  node.type = 'n8n-nodes-base.set';
  node.typeVersion = getNodeTypeVersion('n8n-nodes-base.set') ?? 3.4;
  node.position = [x, y];
  node.notes = {
    ...notes,
    title: `AI 特征识别器-${displayName}`,
    subtitle: `视觉分析单元，专注识别${displayName}的人脸身份。`,
    category: 'FACE-NET',
    sub,
  };
}

export function ensureFaceNetNodeForAlias(
  nodes: Array<Record<string, any>>,
  baseNode: Record<string, any>,
  alias: string,
  displayName: string,
  facePos: any[],
  order: number
): Record<string, any> {
  const targetName = `set_face_net_recognition_${alias}`;
  const existing = nodes.find((node) => String(node.name || '') === targetName);
  const x = typeof facePos[0] === 'number' ? facePos[0] + 8 : 8;
  const yBase = typeof facePos[1] === 'number' ? facePos[1] : 0;
  const y = yBase + 168 * order;
  if (existing) {
    normalizeFaceNetNodeForAlias(existing, targetName, displayName, x, y);
    return existing;
  }

  const clone = JSON.parse(JSON.stringify(baseNode)) as Record<string, any>;
  clone.id = randomUUID();
  normalizeFaceNetNodeForAlias(clone, targetName, displayName, x, y);
  nodes.push(clone);
  return clone;
}

export function buildIdentityIfConditions(matchValue: string): Record<string, unknown> {
  return {
    options: {
      caseSensitive: true,
      leftValue: '',
      typeValidation: 'strict',
      version: 2,
    },
    conditions: [
      {
        id: randomUUID(),
        leftValue: 'facenet_output',
        rightValue: matchValue,
        operator: {
          type: 'string',
          operation: 'equals',
          name: 'filter.operator.equals',
        },
      },
    ],
    combinator: 'and',
  };
}

export function ensureIdentityIfNode(
  nodes: Array<Record<string, any>>,
  facePos: any[],
  identity: string,
  matchValue?: string,
  order?: number
): string {
  const normalizedIdentity = normalizeIdentityAlias(identity) || 'liu';
  const nodeName = `if_identity_is_${normalizedIdentity}`;
  const expectedMatchValue = (matchValue || normalizedIdentity).trim() || normalizedIdentity;
  const existing = nodes.find((node) => String(node.name || '') === nodeName);
  if (existing) {
    existing.type = 'n8n-nodes-base.if';
    existing.typeVersion = getNodeTypeVersion('n8n-nodes-base.if') ?? 2.2;
    if (!existing.parameters || typeof existing.parameters !== 'object') {
      existing.parameters = {};
    }
    const params = existing.parameters as Record<string, any>;
    params.conditions = buildIdentityIfConditions(expectedMatchValue);
    if (!params.options) {
      params.options = {};
    }
    return nodeName;
  }

  const x = typeof facePos[0] === 'number' ? facePos[0] + 224 : 224;
  const yBase = typeof facePos[1] === 'number' ? facePos[1] : 0;
  const branchOrder =
    typeof order === 'number'
      ? order
      : Math.max(nodes.filter((node) => String(node.name || '').startsWith('if_identity_is_')).length - 1, 0);
  const y = yBase + 160 * branchOrder;
  const template = getNodeParameterTemplate('n8n-nodes-base.if');

  nodes.push({
    id: randomUUID(),
    name: nodeName,
    type: 'n8n-nodes-base.if',
    typeVersion: getNodeTypeVersion('n8n-nodes-base.if') ?? template.typeVersion ?? 2.2,
    position: [x, y],
    parameters: {
      ...template.parameters,
      conditions: buildIdentityIfConditions(expectedMatchValue),
    },
    notes: {
      title: '身份验证网关',
      subtitle: '条件分流核心。根据识别出的身份进入对应执行分支。',
      category: 'BASE',
      session_ID: '',
      extra: 'pending',
      topology: null,
      device_ID: null,
      sub: {},
    },
  });

  return nodeName;
}

