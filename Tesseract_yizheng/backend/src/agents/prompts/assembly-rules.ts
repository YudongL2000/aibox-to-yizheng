/**
 * [INPUT]: 无
 * [OUTPUT]: 对外提供组装规则与质量检查渲染函数
 * [POS]: agents/prompts 的组装规范与质量标准定义
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENT.md
 */

export const REQUIREMENT_ANALYSIS_STEPS = [
  'STEP 1: 识别触发方式（定时 → schedule_trigger / 外部事件 → webhook_trigger）',
  'STEP 2: 识别输入来源（看 → camera_input / 听 → microphone_input / 外部数据 → webhook）',
  'STEP 3: 识别处理需求（识别/转写/情绪/生成 → 对应 AI 组件）',
  'STEP 4: 识别判断条件（单条件 → single_condition / 多条件 AND/OR）',
  'STEP 5: 识别输出执行（手势/臂/移动/显示/播报 → 对应输出组件）',
];

export const CONNECTION_RULES = [
  '数据流向: 左 → 右（触发 → 输入 → 处理 → 判断 → 输出）',
  '输入输出契约匹配: 上游 outputContract 必须覆盖下游 inputContract',
  '字段不匹配时仅在处理器间使用 Set 节点桥接映射',
  'IF true/false 分支按条件连接，可留空分支；IF 后直连执行器（HAND/SCREEN）',
  '同一节点可并行连接多个下游',
];

export const FLEXIBILITY_RULES = [
  '组件可替换: 输入/处理/输出可互换组合',
  '组件可扩展: 可新增 AI 处理组件',
  '流程可变化: 单分支 / 多分支 / 并行',
  '条件可组合: AND / OR / 嵌套',
  '输出可叠加: 同时执行多个输出组件',
];

export const MINIMUM_NODE_REQUIREMENTS = [
  '触发器: 1 个',
  '输入采集: 至少 2 个（httpRequest + Set）',
  'AI 处理: 至少 2 个（httpRequest + Set）',
  '条件判断: 至少 1 个（IF）',
  '输出执行: 至少 4 个（code/httpRequest 执行器 × n）',
  '最低总节点数: 10 个',
];

export const QUALITY_CHECKLIST = [
  '所有 httpRequest 使用环境变量兜底: {{$env.XXX || "fallback"}}',
  '所有 httpRequest 包含 timeout: 60000',
  '所有数据提取使用容错表达式: {{$json.x || $json.y || ""}}',
  '所有 IF 使用 v2 格式: combinator + operator{type,operation,name}',
  'IF 后不接 Set 桥接执行器，改为直连 HAND/SCREEN（HAND 后可接 ASSIGN 存状态）',
  '无孤立节点（connections 完整）',
];

export function renderAssemblyRules(): string {
  return `
## 需求分析规则
${REQUIREMENT_ANALYSIS_STEPS.map((line) => `- ${line}`).join('\n')}

## 串联规范
${CONNECTION_RULES.map((line) => `- ${line}`).join('\n')}

## 灵活性保障
${FLEXIBILITY_RULES.map((line) => `- ${line}`).join('\n')}
`.trim();
}

export function renderQualityChecklist(): string {
  return `
## 最小节点数检查
${MINIMUM_NODE_REQUIREMENTS.map((line) => `- ${line}`).join('\n')}

## 必需检查点
${QUALITY_CHECKLIST.map((line) => `- ${line}`).join('\n')}
`.trim();
}
