/**
 * [INPUT]: 依赖 topology-resolver、notes-enricher 与节点模板/notes 工具，对 emo 场景 workflow 做增量补全
 * [OUTPUT]: 对外提供 WorkflowEmotionSceneFlow，负责 emo 场景的节点补缺、重复节点去重与情绪分支重连
 * [POS]: workflow-architect/scene 的 emo 场景后处理器，已从整图模板替换降级为增量补全层
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import { randomUUID } from 'crypto';
import { logger } from '../../../utils/logger';
import { normalizeNodeNotes } from '../../../utils/node-notes';
import { getNodeTypeVersion } from '../../node-type-versions';
import {
  buildN8nEnvBackedUrlExpression,
  ROBOT_CAMERA_SNAPSHOT_URL,
  ROBOT_MIC_CAPTURE_URL,
} from '../../hardware-endpoint-defaults';
import { NodeCategory, WorkflowDefinition } from '../../types';
import { getNodeParameterTemplate } from '../../prompts/node-templates';
import { generateNodeTitleSubtitle } from '../../prompts/title-generator';
import { WorkflowNotesEnricher } from '../node/notes-enricher';
import { WorkflowTopologyResolver } from '../node/topology-resolver';

type WorkflowNode = Record<string, any>;

type EmotionNodeSpec = {
  name: string;
  type: string;
  category: NodeCategory;
  position: [number, number];
  aliases?: string[];
  sub: Record<string, unknown>;
  keywordHints?: string[];
};

type EnsuredNode = {
  node: WorkflowNode;
  added: boolean;
  renamedFrom?: string;
};

export class WorkflowEmotionSceneFlow {
  constructor(
    private topologyResolver: WorkflowTopologyResolver,
    private notesEnricher: WorkflowNotesEnricher
  ) {}

  ensureEmotionInteractionFlow(workflow: WorkflowDefinition): void {
    if (!Array.isArray(workflow.nodes) || !workflow.connections || typeof workflow.connections !== 'object') {
      return;
    }

    const nodes = workflow.nodes as WorkflowNode[];
    if (!this.isEmotionScene(nodes)) {
      return;
    }

    const addedNodeNames: string[] = [];
    const renamedNodePairs: Array<{ from: string; to: string }> = [];
    const requiredByName = new Map<string, WorkflowNode>();

    for (const spec of this.buildRequiredSpecs()) {
      const ensured = this.ensureEmotionNode(workflow, spec);
      requiredByName.set(spec.name, ensured.node);
      if (ensured.added) {
        addedNodeNames.push(spec.name);
      }
      if (ensured.renamedFrom) {
        renamedNodePairs.push({ from: ensured.renamedFrom, to: spec.name });
      }
    }

    const removedNodeNames = [
      ...this.removeDuplicateCategoryNodes(workflow, 'ASR', 'set_asr_recognition'),
      ...this.removeDuplicateCategoryNodes(workflow, 'LLM-EMO', 'set_llm_emotion'),
    ];

    this.ensureEmotionConnections(workflow);

    logger.info('WorkflowArchitect: incrementally normalized emotion interaction workflow', {
      nodeCount: (workflow.nodes as WorkflowNode[]).length,
      addedNodeNames,
      renamedNodePairs,
      removedNodeNames,
    });
  }

  private ensureEmotionNode(
    workflow: WorkflowDefinition,
    spec: EmotionNodeSpec
  ): EnsuredNode {
    const nodes = workflow.nodes as WorkflowNode[];
    const matched = this.findBestMatch(nodes, spec);
    const node = matched ?? this.buildEmotionNode(spec);

    if (!matched) {
      nodes.push(node);
    }

    const originalName = String(node.name || '');
    this.applyEmotionNodeSpec(node, spec);

    if (matched && originalName && originalName !== spec.name) {
      this.renameNodeReferences(workflow, originalName, spec.name);
      return { node, added: false, renamedFrom: originalName };
    }

    return { node, added: !matched };
  }

  private ensureEmotionConnections(workflow: WorkflowDefinition): void {
    const connections = workflow.connections as Record<string, any>;

    this.topologyResolver.setOutputPrimaryTarget(connections, 'schedule_trigger_30s', 'http_request_camera_snapshot', 0);
    this.topologyResolver.setOutputPrimaryTarget(connections, 'http_request_camera_snapshot', 'set_yolov8_expression', 0);
    this.topologyResolver.setOutputPrimaryTarget(connections, 'set_yolov8_expression', 'http_request_microphone_capture', 0);
    this.topologyResolver.setOutputPrimaryTarget(connections, 'http_request_microphone_capture', 'set_asr_recognition', 0);
    this.topologyResolver.setOutputPrimaryTarget(connections, 'set_asr_recognition', 'set_llm_emotion', 0);

    connections.set_llm_emotion = {
      main: [[
        this.edge('if_emotion_is_happy'),
        this.edge('if_emotion_is_sad'),
      ]],
    };

    connections.if_emotion_is_happy = {
      main: [[
        this.edge('set_tts_text_happy'),
        this.edge('code_screen_execute_emoji_happy'),
        this.edge('code_hand_execute_happy'),
      ], []],
    };

    connections.if_emotion_is_sad = {
      main: [[
        this.edge('set_tts_text_sad'),
        this.edge('code_screen_execute_emoji_sad'),
        this.edge('code_hand_execute_sad'),
      ], []],
    };

    this.topologyResolver.setOutputPrimaryTarget(connections, 'set_tts_text_happy', 'code_speaker_play_audio_happy', 0);
    this.topologyResolver.setOutputPrimaryTarget(connections, 'set_tts_text_sad', 'code_speaker_play_audio_sad', 0);
  }

  private removeDuplicateCategoryNodes(
    workflow: WorkflowDefinition,
    category: NodeCategory,
    canonicalName: string
  ): string[] {
    const nodes = workflow.nodes as WorkflowNode[];
    const categoryNodes = nodes.filter(
      (node) => normalizeNodeNotes(node.notes).category === category
    );

    if (categoryNodes.length <= 1) {
      return [];
    }

    const keepNode = categoryNodes.find((node) => String(node.name || '') === canonicalName) ?? categoryNodes[0];
    const keepName = String(keepNode?.name || canonicalName);
    const removedNames: string[] = [];

    for (const node of categoryNodes) {
      const nodeName = String(node.name || '');
      if (!nodeName || nodeName === keepName) {
        continue;
      }
      removedNames.push(nodeName);
      this.topologyResolver.removeNodeCompletely(workflow, nodeName);
    }

    return removedNames;
  }

  private renameNodeReferences(
    workflow: WorkflowDefinition,
    previousName: string,
    nextName: string
  ): void {
    if (!workflow.connections || typeof workflow.connections !== 'object' || previousName === nextName) {
      return;
    }

    const connections = workflow.connections as Record<string, any>;

    if (Object.prototype.hasOwnProperty.call(connections, previousName) && !Object.prototype.hasOwnProperty.call(connections, nextName)) {
      connections[nextName] = connections[previousName];
      delete connections[previousName];
    }

    for (const mapping of Object.values(connections)) {
      const main = Array.isArray((mapping as { main?: unknown[] })?.main)
        ? ((mapping as { main: unknown[] }).main)
        : [];

      for (const branch of main) {
        if (!Array.isArray(branch)) {
          continue;
        }
        for (const edge of branch) {
          if ((edge as { node?: string })?.node === previousName) {
            (edge as { node?: string }).node = nextName;
          }
        }
      }
    }
  }

  private findBestMatch(nodes: WorkflowNode[], spec: EmotionNodeSpec): WorkflowNode | undefined {
    const aliasSet = new Set([spec.name, ...(spec.aliases ?? [])]);
    const keywordHints = spec.keywordHints ?? [];

    const exact = nodes.find((node) => aliasSet.has(String(node.name || '')));
    if (exact) {
      return exact;
    }

    const sameCategory = nodes.filter(
      (node) => normalizeNodeNotes(node.notes).category === spec.category
    );

    const hinted = sameCategory.find((node) => {
      const normalizedName = String(node.name || '').toLowerCase();
      return keywordHints.some((hint) => normalizedName.includes(hint));
    });
    if (hinted) {
      return hinted;
    }

    if (sameCategory.length === 1) {
      return sameCategory[0];
    }

    return undefined;
  }

  private buildRequiredSpecs(): EmotionNodeSpec[] {
    return [
      {
        name: 'schedule_trigger_30s',
        type: 'n8n-nodes-base.scheduleTrigger',
        category: 'BASE',
        position: [864, 416],
        sub: { seconds: 5 },
        keywordHints: ['schedule_trigger'],
      },
      {
        name: 'http_request_camera_snapshot',
        type: 'n8n-nodes-base.httpRequest',
        category: 'CAM',
        position: [1088, 240],
        sub: { output: 'camera1' },
        keywordHints: ['camera_snapshot', 'camera'],
      },
      {
        name: 'set_yolov8_expression',
        type: 'n8n-nodes-base.set',
        category: 'YOLO-HAND',
        position: [1328, 240],
        sub: { yolov_input: 'camera1', yolov_output: 'visionLabel' },
        keywordHints: ['yolov', 'expression', 'gesture'],
      },
      {
        name: 'http_request_microphone_capture',
        type: 'n8n-nodes-base.httpRequest',
        category: 'MIC',
        position: [1552, 240],
        sub: { output: 'microphone1' },
        keywordHints: ['microphone', 'mic'],
      },
      {
        name: 'set_asr_recognition',
        type: 'n8n-nodes-base.set',
        category: 'ASR',
        position: [1776, 240],
        sub: { asr_input: 'microphone1', asr_output: 'asr_output' },
        aliases: ['set_asr_processor'],
        keywordHints: ['asr'],
      },
      {
        name: 'set_llm_emotion',
        type: 'n8n-nodes-base.set',
        category: 'LLM-EMO',
        position: [2000, 240],
        sub: {
          prompt: '你是一个情绪分类机器人，基于用户输入，仅判断用户情绪是[开心、悲伤、愤怒、平静]后输出对应的情绪关键词',
          llm_emo_input: 'asr_output',
          llm_emo_output: 'emotionText',
        },
        aliases: ['http_request_llm_emotion'],
        keywordHints: ['emotion', 'structbert', 'llm_emotion'],
      },
      {
        name: 'if_emotion_is_happy',
        type: 'n8n-nodes-base.if',
        category: 'BASE',
        position: [2224, 240],
        aliases: ['if_happy_detected'],
        sub: {},
        keywordHints: ['emotion_is_happy', 'happy'],
      },
      {
        name: 'if_emotion_is_sad',
        type: 'n8n-nodes-base.if',
        category: 'BASE',
        position: [2464, 240],
        aliases: ['if_sad_detected'],
        sub: {},
        keywordHints: ['emotion_is_sad', 'sad'],
      },
      {
        name: 'set_tts_text_happy',
        type: 'n8n-nodes-base.set',
        category: 'TTS',
        position: [2704, 144],
        sub: { TTS_input: '主人高兴我也高兴', audio_name: 'audio_happy' },
        keywordHints: ['tts_text_happy', 'audio_generate_happy', 'happy'],
      },
      {
        name: 'code_screen_execute_emoji_happy',
        type: 'n8n-nodes-base.code',
        category: 'SCREEN',
        position: [2704, 48],
        sub: { execute_emoji: 'Happy' },
        keywordHints: ['emoji_happy', 'screen_happy', 'happy'],
      },
      {
        name: 'code_hand_execute_happy',
        type: 'n8n-nodes-base.code',
        category: 'HAND',
        position: [2704, 240],
        sub: { execute_gesture: 'Waving' },
        keywordHints: ['hand_happy', 'execute_happy', 'happy'],
      },
      {
        name: 'code_speaker_play_audio_happy',
        type: 'n8n-nodes-base.code',
        category: 'SPEAKER',
        position: [2944, 144],
        sub: { audio_name: 'audio_happy' },
        keywordHints: ['speaker_happy', 'audio_happy', 'happy'],
      },
      {
        name: 'set_tts_text_sad',
        type: 'n8n-nodes-base.set',
        category: 'TTS',
        position: [2944, 336],
        sub: { TTS_input: '怎么了呀主人', audio_name: 'audio_sad' },
        keywordHints: ['tts_text_sad', 'audio_generate_sad', 'sad'],
      },
      {
        name: 'code_screen_execute_emoji_sad',
        type: 'n8n-nodes-base.code',
        category: 'SCREEN',
        position: [2944, 240],
        sub: { execute_emoji: 'Sad' },
        keywordHints: ['emoji_sad', 'screen_sad', 'sad'],
      },
      {
        name: 'code_hand_execute_sad',
        type: 'n8n-nodes-base.code',
        category: 'HAND',
        position: [2944, 432],
        sub: { execute_gesture: 'Put_down' },
        keywordHints: ['hand_sad', 'execute_sad', 'sad'],
      },
      {
        name: 'code_speaker_play_audio_sad',
        type: 'n8n-nodes-base.code',
        category: 'SPEAKER',
        position: [3184, 336],
        sub: { audio_name: 'audio_sad' },
        keywordHints: ['speaker_sad', 'audio_sad', 'sad'],
      },
    ];
  }

  private buildEmotionNode(spec: EmotionNodeSpec): WorkflowNode {
    const template = getNodeParameterTemplate(spec.type);
    const generatedText = generateNodeTitleSubtitle(
      { type: spec.type, name: spec.name, sub: spec.sub },
      spec.category
    );

    return {
      id: randomUUID(),
      name: spec.name,
      type: spec.type,
      typeVersion: getNodeTypeVersion(spec.type) ?? template.typeVersion ?? 1,
      position: spec.position,
      parameters: this.buildEmotionNodeParameters(spec.name, spec.type, template.parameters),
      notes: {
        title: generatedText.title,
        subtitle: generatedText.subtitle,
        category: spec.category,
        session_ID: '',
        extra: this.notesEnricher.normalizeExtraStatus('', spec.type),
        topology: null,
        device_ID: null,
        sub: spec.sub,
      },
    };
  }

  private applyEmotionNodeSpec(node: WorkflowNode, spec: EmotionNodeSpec): void {
    const currentNotes = normalizeNodeNotes(node.notes);
    const template = getNodeParameterTemplate(spec.type);
    const generatedText = generateNodeTitleSubtitle(
      { type: spec.type, name: spec.name, sub: spec.sub },
      spec.category
    );

    node.name = spec.name;
    node.type = spec.type;
    node.typeVersion = getNodeTypeVersion(spec.type) ?? template.typeVersion ?? 1;
    node.position = spec.position;
    node.parameters = this.buildEmotionNodeParameters(spec.name, spec.type, template.parameters);
    node.notes = {
      ...currentNotes,
      title: this.notesEnricher.resolveNodeTitle(currentNotes.title, generatedText.title, spec.category),
      subtitle: this.notesEnricher.resolveNodeSubtitle(currentNotes.subtitle, generatedText.subtitle, spec.category),
      category: spec.category,
      extra: this.notesEnricher.normalizeExtraStatus(currentNotes.extra, spec.type),
      topology: currentNotes.topology ?? null,
      device_ID: currentNotes.device_ID ?? null,
      sub: {
        ...(currentNotes.sub ?? {}),
        ...spec.sub,
      },
    };
  }

  private buildEmotionNodeParameters(
    nodeName: string,
    nodeType: string,
    fallback: Record<string, unknown>
  ): Record<string, unknown> {
    if (nodeType === 'n8n-nodes-base.scheduleTrigger') {
      return { rule: { interval: [{}] } };
    }

    if (nodeType === 'n8n-nodes-base.httpRequest') {
      if (nodeName === 'http_request_camera_snapshot') {
        return {
          url: buildN8nEnvBackedUrlExpression(
            'CAMERA_SNAPSHOT_URL',
            ROBOT_CAMERA_SNAPSHOT_URL
          ),
          options: { timeout: 60000 },
        };
      }
      if (nodeName === 'http_request_microphone_capture') {
        return {
          url: buildN8nEnvBackedUrlExpression(
            'MIC_CAPTURE_URL',
            ROBOT_MIC_CAPTURE_URL
          ),
          options: { timeout: 60000 },
        };
      }
      return { ...(fallback ?? {}), options: { timeout: 60000 } };
    }

    if (nodeType === 'n8n-nodes-base.if') {
      const branch = nodeName.includes('happy') ? 'happy' : 'sad';
      return { conditions: this.buildEmotionIfConditions(branch), options: {} };
    }

    if (nodeType === 'n8n-nodes-base.code') {
      return { language: 'javaScript', jsCode: 'return items;' };
    }

    if (nodeType === 'n8n-nodes-base.set') {
      return { assignments: { assignments: [] }, options: {}, includeOtherFields: false };
    }

    return fallback ?? {};
  }

  private buildEmotionIfConditions(branch: 'happy' | 'sad'): Record<string, unknown> {
    const normalized = this.normalizeEmotionConditionValue(branch);
    return {
      options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 1 },
      conditions: [
        {
          id: randomUUID(),
          leftValue: 'emotionText',
          rightValue: normalized,
          operator: { type: 'string', operation: 'equals', name: 'filter.operator.equals' },
        },
        {
          id: randomUUID(),
          leftValue: 'visionLabel',
          rightValue: normalized,
          operator: { type: 'string', operation: 'equals', name: 'filter.operator.equals' },
        },
      ],
      combinator: 'or',
    };
  }

  private normalizeEmotionConditionValue(value: string): 'happy' | 'sad' {
    const normalized = String(value || '').trim().toLowerCase();
    if (['微笑', '开心', '高兴', 'happy', 'smile'].some((entry) => normalized.includes(entry.toLowerCase()))) {
      return 'happy';
    }
    if (['难过', '悲伤', '伤心', 'sad'].some((entry) => normalized.includes(entry.toLowerCase()))) {
      return 'sad';
    }
    return normalized === 'happy' ? 'happy' : 'sad';
  }

  private edge(node: string): { node: string; type: 'main'; index: 0 } {
    return { node, type: 'main', index: 0 };
  }

  private isEmotionScene(nodes: WorkflowNode[]): boolean {
    const categories = nodes.map((node) => normalizeNodeNotes(node.notes).category);
    const names = nodes.map((node) => String(node?.name || '').toLowerCase());

    const hasEmotionCore =
      categories.includes('LLM-EMO') ||
      names.some((name) => name.includes('llm_emotion') || name.includes('structbert') || name.includes('emotion'));
    const hasVoicePipeline =
      categories.includes('MIC') ||
      categories.includes('ASR') ||
      names.some((name) => name.includes('microphone') || name.includes('asr'));
    const hasGestureAndOutput =
      categories.includes('HAND') &&
      categories.includes('SCREEN') &&
      categories.includes('SPEAKER');
    const hasGameMarkers =
      categories.includes('RAM') ||
      categories.includes('ASSIGN') ||
      categories.includes('YOLO-RPS');
    const hasFaceNet = categories.includes('FACE-NET');

    return hasEmotionCore && hasVoicePipeline && hasGestureAndOutput && !hasGameMarkers && !hasFaceNet;
  }
}
