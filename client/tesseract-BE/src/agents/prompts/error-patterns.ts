/**
 * [INPUT]: 无
 * [OUTPUT]: 对外提供 ERROR_PATTERNS 常见错误模式
 * [POS]: agents/prompts 的错误修复提示源
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENT.md
 */

export const ERROR_PATTERNS = [
  {
    code: 'missing_typeversion',
    description: '节点缺少typeVersion或版本过低',
    fix: '调用get_node获取最新typeVersion并补齐。',
  },
  {
    code: 'invalid_connection',
    description: 'connections结构不符合n8n格式',
    fix: '确保connections为{ source: { main: [[{ node, type, index }]] } }结构。',
  },
  {
    code: 'missing_required_param',
    description: 'HTTP节点缺少url或method等必填字段',
    fix: '补齐url/method/headers等必需参数。',
  },
  {
    code: 'expression_format',
    description: '表达式缺少={{ }}包裹',
    fix: '修复为={{ $json.field }}格式。',
  },
];
