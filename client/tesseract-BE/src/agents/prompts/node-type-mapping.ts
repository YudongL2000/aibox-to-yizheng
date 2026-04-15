/**
 * [INPUT]: 依赖节点 category 与当前 type
 * [OUTPUT]: 对外提供 resolveExpectedNodeType 节点类型映射能力
 * [POS]: prompts 的类型映射规则中心，统一 category -> n8n type
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENT.md
 */

export const CATEGORY_TO_N8N_TYPE: Record<string, string> = {
  BASE_TRIGGER: 'n8n-nodes-base.scheduleTrigger',
  BASE_IF: 'n8n-nodes-base.if',
  BASE_SWITCH: 'n8n-nodes-base.switch',
  CAM: 'n8n-nodes-base.httpRequest',
  MIC: 'n8n-nodes-base.httpRequest',
  'FACE-NET': 'n8n-nodes-base.set',
  'YOLO-HAND': 'n8n-nodes-base.set',
  TTS: 'n8n-nodes-base.set',
  ASR: 'n8n-nodes-base.set',
  LLM: 'n8n-nodes-base.set',
  'LLM-EMO': 'n8n-nodes-base.set',
  RAM: 'n8n-nodes-base.set',
  ASSIGN: 'n8n-nodes-base.set',
  'YOLO-RPS': 'n8n-nodes-base.set',
  HAND: 'n8n-nodes-base.code',
  WHEEL: 'n8n-nodes-base.code',
  SPEAKER: 'n8n-nodes-base.code',
  SCREEN: 'n8n-nodes-base.code',
};

export function resolveExpectedNodeType(category: string, currentType: string): string {
  const normalizedCategory = typeof category === 'string' ? category.trim().toUpperCase() : '';
  if (!normalizedCategory) {
    return currentType;
  }

  if (normalizedCategory === 'BASE') {
    return currentType;
  }

  return CATEGORY_TO_N8N_TYPE[normalizedCategory] ?? currentType;
}

export function validateNodeType(category: string, actualType: string): boolean {
  const expectedType = resolveExpectedNodeType(category, actualType);
  return expectedType === actualType;
}
