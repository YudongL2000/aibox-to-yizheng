/**
 * [INPUT]: 依赖 ./types 的 ToolDocumentation 契约
 * [OUTPUT]: 对外提供 getNodeVersionsDoc 工具文档
 * [POS]: mcp/tool-docs/configuration 的节点版本工具说明，承接 Refactor-4 对 get_node 版本模式的合并拆分
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { ToolDocumentation } from '../types';

export const getNodeVersionsDoc: ToolDocumentation = {
  name: 'get_node_versions',
  category: 'configuration',
  essentials: {
    description: 'Get node version history, optionally with changes since a specific version.',
    keyParameters: ['nodeType', 'since'],
    example: 'get_node_versions({nodeType: "nodes-base.httpRequest", since: "3.0"})',
    performance: 'Fast (<30ms)',
    tips: [
      'Call without since to inspect the full version history summary',
      'Add since when you need upgrade changes from a known baseline',
    ],
  },
  full: {
    description: 'Returns version history for a node. When since is provided, also returns comparison, breaking changes, and migration guidance up to the target version.',
    parameters: {
      nodeType: {
        type: 'string',
        required: true,
        description: 'Full node type with prefix, for example "nodes-base.httpRequest".',
      },
      since: {
        type: 'string',
        required: false,
        description: 'Source version used to compute changes, for example "3.0".',
      },
      toVersion: {
        type: 'string',
        required: false,
        description: 'Optional target version. Defaults to the latest version when omitted.',
      },
    },
    returns: 'Version history summary. If since is set, also returns comparison details, breaking changes, and migration notes.',
    examples: [
      'get_node_versions({nodeType: "nodes-base.executeWorkflow"})',
      'get_node_versions({nodeType: "nodes-base.httpRequest", since: "3.0"})',
      'get_node_versions({nodeType: "nodes-base.httpRequest", since: "3.0", toVersion: "4.1"})',
    ],
    useCases: [
      'Inspect version history before configuring a versioned node',
      'Review upgrade impact from an older workflow baseline',
    ],
    performance: 'Fast - version metadata lookup',
    bestPractices: [
      'Use get_node() for configuration and this tool for upgrade analysis',
      'Prefer since when the question is about compatibility or migrations',
    ],
    pitfalls: [
      'Some nodes have no meaningful version history',
      'Does not return configuration schema details',
    ],
    relatedTools: ['get_node', 'get_node_docs', 'validate_workflow'],
  },
};
