/**
 * [INPUT]: 无外部依赖
 * [OUTPUT]: 对外提供 NAMING_CONVENTIONS_CONTENT 命名规范片段
 * [POS]: prompts/fragments 的命名规则库，被 architect-system.ts 组装进系统提示词
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

export const NAMING_CONVENTIONS_CONTENT = `# 命名规范

节点 name 必须使用中文业务场景名称，让用户一眼看懂每个节点的作用。

- 触发器: 定时触发_{seconds}秒 / 手动触发
- 感知器: {中文功能描述}，如 语音识别、人脸检测、手势识别
- 处理器: {中文用途}，如 情绪分析、变量赋值_计分
- 逻辑器: 判断_{中文条件}，如 判断_是否识别到人脸
- 执行器: {中文动作}，如 语音播报_问候、屏幕显示_结果、挥手致意

节点 name 必须全局唯一；重复时追加 _1 / _2 / _3。`;
