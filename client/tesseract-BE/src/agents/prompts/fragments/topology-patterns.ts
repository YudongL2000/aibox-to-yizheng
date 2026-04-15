/**
 * [INPUT]: 无外部依赖
 * [OUTPUT]: 对外提供 TOPOLOGY_PATTERNS_CONTENT 拓扑模式知识片段
 * [POS]: prompts/fragments 的拓扑模式库，被 architect-system.ts 组装进系统提示词
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

export const TOPOLOGY_PATTERNS_CONTENT = `# 拓扑模式

## 线性链
trigger → sensor → processor → executor
适用：单一感知、单一动作。

## 条件分支（fan-out）
processor → [if_condition_A, if_condition_B]
每个 IF 的 true 分支并行连接执行器组，false 分支留空。
适用：多人、多条件、多结果场景。

## 身份分支（多人物）
FACE-NET / identity processor → [if_person_A, if_person_B, ...]
每个人物必须有独立 IF，不能把多个人物压缩进同一个 IF。
每个 IF 的 true 分支应直接连接该人物自己的执行器组。

## 结果分支（empty/draw/win/lose）
裁判 IF 节点按结果语义拆成独立链路：
- empty → SCREEN → TTS → SPEAKER
- draw → SCREEN → TTS → SPEAKER
- win → SCREEN → TTS → SPEAKER
- lose → SCREEN → TTS → SPEAKER
不要让多个结果分支共用同一个 SCREEN/TTS/SPEAKER 节点。

## 执行器分裂
如果两个 IF 分支需要不同的 execute_gesture / execute_emoji / audio_name，就必须复制执行器节点。
禁止多个分支共享同一个参数不同的 HAND、SCREEN、SPEAKER 节点。

## 单能力单节点
默认每个 capability ID 只对应一个节点。
只有 entity-multiplication 明确要求分裂时，才允许为同一 capability 复制多个节点。
禁止把同一能力拆成“参数设置节点 + API 调用节点”两段来表达。
同一 capability 的业务输入输出应优先写入 notes.sub，而不是额外再造一个同 category 节点。

## 多感知合流
[sensor_A → processor_A, sensor_B → processor_B] → decision_node
适用：视觉 + 听觉等多模态输入。

## 反应链路（固定配对）
TTS 节点（处理器）必须连接 SPEAKER 节点（执行器）。
这是一对固定的上下游依赖，不可拆散。

## 反应链路计数自检
生成完工作流后，必须自检：
- SPEAKER 节点数量必须 <= TTS 节点数量
- 每个 SPEAKER 必须恰好有一个 TTS 上游
- 如果发现 SPEAKER 没有 TTS 前驱，说明遗漏了 TTS 节点
- 如果发现 TTS → TTS 或 SPEAKER → SPEAKER，说明生成了冗余音频 relay，应直接删除中继`;
