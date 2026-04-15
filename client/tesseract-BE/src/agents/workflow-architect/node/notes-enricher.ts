/**
 * [INPUT]: 依赖 notes/category/sub/title 相关工具与 node-rules 的共享规则
 * [OUTPUT]: 对外提供 WorkflowNotesEnricher，负责节点 notes/sub/title/subtitle 标准化
 * [POS]: workflow-architect/node 的 notes 补全器，被 WorkflowNodeNormalizer 调用
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import { normalizeNodeNotes } from '../../../utils/node-notes';
import { NodeCategory } from '../../types';
import { detectNodeCategory } from '../../prompts/category-mapping';
import { extractSubFields } from '../../prompts/sub-field-extractor';
import { generateNodeTitleSubtitle, resolveAdaptiveNodeText } from '../../prompts/title-generator';
import { generateNodeName } from '../../prompts/node-name-generator';
import {
  GLOBAL_NODE_SUB_KEYS,
  LEGACY_NODE_SUB_KEYS,
  NODE_CATEGORY_SET,
  NODE_SUB_KEYS_BY_CATEGORY,
  isIdentityIfNodeName,
} from './node-rules';

export class WorkflowNotesEnricher {
  ensureNodeNotes(node: Record<string, any>): void {
    const rawCategory = this.extractRawNodeCategory(node.notes);
    const normalizedNotes = normalizeNodeNotes(node.notes);
    const detectedCategory = detectNodeCategory({
      type: node.type,
      name: node.name,
      parameters: node.parameters,
    });
    const category = this.resolveNodeCategory(
      rawCategory,
      detectedCategory,
      typeof node.name === 'string' ? node.name : '',
      typeof node.type === 'string' ? node.type : ''
    );
    const inferredSub = extractSubFields(
      {
        type: node.type,
        name: node.name,
        parameters: node.parameters,
      },
      category
    );
    const mergedSub = this.mergeNodeSub(
      inferredSub as Record<string, unknown>,
      normalizedNotes.sub
    );
    const sanitizedSub = this.sanitizeNodeSub(
      category,
      typeof node.name === 'string' ? node.name : '',
      mergedSub
    );
    const adjustedSub = this.applyNodeSubDefaults(
      category,
      typeof node.name === 'string' ? node.name : '',
      sanitizedSub
    );
    const generatedTexts = generateNodeTitleSubtitle(
      { type: node.type, name: node.name, sub: adjustedSub },
      category
    );
    const title = this.resolveNodeTitle(normalizedNotes.title, generatedTexts.title, category);
    const subtitle = this.resolveNodeSubtitle(normalizedNotes.subtitle, generatedTexts.subtitle, category);

    node.name = generateNodeName({
      nodeType: typeof node.type === 'string' ? node.type : '',
      currentName: typeof node.name === 'string' ? node.name : '',
      category,
      sub: adjustedSub,
    });

    node.notes = {
      ...normalizedNotes,
      title,
      subtitle,
      category,
      extra: this.normalizeExtraStatus(
        normalizedNotes.extra,
        typeof node.type === 'string' ? node.type : ''
      ),
      sub: adjustedSub,
      topology: normalizedNotes.topology ?? null,
      device_ID: normalizedNotes.device_ID ?? null,
    };
  }

  resolveNodeTitle(existingTitle: string, generatedTitle: string, category: NodeCategory): string {
    return resolveAdaptiveNodeText(existingTitle, generatedTitle, category, 'title');
  }

  resolveNodeSubtitle(existingSubtitle: string, generatedSubtitle: string, category: NodeCategory): string {
    return resolveAdaptiveNodeText(existingSubtitle, generatedSubtitle, category, 'subtitle');
  }

  normalizeExtraStatus(value: string, nodeType: string): string {
    if (value === 'configuring' || value === 'configured') {
      return value;
    }
    if (this.isLogicLikeNodeType(nodeType)) {
      return 'configured';
    }
    return 'pending';
  }

  private applyNodeSubDefaults(
    category: NodeCategory,
    nodeName: string,
    sub: Record<string, unknown>
  ): Record<string, unknown> {
    const next = this.sanitizeNodeSub(category, nodeName, sub);
    const normalizedName = (nodeName || '').toLowerCase();

    if (category === 'TTS' && normalizedName.includes('countdown')) {
      next.TTS_input = '准备开始石头剪刀布游戏！三！二！一！';
    }

    return next;
  }

  private extractRawNodeCategory(rawNotes: unknown): string {
    if (!rawNotes) {
      return '';
    }
    if (typeof rawNotes === 'string') {
      const trimmed = rawNotes.trim();
      if (!trimmed || !trimmed.startsWith('{')) {
        return '';
      }
      try {
        const parsed = JSON.parse(trimmed);
        return this.extractRawNodeCategory(parsed);
      } catch {
        return '';
      }
    }
    if (typeof rawNotes !== 'object' || Array.isArray(rawNotes)) {
      return '';
    }
    const value = (rawNotes as Record<string, unknown>).category;
    return typeof value === 'string' ? value : '';
  }

  private resolveNodeCategory(
    existingCategory: string,
    detectedCategory: NodeCategory,
    nodeName: string,
    nodeType: string
  ): NodeCategory {
    const forcedCategory = this.inferForcedCategoryByName(nodeName, nodeType);
    if (forcedCategory) {
      return forcedCategory;
    }

    const normalizedCategory =
      typeof existingCategory === 'string' ? existingCategory.trim().toUpperCase() : '';
    if (NODE_CATEGORY_SET.has(normalizedCategory as NodeCategory)) {
      if (normalizedCategory === 'BASE' && detectedCategory !== 'BASE') {
        return detectedCategory;
      }
      return normalizedCategory as NodeCategory;
    }
    return detectedCategory;
  }

  private inferForcedCategoryByName(nodeName: string, nodeType: string): NodeCategory | null {
    const normalizedName = (nodeName || '').toLowerCase();
    const normalizedType = (nodeType || '').toLowerCase();
    if (!normalizedName) {
      return null;
    }

    if (isIdentityIfNodeName(normalizedName) || normalizedType.includes('n8n-nodes-base.if')) {
      return 'BASE';
    }
    if (normalizedName.includes('screen') || normalizedName.includes('emoji')) {
      return 'SCREEN';
    }
    if (normalizedName.includes('speaker') || (normalizedType.includes('code') && normalizedName.includes('audio'))) {
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

  private mergeNodeSub(
    inferredSub: Record<string, unknown>,
    existingSub: Record<string, unknown>
  ): Record<string, unknown> {
    const merged: Record<string, unknown> = { ...inferredSub };
    Object.entries(existingSub).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') {
        return;
      }
      merged[key] = value;
    });
    return merged;
  }

  private sanitizeNodeSub(
    category: NodeCategory,
    nodeName: string,
    sub: Record<string, unknown>
  ): Record<string, unknown> {
    const next: Record<string, unknown> = { ...sub };

    const ttsInput = this.firstNonEmptyString(
      next.TTS_input,
      next.ttsText,
      next.countdownText,
      next.resultText
    );
    if (category === 'TTS' && ttsInput) {
      next.TTS_input = ttsInput;
    }

    const audioName = this.firstNonEmptyString(next.audio_name, next.audioName);
    if (audioName) {
      next.audio_name = audioName;
    }

    if (category === 'RAM') {
      const output = this.firstNonEmptyString(next.output, next.n);
      next.output = this.normalizeRamOutput(output, nodeName);
      if (typeof next.random_rule !== 'number') {
        next.random_rule = 3;
      }
    }

    LEGACY_NODE_SUB_KEYS.forEach((key) => {
      delete next[key];
    });
    delete next.audioName;
    delete next.n;
    delete next.countdownText;
    delete next.resultText;

    const allowedKeys = new Set([
      ...(NODE_SUB_KEYS_BY_CATEGORY[category] ?? []),
      ...GLOBAL_NODE_SUB_KEYS,
    ]);
    Object.keys(next).forEach((key) => {
      if (!allowedKeys.has(key)) {
        delete next[key];
      }
    });

    return next;
  }

  private normalizeRamOutput(rawValue: string | null, nodeName: string): string {
    const normalizedName = (nodeName || '').toLowerCase();
    if (normalizedName.includes('random') || normalizedName.includes('robot_n')) {
      return 'n';
    }
    if (!rawValue) {
      return 'n';
    }

    const trimmed = rawValue.trim();
    if (!trimmed) {
      return 'n';
    }
    if (/Math\.floor\s*\(/i.test(trimmed)) {
      return 'n';
    }

    const withoutEqual = trimmed.startsWith('=') ? trimmed.slice(1).trim() : trimmed;
    const expression =
      withoutEqual.startsWith('{{') && withoutEqual.endsWith('}}')
        ? withoutEqual.slice(2, -2).trim()
        : withoutEqual;
    if (/Math\.floor\s*\(/i.test(expression)) {
      return 'n';
    }
    const jsonDot = expression.match(/^\$json\.([A-Za-z_][\w]*)$/);
    if (jsonDot?.[1]) {
      return jsonDot[1];
    }
    const jsonBracket = expression.match(/^\$json\[['"]([^'"]+)['"]\]$/);
    if (jsonBracket?.[1]) {
      return jsonBracket[1];
    }

    return expression || 'n';
  }

  private isLogicLikeNodeType(nodeType: string): boolean {
    return (
      nodeType.includes('if') ||
      nodeType.includes('switch') ||
      nodeType.includes('merge') ||
      nodeType.includes('scheduleTrigger') ||
      nodeType.includes('manualTrigger') ||
      nodeType.includes('webhook')
    );
  }

  private firstNonEmptyString(...values: unknown[]): string | null {
    for (const value of values) {
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }
    return null;
  }
}
