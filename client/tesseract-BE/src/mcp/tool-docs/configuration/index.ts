/**
 * [INPUT]: 依赖 configuration 子目录下的具体节点工具文档定义
 * [OUTPUT]: 对外提供 configuration 分类的 ToolDocumentation 导出集合
 * [POS]: mcp/tool-docs/configuration 的导出入口，承接 Refactor-4 的节点工具拆分
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

export { getNodeDoc } from './get-node';
export { getNodeDocsDoc } from './get-node-docs';
export { searchNodePropertiesDoc } from './search-node-properties';
export { getNodeVersionsDoc } from './get-node-versions';
