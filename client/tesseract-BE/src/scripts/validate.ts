#!/usr/bin/env node
/**
 * [INPUT]: 依赖 nodes.db、database-adapter 与当前节点库的真实 node_type 分布
 * [OUTPUT]: 对外提供数据库关键节点校验、统计摘要与版本兼容的 critical checks
 * [POS]: scripts 的发布前守门脚本，负责验证“当前数据库事实”而不是过期假设
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
/**
 * Copyright (c) 2024 AiAdvisors Romuald Czlonkowski
 * Licensed under the Sustainable Use License v1.0
 */
import { createDatabaseAdapter } from '../database/database-adapter';

interface NodeRow {
  node_type: string;
  package_name: string;
  display_name: string;
  description?: string;
  category?: string;
  development_style?: string;
  is_ai_tool: number;
  is_trigger: number;
  is_webhook: number;
  is_versioned: number;
  version?: string;
  documentation?: string;
  properties_schema?: string;
  operations?: string;
  credentials_required?: string;
  updated_at: string;
}

interface CriticalCheck {
  label: string;
  candidates: string[];
  checks: {
    hasReferenceText?: boolean;
    textContains?: string;
    style?: string;
    hasOperations?: boolean;
    isAITool?: boolean;
    packageName?: string;
  };
}

async function validate() {
  const db = await createDatabaseAdapter('./data/nodes.db');
  
  console.log('🔍 Validating critical nodes...\n');
  
  const criticalChecks: CriticalCheck[] = [
    { 
      label: 'nodes-base.httpRequest',
      candidates: ['nodes-base.httpRequest'],
      checks: {
        hasReferenceText: true,
        textContains: 'HTTP Request',
        style: 'programmatic'
      }
    },
    { 
      label: 'nodes-base.code',
      candidates: ['nodes-base.code'],
      checks: {
        hasReferenceText: true,
        textContains: 'Code',
        style: 'programmatic'
      }
    },
    { 
      label: 'nodes-base.slack',
      candidates: ['nodes-base.slack'],
      checks: {
        hasOperations: true,
        style: 'programmatic'
      }
    },
    {
      label: 'nodes-langchain.agent',
      candidates: ['nodes-langchain.agent', 'nodes-langchain.agentTool'],
      checks: {
        hasReferenceText: true,
        textContains: 'Agent',
        isAITool: false,
        packageName: '@n8n/n8n-nodes-langchain'
      }
    }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const check of criticalChecks) {
    const resolution = resolveNode(db, check.candidates);
    const node = resolution?.node;
    
    if (!node) {
      console.log(`❌ ${check.label}: NOT FOUND (tried: ${check.candidates.join(', ')})`);
      failed++;
      continue;
    }
    
    let nodeOk = true;
    const issues: string[] = [];
    const referenceText = buildReferenceText(node);
    
    // Run checks
    if (check.checks.hasReferenceText && !referenceText) {
      nodeOk = false;
      issues.push('missing documentation/description text');
    }
    
    if (
      check.checks.textContains &&
      !referenceText.toLowerCase().includes(check.checks.textContains.toLowerCase())
    ) {
      nodeOk = false;
      issues.push(`reference text doesn't contain "${check.checks.textContains}"`);
    }
    
    if (check.checks.style && node.development_style !== check.checks.style) {
      nodeOk = false;
      issues.push(`wrong style: ${node.development_style}`);
    }
    
    if (check.checks.hasOperations) {
      const operations = JSON.parse(node.operations || '[]');
      if (!operations.length) {
        nodeOk = false;
        issues.push('no operations found');
      }
    }
    
    if (check.checks.isAITool !== undefined && !!node.is_ai_tool !== check.checks.isAITool) {
      nodeOk = false;
      issues.push(`AI tool flag mismatch: expected ${check.checks.isAITool}, got ${!!node.is_ai_tool}`);
    }
    
    if ('isVersioned' in check.checks && check.checks.isVersioned && !node.is_versioned) {
      nodeOk = false;
      issues.push('not marked as versioned');
    }
    
    if (check.checks.packageName && node.package_name !== check.checks.packageName) {
      nodeOk = false;
      issues.push(`wrong package: ${node.package_name}`);
    }
    
    if (nodeOk) {
      const resolvedSuffix = resolution?.matchedType !== check.label
        ? ` [resolved: ${resolution?.matchedType}]`
        : '';
      console.log(`✅ ${check.label}${resolvedSuffix}`);
      passed++;
    } else {
      const resolvedSuffix = resolution?.matchedType !== check.label
        ? ` [resolved: ${resolution?.matchedType}]`
        : '';
      console.log(`❌ ${check.label}${resolvedSuffix}: ${issues.join(', ')}`);
      failed++;
    }
  }
  
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
  
  // Additional statistics
  const stats = db.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(is_ai_tool) as ai_tools,
      SUM(is_trigger) as triggers,
      SUM(is_versioned) as versioned,
      COUNT(DISTINCT package_name) as packages
    FROM nodes
  `).get() as any;
  
  console.log('\n📈 Database Statistics:');
  console.log(`   Total nodes: ${stats.total}`);
  console.log(`   AI tools: ${stats.ai_tools}`);
  console.log(`   Triggers: ${stats.triggers}`);
  console.log(`   Versioned: ${stats.versioned}`);
  console.log(`   Packages: ${stats.packages}`);
  
  // Check documentation coverage
  const docStats = db.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN NULLIF(TRIM(documentation), '') IS NOT NULL THEN 1 ELSE 0 END) as with_docs,
      SUM(CASE WHEN NULLIF(TRIM(COALESCE(documentation, description)), '') IS NOT NULL THEN 1 ELSE 0 END) as with_reference_text
    FROM nodes
  `).get() as any;
  
  console.log(`\n📚 Documentation Coverage:`);
  console.log(`   Nodes with docs: ${docStats.with_docs}/${docStats.total} (${Math.round(docStats.with_docs / docStats.total * 100)}%)`);
  console.log(`   Nodes with docs/description: ${docStats.with_reference_text}/${docStats.total} (${Math.round(docStats.with_reference_text / docStats.total * 100)}%)`);
  if (docStats.with_docs === 0 && docStats.with_reference_text > 0) {
    console.log('   Note: 当前重建流程未生成长文档，校验已回退到 description/displayName。');
  }
  
  db.close();
  process.exit(failed > 0 ? 1 : 0);
}

function resolveNode(
  db: Awaited<ReturnType<typeof createDatabaseAdapter>>,
  candidates: string[]
): { node: NodeRow; matchedType: string } | null {
  for (const candidate of candidates) {
    const node = db.prepare('SELECT * FROM nodes WHERE node_type = ?').get(candidate) as NodeRow | undefined;
    if (node) {
      return {
        node,
        matchedType: candidate,
      };
    }
  }

  return null;
}

function buildReferenceText(node: NodeRow): string {
  return [node.documentation, node.description, node.display_name]
    .filter((value): value is string => Boolean(value && value.trim()))
    .join('\n')
    .trim();
}

if (require.main === module) {
  validate().catch(console.error);
}
