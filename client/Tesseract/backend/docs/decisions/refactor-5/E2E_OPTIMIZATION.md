# Refactor-5 端到端测试审核与优化执行文档

> 基于 `data/logs/2026-03-14T21-33-56-685+08-00.log` (6971 行) 的三场景端到端测试

---

## 0. 测试总览

| 场景 | 输入 | 结果 | 问题 |
|------|------|------|------|
| gesture | "见到老刘竖个中指说一句'滚'，见到老付比个V说'你长得好帅'" | workflow_ready ✅ | 无明显问题 |
| emo | "我想做一个和我共情的机器人" | workflow_ready (3 轮) | 澄清回退 + 节点重复 |
| game | "我想有一个和我玩石头剪刀布的机器人" | workflow_ready (2 轮) | 澄清回退 + 缺失游戏逻辑 + HAND 节点缺失 |

**测试环境**
- LLM: claude-sonnet-4-6 via aihubmix.com, maxIterations: 3
- 9 个 safety net 全部 DISABLED (`AGENT_SCENE_SAFETY_NETS=none`)
- promptVariant: baseline

---

## 1. ISSUE-1: 澄清交互回退为问题模式

### 现象

emo 场景 (L2673) 和 game 场景 (L4962) 均触发：
```
title: '澄清交互回退为问题模式'
detail: '后端当前没有拿到足够可用的交互选项，前端将只展示 clarification_questions'
```
gesture 场景未触发 — confidence 0.97 直接 `direct_accept`。

### 根因链

```
LLM 返回 suggested_user_actions: []     ← 3 个场景全部为空
         ↓
buildAiNativeClarificationOptions()
    → normalizeInteractionOptions([])    ← 空数组，fallback
    → buildQuestionOptions(reflection)   ← 尝试从 clarification_questions.options 提取
         ↓
limitClarificationOptions()              ← 按 primaryCategory 切片，最多取 4 条
         ↓
buildClarificationInteraction()
    → options.length < 2 → return undefined   ← 阈值未通过
         ↓
response.interaction = undefined → 触发 fallback trace
```

**核心断点**: LLM 从未生成 `suggested_user_actions`。日志证据：
- L208: `suggested_user_actions: []` (gesture)
- L3026: `suggested_user_actions: []` (emo round 3)
- L5115: `suggested_user_actions: []` (game round 2)

**次级断点**: `buildQuestionOptions` 的 category 过滤逻辑过于严格 — `resolveQuestionCategory` 会将 question 映射到 `missing_info.category`，mapping 失败时取 `missing_info[index]`（按索引对位），导致 options 跨 category 分散后被 `limitClarificationOptions` 的 primaryCategory 切片缩减到不足 2 条。

### 涉及文件

| 文件 | 行 | 关注点 |
|------|-----|--------|
| `src/agents/reflection-prompt-builder.ts` | 37-49 | prompt 中 suggested_user_actions 的格式说明与约束 |
| `src/agents/reflection-engine.ts` | 208-220 | ReflectionResult 输出映射 |
| `src/agents/orchestrator/response-builder.ts` | 376-385 | `buildAiNativeClarificationOptions` 主逻辑 |
| `src/agents/orchestrator/response-builder.ts` | 357-371 | `buildClarificationInteraction` ← `options.length < 2` 阈值 |
| `src/agents/orchestrator/response-builder.ts` | 500-522 | `limitClarificationOptions` ← primaryCategory 切片 |
| `src/agents/orchestrator/response-builder.ts` | 412-430 | `buildQuestionOptions` ← fallback 提取 |
| `src/agents/orchestrator.ts` | 192-197 | 回退检测 & trace 发射点 |

### 修复方案

**P0 — Prompt 强化: 让 LLM 必出 suggested_user_actions**

文件: `src/agents/reflection-prompt-builder.ts`

```diff
- '- clarify_needed 时，尽量给 2-4 条 suggested_user_actions，优先覆盖不同 missing_info 类别，内容必须是用户可以直接点选或直接发送的下一句话。',
+ '- clarify_needed 时 suggested_user_actions 不得为空，必须给 2-4 条，每条覆盖一个 missing_info 类别。value 是用户可以直接发送的完整短句。',
+ '- 每条 suggested_user_actions 的 category 必须与某条 missing_info.category 精确匹配。',
```

