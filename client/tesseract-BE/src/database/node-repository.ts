import { DatabaseAdapter } from './database-adapter';
import { ParsedNode } from '../parsers/node-parser';
import { NodeTypeNormalizer } from '../utils/node-type-normalizer';

export class NodeRepository {
  private db: DatabaseAdapter;
  
  constructor(db: DatabaseAdapter) {
    this.db = db;
  }
  
  /**
   * Save node with proper JSON serialization
   */
  saveNode(node: ParsedNode): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO nodes (
        node_type, package_name, display_name, description,
        category, development_style, is_ai_tool, is_trigger,
        is_webhook, is_versioned, is_tool_variant, tool_variant_of,
        has_tool_variant, version, documentation,
        properties_schema, operations, credentials_required,
        outputs, output_names
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      node.nodeType,
      node.packageName,
      node.displayName,
      node.description,
      node.category,
      node.style,
      node.isAITool ? 1 : 0,
      node.isTrigger ? 1 : 0,
      node.isWebhook ? 1 : 0,
      node.isVersioned ? 1 : 0,
      node.isToolVariant ? 1 : 0,
      node.toolVariantOf || null,
      node.hasToolVariant ? 1 : 0,
      node.version,
      node.documentation || null,
      JSON.stringify(node.properties, null, 2),
      JSON.stringify(node.operations, null, 2),
      JSON.stringify(node.credentials, null, 2),
      node.outputs ? JSON.stringify(node.outputs, null, 2) : null,
      node.outputNames ? JSON.stringify(node.outputNames, null, 2) : null
    );
  }
  
  /**
   * Get node with proper JSON deserialization
   * Automatically normalizes node type to full form for consistent lookups
   */
  getNode(nodeType: string): any {
    // Normalize to full form first for consistent lookups
    const normalizedType = NodeTypeNormalizer.normalizeToFullForm(nodeType);

    const row = this.db.prepare(`
      SELECT * FROM nodes WHERE node_type = ?
    `).get(normalizedType) as any;

    // Fallback: try original type if normalization didn't help (e.g., community nodes)
    if (!row && normalizedType !== nodeType) {
      const originalRow = this.db.prepare(`
        SELECT * FROM nodes WHERE node_type = ?
      `).get(nodeType) as any;

      if (originalRow) {
        return this.parseNodeRow(originalRow);
      }
    }

    if (!row) return null;

    return this.parseNodeRow(row);
  }
  
  /**
   * Get AI tools with proper filtering
   */
  getAITools(): any[] {
    const rows = this.db.prepare(`
      SELECT node_type, display_name, description, package_name
      FROM nodes 
      WHERE is_ai_tool = 1
      ORDER BY display_name
    `).all() as any[];
    
    return rows.map(row => ({
      nodeType: row.node_type,
      displayName: row.display_name,
      description: row.description,
      package: row.package_name
    }));
  }
  
  private safeJsonParse(json: string, defaultValue: any): any {
    try {
      return JSON.parse(json);
    } catch {
      return defaultValue;
    }
  }

  // Additional methods for benchmarks
  upsertNode(node: ParsedNode): void {
    this.saveNode(node);
  }

  getNodeByType(nodeType: string): any {
    return this.getNode(nodeType);
  }

  getNodesByCategory(category: string): any[] {
    const rows = this.db.prepare(`
      SELECT * FROM nodes WHERE category = ?
      ORDER BY display_name
    `).all(category) as any[];
    
    return rows.map(row => this.parseNodeRow(row));
  }

  /**
   * Legacy LIKE-based search method for direct repository usage.
   *
   * NOTE: MCP tools do NOT use this method. They use MCPServer.searchNodes()
   * which automatically detects and uses FTS5 full-text search when available.
   * See src/mcp/server.ts:1135-1148 for FTS5 implementation.
   *
   * This method remains for:
   * - Direct repository access in scripts/benchmarks
   * - Fallback when FTS5 table doesn't exist
   * - Legacy compatibility
   */
  searchNodes(query: string, mode: 'OR' | 'AND' | 'FUZZY' = 'OR', limit: number = 20): any[] {
    let sql = '';
    const params: any[] = [];

    if (mode === 'FUZZY') {
      // Simple fuzzy search
      sql = `
        SELECT * FROM nodes 
        WHERE node_type LIKE ? OR display_name LIKE ? OR description LIKE ?
        ORDER BY display_name
        LIMIT ?
      `;
      const fuzzyQuery = `%${query}%`;
      params.push(fuzzyQuery, fuzzyQuery, fuzzyQuery, limit);
    } else {
      // OR/AND mode
      const words = query.split(/\s+/).filter(w => w.length > 0);
      const conditions = words.map(() => 
        '(node_type LIKE ? OR display_name LIKE ? OR description LIKE ?)'
      );
      const operator = mode === 'AND' ? ' AND ' : ' OR ';
      
      sql = `
        SELECT * FROM nodes 
        WHERE ${conditions.join(operator)}
        ORDER BY display_name
        LIMIT ?
      `;
      
      for (const word of words) {
        const searchTerm = `%${word}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }
      params.push(limit);
    }
    
    const rows = this.db.prepare(sql).all(...params) as any[];
    return rows.map(row => this.parseNodeRow(row));
  }

  getAllNodes(limit?: number): any[] {
    let sql = 'SELECT * FROM nodes ORDER BY display_name';
    if (limit) {
      sql += ` LIMIT ${limit}`;
    }
    
    const rows = this.db.prepare(sql).all() as any[];
    return rows.map(row => this.parseNodeRow(row));
  }

  getNodeCount(): number {
    const result = this.db.prepare('SELECT COUNT(*) as count FROM nodes').get() as any;
    return result.count;
  }

  getAIToolNodes(): any[] {
    return this.getAITools();
  }

  /**
   * Get the Tool variant for a base node
   */
  getToolVariant(baseNodeType: string): any | null {
    // Validate node type format (must be package.nodeName pattern)
    if (!baseNodeType || typeof baseNodeType !== 'string' || !baseNodeType.includes('.')) {
      return null;
    }
    const toolNodeType = `${baseNodeType}Tool`;
    return this.getNode(toolNodeType);
  }

  /**
   * Get the base node for a Tool variant
   */
  getBaseNodeForToolVariant(toolNodeType: string): any | null {
    const row = this.db.prepare(`
      SELECT tool_variant_of FROM nodes WHERE node_type = ?
    `).get(toolNodeType) as any;

    if (!row?.tool_variant_of) return null;
    return this.getNode(row.tool_variant_of);
  }

  /**
   * Get all Tool variants
   */
  getToolVariants(): any[] {
    const rows = this.db.prepare(`
      SELECT node_type, display_name, description, package_name, tool_variant_of
      FROM nodes
      WHERE is_tool_variant = 1
      ORDER BY display_name
    `).all() as any[];

    return rows.map(row => ({
      nodeType: row.node_type,
      displayName: row.display_name,
      description: row.description,
      package: row.package_name,
      toolVariantOf: row.tool_variant_of
    }));
  }

  /**
   * Get count of Tool variants
   */
  getToolVariantCount(): number {
    const result = this.db.prepare('SELECT COUNT(*) as count FROM nodes WHERE is_tool_variant = 1').get() as any;
    return result.count;
  }

  getNodesByPackage(packageName: string): any[] {
    const rows = this.db.prepare(`
      SELECT * FROM nodes WHERE package_name = ?
      ORDER BY display_name
    `).all(packageName) as any[];
    
    return rows.map(row => this.parseNodeRow(row));
  }

  searchNodeProperties(nodeType: string, query: string, maxResults: number = 20): any[] {
    const node = this.getNode(nodeType);
    if (!node || !node.properties) return [];
    
    const results: any[] = [];
    const searchLower = query.toLowerCase();
    
    function searchProperties(properties: any[], path: string[] = []) {
      for (const prop of properties) {
        if (results.length >= maxResults) break;
        
        const currentPath = [...path, prop.name || prop.displayName];
        const pathString = currentPath.join('.');
        
        if (prop.name?.toLowerCase().includes(searchLower) ||
            prop.displayName?.toLowerCase().includes(searchLower) ||
            prop.description?.toLowerCase().includes(searchLower)) {
          results.push({
            path: pathString,
            property: prop,
            description: prop.description
          });
        }
        
        // Search nested properties
        if (prop.options) {
          searchProperties(prop.options, currentPath);
        }
      }
    }
    
    searchProperties(node.properties);
    return results;
  }

  private parseNodeRow(row: any): any {
    return {
      nodeType: row.node_type,
      displayName: row.display_name,
      description: row.description,
      category: row.category,
      developmentStyle: row.development_style,
      package: row.package_name,
      isAITool: Number(row.is_ai_tool) === 1,
      isTrigger: Number(row.is_trigger) === 1,
      isWebhook: Number(row.is_webhook) === 1,
      isVersioned: Number(row.is_versioned) === 1,
      isToolVariant: Number(row.is_tool_variant) === 1,
      toolVariantOf: row.tool_variant_of || null,
      hasToolVariant: Number(row.has_tool_variant) === 1,
      version: row.version,
      properties: this.safeJsonParse(row.properties_schema, []),
      operations: this.safeJsonParse(row.operations, []),
      credentials: this.safeJsonParse(row.credentials_required, []),
      hasDocumentation: !!row.documentation,
      outputs: row.outputs ? this.safeJsonParse(row.outputs, null) : null,
      outputNames: row.output_names ? this.safeJsonParse(row.output_names, null) : null
    };
  }

  /**
   * Get operations for a specific node, optionally filtered by resource
   */
  getNodeOperations(nodeType: string, resource?: string): any[] {
    const node = this.getNode(nodeType);
    if (!node) return [];

    const operations: any[] = [];

    // Parse operations field
    if (node.operations) {
      if (Array.isArray(node.operations)) {
        operations.push(...node.operations);
      } else if (typeof node.operations === 'object') {
        // Operations might be grouped by resource
        if (resource && node.operations[resource]) {
          return node.operations[resource];
        } else {
          // Return all operations
          Object.values(node.operations).forEach(ops => {
            if (Array.isArray(ops)) {
              operations.push(...ops);
            }
          });
        }
      }
    }

    // Also check properties for operation fields
    if (node.properties && Array.isArray(node.properties)) {
      for (const prop of node.properties) {
        if (prop.name === 'operation' && prop.options) {
          // If resource is specified, filter by displayOptions
          if (resource && prop.displayOptions?.show?.resource) {
            const allowedResources = Array.isArray(prop.displayOptions.show.resource)
              ? prop.displayOptions.show.resource
              : [prop.displayOptions.show.resource];
            if (!allowedResources.includes(resource)) {
              continue;
            }
          }

          // Add operations from this property
          operations.push(...prop.options);
        }
      }
    }

    return operations;
  }

  /**
   * Get all resources defined for a node
   */
  getNodeResources(nodeType: string): any[] {
    const node = this.getNode(nodeType);
    if (!node || !node.properties) return [];

    const resources: any[] = [];

    // Look for resource property
    for (const prop of node.properties) {
      if (prop.name === 'resource' && prop.options) {
        resources.push(...prop.options);
      }
    }

    return resources;
  }

  /**
   * Get operations that are valid for a specific resource
   */
  getOperationsForResource(nodeType: string, resource: string): any[] {
    const node = this.getNode(nodeType);
    if (!node || !node.properties) return [];

    const operations: any[] = [];

    // Find operation properties that are visible for this resource
    for (const prop of node.properties) {
      if (prop.name === 'operation' && prop.displayOptions?.show?.resource) {
        const allowedResources = Array.isArray(prop.displayOptions.show.resource)
          ? prop.displayOptions.show.resource
          : [prop.displayOptions.show.resource];

        if (allowedResources.includes(resource) && prop.options) {
          operations.push(...prop.options);
        }
      }
    }

    return operations;
  }

  /**
   * Get all operations across all nodes (for analysis)
   */
  getAllOperations(): Map<string, any[]> {
    const allOperations = new Map<string, any[]>();
    const nodes = this.getAllNodes();

    for (const node of nodes) {
      const operations = this.getNodeOperations(node.nodeType);
      if (operations.length > 0) {
        allOperations.set(node.nodeType, operations);
      }
    }

    return allOperations;
  }

  /**
   * Get all resources across all nodes (for analysis)
   */
  getAllResources(): Map<string, any[]> {
    const allResources = new Map<string, any[]>();
    const nodes = this.getAllNodes();

    for (const node of nodes) {
      const resources = this.getNodeResources(node.nodeType);
      if (resources.length > 0) {
        allResources.set(node.nodeType, resources);
      }
    }

    return allResources;
  }

  /**
   * Get default values for node properties
   */
  getNodePropertyDefaults(nodeType: string): Record<string, any> {
    try {
      const node = this.getNode(nodeType);
      if (!node || !node.properties) return {};

      const defaults: Record<string, any> = {};

      for (const prop of node.properties) {
        if (prop.name && prop.default !== undefined) {
          defaults[prop.name] = prop.default;
        }
      }

      return defaults;
    } catch (error) {
      // Log error and return empty defaults rather than throwing
      console.error(`Error getting property defaults for ${nodeType}:`, error);
      return {};
    }
  }

  /**
   * Get the default operation for a specific resource
   */
  getDefaultOperationForResource(nodeType: string, resource?: string): string | undefined {
    try {
      const node = this.getNode(nodeType);
      if (!node || !node.properties) return undefined;

      // Find operation property that's visible for this resource
      for (const prop of node.properties) {
        if (prop.name === 'operation') {
          // If there's a resource dependency, check if it matches
          if (resource && prop.displayOptions?.show?.resource) {
            // Validate displayOptions structure
            const resourceDep = prop.displayOptions.show.resource;
            if (!Array.isArray(resourceDep) && typeof resourceDep !== 'string') {
              continue; // Skip malformed displayOptions
            }

            const allowedResources = Array.isArray(resourceDep)
              ? resourceDep
              : [resourceDep];

            if (!allowedResources.includes(resource)) {
              continue; // This operation property doesn't apply to our resource
            }
          }

          // Return the default value if it exists
          if (prop.default !== undefined) {
            return prop.default;
          }

          // If no default but has options, return the first option's value
          if (prop.options && Array.isArray(prop.options) && prop.options.length > 0) {
            const firstOption = prop.options[0];
            return typeof firstOption === 'string' ? firstOption : firstOption.value;
          }
        }
      }
    } catch (error) {
      // Log error and return undefined rather than throwing
      // This ensures validation continues even with malformed node data
      console.error(`Error getting default operation for ${nodeType}:`, error);
      return undefined;
    }

    return undefined;
  }

  /**
   * VERSION MANAGEMENT METHODS
   * Methods for working with node_versions and version_property_changes tables
   */

  /**
   * Save a specific node version to the database
   */
  saveNodeVersion(versionData: {
    nodeType: string;
    version: string;
    packageName: string;
    displayName: string;
    description?: string;
    category?: string;
    isCurrentMax?: boolean;
    propertiesSchema?: any;
    operations?: any;
    credentialsRequired?: any;
    outputs?: any;
    minimumN8nVersion?: string;
    breakingChanges?: any[];
    deprecatedProperties?: string[];
    addedProperties?: string[];
    releasedAt?: Date;
  }): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO node_versions (
        node_type, version, package_name, display_name, description,
        category, is_current_max, properties_schema, operations,
        credentials_required, outputs, minimum_n8n_version,
        breaking_changes, deprecated_properties, added_properties,
        released_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      versionData.nodeType,
      versionData.version,
      versionData.packageName,
      versionData.displayName,
      versionData.description || null,
      versionData.category || null,
      versionData.isCurrentMax ? 1 : 0,
      versionData.propertiesSchema ? JSON.stringify(versionData.propertiesSchema) : null,
      versionData.operations ? JSON.stringify(versionData.operations) : null,
      versionData.credentialsRequired ? JSON.stringify(versionData.credentialsRequired) : null,
      versionData.outputs ? JSON.stringify(versionData.outputs) : null,
      versionData.minimumN8nVersion || null,
      versionData.breakingChanges ? JSON.stringify(versionData.breakingChanges) : null,
      versionData.deprecatedProperties ? JSON.stringify(versionData.deprecatedProperties) : null,
      versionData.addedProperties ? JSON.stringify(versionData.addedProperties) : null,
      versionData.releasedAt || null
    );
  }

  /**
   * Get all available versions for a specific node type
   */
  getNodeVersions(nodeType: string): any[] {
    const normalizedType = NodeTypeNormalizer.normalizeToFullForm(nodeType);

    const rows = this.db.prepare(`
      SELECT * FROM node_versions
      WHERE node_type = ?
      ORDER BY version DESC
    `).all(normalizedType) as any[];

    return rows.map(row => this.parseNodeVersionRow(row));
  }

  /**
   * Get the latest (current max) version for a node type
   */
  getLatestNodeVersion(nodeType: string): any | null {
    const normalizedType = NodeTypeNormalizer.normalizeToFullForm(nodeType);

    const row = this.db.prepare(`
      SELECT * FROM node_versions
      WHERE node_type = ? AND is_current_max = 1
      LIMIT 1
    `).get(normalizedType) as any;

    if (!row) return null;
    return this.parseNodeVersionRow(row);
  }

  /**
   * Get a specific version of a node
   */
  getNodeVersion(nodeType: string, version: string): any | null {
    const normalizedType = NodeTypeNormalizer.normalizeToFullForm(nodeType);

    const row = this.db.prepare(`
      SELECT * FROM node_versions
      WHERE node_type = ? AND version = ?
    `).get(normalizedType, version) as any;

    if (!row) return null;
    return this.parseNodeVersionRow(row);
  }

  /**
   * Save a property change between versions
   */
  savePropertyChange(changeData: {
    nodeType: string;
    fromVersion: string;
    toVersion: string;
    propertyName: string;
    changeType: 'added' | 'removed' | 'renamed' | 'type_changed' | 'requirement_changed' | 'default_changed';
    isBreaking?: boolean;
    oldValue?: string;
    newValue?: string;
    migrationHint?: string;
    autoMigratable?: boolean;
    migrationStrategy?: any;
    severity?: 'LOW' | 'MEDIUM' | 'HIGH';
  }): void {
    const stmt = this.db.prepare(`
      INSERT INTO version_property_changes (
        node_type, from_version, to_version, property_name, change_type,
        is_breaking, old_value, new_value, migration_hint, auto_migratable,
        migration_strategy, severity
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      changeData.nodeType,
      changeData.fromVersion,
      changeData.toVersion,
      changeData.propertyName,
      changeData.changeType,
      changeData.isBreaking ? 1 : 0,
      changeData.oldValue || null,
      changeData.newValue || null,
      changeData.migrationHint || null,
      changeData.autoMigratable ? 1 : 0,
      changeData.migrationStrategy ? JSON.stringify(changeData.migrationStrategy) : null,
      changeData.severity || 'MEDIUM'
    );
  }

  /**
   * Get property changes between two versions
   */
  getPropertyChanges(nodeType: string, fromVersion: string, toVersion: string): any[] {
    const normalizedType = NodeTypeNormalizer.normalizeToFullForm(nodeType);

    const rows = this.db.prepare(`
      SELECT * FROM version_property_changes
      WHERE node_type = ? AND from_version = ? AND to_version = ?
      ORDER BY severity DESC, property_name
    `).all(normalizedType, fromVersion, toVersion) as any[];

    return rows.map(row => this.parsePropertyChangeRow(row));
  }

  /**
   * Get all breaking changes for upgrading from one version to another
   * Can handle multi-step upgrades (e.g., 1.0 -> 2.0 via 1.5)
   */
  getBreakingChanges(nodeType: string, fromVersion: string, toVersion?: string): any[] {
    const normalizedType = NodeTypeNormalizer.normalizeToFullForm(nodeType);

    let sql = `
      SELECT * FROM version_property_changes
      WHERE node_type = ? AND is_breaking = 1
    `;
    const params: any[] = [normalizedType];

    if (toVersion) {
      // Get changes between specific versions
      sql += ` AND from_version >= ? AND to_version <= ?`;
      params.push(fromVersion, toVersion);
    } else {
      // Get all breaking changes from this version onwards
      sql += ` AND from_version >= ?`;
      params.push(fromVersion);
    }

    sql += ` ORDER BY from_version, to_version, severity DESC`;

    const rows = this.db.prepare(sql).all(...params) as any[];
    return rows.map(row => this.parsePropertyChangeRow(row));
  }

  /**
   * Get auto-migratable changes for a version upgrade
   */
  getAutoMigratableChanges(nodeType: string, fromVersion: string, toVersion: string): any[] {
    const normalizedType = NodeTypeNormalizer.normalizeToFullForm(nodeType);

    const rows = this.db.prepare(`
      SELECT * FROM version_property_changes
      WHERE node_type = ?
        AND from_version = ?
        AND to_version = ?
        AND auto_migratable = 1
      ORDER BY severity DESC
    `).all(normalizedType, fromVersion, toVersion) as any[];

    return rows.map(row => this.parsePropertyChangeRow(row));
  }

  /**
   * Check if a version upgrade path exists between two versions
   */
  hasVersionUpgradePath(nodeType: string, fromVersion: string, toVersion: string): boolean {
    const versions = this.getNodeVersions(nodeType);
    if (versions.length === 0) return false;

    // Check if both versions exist
    const fromExists = versions.some(v => v.version === fromVersion);
    const toExists = versions.some(v => v.version === toVersion);

    return fromExists && toExists;
  }

  /**
   * Get count of nodes with multiple versions
   */
  getVersionedNodesCount(): number {
    const result = this.db.prepare(`
      SELECT COUNT(DISTINCT node_type) as count
      FROM node_versions
    `).get() as any;
    return result.count;
  }

  /**
   * Parse node version row from database
   */
  private parseNodeVersionRow(row: any): any {
    return {
      id: row.id,
      nodeType: row.node_type,
      version: row.version,
      packageName: row.package_name,
      displayName: row.display_name,
      description: row.description,
      category: row.category,
      isCurrentMax: Number(row.is_current_max) === 1,
      propertiesSchema: row.properties_schema ? this.safeJsonParse(row.properties_schema, []) : null,
      operations: row.operations ? this.safeJsonParse(row.operations, []) : null,
      credentialsRequired: row.credentials_required ? this.safeJsonParse(row.credentials_required, []) : null,
      outputs: row.outputs ? this.safeJsonParse(row.outputs, null) : null,
      minimumN8nVersion: row.minimum_n8n_version,
      breakingChanges: row.breaking_changes ? this.safeJsonParse(row.breaking_changes, []) : [],
      deprecatedProperties: row.deprecated_properties ? this.safeJsonParse(row.deprecated_properties, []) : [],
      addedProperties: row.added_properties ? this.safeJsonParse(row.added_properties, []) : [],
      releasedAt: row.released_at,
      createdAt: row.created_at
    };
  }

  /**
   * Parse property change row from database
   */
  private parsePropertyChangeRow(row: any): any {
    return {
      id: row.id,
      nodeType: row.node_type,
      fromVersion: row.from_version,
      toVersion: row.to_version,
      propertyName: row.property_name,
      changeType: row.change_type,
      isBreaking: Number(row.is_breaking) === 1,
      oldValue: row.old_value,
      newValue: row.new_value,
      migrationHint: row.migration_hint,
      autoMigratable: Number(row.auto_migratable) === 1,
      migrationStrategy: row.migration_strategy ? this.safeJsonParse(row.migration_strategy, null) : null,
      severity: row.severity,
      createdAt: row.created_at
    };
  }

  // ========================================
  // Workflow Versioning Methods
  // ========================================

  /**
   * Create a new workflow version (backup before modification)
   */
  createWorkflowVersion(data: {
    workflowId: string;
    versionNumber: number;
    workflowName: string;
    workflowSnapshot: any;
    trigger: 'partial_update' | 'full_update' | 'autofix';
    operations?: any[];
    fixTypes?: string[];
    metadata?: any;
  }): number {
    const stmt = this.db.prepare(`
      INSERT INTO workflow_versions (
        workflow_id, version_number, workflow_name, workflow_snapshot,
        trigger, operations, fix_types, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.workflowId,
      data.versionNumber,
      data.workflowName,
      JSON.stringify(data.workflowSnapshot),
      data.trigger,
      data.operations ? JSON.stringify(data.operations) : null,
      data.fixTypes ? JSON.stringify(data.fixTypes) : null,
      data.metadata ? JSON.stringify(data.metadata) : null
    );

    return result.lastInsertRowid as number;
  }

  /**
   * Get workflow versions ordered by version number (newest first)
   */
  getWorkflowVersions(workflowId: string, limit?: number): any[] {
    let sql = `
      SELECT * FROM workflow_versions
      WHERE workflow_id = ?
      ORDER BY version_number DESC
    `;

    if (limit) {
      sql += ` LIMIT ?`;
      const rows = this.db.prepare(sql).all(workflowId, limit) as any[];
      return rows.map(row => this.parseWorkflowVersionRow(row));
    }

    const rows = this.db.prepare(sql).all(workflowId) as any[];
    return rows.map(row => this.parseWorkflowVersionRow(row));
  }

  /**
   * Get a specific workflow version by ID
   */
  getWorkflowVersion(versionId: number): any | null {
    const row = this.db.prepare(`
      SELECT * FROM workflow_versions WHERE id = ?
    `).get(versionId) as any;

    if (!row) return null;
    return this.parseWorkflowVersionRow(row);
  }

  /**
   * Get the latest workflow version for a workflow
   */
  getLatestWorkflowVersion(workflowId: string): any | null {
    const row = this.db.prepare(`
      SELECT * FROM workflow_versions
      WHERE workflow_id = ?
      ORDER BY version_number DESC
      LIMIT 1
    `).get(workflowId) as any;

    if (!row) return null;
    return this.parseWorkflowVersionRow(row);
  }

  /**
   * Delete a specific workflow version
   */
  deleteWorkflowVersion(versionId: number): void {
    this.db.prepare(`
      DELETE FROM workflow_versions WHERE id = ?
    `).run(versionId);
  }

  /**
   * Delete all versions for a specific workflow
   */
  deleteWorkflowVersionsByWorkflowId(workflowId: string): number {
    const result = this.db.prepare(`
      DELETE FROM workflow_versions WHERE workflow_id = ?
    `).run(workflowId);

    return result.changes;
  }

  /**
   * Prune old workflow versions, keeping only the most recent N versions
   * Returns number of versions deleted
   */
  pruneWorkflowVersions(workflowId: string, keepCount: number): number {
    // Get all versions ordered by version_number DESC
    const versions = this.db.prepare(`
      SELECT id FROM workflow_versions
      WHERE workflow_id = ?
      ORDER BY version_number DESC
    `).all(workflowId) as any[];

    // If we have fewer versions than keepCount, no pruning needed
    if (versions.length <= keepCount) {
      return 0;
    }

    // Get IDs of versions to delete (all except the most recent keepCount)
    const idsToDelete = versions.slice(keepCount).map(v => v.id);

    if (idsToDelete.length === 0) {
      return 0;
    }

    // Delete old versions
    const placeholders = idsToDelete.map(() => '?').join(',');
    const result = this.db.prepare(`
      DELETE FROM workflow_versions WHERE id IN (${placeholders})
    `).run(...idsToDelete);

    return result.changes;
  }

  /**
   * Truncate the entire workflow_versions table
   * Returns number of rows deleted
   */
  truncateWorkflowVersions(): number {
    const result = this.db.prepare(`
      DELETE FROM workflow_versions
    `).run();

    return result.changes;
  }

  /**
   * Get count of versions for a specific workflow
   */
  getWorkflowVersionCount(workflowId: string): number {
    const result = this.db.prepare(`
      SELECT COUNT(*) as count FROM workflow_versions WHERE workflow_id = ?
    `).get(workflowId) as any;

    return result.count;
  }

  /**
   * Get storage statistics for workflow versions
   */
  getVersionStorageStats(): any {
    // Total versions
    const totalResult = this.db.prepare(`
      SELECT COUNT(*) as count FROM workflow_versions
    `).get() as any;

    // Total size (approximate - sum of JSON lengths)
    const sizeResult = this.db.prepare(`
      SELECT SUM(LENGTH(workflow_snapshot)) as total_size FROM workflow_versions
    `).get() as any;

    // Per-workflow breakdown
    const byWorkflow = this.db.prepare(`
      SELECT
        workflow_id,
        workflow_name,
        COUNT(*) as version_count,
        SUM(LENGTH(workflow_snapshot)) as total_size,
        MAX(created_at) as last_backup
      FROM workflow_versions
      GROUP BY workflow_id
      ORDER BY version_count DESC
    `).all() as any[];

    return {
      totalVersions: totalResult.count,
      totalSize: sizeResult.total_size || 0,
      byWorkflow: byWorkflow.map(row => ({
        workflowId: row.workflow_id,
        workflowName: row.workflow_name,
        versionCount: row.version_count,
        totalSize: row.total_size,
        lastBackup: row.last_backup
      }))
    };
  }

  /**
   * Parse workflow version row from database
   */
  private parseWorkflowVersionRow(row: any): any {
    return {
      id: row.id,
      workflowId: row.workflow_id,
      versionNumber: row.version_number,
      workflowName: row.workflow_name,
      workflowSnapshot: this.safeJsonParse(row.workflow_snapshot, null),
      trigger: row.trigger,
      operations: row.operations ? this.safeJsonParse(row.operations, null) : null,
      fixTypes: row.fix_types ? this.safeJsonParse(row.fix_types, null) : null,
      metadata: row.metadata ? this.safeJsonParse(row.metadata, null) : null,
      createdAt: row.created_at
    };
  }
}
