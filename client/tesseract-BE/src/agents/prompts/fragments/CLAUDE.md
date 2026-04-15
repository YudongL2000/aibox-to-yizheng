# fragments/
> L2 | 父级: ../CLAUDE.md

Architect system prompt 的知识维度切片。每个文件导出一个 `*_CONTENT` 常量，禁止在这里塞运行时代码或 few-shot JSON。

成员清单
topology-patterns.ts: 拓扑模式库，定义线性链、fan-out、多感知合流与 TTS→SPEAKER 固定链路，并要求音频链做数量自检。
notes-spec.ts: notes 与 notes.sub 规范，锁定 category、session_ID 与各类 sub 键名。
entity-multiplication.ts: 实体驱动的节点乘法规则，约束多人物/多条件场景必须按实体实例化节点，并明确 FACE-NET 串联后 fan-out 的身份路由模式。
emotion-interaction-pattern.ts: 共情场景专用拓扑切片，约束 CAM+MIC 双感知、单 ASR/LLM-EMO、happy/sad 独立分支与 TTS→SPEAKER 配对。
game-rps-pattern.ts: 石头剪刀布专用拓扑切片，约束 CAM→YOLO-RPS→RAM→IF→HAND→ASSIGN→结果分支 的标准顺序与完整节点清单。
naming-conventions.ts: 节点命名规范，约束 trigger/http/set/if/code 的 name 形态。

法则: fragment 只放稳定知识切片；动态上下文（实体、验证反馈）由 architect-system.ts 在运行时构造。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
