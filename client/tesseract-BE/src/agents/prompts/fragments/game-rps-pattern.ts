/**
 * [INPUT]: 无外部依赖
 * [OUTPUT]: 对外提供 GAME_RPS_PATTERN_CONTENT 石头剪刀布专用拓扑约束片段
 * [POS]: prompts/fragments 的 game 场景知识切片，被 architect-system.ts 组装进系统提示词
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

export const GAME_RPS_PATTERN_CONTENT = `# 石头剪刀布专用拓扑

当需求是和人玩石头剪刀布时，工作流应优先按以下顺序组装：
1. CAM → YOLO-RPS，识别玩家出拳 userGesture
2. RAM，生成 robot_n (1-3)
3. IF robot_n = 1 / 2 / 3，分别进入独立的 HAND 节点：
   - 1 → Rock
   - 2 → Scissors
   - 3 → Paper
4. 每个 HAND 后接 ASSIGN，写入 robotGesture，并执行 userGesture vs robotGesture 的实际比较逻辑，输出 gameResult
5. gameResult 再进入独立结果分支：SCREEN → TTS → SPEAKER

禁止：
- 先输出 gameResult，再反推 robotGesture
- 只生成一个共享 HAND 节点却不给出分支参数
- 把 ASSIGN 的游戏逻辑写成 "draw|win|lose|empty" 这类占位字符串

## 石头剪刀布完整节点清单

一个正确的 RPS 工作流应包含 >=20 个节点：

触发：
- schedule_trigger_5s

感知：
- http_request_camera_snapshot (CAM)

识别：
- set_rps_recognition (YOLO-RPS) → 输出 userGesture

随机：
- set_generate_random_n (RAM) → 输出 robot_n ∈ {1,2,3}

手势分裂（3 个 IF → 3 个 HAND → 3 个 ASSIGN）：
- if_robot_n_eq_1 → code_hand_execute_rock → set_robot_gesture_rock
- if_robot_n_eq_2 → code_hand_execute_scissors → set_robot_gesture_scissors
- if_robot_n_eq_3 → code_hand_execute_paper → set_robot_gesture_paper

注意：
- IF 必须直连 HAND，中间不要插入 SET bridge 节点
- 每个 HAND 后都要接 ASSIGN
- ASSIGN 的 notes.sub 必须包含 robotGesture
- ASSIGN 的 notes.sub.gameLogic 必须写成实际比较逻辑，不要写占位枚举

结果分支（4 条独立链）：
- if_user_gesture_empty → code_screen_execute_empty_angry → set_audio_generate_empty → code_speaker_execute_empty
- if_draw → code_screen_execute_draw_angry → set_audio_generate_draw → code_speaker_execute_draw
- win 类 IF → code_screen_execute_win_happy → set_audio_generate_win → code_speaker_execute_win
- lose 类 IF → code_screen_execute_lose_sad → set_audio_generate_lose → code_speaker_execute_lose

关键约束：
- empty / draw / win / lose 四种结果都必须有独立 SCREEN → TTS → SPEAKER 链
- 每个结果链的 SCREEN / TTS / SPEAKER 不共享
- userGesture 比较应发生在 ASSIGN 写入 robotGesture 之后，而不是之前`;
