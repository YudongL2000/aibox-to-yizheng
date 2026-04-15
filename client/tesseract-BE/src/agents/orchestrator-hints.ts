/**
 * [INPUT]: 无，纯常量归档模块
 * [OUTPUT]: 对外提供 ORCHESTRATOR_HINTS 启发式关键词清单
 * [POS]: agents 的启发式历史仓库，当前不接入 Orchestrator 主链路，仅保留作回归对照与后续实验
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

export const ORCHESTRATOR_HINTS = {
  lowSignalInputs: ['你好', '您好', 'hello', 'hi', 'hey', '在吗', '你能做什么', 'help'],
  trigger: ['定时', '每天', '每周', '每月', '每隔', '定期'],
  condition: ['如果', '若', 'when', 'if', '否则', '条件', '分支', '判断'],
  rockPaperScissors: ['石头剪刀布', '剪刀石头布', '猜拳'],
  face: ['人脸', '识别到人脸', '检测到人脸', '看到谁', '看到我', '看见我', '检测到我'],
  greeting: ['欢迎', '打招呼', '问候'],
  voice: ['语音', '播报', '说', '朗读', '喊'],
  screen: ['屏幕', '表情', 'emoji', '显示'],
  audio: ['声音', '语音识别', '麦克风', '听到'],
  movement: ['移动', '底盘', '转圈', '转个圈', '转一圈', '原地转圈', '原地转个圈', '原地转一圈', '旋转'],
  follow: ['跟着我', '跟随我', '跟我走', '自动跟着我', '跟着人', '跟随人', '跟踪我', 'follow me'],
  arm: ['机械臂', '抓取', '抬起', '放下', '伸出'],
} as const;

export type OrchestratorHintGroup = keyof typeof ORCHESTRATOR_HINTS;
