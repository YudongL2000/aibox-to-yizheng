/**
 * [INPUT]: 依赖 ./types 的 ToolDocumentation 契约
 * [OUTPUT]: 对外提供 getNodeDocsDoc 工具文档
 * [POS]: mcp/tool-docs/configuration 的节点文档工具说明，承接 Refactor-4 对 get_node 文档模式的拆分
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { ToolDocumentation } from '../types';

export const getNodeDocsDoc: ToolDocumentation = {
  name: 'get_node_docs',
  category: 'configuration',
  essentials: {
    description: 'Get readable markdown documentation for a node type.',
    keyParameters: ['nodeType'],
    example: 'get_node_docs({nodeType: "nodes-base.webhook"})',
    performance: 'Fast (<20ms)',
    tips: [
      'Use after get_node() when you need narrative docs instead of schema',
      'Best for explaining a node to users or reviewing usage patterns',
    ],
  },
  full: {
    description: 'Returns human-readable markdown documentation for a node, including examples and usage patterns.',
    parameters: {
      nodeType: {
        type: 'string',
        required: true,
        description: 'Full node type with prefix, for example "nodes-base.webhook".',
      },
    },
    returns: 'Markdown documentation string for the requested node.',
    examples: [
      'get_node_docs({nodeType: "nodes-base.webhook"})',
      'get_node_docs({nodeType: "nodes-base.httpRequest"})',
    ],
    useCases: [
      'Read usage guidance for a node before configuring it',
      'Explain node behavior to users in natural language',
    ],
    performance: 'Fast - documentation lookup only',
    bestPractices: [
      'Call get_node({detail:"standard"}) first when the goal is configuration',
      'Use this tool for human-readable guidance, not required field discovery',
    ],
    pitfalls: [
      'Does not return property-level schema details',
      'Node type must include the package prefix',
    ],
    relatedTools: ['get_node', 'search_node_properties', 'validate_node'],
  },
};