**P1 — Fallback 降级策略: 从 clarification_questions.options 跨 category 合并**

文件: `src/agents/orchestrator/response-builder.ts`

`limitClarificationOptions` 当前只取 primaryCategory 的前 4 条。如果 primaryCategory 只有 1 条 option，整个交互就失败了。

修改策略: 当 primaryCategory 不足 2 条时，合并所有 category 的 options 直到满 2 条：

```typescript
private limitClarificationOptions(
  options: ClarificationOptionCandidate[]
): ClarificationOptionCandidate[] {
  if (options.length <= 1) return options;

  const groups = new Map<string, ClarificationOptionCandidate[]>();
  options.forEach((opt) => {
    const key = opt.category ?? 'uncategorized';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(opt);
  });

  const primaryCategory = Array.from(groups.keys())[0];
  const primary = (groups.get(primaryCategory) ?? []).slice(0, 4);
  // ---- NEW: 不足 2 条时跨 category 补充 ----
  if (primary.length < 2) {
    const rest = options.filter(o => (o.category ?? 'uncategorized') !== primaryCategory);
    return [...primary, ...rest].slice(0, 4);
  }
  return primary;
}
```

**P2 — 降低 interaction 阈值的兜底**

当 `buildQuestionOptions` 能产出至少 1 条有效 option 时，即使只有 1 条也应构建 interaction（mode 从 `single` 切为 `freetext_with_suggestion`），而非直接 return undefined。这是第三道防线。

### 预期效果

- P0 解决 80% case — LLM 被强制要求生成匹配 missing_info 的 suggested_user_actions
- P1 解决 15% case — 即使 LLM 不出 actions，从 questions.options 跨 category 合并能达到 2 条
- P2 解决 5% edge case — 极端情况下至少展示 1 个选项而非完全没有交互

---

## 2. ISSUE-2: 石头剪刀布场景逻辑粗糙

### 现象

game 场景生成了 17 个节点，但：
1. **缺少 HAND 执行节点** — 没有 `code_hand_execute_rock/scissors/paper`
2. **无真实游戏逻辑** — ASSIGN 节点的 sub 只有 `gameResult: "draw|win|lose|empty"` 字符串，没有比较计算
3. **Safety net 全部 disabled** — `ensureGameHandExecutor`、`ensureHandHasAssign`、`ensureResultBranches` 均未执行

### Ground Truth 对比

Ground truth (`docs/development/scene/game/game_0203.json`) 要求的拓扑：
```
schedule_trigger → camera_snapshot → yolov8_gesture → generate_random_n
    → if_robot_n_eq_1 → code_hand_execute_rock → set_assign_for_hand
    → if_robot_n_eq_2 → code_hand_execute_scissors → set_assign_for_hand
    → if_robot_n_eq_3 → code_hand_execute_paper → set_assign_for_hand
    → set_audio_generate_result → code_speaker_execute → set_screen_execute_result
```

**实际生成的拓扑** (17 nodes):
```
webhook → camera → yolo_rps → ram → assign
    → if_empty → tts_empty → speaker_empty
    → if_draw  → tts_draw  → speaker_draw
    → if_win   → tts_win   → speaker_win
    → if_lose  → tts_lose  → speaker_lose
```

差距:
- ❌ 无 HAND 执行节点 (3 个，按 rock/scissors/paper 分)
- ❌ 无 SCREEN 节点
- ❌ IF 分支按 gameResult 而非 robot_n 分 (逻辑错误: gameResult 需要先算才有值)
- ❌ ASSIGN 节点无比较逻辑 (只有占位字符串)
- ❌ 调度触发器用 webhook 而非 schedule_trigger

### 涉及文件

| 文件 | 关注点 |
|------|--------|
| `src/agents/workflow-architect/scene/game-flow.ts` | `ensureGameHandExecutor` safety net 实现 |
| `src/agents/workflow-architect/scene/safety-net-controls.ts` | flag 开关 |
| `src/agents/prompts/fragments/topology-patterns.ts` | 拓扑规则 (缺 game 专项) |
| `src/agents/prompts/fragments/entity-multiplication.ts` | 实体分裂规则 |
| `src/agents/prompts/architect-system.ts` | 系统 prompt (HAND metadata 期望) |
| `docs/development/scene/game/game_0203.json` | Ground truth 参考 |

