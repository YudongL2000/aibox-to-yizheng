/**
 * [INPUT]: 依赖原始 code 节点 parameters，可选读取 language/jsCode/pythonCode
 * [OUTPUT]: 对外提供 buildExecutableCodeNodeParameters 与默认 code 节点模板常量
 * [POS]: utils 的 code 节点参数单一真相源，统一约束最小可执行模板，避免 agents/services/prompts 三处漂移
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

export const DEFAULT_CODE_NODE_LANGUAGE = 'javaScript';
export const DEFAULT_CODE_NODE_JS_CODE = 'return items;';
export const DEFAULT_CODE_NODE_PYTHON_CODE = 'return _input.all()';

export function buildExecutableCodeNodeParameters(
  parameters: Record<string, unknown> = {}
): Record<string, unknown> {
  const next = { ...parameters };
  const language = next.language === 'python' ? 'python' : DEFAULT_CODE_NODE_LANGUAGE;

  next.language = language;

  if (language === 'python') {
    const pythonCode = typeof next.pythonCode === 'string' && next.pythonCode.trim()
      ? next.pythonCode.trim()
      : DEFAULT_CODE_NODE_PYTHON_CODE;
    next.pythonCode = pythonCode;
    delete next.jsCode;
    return next;
  }

  const jsCode = typeof next.jsCode === 'string' && next.jsCode.trim()
    ? next.jsCode.trim()
    : DEFAULT_CODE_NODE_JS_CODE;
  next.jsCode = jsCode;
  delete next.pythonCode;
  return next;
}
