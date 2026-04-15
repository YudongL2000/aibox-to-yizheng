/**
 * [INPUT]: 依赖 ../types 的 ToolDocumentation 契约
 * [OUTPUT]: 对外提供 getNodeDoc 工具文档
 * [POS]: mcp/tool-docs/configuration 的核心节点配置工具说明，描述 get_node 的渐进式 schema 查询职责
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { ToolDocumentation } from '../types';

export const getNodeDoc: ToolDocumentation = {
  name: 'get_node',
  category: 'configuration',
  essentials: {
    description: 'Core node configuration tool with progressive detail levels. Use it for schema, required fields, and operations.',
    keyParameters: ['nodeType', 'detail', 'includeTypeInfo', 'includeExamples'],
    example: 'get_node({nodeType: "nodes-base.httpRequest", detail: "standard"})',
    performance: 'Instant (<10ms) for minimal/standard, moderate for full',
    tips: [
      'Use detail="standard" (default) for most tasks - shows required fields',
      'Use get_node_docs for readable markdown documentation',
      'Use search_node_properties to find specific fields',
      'Use get_node_versions to check version history and upgrade changes',
      'Add includeExamples=true to get real-world configuration examples'
    ]
  },
  full: {
    description: `**Detail Levels:**
- minimal (~200 tokens): Basic metadata only - nodeType, displayName, description, category
- standard (~1-2K tokens): Essential properties + operations - recommended for most tasks
- full (~3-8K tokens): Complete node schema - use only when standard insufficient
`,
    parameters: {
      nodeType: { type: 'string', required: true, description: 'Full node type with prefix: "nodes-base.httpRequest" or "nodes-langchain.agent"' },
      detail: { type: 'string', required: false, description: 'Detail level for mode=info: "minimal", "standard" (default), "full"' },
      includeTypeInfo: { type: 'boolean', required: false, description: 'Include type structure metadata (validation rules, JS types). Adds ~80-120 tokens per property' },
      includeExamples: { type: 'boolean', required: false, description: 'Reserved for future configuration examples (currently no-op)' }
    },
    returns: 'Node schema with properties based on the selected detail level.',
    examples: [
      '// Standard detail (recommended for AI agents)\nget_node({nodeType: "nodes-base.httpRequest"})',
      '// Minimal for quick metadata check\nget_node({nodeType: "nodes-base.slack", detail: "minimal"})',
      '// Full detail\nget_node({nodeType: "nodes-base.googleSheets", detail: "full"})',
      '// Include validation/type hints\nget_node({nodeType: "nodes-base.if", detail: "standard", includeTypeInfo: true})'
    ],
    useCases: [
      'Configure nodes for workflow building (use detail=standard)',
      'Load the full schema only when standard is insufficient',
      'Understand complex types with includeTypeInfo=true'
    ],
    performance: `Token costs by detail level:
- minimal: ~200 tokens
- standard: ~1000-2000 tokens (default)
- full: ~3000-8000 tokens
- includeTypeInfo: +80-120 tokens per property
- includeExamples: +200-400 tokens per example`,
    bestPractices: [
      'Start with detail="standard" - it covers 95% of use cases',
      'Only use detail="full" if standard is missing required properties',
      'Use get_node_docs when explaining nodes to users',
      'Use search_node_properties when you already know the field keyword',
      'Combine includeTypeInfo=true for complex nodes (filter, resourceMapper)',
      'Use get_node_versions for upgrade and compatibility questions'
    ],
    pitfalls: [
      'detail="full" returns large responses (~100KB) - use sparingly',
      'Node type must include prefix (nodes-base. or nodes-langchain.)',
      'includeExamples only works with detail-based schema responses',
      'This tool no longer handles docs/property search/version history'
    ],
    relatedTools: ['search_nodes', 'get_node_docs', 'search_node_properties', 'get_node_versions', 'validate_node', 'validate_workflow']
  }
};
