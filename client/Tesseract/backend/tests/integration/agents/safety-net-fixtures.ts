/**
 * [INPUT]: 依赖 docs/development/scene 的 ground truth JSON 与 WorkflowDefinition 类型，封装 SafetyNet 对照测试所需的场景 workflow fixture
 * [OUTPUT]: 对外提供 ground truth 加载器、请求构造器与 gesture/emo/game 场景的 workflow fixture builders
 * [POS]: tests/integration/agents 的 fixture 库，给 safety-net-matrix.test.ts 提供可复用场景输入，避免测试文件继续膨胀
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { WorkflowDefinition } from '../../../src/agents/types';

const REPO_ROOT = process.cwd();
const EMPTY_SET_PARAMETERS = { assignments: { assignments: [] }, options: {} };
const DEFAULT_JS_CODE = 'return items;';

type WorkflowNode = Record<string, unknown>;
type NodeCategory = string;
type NodeSub = Record<string, unknown>;
type MainEdge = { node: string; type: 'main'; index: 0 };
type RequestInput = {
  userIntent: string;
  entities: Record<string, string>;
};

type NotesInput = {
  category: NodeCategory;
  sub?: NodeSub;
  title?: string;
  subtitle?: string;
  extra?: string;
  session_ID?: string;
};

type NodeInput = {
  id: string;
  name: string;
  type: string;
  typeVersion: number;
  position: [number, number];
  parameters: Record<string, unknown>;
  notes: NotesInput;
};

export function createRequest(userIntent: string, entities: Record<string, string> = {}): RequestInput {
  return { userIntent, entities };
}

export function loadGroundTruth(relativePath: string): WorkflowDefinition {
  return JSON.parse(readFileSync(path.join(REPO_ROOT, relativePath), 'utf-8')) as WorkflowDefinition;
}

export function buildGestureSharedIdentityWorkflow(): WorkflowDefinition {
  return workflow('Gesture Multi Person', [
    scheduleNode('1', 'schedule_trigger_30s', [0, 0], notes('BASE', { seconds: 5 }, '触发器')),
    httpNode('2', 'http_request_camera_snapshot', [220, 0], notes('CAM', { output: 'camera1' }, '摄像头')),
    setNode('3', 'set_face_net_recognition', [440, 0], notes('FACE-NET', { facenet_input: 'camera1', facenet_output: 'facenet_output' }, '人脸识别')),
    ifNode('4', 'if_identity_is_liu', [660, -120], notes('BASE', {}, '身份验证网关')),
    ifNode('5', 'if_identity_is_fu', [660, 120], notes('BASE', {}, '身份验证网关')),
    codeNode('6', 'code_hand_execute', [880, -60], notes('HAND', { execute_gesture: 'Middle_Finger' }, '机械手')),
    setNode('7', 'set_tts_text', [880, 60], notes('TTS', { TTS_input: '', audio_name: 'audio_liu' }, '语音')),
    codeNode('8', 'code_speaker_play_audio', [1100, 60], notes('SPEAKER', { audio_name: 'audio_liu' }, '喇叭')),
  ], {
    schedule_trigger_30s: main('http_request_camera_snapshot'),
    http_request_camera_snapshot: main('set_face_net_recognition'),
    set_face_net_recognition: main('if_identity_is_liu', 'if_identity_is_fu'),
    if_identity_is_liu: split(['code_hand_execute', 'set_tts_text']),
    if_identity_is_fu: split(['code_hand_execute', 'set_tts_text']),
    set_tts_text: main('code_speaker_play_audio'),
  });
}

export function buildGestureSpeakerWithoutTtsWorkflow(): WorkflowDefinition {
  return workflow('Gesture Speaker Without Tts', [
    scheduleNode('1', 'schedule_trigger_30s', [0, 0], notes('BASE', { seconds: 5 })),
    httpNode('2', 'http_request_camera_snapshot', [220, 0], notes('CAM', { output: 'camera1' })),
    setNode('3', 'set_face_net_recognition', [440, 0], notes('FACE-NET', { facenet_input: 'camera1', facenet_output: 'facenet_output' })),
    codeNode('4', 'code_hand_execute', [660, 0], notes('HAND', { execute_gesture: 'Victory' })),
    codeNode('5', 'code_speaker_play_audio', [880, 0], notes('SPEAKER', { audio_name: 'audio_liu' })),
  ], {
    schedule_trigger_30s: main('http_request_camera_snapshot'),
    http_request_camera_snapshot: main('set_face_net_recognition'),
    set_face_net_recognition: main('code_hand_execute'),
    code_hand_execute: main('code_speaker_play_audio'),
  });
}

export function buildGestureRedundantTtsWorkflow(): WorkflowDefinition {
  return workflow('Gesture Redundant TTS', [
    scheduleNode('trigger', 'schedule_trigger_30s', [0, 0], notes('BASE', { seconds: 5 })),
    httpNode('camera', 'http_request_camera_snapshot', [220, 0], notes('CAM', { output: 'camera1' })),
    setNode('face', 'set_face_net_recognition', [440, 0], notes('FACE-NET', { facenet_input: 'camera1', facenet_output: 'facenet_output' })),
    codeNode('hand', 'code_hand_execute', [660, 0], notes('HAND', { execute_gesture: 'Victory' })),
    setNode('tts1', 'set_tts_text_welcome', [880, 0], notes('TTS', { TTS_input: '欢迎回来', audio_name: 'welcome_audio' })),
    setNode('tts2', 'set_tts_bridge_welcome', [1100, 0], notes('TTS', { audio_name: 'welcome_audio' })),
    codeNode('speaker', 'code_speaker_play_audio', [1320, 0], notes('SPEAKER', { audio_name: 'welcome_audio' })),
  ], {
    schedule_trigger_30s: main('http_request_camera_snapshot'),
    http_request_camera_snapshot: main('set_face_net_recognition'),
    set_face_net_recognition: main('code_hand_execute'),
    code_hand_execute: main('set_tts_text_welcome'),
    set_tts_text_welcome: main('set_tts_bridge_welcome'),
    set_tts_bridge_welcome: main('code_speaker_play_audio'),
  });
}

export function buildGestureSpeakerRelayWorkflow(): WorkflowDefinition {
  return workflow('Gesture Speaker Relay', [
    scheduleNode('trigger', 'schedule_trigger_30s', [0, 0], notes('BASE', { seconds: 5 })),
    httpNode('camera', 'http_request_camera_snapshot', [220, 0], notes('CAM', { output: 'camera1' })),
    setNode('face', 'set_face_net_recognition', [440, 0], notes('FACE-NET', { facenet_input: 'camera1', facenet_output: 'facenet_output' })),
    codeNode('hand', 'code_hand_execute', [660, 0], notes('HAND', { execute_gesture: 'Victory' })),
    setNode('tts', 'set_tts_text_welcome', [880, 0], notes('TTS', { TTS_input: '欢迎回来', audio_name: 'welcome_audio' })),
    codeNode('speaker1', 'code_speaker_primary', [1100, 0], notes('SPEAKER', { audio_name: 'welcome_audio' })),
    codeNode('speaker2', 'code_speaker_relay', [1320, 0], notes('SPEAKER', { audio_name: 'welcome_audio' })),
    codeNode('screen', 'code_screen_execute_emoji_happy', [1540, 0], notes('SCREEN', { execute_emoji: 'Happy' })),
  ], {
    schedule_trigger_30s: main('http_request_camera_snapshot'),
    http_request_camera_snapshot: main('set_face_net_recognition'),
    set_face_net_recognition: main('code_hand_execute'),
    code_hand_execute: main('set_tts_text_welcome'),
    set_tts_text_welcome: main('code_speaker_primary'),
    code_speaker_primary: main('code_speaker_relay'),
    code_speaker_relay: main('code_screen_execute_emoji_happy'),
  });
}

export function buildGestureStructuredWorkflow(): WorkflowDefinition {
  const workflow = cloneWorkflow(loadGroundTruth('docs/development/scene/gesture/gesture_0315.json'));
  removeNodesByName(workflow, ['set_face_net_fu']);
  setMainTargets(workflow, 'set_face_net_liu', ['if_identity_is_liu', 'if_identity_is_fu']);
  return workflow;
}

export function buildEmotionDuplicateWorkflow(): WorkflowDefinition {
  return workflow('Emotion Duplicate Chain', [
    scheduleNode('trigger', 'schedule_trigger_30s', [0, 0], notes('BASE', { seconds: 5 })),
    httpNode('mic', 'http_request_microphone_capture', [220, 0], notes('MIC', { output: 'microphone1' }), {
      method: 'POST',
      url: 'http://robot.local/api/mic/capture',
      options: {},
    }),
    setNode('asr_set', 'set_asr_processor', [440, -80], notes('ASR', { asr_input: 'microphone1', asr_output: 'asr_output' })),
    httpNode('asr_http', 'http_request_asr', [440, 80], notes('ASR', { asr_input: 'microphone1', asr_output: 'asr_output' }), {
      method: 'POST',
      url: 'http://robot.local/api/asr',
      options: {},
    }),
    setNode('emo_set', 'set_llm_emotion', [660, -80], notes('LLM-EMO', { llm_emo_input: 'asr_output', llm_emo_output: 'emotionText' })),
    httpNode('emo_http', 'http_request_llm_emotion', [660, 80], notes('LLM-EMO', { llm_emo_input: 'asr_output', llm_emo_output: 'emotionText' }), {
      method: 'POST',
      url: 'http://robot.local/api/emo',
      options: {},
    }),
    codeNode('screen', 'code_screen_execute_emoji_happy', [880, 0], notes('SCREEN', { execute_emoji: 'Happy' })),
    codeNode('hand', 'code_hand_execute_happy', [1100, 0], notes('HAND', { execute_gesture: 'Waving' })),
    codeNode('speaker', 'code_speaker_play_audio_happy', [1320, 0], notes('SPEAKER', { audio_name: 'audio_happy' })),
  ], {
    schedule_trigger_30s: main('http_request_microphone_capture'),
  });
}

export function buildEmotionStructuredWorkflow(): WorkflowDefinition {
  return workflow('Emotion Structured Baseline', [
    scheduleNode('trigger', 'schedule_trigger_30s', [864, 416], notes('BASE', { seconds: 5 })),
    httpNode('camera', 'http_request_camera_snapshot', [1088, 240], notes('CAM', { output: 'camera1' }), {
      url: '={{$env.CAMERA_SNAPSHOT_URL || "http://robot.local/api/camera/snapshot"}}',
      options: { timeout: 60000 },
    }),
    setNode('vision', 'set_yolov8_expression', [1328, 240], notes('YOLO-HAND', { yolov_input: 'camera1', yolov_output: 'visionLabel' })),
    httpNode('mic', 'http_request_microphone_capture', [1552, 240], notes('MIC', { output: 'microphone1' }), {
      url: '={{$env.MIC_CAPTURE_URL || "http://robot.local/api/mic/capture"}}',
      options: { timeout: 60000 },
    }),
    setNode('asr', 'set_asr_recognition', [1776, 240], notes('ASR', { asr_input: 'microphone1', asr_output: 'asr_output' })),
    setNode('emo', 'set_llm_emotion', [2000, 240], notes('LLM-EMO', { llm_emo_input: 'asr_output', llm_emo_output: 'emotionText' })),
    ifNode('if_happy', 'if_emotion_is_happy', [2224, 240], notes('BASE')),
    ifNode('if_sad', 'if_emotion_is_sad', [2464, 240], notes('BASE')),
    setNode('tts_happy', 'set_tts_text_happy', [2704, 144], notes('TTS', { TTS_input: '主人高兴我也高兴', audio_name: 'audio_happy' })),
    codeNode('screen_happy', 'code_screen_execute_emoji_happy', [2704, 48], notes('SCREEN', { execute_emoji: 'Happy' })),
    codeNode('hand_happy', 'code_hand_execute_happy', [2704, 240], notes('HAND', { execute_gesture: 'Waving' })),
    codeNode('speaker_happy', 'code_speaker_play_audio_happy', [2944, 144], notes('SPEAKER', { audio_name: 'audio_happy' })),
    codeNode('screen_sad', 'code_screen_execute_emoji_sad', [2944, 240], notes('SCREEN', { execute_emoji: 'Sad' })),
    codeNode('hand_sad', 'code_hand_execute_sad', [2944, 432], notes('HAND', { execute_gesture: 'Put_down' })),
  ], {
    schedule_trigger_30s: main('http_request_camera_snapshot'),
    http_request_camera_snapshot: main('set_yolov8_expression'),
    set_yolov8_expression: main('http_request_microphone_capture'),
    http_request_microphone_capture: main('set_asr_recognition'),
    set_asr_recognition: main('set_llm_emotion'),
    set_llm_emotion: main('if_emotion_is_happy', 'if_emotion_is_sad'),
    if_emotion_is_happy: split(['set_tts_text_happy', 'code_screen_execute_emoji_happy', 'code_hand_execute_happy']),
    if_emotion_is_sad: split(['code_screen_execute_emoji_sad', 'code_hand_execute_sad']),
    set_tts_text_happy: main('code_speaker_play_audio_happy'),
  });
}

export function buildEmotionQualityWorkflow(): WorkflowDefinition {
  return cloneWorkflow(loadGroundTruth('docs/development/scene/emo/emo_0310.json'));
}

export function buildGameMissingHandWorkflow(): WorkflowDefinition {
  return workflow('Ensure Hand Node', [
    setNode('ram', 'set_random_robot_gesture', [0, 0], notes('RAM', { random_rule: 3 })),
    setNode('assign_rock', 'set_robot_gesture_rock', [220, -80], notes('ASSIGN', { robotGesture: 'rock' })),
    setNode('assign_scissors', 'set_robot_gesture_scissors', [220, 0], notes('ASSIGN', { robotGesture: 'scissors' })),
    httpNode('cam', 'http_camera_snapshot', [440, 0], notes('CAM', { output: 'camera1' }), {
      method: 'POST',
      url: 'http://camera.local/snapshot',
      options: {},
    }),
    setNode('yolo', 'set_yolo_rps_recognition', [660, 0], notes('YOLO-RPS', { yolov_input: 'camera1' })),
  ], {
    set_robot_gesture_rock: main('http_camera_snapshot'),
    set_robot_gesture_scissors: main('http_camera_snapshot'),
  });
}

export function buildGameStructuredMissingHandsWorkflow(): WorkflowDefinition {
  const workflow = cloneWorkflow(loadGroundTruth('docs/development/scene/game/game_0203.json'));
  removeNodesByName(workflow, [
    'code_hand_execute_rock',
    'code_hand_execute_scissors',
    'code_hand_execute_paper',
  ]);
  setMainTargets(workflow, 'if_robot_n_eq_1', ['set_robot_gesture_rock']);
  setMainTargets(workflow, 'if_robot_n_eq_2', ['set_robot_gesture_scissors']);
  setMainTargets(workflow, 'if_robot_n_eq_3', ['set_robot_gesture_paper']);
  return workflow;
}

export function buildGameSharedResultWorkflow(): WorkflowDefinition {
  return workflow('Shared Result Branches', [
    ifNode('if_1', 'if_gesture_empty', [0, 0], notes('BASE')),
    ifNode('if_2', 'if_draw', [0, 80], notes('BASE')),
    ifNode('if_3', 'if_rock_vs_scissors', [0, 160], notes('BASE')),
    ifNode('if_4', 'if_rock_vs_paper', [0, 240], notes('BASE')),
    codeNode('screen_shared', 'http_screen_emoji', [300, 0], notes('SCREEN', { execute_emoji: 'Angry' })),
    setNode('tts_shared', 'set_audio_generate_result', [520, 0], notes('TTS', { TTS_input: 'result', audio_name: 'result_audio' })),
    codeNode('speaker_shared', 'code_speaker_execute_result', [740, 0], notes('SPEAKER', { audio_name: 'result_audio' })),
  ], {
    if_gesture_empty: split(['http_screen_emoji']),
    if_draw: split(['http_screen_emoji']),
    if_rock_vs_scissors: split(['http_screen_emoji']),
    if_rock_vs_paper: split(['http_screen_emoji']),
    http_screen_emoji: main('set_audio_generate_result'),
    set_audio_generate_result: main('code_speaker_execute_result'),
  });
}

export function buildGameStructuredMissingDrawBranchWorkflow(): WorkflowDefinition {
  const workflow = cloneWorkflow(loadGroundTruth('docs/development/scene/game/game_0203.json'));
  removeNodesByName(workflow, [
    'code_screen_execute_draw_angry',
    'set_audio_generate_draw',
    'code_speaker_execute_draw',
  ]);
  setMainTargets(workflow, 'if_draw', []);
  return workflow;
}

export function buildGameBridgeWorkflow(): WorkflowDefinition {
  return workflow('If Direct Executor', [
    scheduleNode('trigger_1', 'schedule_trigger', [0, 0], notes('BASE', { seconds: 5 })),
    ifNode('if_1', 'if_robot_choice', [220, 0], notes('BASE')),
    setNode('set_rock_bridge', 'set_robot_rock_bridge', [440, 0], notes('BASE', { execute_gesture: 'Rock' }), {
      assignments: { assignments: [{ name: 'robotGesture', value: 'Rock', type: 'string' }] },
      options: {},
    }),
    codeNode('hand_rock', 'code_hand_rock', [660, 0], notes('HAND')),
    setNode('assign_rock', 'set_robot_assign_rock', [880, 0], notes('ASSIGN', { robotGesture: 'rock' })),
    ifNode('if_2', 'if_result_win', [1100, 0], notes('BASE')),
    setNode('set_screen_bridge', 'set_screen_win_bridge', [1320, 0], notes('BASE', { execute_emoji: 'Happy' }), {
      assignments: { assignments: [{ name: 'emoji', value: 'Happy', type: 'string' }] },
      options: {},
    }),
    codeNode('screen_win', 'code_screen_win', [1540, 0], notes('SCREEN')),
  ], {
    schedule_trigger: main('if_robot_choice'),
    if_robot_choice: split(['set_robot_rock_bridge']),
    set_robot_rock_bridge: main('code_hand_rock'),
    code_hand_rock: main('set_robot_assign_rock'),
    set_robot_assign_rock: main('if_result_win'),
    if_result_win: split(['set_screen_win_bridge']),
    set_screen_win_bridge: main('code_screen_win'),
  });
}

export function buildGameStructuredBridgeWorkflow(): WorkflowDefinition {
  const workflow = cloneWorkflow(loadGroundTruth('docs/development/scene/game/game_0203.json'));
  const nodes = (Array.isArray(workflow.nodes) ? workflow.nodes : []) as WorkflowNode[];
  nodes.push(
    setNode(
      'bridge_rock',
      'set_robot_rock_bridge',
      [1240, 1500],
      notes('BASE', { execute_gesture: 'Rock' }, '桥接节点'),
      {
        assignments: {
          assignments: [{ name: 'robotGesture', value: 'Rock', type: 'string' }],
        },
        options: {},
      }
    )
  );
  nodes.push(
    setNode(
      'bridge_draw',
      'set_screen_draw_bridge',
      [1760, 2240],
      notes('BASE', { execute_emoji: 'Angry' }, '桥接节点'),
      {
        assignments: {
          assignments: [{ name: 'emoji', value: 'Angry', type: 'string' }],
        },
        options: {},
      }
    )
  );
  setMainTargets(workflow, 'if_robot_n_eq_1', ['set_robot_rock_bridge']);
  setMainTargets(workflow, 'set_robot_rock_bridge', ['code_hand_execute_rock']);
  setMainTargets(workflow, 'if_draw', ['set_screen_draw_bridge']);
  setMainTargets(workflow, 'set_screen_draw_bridge', ['code_screen_execute_draw_angry']);
  return workflow;
}

export function buildHandWithoutAssignWorkflow(): WorkflowDefinition {
  return workflow('Ensure Assign After Hand', [
    codeNode('hand_1', 'code_mechanical_hand_execute', [100, 100], notes('HAND', { execute_gesture: 'Rock' })),
    httpNode('cam_1', 'http_camera_snapshot', [320, 100], notes('CAM', { output: 'camera1' }), {
      method: 'POST',
      url: 'http://robot.local/api/camera/snapshot',
      options: {},
    }),
  ], {
    code_mechanical_hand_execute: main('http_camera_snapshot'),
  });
}

export function buildGameStructuredMissingAssignWorkflow(): WorkflowDefinition {
  const workflow = cloneWorkflow(loadGroundTruth('docs/development/scene/game/game_0203.json'));
  removeNodesByName(workflow, [
    'set_robot_gesture_rock',
    'set_robot_gesture_scissors',
    'set_robot_gesture_paper',
  ]);
  setMainTargets(workflow, 'code_hand_execute_rock', ['http_request_camera_snapshot']);
  setMainTargets(workflow, 'code_hand_execute_scissors', ['http_request_camera_snapshot']);
  setMainTargets(workflow, 'code_hand_execute_paper', ['http_request_camera_snapshot']);
  return workflow;
}

export function buildGameStructuredSpeakerPairedWorkflow(): WorkflowDefinition {
  return cloneWorkflow(loadGroundTruth('docs/development/scene/game/game_0203.json'));
}

export function buildGestureStructuredSpeakerPairedWorkflow(): WorkflowDefinition {
  return cloneWorkflow(loadGroundTruth('docs/development/scene/gesture/gesture_0315.json'));
}

function workflow(
  name: string,
  nodes: WorkflowNode[],
  connections: Record<string, { main: Array<Array<MainEdge>> }>
): WorkflowDefinition {
  return { name, nodes, connections };
}

function notes(
  category: NodeCategory,
  sub: NodeSub = {},
  title = '',
  subtitle = '',
  extra = 'pending',
  session_ID = 'sess'
): NotesInput {
  return { category, sub, title, subtitle, extra, session_ID };
}

function scheduleNode(id: string, name: string, position: [number, number], nodeNotes: NotesInput): WorkflowNode {
  return node({ id, name, type: 'n8n-nodes-base.scheduleTrigger', typeVersion: 1.1, position, parameters: { rule: { interval: [{}] } }, notes: nodeNotes });
}

function httpNode(
  id: string,
  name: string,
  position: [number, number],
  nodeNotes: NotesInput,
  parameters: Record<string, unknown> = {}
): WorkflowNode {
  return node({ id, name, type: 'n8n-nodes-base.httpRequest', typeVersion: 4.3, position, parameters, notes: nodeNotes });
}

function setNode(
  id: string,
  name: string,
  position: [number, number],
  nodeNotes: NotesInput,
  parameters: Record<string, unknown> = EMPTY_SET_PARAMETERS
): WorkflowNode {
  return node({ id, name, type: 'n8n-nodes-base.set', typeVersion: 3.4, position, parameters, notes: nodeNotes });
}

function codeNode(
  id: string,
  name: string,
  position: [number, number],
  nodeNotes: NotesInput,
  parameters: Record<string, unknown> = { jsCode: DEFAULT_JS_CODE }
): WorkflowNode {
  return node({ id, name, type: 'n8n-nodes-base.code', typeVersion: 2, position, parameters, notes: nodeNotes });
}

function ifNode(id: string, name: string, position: [number, number], nodeNotes: NotesInput): WorkflowNode {
  return node({
    id,
    name,
    type: 'n8n-nodes-base.if',
    typeVersion: 2.2,
    position,
    parameters: {
      conditions: {
        combinator: 'and',
        conditions: [],
        options: { version: 1, caseSensitive: true, leftValue: '', typeValidation: 'strict' },
      },
    },
    notes: nodeNotes,
  });
}

function node(input: NodeInput): WorkflowNode {
  return {
    id: input.id,
    name: input.name,
    type: input.type,
    typeVersion: input.typeVersion,
    position: input.position,
    parameters: input.parameters,
    notes: input.notes,
  };
}

function main(...targets: string[]): { main: Array<Array<MainEdge>> } {
  return { main: [targets.map(edge)] };
}

function split(trueTargets: string[], falseTargets: string[] = []): { main: Array<Array<MainEdge>> } {
  return { main: [trueTargets.map(edge), falseTargets.map(edge)] };
}

function edge(node: string): MainEdge {
  return { node, type: 'main', index: 0 };
}

function cloneWorkflow<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function removeNodesByName(workflow: WorkflowDefinition, names: string[]): void {
  const nameSet = new Set(names);
  if (Array.isArray(workflow.nodes)) {
    workflow.nodes = workflow.nodes.filter((node) => !nameSet.has(String((node as Record<string, unknown>)?.name || '')));
  }
  if (!workflow.connections || typeof workflow.connections !== 'object') {
    return;
  }
  const connections = workflow.connections as Record<string, { main?: Array<Array<Record<string, unknown>>> }>;
  for (const [sourceName, mapping] of Object.entries(connections)) {
    if (nameSet.has(sourceName)) {
      delete connections[sourceName];
      continue;
    }
    const main = Array.isArray(mapping.main) ? mapping.main : [];
    mapping.main = main.map((branch) =>
      Array.isArray(branch)
        ? branch.filter((edge) => !nameSet.has(String(edge?.node || '')))
        : []
    );
  }
}

function setMainTargets(workflow: WorkflowDefinition, sourceName: string, targets: string[]): void {
  if (!workflow.connections || typeof workflow.connections !== 'object') {
    workflow.connections = {};
  }
  const connections = workflow.connections as Record<string, { main?: Array<Array<MainEdge>> }>;
  connections[sourceName] = {
    main: [targets.map((target) => edge(target))],
  };
}
