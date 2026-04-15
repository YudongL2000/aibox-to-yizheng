/**
 * [INPUT]: 依赖 MCP 工具定义数组
 * [OUTPUT]: 对外提供 n8nFriendlyDescriptions 与 makeToolsN8nFriendly 包装器
 * [POS]: mcp 的描述层适配器，降低 n8n AI Agent 对 schema 的误判率
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

/**
 * n8n-friendly tool descriptions
 * These descriptions are optimized to reduce schema validation errors in n8n's AI Agent
 * 
 * Key principles:
 * 1. Use exact JSON examples in descriptions
 * 2. Be explicit about data types
 * 3. Keep descriptions short and directive
 * 4. Avoid ambiguity
 */

export const n8nFriendlyDescriptions: Record<string, {
  description: string;
  params: Record<string, string>;
}> = {
  // Consolidated validation tool (replaces validate_node_operation and validate_node_minimal)
  validate_node: {
    description: 'Validate n8n node config. Pass nodeType (string) and config (object). Use mode="full" for comprehensive validation, mode="minimal" for quick check. Example: {"nodeType": "nodes-base.slack", "config": {"resource": "channel", "operation": "create"}}',
    params: {
      nodeType: 'String value like "nodes-base.slack"',
      config: 'Object value like {"resource": "channel", "operation": "create"} or empty object {}',
      mode: 'Optional string: "full" (default) or "minimal"',
      profile: 'Optional string: "minimal" or "runtime" or "ai-friendly" or "strict"'
    }
  },

  // Search tool
  search_nodes: {
    description: 'Search nodes. Pass query (string). Example: {"query": "webhook"}',
    params: {
      query: 'String keyword like "webhook" or "database"',
      limit: 'Optional number, default 20'
    }
  },

  // Core node configuration tool
  get_node: {
    description: 'Get node config info. Pass nodeType (string). Use detail="standard" first for required fields. Example: {"nodeType": "nodes-base.httpRequest", "detail": "standard"}',
    params: {
      nodeType: 'String with prefix like "nodes-base.httpRequest"',
      detail: 'Optional string: "minimal", "standard" (default), "full"',
      includeTypeInfo: 'Optional boolean. true adds validation/type metadata per property'
    }
  },

  get_node_docs: {
    description: 'Get readable markdown docs for one node. Pass nodeType (string). Example: {"nodeType": "nodes-base.webhook"}',
    params: {
      nodeType: 'String with prefix like "nodes-base.webhook"',
    }
  },

  search_node_properties: {
    description: 'Search fields inside one node schema. Pass nodeType (string) and query (string). Example: {"nodeType": "nodes-base.httpRequest", "query": "auth"}',
    params: {
      nodeType: 'String with prefix like "nodes-base.httpRequest"',
      query: 'String keyword like "auth", "header", "body", or "model"',
      maxResults: 'Optional number, default 20'
    }
  },

  get_node_versions: {
    description: 'Get node version history and upgrade changes. Pass nodeType (string). Optional since (string) and toVersion (string). Example: {"nodeType": "nodes-base.httpRequest", "since": "3.0"}',
    params: {
      nodeType: 'String with prefix like "nodes-base.httpRequest"',
      since: 'Optional string source version like "3.0"',
      toVersion: 'Optional string target version; defaults to latest'
    }
  },

  // Workflow validation
  validate_workflow: {
    description: 'Validate workflow structure, connections, and expressions. Pass workflow object. MUST have: {"workflow": {"nodes": [array of node objects], "connections": {object with node connections}}}. Each node needs: name, type, typeVersion, position.',
    params: {
      workflow: 'Object with two required fields: nodes (array) and connections (object). Example: {"nodes": [{"name": "Webhook", "type": "n8n-nodes-base.webhook", "typeVersion": 2, "position": [250, 300], "parameters": {}}], "connections": {}}',
      options: 'Optional object. Example: {"validateNodes": true, "validateConnections": true, "validateExpressions": true, "profile": "runtime"}'
    }
  },

  // Documentation tool
  tools_documentation: {
    description: 'Get tool docs. Pass optional depth (string). Example: {"depth": "essentials"} or {}',
    params: {
      depth: 'Optional string: "essentials" (default) or "full"',
      topic: 'Optional string tool name like "search_nodes"'
    }
  }
};

/**
 * Apply n8n-friendly descriptions to tools
 * This function modifies tool descriptions to be more explicit for n8n's AI agent
 */
export function makeToolsN8nFriendly(tools: any[]): any[] {
  return tools.map(tool => {
    const toolName = tool.name as string;
    const friendlyDesc = n8nFriendlyDescriptions[toolName];
    if (friendlyDesc) {
      // Clone the tool to avoid mutating the original
      const updatedTool = { ...tool };
      
      // Update the main description
      updatedTool.description = friendlyDesc.description;
      
      // Clone inputSchema if it exists
      if (tool.inputSchema?.properties) {
        updatedTool.inputSchema = {
          ...tool.inputSchema,
          properties: { ...tool.inputSchema.properties }
        };
        
        // Update parameter descriptions
        Object.keys(updatedTool.inputSchema.properties).forEach(param => {
          if (friendlyDesc.params[param]) {
            updatedTool.inputSchema.properties[param] = {
              ...updatedTool.inputSchema.properties[param],
              description: friendlyDesc.params[param]
            };
          }
        });
      }
      
      return updatedTool;
    }
    return tool;
  });
}