### 修复方案

**P0 — 重新启用关键 safety net**

Safety net 应当分层启用。完全禁用不是测试 LLM 能力的正确方式 — 如果目标是减少 safety net 依赖，应逐个禁用并验证退步。

立即重新启用:
- `ensureGameHandExecutor` — 自动补 HAND 执行节点
- `ensureHandHasAssign` — 确保 HAND → ASSIGN 连接
- `ensureResultBranches` — 补全结果输出分支
- `ensureIfDirectExecutorConnections` — IF → HAND/SCREEN 直连

**P1 — 新增 game 场景 prompt fragment**

当前 `topology-patterns.ts` 和 `entity-multiplication.ts` 没有 game-specific 的组装指引。LLM 不知道:
1. "石头剪刀布" 需要 robot_n → IF 分支 → 每个分支独立 HAND 节点
2. ASSIGN 节点必须包含比较逻辑 (user_gesture vs robot_gesture → result)
3. 结果分支应该在 ASSIGN 之后而非之前

新增 `src/agents/prompts/fragments/game-rps-pattern.ts`:
```typescript
export const GAME_RPS_PATTERN_FRAGMENT = [
  '<game-rps-pattern>',
  '石头剪刀布场景拓扑:',
  '1. CAM → YOLO-RPS (识别玩家出拳 user_gesture)',
  '2. RAM (随机 1-3 生成 robot_n)',
  '3. IF robot_n=1 → HAND(rock), IF robot_n=2 → HAND(scissors), IF robot_n=3 → HAND(paper)',
  '4. 每个 HAND 之后接 ASSIGN: 用 code 比较 user_gesture 与 robot_gesture, 输出 gameResult',
  '5. ASSIGN 后统一接 TTS + SPEAKER + SCREEN 播报结果',
  'ASSIGN.sub.gameLogic 必须包含实际比较代码, 不得为占位字符串。',
  '</game-rps-pattern>',
].join('\n');
```

**P2 — ASSIGN 代码逻辑 fragment**

当前 LLM 生成的 ASSIGN 节点只写了 `gameResult: "draw|win|lose|empty"` — 这是一个模式描述字符串而非实际代码。需要在 notes-spec 或 ASSIGN 相关 fragment 中明确:

```
ASSIGN 节点的 sub 字段：如果包含比较逻辑，sub.gameLogic 必须是可执行的 JavaScript 表达式或明确的变量赋值，
不得只写 "draw|win|lose|empty" 等枚举描述。
```

### 预期效果

- P0: safety net 重启后，即使 LLM 生成不完整的工作流，HAND 节点会被自动补全
- P1: game fragment 让 LLM 理解正确的石头剪刀布拓扑模式
- P2: ASSIGN 代码约束确保逻辑不再是占位字符串

---

## 3. ISSUE-3: 共情场景节点重复

### 现象

emo 场景中，LLM 为 ASR 和 LLM-EMO 各生成了 2 个节点：

| 节点名 | 类型 | category | 角色 |
|--------|------|----------|------|
| `set_asr_processor` | n8n-nodes-base.set | ASR | SET 占位 |
| `http_request_asr` | n8n-nodes-base.httpRequest | ASR | API 调用 |
| `set_llm_emotion` | n8n-nodes-base.set | LLM-EMO | SET 占位 |
| `http_request_llm_emotion` | n8n-nodes-base.httpRequest | LLM-EMO | API 调用 |

Ground truth 只需要 1 个节点 per capability (如 `set_asr_recognition` 一个 SET 节点即完成)。

### 根因

1. **Prompt 无 "单节点/capability" 约束** — notes-spec 告诉 LLM 每个节点需要什么字段，但没说 "一个 category 只对应一个节点（除非 entity-multiplication 显式要求分裂）"
2. **entity-multiplication 只教了分裂规则** — 告诉 LLM 何时应该增殖 (多人→多个 HAND/TTS)，但没告诉何时不该增殖
3. **LLM 理解偏差** — 将 "语音识别" 分解为 "参数设置阶段 (SET)" + "API 调用阶段 (httpRequest)"，这在传统工程里合理但在本系统中冗余

