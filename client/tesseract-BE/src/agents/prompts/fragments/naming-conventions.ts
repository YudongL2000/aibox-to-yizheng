/**
 * [INPUT]: 无外部依赖
 * [OUTPUT]: 对外提供 NAMING_CONVENTIONS_CONTENT 命名规范片段
 * [POS]: prompts/fragments 的命名规则库，被 architect-system.ts 组装进系统提示词
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

export const NAMING_CONVENTIONS_CONTENT = `# 命名规范

- 触发器: schedule_trigger_{seconds}s
- 感知器: http_request_{功能}
- 处理器: set_{category}_{用途}
- 逻辑器: if_{条件语义}
- 执行器: code_{category}_{用途}

节点 name 必须全局唯一；重复时追加 _1 / _2 / _3。`;
