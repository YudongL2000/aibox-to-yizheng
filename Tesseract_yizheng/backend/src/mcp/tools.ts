/**
 * [INPUT]: 依赖 ../types 的 ToolDefinition 契约
 * [OUTPUT]: 对外提供 n8nDocumentationToolsFinal 工具定义集合
 * [POS]: mcp 工具声明真相源，被 server.ts 注册并被 n8n-friendly 描述层二次包装
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { ToolDefinition } from '../types';

/**
 * n8n Documentation MCP Tools - FINAL OPTIMIZED VERSION
 * 
 * Incorporates all lessons learned from real workflow building.
 * Designed to help AI agents avoid common pitfalls and build workflows efficiently.
 */
export const n8nDocumentationToolsFinal: ToolDefinition[] = [
  {
    name: 'tools_documentation',
    description: `Get documentation for n8n MCP tools. Call without parameters for quick start guide. Use topic parameter to get documentation for specific tools. Use depth='full' for comprehensive documentation.`,
    inputSchema: {
      type: 'object',
      properties: {
        topic: {
          type: 'string',
          description: 'Tool name (e.g., "search_nodes") or "overview" for general guide. Leave empty for quick reference.',
        },
        depth: {
          type: 'string',
          enum: ['essentials', 'full'],
          description: 'Level of detail. "essentials" (default) for quick reference, "full" for comprehensive docs.',
          default: 'essentials',
        },
      },
    },
  },
  {
    name: 'search_nodes',
    description: `Search n8n nodes by keyword. Pass query as string. Example: query="webhook" or query="database". Returns max 20 results.`,
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search terms. Use quotes for exact phrase.',
        },
        limit: {
          type: 'number',
          description: 'Max results (default 20)',
          default: 20,
        },
        mode: {
          type: 'string',
          enum: ['OR', 'AND', 'FUZZY'],
          description: 'OR=any word, AND=all words, FUZZY=typo-tolerant',
          default: 'OR',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_node',
    description: `Get node configuration info with progressive detail levels. Detail: minimal (~200 tokens), standard (~1-2K, default), full (~3-8K). Use this for schema and required fields. Use get_node_docs, search_node_properties, and get_node_versions for other node tasks.`,
    inputSchema: {
      type: 'object',
      properties: {
        nodeType: {
          type: 'string',
          description: 'Full node type: "nodes-base.httpRequest" or "nodes-langchain.agent"',
        },
        detail: {
          type: 'string',
          enum: ['minimal', 'standard', 'full'],
          default: 'standard',
          description: 'Information detail level. standard=essential properties (recommended), full=everything',
        },
        includeTypeInfo: {
          type: 'boolean',
          default: false,
          description: 'Include type structure metadata (type category, JS type, validation rules). Adds ~80-120 tokens per property.',
        },
      },
      required: ['nodeType'],
    },
  },
  {
    name: 'get_node_docs',
    description: 'Get readable markdown documentation for a node. Use after get_node when you need narrative guidance instead of raw schema.',
    inputSchema: {
      type: 'object',
      properties: {
        nodeType: {
          type: 'string',
          description: 'Full node type: "nodes-base.httpRequest" or "nodes-langchain.agent"',
        },
      },
      required: ['nodeType'],
    },
  },
  {
    name: 'search_node_properties',
    description: 'Search property paths inside a node schema. Use when you already know the node type and need a field like auth, header, body, or model.',
    inputSchema: {
      type: 'object',
      properties: {
        nodeType: {
          type: 'string',
          description: 'Full node type: "nodes-base.httpRequest" or "nodes-langchain.agent"',
        },
        query: {
          type: 'string',
          description: 'Search term like "auth", "header", "body", "credential", or "model"',
        },
        maxResults: {
          type: 'number',
          description: 'Maximum results to return (default 20)',
          default: 20,
        },
      },
      required: ['nodeType', 'query'],
    },
  },
  {
    name: 'get_node_versions',
    description: 'Get node version history. Add since to review changes, breaking changes, and migrations from an older version.',
    inputSchema: {
      type: 'object',
      properties: {
        nodeType: {
          type: 'string',
          description: 'Full node type: "nodes-base.httpRequest" or "nodes-langchain.agent"',
        },
        since: {
          type: 'string',
          description: 'Optional source version for change analysis, for example "3.0"',
        },
        toVersion: {
          type: 'string',
          description: 'Optional target version. Defaults to the latest version when omitted.',
        },
      },
      required: ['nodeType'],
    },
  },
  {
    name: 'validate_node',
    description: `Validate n8n node configuration. Use mode='full' for comprehensive validation with errors/warnings/suggestions, mode='minimal' for quick required fields check. Example: nodeType="nodes-base.slack", config={resource:"channel",operation:"create"}`,
    inputSchema: {
      type: 'object',
      properties: {
        nodeType: {
          type: 'string',
          description: 'Node type as string. Example: "nodes-base.slack"',
        },
        config: {
          type: 'object',
          description: 'Configuration as object. For simple nodes use {}. For complex nodes include fields like {resource:"channel",operation:"create"}',
        },
        mode: {
          type: 'string',
          enum: ['full', 'minimal'],
          description: 'Validation mode. full=comprehensive validation with errors/warnings/suggestions, minimal=quick required fields check only. Default is "full"',
          default: 'full',
        },
        profile: {
          type: 'string',
          enum: ['strict', 'runtime', 'ai-friendly', 'minimal'],
          description: 'Profile for mode=full: "minimal", "runtime", "ai-friendly", or "strict". Default is "ai-friendly"',
          default: 'ai-friendly',
        },
      },
      required: ['nodeType', 'config'],
      additionalProperties: false,
    },
    outputSchema: {
      type: 'object',
      properties: {
        nodeType: { type: 'string' },
        workflowNodeType: { type: 'string' },
        displayName: { type: 'string' },
        valid: { type: 'boolean' },
        errors: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              property: { type: 'string' },
              message: { type: 'string' },
              fix: { type: 'string' }
            }
          }
        },
        warnings: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              property: { type: 'string' },
              message: { type: 'string' },
              suggestion: { type: 'string' }
            }
          }
        },
        suggestions: { type: 'array', items: { type: 'string' } },
        missingRequiredFields: {
          type: 'array',
          items: { type: 'string' },
          description: 'Only present in mode=minimal'
        },
        summary: {
          type: 'object',
          properties: {
            hasErrors: { type: 'boolean' },
            errorCount: { type: 'number' },
            warningCount: { type: 'number' },
            suggestionCount: { type: 'number' }
          }
        }
      },
      required: ['nodeType', 'displayName', 'valid']
    },
  },
  {
    name: 'validate_workflow',
    description: `Full workflow validation: structure, connections, expressions, AI tools. Returns errors/warnings/fixes. Essential before deploy.`,
    inputSchema: {
      type: 'object',
      properties: {
        workflow: {
          type: 'object',
          description: 'The complete workflow JSON to validate. Must include nodes array and connections object.',
        },
        options: {
          type: 'object',
          properties: {
            validateNodes: {
              type: 'boolean',
              description: 'Validate individual node configurations. Default true.',
              default: true,
            },
            validateConnections: {
              type: 'boolean',
              description: 'Validate node connections and flow. Default true.',
              default: true,
            },
            validateExpressions: {
              type: 'boolean',
              description: 'Validate n8n expressions syntax and references. Default true.',
              default: true,
            },
            profile: {
              type: 'string',
              enum: ['minimal', 'runtime', 'ai-friendly', 'strict'],
              description: 'Validation profile for node validation. Default "runtime".',
              default: 'runtime',
            },
          },
          description: 'Optional validation settings',
        },
      },
      required: ['workflow'],
      additionalProperties: false,
    },
    outputSchema: {
      type: 'object',
      properties: {
        valid: { type: 'boolean' },
        summary: {
          type: 'object',
          properties: {
            totalNodes: { type: 'number' },
            enabledNodes: { type: 'number' },
            triggerNodes: { type: 'number' },
            validConnections: { type: 'number' },
            invalidConnections: { type: 'number' },
            expressionsValidated: { type: 'number' },
            errorCount: { type: 'number' },
            warningCount: { type: 'number' }
          }
        },
        errors: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              node: { type: 'string' },
              message: { type: 'string' },
              details: { type: 'string' }
            }
          }
        },
        warnings: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              node: { type: 'string' },
              message: { type: 'string' },
              details: { type: 'string' }
            }
          }
        },
        suggestions: { type: 'array', items: { type: 'string' } }
      },
      required: ['valid', 'summary']
    },
  },
];