### 涉及文件

| 文件 | 关注点 |
|------|--------|
| `src/agents/prompts/fragments/notes-spec.ts` | 节点字段规范 (缺 singleton 约束) |
| `src/agents/prompts/fragments/entity-multiplication.ts` | 分裂规则 (只有正向，缺反向) |
| `src/agents/prompts/fragments/topology-patterns.ts` | 拓扑模式 |
| `src/agents/workflow-architect/scene/emotion-flow.ts` | emo safety net (可做 dedup) |

### 修复方案

**P0 — 在 notes-spec 或 topology-patterns 中增加 singleton capability 约束**

在 `src/agents/prompts/fragments/topology-patterns.ts` 末尾追加:

```typescript
// ---- singleton capability 规则 ----
'<singleton-capability-rule>',
'默认: 每个 capability ID 对应恰好 1 个节点。',
'例外: entity-multiplication 规则触发时允许分裂 (如多人场景的多个 HAND)。',
'禁止: 将同一能力拆分为 "参数设置节点" + "API 调用节点"。',
'每个硬件能力只需一个 SET 节点，在 notes.sub 中描述输入输出，',
'后续 Config 阶段负责将其替换为正确的 HTTP 调节点。',
'</singleton-capability-rule>',
```

**P1 — emotion-flow safety net 增加 dedup 逻辑**

`ensureEmotionInteractionFlow` 当前检查拓扑完整性。增加 category dedup 步骤:

```typescript
// 在 emotion-flow.ts 的 ensure 函数中
const categoryCount = new Map<string, number>();
workflow.nodes.forEach(n => {
  const cat = n.notes?.category;
  if (cat) categoryCount.set(cat, (categoryCount.get(cat) ?? 0) + 1);
});
// 移除同 category 的 httpRequest 节点 (保留 SET 节点)
categoryCount.forEach((count, cat) => {
  if (count > 1) {
    workflow.nodes = workflow.nodes.filter(n =>
      !(n.notes?.category === cat && n.type === 'n8n-nodes-base.httpRequest')
    );
  }
});
```

**P2 — 通用 category dedup 后处理**

在 `WorkflowArchitect` 的后处理管线中，增加一个通用的 category singleton 检查:
- 遍历所有节点，按 category 分组
- 如果同 category 有 >1 节点，且该 category 不在 entity-multiplication 的白名单中，发出 warning 并保留第一个
- 这是一个跨场景的安全网，不依赖特定场景 safety net

### 预期效果

- P0: LLM 级别理解 "1 capability = 1 node" 的约束，减少 80% 的重复生成
- P1: safety net 级别修复已生成的重复节点
- P2: 通用后处理兜底，防止任何场景出现 category 重复

---

## 4. 横切关注: Safety Net 分层启用策略

### 当前状态

所有 9 个 safety net 在测试中被 `AGENT_SCENE_SAFETY_NETS=none` 全局禁用。这导致 LLM 的所有质量缺陷直接暴露。

### 建议: 渐进式验证策略

**Phase A — 全部启用 (立即)**

恢复 `DEFAULT_WORKFLOW_SCENE_SAFETY_NET_FLAGS` 全部为 true (已是代码默认值)。
测试环境移除 `AGENT_SCENE_SAFETY_NETS=none`。

**Phase B — 逐个禁用验证 (完成 Issue 1-3 修复后)**

每次只禁用一个 safety net，跑三场景 E2E:

