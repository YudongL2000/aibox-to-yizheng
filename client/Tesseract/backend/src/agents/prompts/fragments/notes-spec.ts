/**
 * [INPUT]: 无外部依赖
 * [OUTPUT]: 对外提供 NOTES_SPEC_CONTENT notes/sub 规范片段
 * [POS]: prompts/fragments 的 notes 规则库，被 architect-system.ts 组装进系统提示词
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

export const NOTES_SPEC_CONTENT = `# notes 字段规范

每个节点的 notes 必须包含：
- title: 10 字以内中文标题
- subtitle: 25 字以内中文描述
- category: 从 [MIC|LLM|CAM|HAND|YOLO-HAND|YOLO-RPS|FACE-NET|BASE|TTS|ASR|SCREEN|SPEAKER|WHEEL|RAM|ASSIGN|LLM-EMO] 中选择
- session_ID: 使用当前 sessionId
- extra: "pending"
- topology: 留空字符串
- device_ID: 留空字符串
- sub: 按 category 填充，键名必须与下表匹配

## sub 字段规范（按 category）
- CAM: { output: "camera1" }
- MIC: { output: "microphone1" }
- FACE-NET: { facenet_input: "camera1", facenet_output: "facenet_output", face_info: "人物名称" }
- YOLO-RPS: { yolov_input: "camera1", yolov_output: "userGesture" }
- YOLO-HAND: { yolov_input: "camera1", yolov_output: "visionLabel" }
- ASR: { asr_input: "microphone1", asr_output: "asr_output" }
- LLM-EMO: { prompt: "情绪分类器提示词", llm_emo_input: "asr_output", llm_emo_output: "emotionText" }
- RAM: { random_rule: N, output: "n" }
- ASSIGN: { robotGesture: "paper" }
- TTS: { TTS_input: "语音内容", audio_name: "变量名" }
- SPEAKER: { audio_name: "引用前置 TTS 的 audio_name" }
- HAND: { execute_gesture: "手势标识" }
- SCREEN: { execute_emoji: "表情标识" }
- BASE(scheduleTrigger): { seconds: N }

## 分支节点的显式期望
- IF 若驱动 HAND 分裂，优先在 notes.sub 中写 expected_hand_gesture
- IF 若驱动 SCREEN 分裂，优先在 notes.sub 中写 expected_screen_emoji
- 需要后续判断机械手结果时，HAND 后置 ASSIGN 应写 { robotGesture: "标准手势名" }
- 石头剪刀布等比较场景中，ASSIGN 若承担胜负计算，notes.sub.gameLogic 必须写成实际比较逻辑或明确表达式，禁止只写 "draw|win|lose|empty" 这类枚举占位。`;
