/**
 * [INPUT]: 依赖 configuration/discovery/validation/system/workflow_management 下的 ToolDocumentation 定义
 * [OUTPUT]: 对外提供 toolsDocumentation 聚合表与 ToolDocumentation 类型导出
 * [POS]: mcp/tool-docs 的总索引，被 tools-documentation.ts 用作工具文档真相源
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { ToolDocumentation } from './types';

// Import all tool documentations
import { searchNodesDoc } from './discovery';
import {
  getNodeDoc,
  getNodeDocsDoc,
  searchNodePropertiesDoc,
  getNodeVersionsDoc,
} from './configuration';
import { validateNodeDoc, validateWorkflowDoc } from './validation';
import {
  toolsDocumentationDoc,
  n8nHealthCheckDoc
} from './system';
import { aiAgentsGuide } from './guides';
import {
  n8nCreateWorkflowDoc,
  n8nGetWorkflowDoc,
  n8nUpdateFullWorkflowDoc,
  n8nUpdatePartialWorkflowDoc,
  n8nDeleteWorkflowDoc,
  n8nListWorkflowsDoc,
  n8nValidateWorkflowDoc,
  n8nAutofixWorkflowDoc,
  n8nTestWorkflowDoc,
  n8nExecutionsDoc
} from './workflow_management';

// Combine all tool documentations into a single object
export const toolsDocumentation: Record<string, ToolDocumentation> = {
  // System tools
  tools_documentation: toolsDocumentationDoc,
  n8n_health_check: n8nHealthCheckDoc,

  // Guides
  ai_agents_guide: aiAgentsGuide,

  // Discovery tools
  search_nodes: searchNodesDoc,

  // Configuration tools
  get_node: getNodeDoc,
  get_node_docs: getNodeDocsDoc,
  search_node_properties: searchNodePropertiesDoc,
  get_node_versions: getNodeVersionsDoc,

  // Validation tools
  validate_node: validateNodeDoc,
  validate_workflow: validateWorkflowDoc,

  // Workflow Management tools (n8n API)
  n8n_create_workflow: n8nCreateWorkflowDoc,
  n8n_get_workflow: n8nGetWorkflowDoc,
  n8n_update_full_workflow: n8nUpdateFullWorkflowDoc,
  n8n_update_partial_workflow: n8nUpdatePartialWorkflowDoc,
  n8n_delete_workflow: n8nDeleteWorkflowDoc,
  n8n_list_workflows: n8nListWorkflowsDoc,
  n8n_validate_workflow: n8nValidateWorkflowDoc,
  n8n_autofix_workflow: n8nAutofixWorkflowDoc,
  n8n_test_workflow: n8nTestWorkflowDoc,
  n8n_executions: n8nExecutionsDoc
};

// Re-export types
export type { ToolDocumentation } from './types';