| 禁用的 net | 验证目标 | 通过条件 |
|------------|----------|----------|
| `ensureGestureIdentityFlow` | LLM 能否自主生成多人分支 | gesture 场景 node categories 与 ground truth 一致 |
| `ensureEmotionInteractionFlow` | LLM 能否自主生成完整 emo 拓扑 | emo 场景无 category 重复，IF 分支完整 |
| `ensureGameHandExecutor` | LLM 能否自主生成 HAND 执行节点 | game 场景有 3 个 HAND 节点 (rock/scissors/paper) |
| `ensureHandHasAssign` | LLM 能否自主连接 HAND → ASSIGN | ASSIGN 包含实际比较逻辑 |
| `ensureResultBranches` | LLM 能否自主生成结果输出分支 | 结果播报链完整 |
| `pruneGestureRedundantTtsNodes` | LLM 能否避免冗余 TTS | gesture 场景无连续 TTS 节点 |
| `ensureIfDirectExecutorConnections` | LLM 能否正确连接 IF → executor | 无中间 SET relay 节点 |
| `pruneSpeakerRelayNodes` | LLM 能否避免冗余 SPEAKER relay | 无多余 SPEAKER 中继 |
| `ensureSpeakerHasTts` | LLM 能否保证 SPEAKER 前有 TTS | 每个 SPEAKER 前恰好有 1 个 TTS |

**Phase C — 稳态**

通过 Phase B 的 safety net 可以安全禁用。未通过的保持启用，并且记录为 "当前 LLM 仍需辅助" 的能力清单。

---

## 5. 优化优先级与执行顺序

| 优先级 | 任务 | 影响面 | 预计改动 |
|--------|------|--------|----------|
| **P0-1** | 恢复 safety net 默认启用 | 全场景 | 移除测试环境变量 |
| **P0-2** | Prompt 强化 suggested_user_actions | 澄清交互 UX | reflection-prompt-builder.ts |
| **P0-3** | Singleton capability 约束 | 节点去重 | topology-patterns.ts |
| **P1-1** | limitClarificationOptions 跨 category 合并 | 澄清兜底 | response-builder.ts |
| **P1-2** | Game RPS pattern fragment | game 场景结构 | 新增 game-rps-pattern.ts + 注册 |
| **P1-3** | emotion-flow dedup 增强 | emo 场景去重 | emotion-flow.ts |
| **P2-1** | ASSIGN 代码逻辑约束 | game 逻辑完整性 | notes-spec.ts 或新 fragment |
| **P2-2** | 通用 category dedup 后处理 | 全场景兜底 | workflow-architect 后处理 |
| **P2-3** | interaction 单选项兜底 | 极端 edge case | response-builder.ts |

### 执行依赖图

```
P0-1 (safety net) ──────────────────────┐
P0-2 (prompt 强化) ─── P1-1 (跨 cat 合并) ── P2-3 (单选项兜底)
P0-3 (singleton) ───── P1-3 (emo dedup) ──── P2-2 (通用 dedup)
                   └── P1-2 (game fragment) ── P2-1 (ASSIGN 约束)
```

P0 无依赖可并行执行。P1 依赖对应 P0 完成后验证。P2 是兜底层，最后实施。

---

## 6. Gesture 场景评价 (正面基线)

gesture 场景是唯一没有问题的:
- discovery 命中 6 个能力，直接 `direct_accept`，confidence 0.97
- 11 个节点，categories: BASE, CAM, FACE-NET, HAND, TTS, SPEAKER
- 无澄清需求，一轮直达 `workflow_ready`
- 体现了 Refactor-5 上下文工程的设计目标: 明确需求 + 充足 prompt 约束 = LLM 一次生成正确结构

这证明当需求足够明确时，系统已能正确工作。问题集中在模糊需求的澄清链路和特定场景的 prompt 覆盖。

---

## 7. 验收标准

当以下条件全部满足时，本轮优化视为完成:

1. [ ] 三场景 E2E 测试，safety net 全部启用 → 三场景均 workflow_ready
2. [ ] emo + game 的首轮澄清不再回退为「问题模式」，interaction 对象非 undefined
3. [ ] emo 场景生成的节点无同 category 重复 (每个 category 恰好 1 个节点)
4. [ ] game 场景包含至少 3 个 HAND 节点 (rock/scissors/paper)
5. [ ] game 场景 ASSIGN 节点的 sub 包含实际比较逻辑而非枚举字符串
6. [ ] 单独禁用 Phase B 中每个 safety net，验证退步程度并记录
7. [ ] 所有修改通过 `npm run typecheck` 和 `npm test`

[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
