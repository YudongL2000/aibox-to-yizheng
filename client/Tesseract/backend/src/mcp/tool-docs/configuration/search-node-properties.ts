/**
 * [INPUT]: 依赖 ./types 的 ToolDocumentation 契约
 * [OUTPUT]: 对外提供 searchNodePropertiesDoc 工具文档
 * [POS]: mcp/tool-docs/configuration 的属性搜索工具说明，承接 Refactor-4 对 get_node 搜索模式的拆分
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { ToolDocumentation } from '../types';

export const searchNodePropertiesDoc: ToolDocumentation = {
  name: 'search_node_properties',
  category: 'configuration',
  essentials: {
    description: 'Search property paths inside a node schema by keyword.',
    keyParameters: ['nodeType', 'query'],
    example: 'search_node_properties({nodeType: "nodes-base.httpRequest", query: "auth"})',
    performance: 'Fast (<20ms)',
    tips: [
      'Use for targeted property lookup after selecting a node',
      'Keep the query short: auth, header, body, model, credential',
    ],
  },
  full: {
    description: 'Searches the node property tree and returns matching property paths, labels, and descriptions.',
    parameters: {
      nodeType: {
        type: 'string',
        required: true,
        description: 'Full node type with prefix, for example "nodes-base.httpRequest".',
      },
      query: {
        type: 'string',
        required: true,
        description: 'Keyword to search for in property names, paths, and descriptions.',
      },
      maxResults: {
        type: 'number',
        required: false,
        default: 20,
        description: 'Maximum number of matches to return.',
      },
    },
    returns: 'Array of matching properties with path, name, displayName, and description.',
    examples: [
      'search_node_properties({nodeType: "nodes-base.httpRequest", query: "auth"})',
      'search_node_properties({nodeType: "nodes-base.googleSheets", query: "sheet", maxResults: 10})',
    ],
    useCases: [
      'Find authentication-related fields quickly',
      'Locate nested options without loading the full schema',
    ],
    performance: 'Fast - indexed property search',
    bestPractices: [
      'Use short queries and inspect the returned paths',
      'Pair with get_node({detail:"standard"}) when you also need required fields',
    ],
    pitfalls: [
      'Does not validate configurations',
      'Does not return the full schema for matching properties',
    ],
    relatedTools: ['get_node', 'get_node_docs', 'validate_node'],
  },
};
