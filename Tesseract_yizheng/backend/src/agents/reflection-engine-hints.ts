/**
 * [INPUT]: 无，纯常量归档模块
 * [OUTPUT]: 对外提供 REFLECTION_ENGINE_HINTS 历史启发式清单
 * [POS]: agents 的反思启发式档案库，当前不接入 ReflectionEngine 主链路，仅保留作对照与回归实验
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

export const REFLECTION_ENGINE_HINTS = {
  categoryKeywords: {
    trigger: ['触发', '开始', '定时', 'webhook'],
    action: ['动作', '执行', '行为', '机械手'],
    condition: ['条件', '分支', '判断', 'if'],
    feedback: ['反馈', '播报', '显示', '提醒'],
    logic: ['逻辑', '规则', '胜负', '流程'],
  },
  triggerIntentKeywords: ['定时', 'webhook', '触发', '监听'],
  actionIntentKeywords: ['执行', '动作', '回应', '播放', '显示'],
  feedbackIntentKeywords: ['语音', '播报', '显示', '反馈', '提醒'],
  gameIntentKeywords: ['游戏', '玩'],
  lowSignalInputs: ['你好', '您好', 'hello', 'hi', 'hey', '在吗', '你能做什么', 'help'],
  conditionKeywords: ['如果', '若', 'when', 'if', '否则', '条件', '分支', '判断'],
  logicKeywords: ['游戏', '规则', '策略', '胜负', '比较', '评分', '流程'],
  explicitConditionPatterns: [
    /如果.+(就|则|那么)/,
    /when.+then/,
    /(大于|小于|等于|不等于).+(则|就|时)/,
    /(识别到|检测到).+(执行|触发|播报|显示)/,
  ],
  explicitLogicKeywords: ['规则', '三局', '轮次', '优先级', '胜负判定', '重试', '回退', '结束条件'],
} as const;
