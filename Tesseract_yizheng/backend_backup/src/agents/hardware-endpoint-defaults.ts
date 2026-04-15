/**
 * [INPUT]: 无
 * [OUTPUT]: 对外提供机器人/AI/hardware-api 默认 endpoint 常量与 n8n 环境变量表达式构造器
 * [POS]: agents 的 endpoint 真相源，避免 workflow template / capability registry / scene flow 各自复制 fallback URL
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

export const ROBOT_ENDPOINT_BASE_URL = 'http://robot.local';
export const AI_ENDPOINT_BASE_URL = 'http://ai.local';
export const HARDWARE_API_BASE_URL = 'http://hardware-api';

export const ROBOT_CAMERA_SNAPSHOT_URL =
  `${ROBOT_ENDPOINT_BASE_URL}/api/camera/snapshot`;
export const ROBOT_MIC_CAPTURE_URL =
  `${ROBOT_ENDPOINT_BASE_URL}/api/mic/capture`;
export const ROBOT_MIC_SNAPSHOT_URL =
  `${ROBOT_ENDPOINT_BASE_URL}/api/mic/snapshot`;
export const ROBOT_HAND_GESTURE_URL =
  `${ROBOT_ENDPOINT_BASE_URL}/api/hand/gesture`;
export const ROBOT_ARM_ACTION_URL =
  `${ROBOT_ENDPOINT_BASE_URL}/api/arm/action`;
export const ROBOT_BASE_MOVE_URL =
  `${ROBOT_ENDPOINT_BASE_URL}/api/base/move`;
export const ROBOT_SCREEN_EMOJI_URL =
  `${ROBOT_ENDPOINT_BASE_URL}/api/screen/emoji`;
export const ROBOT_SPEAKER_PLAY_URL =
  `${ROBOT_ENDPOINT_BASE_URL}/api/speaker/play`;

export const AI_YOLOV8_IDENTIFY_URL =
  `${AI_ENDPOINT_BASE_URL}/api/yolov8/identify`;
export const AI_YOLOV8_GESTURE_URL =
  `${AI_ENDPOINT_BASE_URL}/api/yolov8/gesture`;
export const AI_ASR_URL = `${AI_ENDPOINT_BASE_URL}/api/asr`;
export const AI_STRUCTBERT_EMOTION_URL =
  `${AI_ENDPOINT_BASE_URL}/api/structbert/emotion`;
export const AI_LLM_URL = `${AI_ENDPOINT_BASE_URL}/api/llm`;
export const AI_TTS_URL = `${AI_ENDPOINT_BASE_URL}/api/tts`;

export const HTTP_REQUEST_PLACEHOLDER_URL =
  `${ROBOT_ENDPOINT_BASE_URL}/api/placeholder`;

export function buildN8nEnvBackedUrlExpression(
  envVarName: string,
  fallbackUrl: string
): string {
  return `={{$env.${envVarName} || "${fallbackUrl}"}}`;
}

export function buildHardwareCapabilityUrl(
  componentId: string,
  capabilityId: string
): string {
  return `${HARDWARE_API_BASE_URL}/${componentId}/${capabilityId}`;
}
