/**
 * [INPUT]: 无外部依赖
 * [OUTPUT]: 对外提供 EMOTION_INTERACTION_PATTERN_CONTENT 共情场景专用拓扑切片
 * [POS]: prompts/fragments 的 emo 场景知识切片，被 architect-system.ts 组装进系统提示词
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

export const EMOTION_INTERACTION_PATTERN_CONTENT = `# 共情场景专用拓扑

当需求涉及“共情”“情绪回应”“情绪识别 + 反馈”时，优先生成以下结构：
1. 触发：schedule_trigger 或用户主动触发。
2. 双感知链：
   - CAM → YOLO-HAND，输出 visionLabel
   - MIC → ASR，输出 asr_output
3. 情绪判断：
   - LLM-EMO 读取 asr_output + visionLabel
   - 输出 emotionText ∈ {happy, sad, angry, neutral}
4. 分支：
   - if_emotion_is_happy → [SCREEN(Happy), TTS("共情话术"), HAND(Waving)]
   - if_emotion_is_sad → [SCREEN(Sad), TTS("安慰话术"), HAND(Put_down)]
5. 反应：
   - 每个情绪分支内 TTS 必须连接一个独立 SPEAKER

关键约束：
- ASR 和 LLM-EMO 各只需一个节点（单能力单节点）
- 每个情绪分支的 SCREEN / HAND / TTS / SPEAKER 独立，不共享
- MIC → ASR → LLM-EMO 是线性链，不要在中间插入多余的 SET bridge / HTTP bridge
- LLM-EMO 必须 fan-out 到多个 IF 分支，而不是把 happy/sad 压进一个 IF
- 如果 sad 分支存在 SCREEN 或 HAND，就必须同时有 TTS → SPEAKER，不要只生成半条分支`;
