# scene/
> L2 | 父级: ../CLAUDE.md

成员清单
assign-flow.ts: HAND 后置状态桥接器，负责补齐 ASSIGN 节点并维持 robotGesture 数据契约。
audio-repair-flow.ts: TTS/SPEAKER 修复器，负责 gesture/result 场景中的音频链路收敛。
gesture-identity-flow.ts: 多人物手势身份分支修复器，负责 FACE-NET/IF fan-out 与人物绑定链路。
emotion-flow.ts: emo 场景增量补全器，负责保留 LLM 原始工作流、补齐双感知/情绪分支/输出执行器组，并把重复 ASR/LLM-EMO 归一成单节点链路。
game-flow.ts: game 场景拓扑后处理器，负责 HAND 执行器补齐、IF→执行器直连、共享执行器拆分与按手势分裂的 HAND 拓扑收敛。
result-flow.ts: 猜拳结果分支修复器，负责 empty/draw/win/lose 四类独立结果链路。
safety-net-controls.ts: 场景安全网控制与观测层，负责 enabled/disabled/dormant 三态、禁用日志与拓扑变更审计。

法则: scene 子模块只放场景安全网；每个文件只承接一类拓扑修复。当 prompt/context 足够强时，这些后处理器应逐步退役，而不是继续膨胀。安全网开关、dormant 观测与变更审计必须集中在 `safety-net-controls.ts`，不要回流到 `workflow-architect.ts`。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
