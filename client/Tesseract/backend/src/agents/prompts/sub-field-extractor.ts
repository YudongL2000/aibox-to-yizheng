/**
 * [INPUT]: 依赖节点参数与分类信息
 * [OUTPUT]: 对外提供 extractSubFields 子字段抽取能力
 * [POS]: prompts 的节点参数抽取器，为 notes.sub 生成标准字段
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENT.md
 */

import { NodeCategory, NodeSubParams } from '../types';

interface AssignmentItem {
  name: string;
  value: unknown;
}

interface NodeMetadataInput {
  type?: unknown;
  name?: unknown;
  parameters?: unknown;
}

function readText(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function normalizeExpressionVariable(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }
  const withoutEqual = trimmed.startsWith('=') ? trimmed.slice(1).trim() : trimmed;
  const expression =
    withoutEqual.startsWith('{{') && withoutEqual.endsWith('}}')
      ? withoutEqual.slice(2, -2).trim()
      : withoutEqual;
  if (/^Math\.floor\(/i.test(expression)) {
    return 'n';
  }
  const directMatch = expression.match(/^\$json\.([A-Za-z_][\w]*)$/);
  if (directMatch?.[1]) {
    return directMatch[1];
  }
  const bracketMatch = expression.match(/^\$json\[['"]([^'"]+)['"]\]$/);
  if (bracketMatch?.[1]) {
    return bracketMatch[1];
  }
  return expression;
}

function lower(value: unknown): string {
  return readText(value).toLowerCase();
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function collectAssignments(parameters: unknown): AssignmentItem[] {
  const record = asRecord(parameters);
  const assignments = asArray(asRecord(record.assignments).assignments)
    .map((entry) => {
      const item = asRecord(entry);
      const name = readText(item.name);
      if (!name) {
        return null;
      }
      return { name, value: item.value } satisfies AssignmentItem;
    })
    .filter((entry): entry is AssignmentItem => Boolean(entry));

  if (assignments.length > 0) {
    return assignments;
  }

  const values = asRecord(record.values);
  const fallback: AssignmentItem[] = [];
  Object.values(values).forEach((typedEntries) => {
    asArray(typedEntries).forEach((entry) => {
      const item = asRecord(entry);
      const name = readText(item.name) || readText(item.field);
      if (!name) {
        return;
      }
      fallback.push({ name, value: item.value });
    });
  });
  return fallback;
}

function findAssignment(assignments: AssignmentItem[], names: string[]): unknown {
  const lowered = names.map((name) => name.toLowerCase());
  const found = assignments.find((assignment) => lowered.includes(assignment.name.toLowerCase()));
  return found?.value;
}

function sanitizeRamOutput(value: unknown): string {
  const text = readText(value);
  if (!text) {
    return 'n';
  }
  const normalized = normalizeExpressionVariable(text);
  return normalized || 'n';
}

function inferVariantFromName(name: string): string {
  if (name.includes('countdown') || name.includes('倒数')) {
    return 'count_down';
  }
  if (name.includes('win') || name.includes('赢')) {
    return 'win';
  }
  if (name.includes('lose') || name.includes('输')) {
    return 'lose';
  }
  if (name.includes('draw') || name.includes('平局')) {
    return 'draw';
  }
  if (name.includes('empty') || name.includes('空')) {
    return 'empty';
  }
  if (name.includes('result') || name.includes('结果')) {
    return 'result';
  }
  return 'output';
}

function inferGestureFromName(name: string): string | undefined {
  if (name.includes('rock') || name.includes('石头')) {
    return 'Rock';
  }
  if (name.includes('scissors') || name.includes('剪刀')) {
    return 'Scissors';
  }
  if (name.includes('paper') || name.includes('布')) {
    return 'Paper';
  }
  if (name.includes('middle') || name.includes('中指')) {
    return 'Middle_Finger';
  }
  if (name.includes('thumb') || name.includes('点赞') || name.includes('大拇指')) {
    return 'Thumbs_Up';
  }
  if (name.includes('victory') || name.includes(' v') || name.includes('手势v')) {
    return 'Victory';
  }
  return undefined;
}

function inferEmojiFromName(name: string): string | undefined {
  if (name.includes('happy') || name.includes('开心')) {
    return 'Happy';
  }
  if (name.includes('sad') || name.includes('难过')) {
    return 'Sad';
  }
  if (name.includes('angry') || name.includes('愤怒')) {
    return 'Angry';
  }
  return undefined;
}

function parseTriggerSeconds(parameters: unknown): number | undefined {
  const rule = asRecord(asRecord(parameters).rule);
  const interval = asArray(rule.interval);
  const first = asRecord(interval[0]);
  const secondsInterval = first.secondsInterval;
  if (typeof secondsInterval === 'number') {
    return secondsInterval;
  }
  if (typeof secondsInterval === 'string' && Number.isFinite(Number(secondsInterval))) {
    return Number(secondsInterval);
  }
  return 0.5;
}

export function extractSubFields(node: NodeMetadataInput, category: NodeCategory): NodeSubParams {
  const name = lower(node.name);
  const assignments = collectAssignments(node.parameters);

  switch (category) {
    case 'BASE': {
      if (lower(node.type).includes('scheduletrigger')) {
        return { seconds: parseTriggerSeconds(node.parameters) ?? 0.5 };
      }
      return {};
    }

    case 'CAM':
      return { output: 'camera1' };

    case 'MIC':
      return { output: 'microphone1', mic_output: 'microphone1' };

    case 'FACE-NET': {
      const facenetInput = findAssignment(assignments, ['facenet_input', 'input', 'camera', 'image_input']);
      const facenetOutput = findAssignment(assignments, ['facenet_output', 'output', 'identity']);
      const faceInfo = findAssignment(assignments, ['face_info', 'faceInfo']);
      return {
        facenet_input: readText(facenetInput) || 'camera1',
        facenet_output: readText(facenetOutput) || 'facenet_output',
        face_info: readText(faceInfo) || '用户上传的人脸图片对应名字',
      };
    }

    case 'YOLO-HAND':
      return { yolov_input: 'camera1', yolov_output: 'visionLabel' };

    case 'YOLO-RPS':
      return { yolov_input: 'camera1', yolov_output: 'userGesture' };

    case 'ASR':
      return { asr_input: 'microphone1', asr_output: 'asr_output' };

    case 'LLM-EMO': {
      const llmPrompt = findAssignment(assignments, ['prompt']);
      const llmEmoInput = findAssignment(assignments, ['llm_emo_input', 'llmInput', 'input']);
      const llmEmoOutput = findAssignment(assignments, ['llm_emo_output', 'emotion', 'output']);
      return {
        prompt:
          readText(llmPrompt) ||
          '你是一个情绪分类机器人，基于用户输入，仅判断用户情绪是[开心、悲伤、愤怒、平静]后输出对应的情绪关键词',
        llm_emo_input: readText(llmEmoInput) || 'asr_output',
        llm_emo_output: readText(llmEmoOutput) || 'emotionText',
      };
    }

    case 'LLM': {
      const llmPrompt = findAssignment(assignments, ['prompt']);
      return { prompt: readText(llmPrompt) || '你是一个共情机器人' };
    }

    case 'TTS': {
      const ttsInput = findAssignment(assignments, ['TTS_input', 'countdownText', 'resultText', 'text']);
      const audioName = findAssignment(assignments, ['audio_name', 'audioName']);
      return {
        TTS_input: readText(ttsInput),
        audio_name: readText(audioName) || inferVariantFromName(name),
      };
    }

    case 'RAM': {
      const output = sanitizeRamOutput(findAssignment(assignments, ['output', 'n']));
      return { random_rule: 3, output };
    }

    case 'ASSIGN': {
      const gesture = findAssignment(assignments, ['robotGesture', 'gesture']);
      return { robotGesture: readText(gesture) || inferGestureFromName(name)?.toLowerCase() || 'rock' };
    }

    case 'HAND': {
      const gesture = findAssignment(assignments, ['execute_gesture', 'handGesture', 'gesture']);
      return { execute_gesture: readText(gesture) || inferGestureFromName(name) || 'Rock' };
    }

    case 'WHEEL':
      return {};

    case 'SPEAKER': {
      const audioName = findAssignment(assignments, ['audio_name', 'audioName', 'audioUrl']);
      return { audio_name: readText(audioName) || inferVariantFromName(name) };
    }

    case 'SCREEN': {
      const emoji = findAssignment(assignments, ['execute_emoji', 'emoji', 'resultEmoji']);
      return { execute_emoji: readText(emoji) || inferEmojiFromName(name) || 'Angry' };
    }

    default:
      return {};
  }
}
