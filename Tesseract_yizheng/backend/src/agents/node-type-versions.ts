/**
 * [INPUT]: 无
 * [OUTPUT]: 对外提供 NODE_TYPE_VERSION_MINIMUMS 与 getNodeTypeVersion
 * [POS]: agents 的节点版本配置中心，被提示词与工作流生成器共享
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENT.md
 */

export const NODE_TYPE_VERSION_MINIMUMS = {
  'n8n-nodes-base.webhook': 2,
  'n8n-nodes-base.scheduleTrigger': 1.1,
  'n8n-nodes-base.if': 2.2,
  'n8n-nodes-base.splitInBatches': 3,
  'n8n-nodes-base.set': 3.4,
  'n8n-nodes-base.httpRequest': 4.3,
  'n8n-nodes-base.code': 2,
} as const;

export type NodeTypeVersionMap = typeof NODE_TYPE_VERSION_MINIMUMS;
export type KnownNodeType = keyof NodeTypeVersionMap;

export const getNodeTypeVersion = (nodeType: string): number | undefined =>
  NODE_TYPE_VERSION_MINIMUMS[nodeType as KnownNodeType];