/**
 * QUICK REFERENCE for AI Agents:
 *
 * 1. RECOMMENDED WORKFLOW:
 *    - Start: search_nodes → get_node → validate_node
 *    - Discovery: search_nodes({query:"trigger"}) for finding nodes
 *    - Quick Config: get_node("nodes-base.httpRequest", {detail:"standard"}) - only essential properties
 *    - Documentation: get_node_docs("nodes-base.httpRequest") - readable markdown docs
 *    - Find Properties: search_node_properties("nodes-base.httpRequest", {query:"auth"})
 *    - Version Review: get_node_versions("nodes-base.httpRequest", {since:"3.0"})
 *    - Full Details: get_node with detail="full" only when standard isn't enough
 *    - Validation: Use validate_node for complex nodes (Slack, Google Sheets, etc.)
 *
 * 2. COMMON NODE TYPES:
 *    Triggers: webhook, schedule, emailReadImap, slackTrigger
 *    Core: httpRequest, code, set, if, merge, splitInBatches
 *    Integrations: slack, gmail, googleSheets, postgres, mongodb
 *    AI: agent, openAi, chainLlm, documentLoader
 *
 * 3. SEARCH TIPS:
 *    - search_nodes returns ANY word match (OR logic)
 *    - Single words more precise, multiple words broader
 *    - If no results: try different keywords or partial names
 *
 * 4. KNOWN ISSUES:
 *    - Some nodes have duplicate properties with different conditions
 *    - Package names: use 'n8n-nodes-base' not '@n8n/n8n-nodes-base'
 *    - Check showWhen/hideWhen to identify the right property variant
 *
 * 5. PERFORMANCE:
 *    - get_node (detail=standard): Fast (<5KB)
 *    - get_node (detail=full): Slow (100KB+) - use sparingly
 *    - get_node_docs / search_node_properties / get_node_versions: Fast, single-purpose
 *    - search_nodes: Fast, cached
 */
