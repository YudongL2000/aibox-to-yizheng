# 工作流质量稳定化执行文档

> 基于 SafetyNet 对照矩阵 (096d63f) 的架构反思与下一步执行方案

---

## 0. 架构现状诊断

### 0.1 SafetyNet 对照矩阵结论

46/46 测试通过。9 条 safety net 按场景逐条关闭做对照，结论如下：

| 场景 | 仍依赖的 Safety Net | 可考虑退役的 Safety Net |
|------|---------------------|------------------------|
| gesture | `ensureGestureIdentityFlow`, `ensureSpeakerHasTts` | `pruneGestureRedundantTtsNodes`, `pruneSpeakerRelayNodes` |
| emo | `ensureEmotionInteractionFlow` | — |
| game | `ensureGameHandExecutor`, `ensureResultBranches`, `ensureIfDirectExecutorConnections`, `ensureHandHasAssign` | — |

**7/9 仍需保留，2/9 可候选退役**（音频修剪类）。

### 0.2 本质矛盾

系统声称 AI-native——LLM 应从上下文自主生成正确工作流。但 7 个 safety net 仍在做重量级拓扑改写，说明 prompt fragment 层的上下文密度远未达到让 LLM 自主闭环的水平。

逐个分析 7 个 net 的失败模式可以揭示真正的缺口：

| Safety Net | 分类 | LLM 缺什么 |
|-----------|------|-----------|
| `ensureGestureIdentityFlow` | 拓扑构建 | 不知道需要为每个人物生成独立 FACE-NET 节点（N 人 = N 个 FACE-NET 串联），也不会把 FACE-NET 链尾 fan-out 到 N 个 IF 分支并按 entity 复制整条执行链 |
| `ensureSpeakerHasTts` | 配对修复 | 偶尔漏掉 TTS→SPEAKER 的固定配对——但 prompt 已有此约束，说明 LLM 在节点多时丢失注意力 |
| `ensureEmotionInteractionFlow` | **完整替换** | 整个 emo 工作流被 16 节点硬编码模板替换。LLM 生成的 emo 拓扑与 ground truth 差距过大 |
| `ensureGameHandExecutor` | 节点补全 | 不会把 ASSIGN 的手势参数分裂成独立 HAND 节点 |
| `ensureResultBranches` | 链路补全 | 不会为 empty/draw/win/lose 各建独立 SCREEN→TTS→SPEAKER 链 |
| `ensureIfDirectExecutorConnections` | 桥接清理 | 生成 IF→SET→HAND 三段式，而非 IF→HAND 直连 |
| `ensureHandHasAssign` | 依赖补全 | HAND 后缺 ASSIGN 节点 |

### 0.3 三层深度分析

**现象层**：7 个 safety net 仍不可退役。

**本质层**：

Safety net 可按其与 LLM 生成之间的关系分为三个梯队：

| 梯队 | 定义 | 成员 | 可削减性 |
|------|------|------|----------|
| **T1 - 模板替换** | 完全抛弃 LLM 输出，用硬编码拓扑覆写 | `ensureEmotionInteractionFlow` | 必须分解，否则 emo 场景永远不是 AI-native |
| **T2 - 结构补全** | 在 LLM 输出基础上添加缺失节点/边 | `ensureGestureIdentityFlow`, `ensureGameHandExecutor`, `ensureResultBranches`, `ensureHandHasAssign` | 可通过增强 prompt 逐步削减 |
| **T3 - 卫生清理** | 修剪冗余/修复漏配对 | `ensureSpeakerHasTts`, `ensureIfDirectExecutorConnections`, `pruneGestureRedundantTtsNodes`, `pruneSpeakerRelayNodes` | 低风险长期保留作为防御层 |

**哲学层**：

T1 是系统的设计原罪——把 safety net 从"防护网"变成了"模板注入器"，彻底绕过了 LLM 的生成路径。这使得 emo 场景的 prompt fragment 永远得不到真实 LLM 输出的反馈来迭代改进，形成恶性循环：**越依赖替换 → prompt 越不被验证 → LLM 输出越差 → 越依赖替换**。

T2 是当前最有价值的优化目标——LLM 已经产出了拓扑骨架，只是缺少特定节点或边。通过增强 fragment，让 LLM 补上这些缺失，是投入产出比最高的方向。

T3 是防御性代码——即使 LLM 完美，保留 TTS→SPEAKER 配对检查和冗余修剪也没有害处。这些可以长期保留为质量兜底层。

---

## 1. 执行策略: 分层质量稳定化

### 总体目标

建立一个三层质量保障体系，使工作流输出在保持 AI-native 特性的前提下达到稳定可交付状态：

```
Layer 1: Prompt Engineering (上下文层)
         → 让 LLM 直接生成正确拓扑
Layer 2: Safety Net (结构后处理层)
         → 补全 LLM 遗漏的节点/边
Layer 3: Validation Loop (验证反馈层)
         → 结构校验 + autofix + 迭代重生成
```

当前现实: Layer 1 覆盖不足，Layer 2 承担过重（含一个 T1 模板替换），Layer 3 正常运转。

目标终态: Layer 1 承担 >80% 的质量保障；Layer 2 退化为 T3 卫生清理 + 少量 T2 补全；Layer 3 不变。

---

## 2. Phase 1: 瓦解 T1 — 解构 emotion-flow 模板替换

### 问题本质

`ensureEmotionInteractionFlow` 是唯一的 T1 safety net，它用 16 个硬编码节点完整替换 LLM 生成的 emo 工作流。这意味着：
- LLM 对 emo 场景的生成能力从未被真正训练/验证
- 任何 emo prompt fragment 的改进效果都被模板覆盖吞噬
- emo 场景的 ground truth 得分反映的是模板质量，而非 LLM 质量

### 执行步骤

**P1-1. 新增 emo 场景专用 prompt fragment**

创建 `src/agents/prompts/fragments/emotion-interaction-pattern.ts`:

```
# 共情场景拓扑

当需求涉及"共情""情绪回应""情绪识别+反馈"时：
1. 触发: schedule_trigger (周期采集) 或用户主动触发
2. 感知链: CAM (视觉) + MIC (音频) 并行采集
   - CAM → YOLO (表情识别)
   - MIC → ASR (语音转文本)
3. 判断: LLM-EMO (情绪分类)，输入为 ASR 文本 + YOLO 视觉标签
   - LLM-EMO 输出 emotionText ∈ {happy, sad, angry, neutral}
4. 分支: 按 emotionText 做 IF 分支
   - if_emotion_is_happy → [SCREEN(Happy), TTS("共情话术"), HAND(Waving)]
   - if_emotion_is_sad → [SCREEN(Sad), TTS("安慰话术"), HAND(Put_down)]
   - 可扩展 angry / neutral 分支
5. 输出: 每个 IF true 分支内 TTS→SPEAKER 配对播放

关键约束:
- ASR 和 LLM-EMO 各只需一个节点 (单能力单节点)
- 每个情绪分支的 SCREEN/HAND/TTS/SPEAKER 独立，不共享
- MIC → ASR → LLM-EMO 是线性链，不要在中间插入多余的 SET/HTTP
```

注册到 `architect-system.ts` 的 `buildArchitectFragments` 中。

**P1-2. 将 emotion-flow.ts 从 T1 降级为 T2**

当前 `ensureEmotionInteractionFlow` 直接 replace 整个 workflow。重构为：
- 保留场景检测逻辑 (`isEmotionScene`)
- 移除完整替换逻辑 (即 `buildRequiredSpecs` + 覆写 `workflow.nodes` + 覆写 `workflow.connections`)
- 改为增量补全:
  - 检查 LLM 输出中是否缺少 if_emotion_* 分支 → 缺则补
  - 检查每个情绪分支是否有 SCREEN + TTS + SPEAKER + HAND → 缺则补
  - 检查 ASR/LLM-EMO 是否有多个同 category 节点 → 有则 dedup
  - 保留 connection 修复（确保 LLM-EMO → IF 分支的 fan-out 存在）

**P1-3. 新增"无 safety net" emo 对照测试**

在 `safety-net-matrix.test.ts` 中增加一组新对照：
- 使用 P1-1 的新 fragment 作为 prompt 输入
- safety net `ensureEmotionInteractionFlow` OFF
- 对比 ground truth 得分 — 目标: node coverage ≥ 70%

如果新 fragment 使 LLM 的 emo 输出 coverage 达到 70%+，则 T2 版的 emotion-flow 只需补全剩余 30%；如果仍低于 50%，说明 fragment 不够，需要增加 few-shot example。

### 验收标准

- [ ] emo fragment 已注册且 prompt token 增量 < 500
- [ ] `ensureEmotionInteractionFlow` 从完整替换改为增量补全
- [ ] OFF 状态下 emo ground truth node coverage ≥ 70%
- [ ] ON 状态下 emo ground truth node coverage ≥ 95% (当前基线)
- [ ] 46 条矩阵测试 + 新增对照全部通过

---

## 3. Phase 2: 削减 T2 — 增强 prompt 减少结构补全

目标: 让 LLM 直接生成 T2 safety net 所补全的节点，使 T2 net 从"必需"降为"保险"。

### P2-1. gesture 场景: ensureGestureIdentityFlow 削减

**Ground Truth**: `gesture_0315.json` (12 节点)

**当前缺口**: LLM 存在两个层面的盲区:
1. 不知道需要为每个人物生成独立的 FACE-NET 节点（N 人 = N 个 `set_face_net_*` 节点）
2. 不知道如何把 FACE-NET 串联链的尾节点 fan-out 到 N 个 IF 分支

**方案**: 增强 `entity-multiplication.ts` fragment，增加 FACE-NET N 主体识别 + IF 路由的完整模式:

```
## 身份路由详细模式（多主体视觉识别）

当 entity 类型为人物且使用 FACE-NET 识别时：

核心规则: N 个主体 → N 个 FACE-NET 节点 → N 个 IF 节点。
每个 FACE-NET 节点代表一个独立的人脸识别任务，让用户为每个人逐个上传人脸图片。

1. 为每个人物创建独立 FACE-NET 检测节点:
   - set_face_net_{person_alias}
   - notes.sub.face_info = "{person_alias}" (供前端展示和人脸上传)
   - notes.sub.face_url = "用户上传的人脸图片地址"
   - notes.sub.facenet_input = "camera1"
   - notes.sub.facenet_output = "facenet_output"
2. FACE-NET 节点按人物顺序线性串联:
   CAM → face_A → face_B → ... → face_N
3. 最后一个 FACE-NET 节点 fan-out 到所有 IF 节点:
   face_N → [if_identity_is_A, if_identity_is_B, ...]
4. 每个 IF true 分支接该人物专属的执行链 (HAND + TTS → SPEAKER)

示例 (2 人: 老刘, 老付):
schedule → CAM → set_face_net_liu → set_face_net_fu
                                         ↓
                              [if_identity_is_liu, if_identity_is_fu]
                                    ↓                    ↓
                              [code_hand_liu,       [code_hand_fu,
                               set_tts_liu →         set_tts_fu →
                               code_speaker_liu]     code_speaker_fu]

总计: 1(trigger) + 1(CAM) + 2(FACE-NET) + 2(IF) + 2×3(HAND+TTS+SPEAKER) = 12 节点
```

**验证**: 禁用 `ensureGestureIdentityFlow` 后重跑 gesture 对照 → 目标 node coverage ≥ 80%。

### P2-2. game 场景: 四项 T2 net 联合削减

game 场景同时依赖 4 个 T2 net，根因是 LLM 缺少"手势分裂 + ASSIGN 比较 + 结果分支独立"的完整范式。

**方案**: 增强 `game-rps-pattern.ts`，把 4 个 net 的补全逻辑用自然语言写进 fragment:

```
## 石头剪刀布完整节点清单

一个正确的 RPS 工作流应包含 ≥20 个节点:

触发: schedule_trigger_5s
感知: http_request_camera_snapshot (CAM)
识别: set_yolov8_gesture (YOLO-RPS) → 输出 userGesture
随机: set_generate_random_n (RAM) → 输出 robot_n ∈ {1,2,3}

手势分裂 (3 个 IF → 3 个 HAND → 3 个 ASSIGN):
  if_robot_n_eq_1 → code_hand_execute_rock → set_assign_for_hand_rock
  if_robot_n_eq_2 → code_hand_execute_scissors → set_assign_for_hand_scissors
  if_robot_n_eq_3 → code_hand_execute_paper → set_assign_for_hand_paper
  注意: IF 直连 HAND，中间不要插入 SET bridge 节点。
  ASSIGN 的 notes.sub 必须包含 robotGesture 和 gameLogic (实际比较代码)。

结果分支 (4 个独立链):
  if_result_empty → code_screen_execute_emoji_empty → set_tts_text_empty → code_speaker_play_empty
  if_result_draw  → code_screen_execute_emoji_draw  → set_tts_text_draw  → code_speaker_play_draw
  if_result_win   → code_screen_execute_emoji_win   → set_tts_text_win   → code_speaker_play_win
  if_result_lose  → code_screen_execute_emoji_lose   → set_tts_text_lose  → code_speaker_play_lose
  每个结果必须有独立的 SCREEN、TTS、SPEAKER，不共享。
```

**验证**: 逐个禁用 4 个 game safety net，检查 LLM 输出:
- 禁用 `ensureGameHandExecutor` → 是否有 3 个 HAND 节点
- 禁用 `ensureHandHasAssign` → HAND 后是否有 ASSIGN
- 禁用 `ensureResultBranches` → 是否有 4 条独立结果链
- 禁用 `ensureIfDirectExecutorConnections` → IF 是否直连 HAND (无 bridge)

### P2-3. 跨场景: ensureSpeakerHasTts 削减

**当前缺口**: LLM 在节点多时偶尔漏掉 TTS→SPEAKER 配对。

**方案**: 在 `topology-patterns.ts` 的"反应链路"段落中增加显式计数约束:

```
## 反应链路计数
生成完工作流后，自检: SPEAKER 节点数量必须 ≤ TTS 节点数量。
每个 SPEAKER 必须恰好有一个 TTS 上游。
如果发现 SPEAKER 没有 TTS 前驱，说明遗漏了 TTS 节点。
```

**验证**: 禁用 `ensureSpeakerHasTts` 跑 gesture + game → 目标: 不影响 coverage。

### Phase 2 验收标准

- [ ] gesture: 禁用 `ensureGestureIdentityFlow` 后 node coverage ≥ 80%
- [ ] game: 逐个禁用 4 个 net，每个的 coverage 退步 ≤ 15%
- [ ] 全场景: 禁用 `ensureSpeakerHasTts` 后无 SPEAKER 缺 TTS 问题
- [ ] 所有修改通过 typecheck + 矩阵测试

---

## 4. Phase 3: 质量回归自动化 — CI 质量门

### 问题

当前 ground truth 评估和 safety net 对照只在手动开发时运行。没有 CI 层面的质量门阻止 prompt/fragment 改动导致工作流质量回退。

### 执行步骤

**P3-1. 质量得分基线固化**

在 `tests/integration/agents/` 中创建 `quality-baseline.ts`:

```typescript
export const QUALITY_BASELINES = {
  gesture: {
    minNodeCoverage: 0.90,
    minCategoryCoverage: 0.95,
    minNodeCount: 12, // gesture_0315: N人=N个FACE-NET
    requiredCategories: ['BASE', 'CAM', 'FACE-NET', 'HAND', 'TTS', 'SPEAKER'],
  },
  emo: {
    minNodeCoverage: 0.85,
    minCategoryCoverage: 0.90,
    requiredCategories: ['BASE', 'CAM', 'MIC', 'ASR', 'LLM-EMO', 'SCREEN', 'HAND', 'TTS', 'SPEAKER'],
  },
  game: {
    minNodeCoverage: 0.70,
    minCategoryCoverage: 0.80,
    requiredCategories: ['BASE', 'CAM', 'YOLO-RPS', 'RAM', 'ASSIGN', 'HAND', 'SCREEN', 'TTS', 'SPEAKER'],
  },
};
```

**P3-2. 回归测试: 全 net 启用下的质量门**

`tests/integration/agents/quality-gate.test.ts`:
- 对每个场景，用 fixture workflow + 全部 safety net ON → normalize → evaluate against ground truth
- 断言 node coverage ≥ baseline，category coverage ≥ baseline，requiredCategories 全命中
- 任何 fragment/safety-net 改动导致 coverage 下降 → 红灯

**P3-3. 回归测试: 安全网退步幅度门**

对每个 safety net，记录"开启 vs 禁用"的 coverage 差值:
- 如果某个 net 的差值从 >15% 降到 <5%，说明 prompt 改进生效，该 net 趋近可退役
- 在 CI 中跟踪此差值，作为 prompt engineering 的量化反馈

### Phase 3 验收标准

- [ ] `quality-baseline.ts` 定义三场景基线
- [ ] `quality-gate.test.ts` 全 net 启用下质量门测试
- [ ] 矩阵测试输出 coverage 差值 → 可追踪的退步幅度指标
- [ ] 集成到 CI 跑通

---

## 5. Phase 4: T3 卫生清理层稳态化

### 目标

将 2 个已可候选退役的音频修剪 net + `ensureSpeakerHasTts` + `ensureIfDirectExecutorConnections` 确认为"长期保留的最小防御集"或正式退役。

### 执行步骤

**P4-1. 候选退役验证**

对 `pruneGestureRedundantTtsNodes` 和 `pruneSpeakerRelayNodes`:
- 矩阵测试已验证禁用后 coverage 无明显退步
- 但需要在 **真实 LLM E2E 测试**（非 fixture）中确认 LLM 不会生成 TTS→TTS 或 SPEAKER→SPEAKER 链
- 如果 E2E 确认不生成 → 标记为"dormant"（代码保留，默认禁用）
- 如果 E2E 偶发生成 → 保持启用

**P4-2. dormant 机制**

在 `safety-net-controls.ts` 中引入第三态:

```typescript
type SafetyNetState = 'enabled' | 'disabled' | 'dormant';
```

- `enabled`: 每次 normalize 都执行
- `dormant`: 执行但不改写，仅在检测到本该修改时发 warning log
- `disabled`: 完全跳过

dormant 状态让退役的 net 成为"观测哨"——记录 LLM 是否仍会犯该错误，但不干预输出。积累足够 dormant-no-fire 日志后，可安全 disable。

### Phase 4 验收标准

- [ ] dormant 机制可选实现 (如认为过度工程，跳过此步)
- [ ] 2 个音频修剪 net 在 E2E 中确认退役安全性
- [ ] 最小防御集确定并文档化

---

## 6. 执行顺序与依赖关系

```
Phase 1 (瓦解 T1)
  P1-1 emo fragment ←── 无依赖
  P1-2 emotion-flow T2 降级 ←── 依赖 P1-1
  P1-3 emo 无 net 对照 ←── 依赖 P1-1 + P1-2

Phase 2 (削减 T2) ←── 依赖 Phase 1 完成
  P2-1 gesture identity fragment 增强 ←── 无依赖
  P2-2 game fragment 增强 ←── 无依赖
  P2-3 speaker-has-tts prompt 增强 ←── 无依赖
  (P2-1/P2-2/P2-3 可并行)

Phase 3 (CI 质量门) ←── 依赖 Phase 1 + Phase 2 的基线数据
  P3-1 基线固化 ←── 无依赖
  P3-2 质量门测试 ←── 依赖 P3-1
  P3-3 退步幅度门 ←── 依赖 P3-2

Phase 4 (T3 稳态) ←── 依赖 Phase 2 + Phase 3
  P4-1 退役验证 ←── 依赖 Phase 3 基线
  P4-2 dormant 机制 ←── 可选
```

Phase 1 是最高优先级——它解除 emo 场景对模板的锁定，释放 prompt engineering 的反馈回路。
Phase 2 是主要工作量——逐场景增强 fragment，削减 T2 依赖。
Phase 3 是稳定性保障——自动化防止回退。
Phase 4 是收尾清理——确认最终的 net 保留/退役决策。

---

## 7. 目标终态

### Safety Net 终态预期

| Safety Net | 当前梯队 | 目标梯队 | 终态 |
|-----------|---------|---------|------|
| `ensureEmotionInteractionFlow` | T1 (模板替换) | T2 (增量补全) | 启用，但只补缺 |
| `ensureGestureIdentityFlow` | T2 (结构补全) | T3 或退役 | dormant 或 启用 |
| `ensureGameHandExecutor` | T2 | T2 或 T3 | 启用，幅度降低 |
| `ensureResultBranches` | T2 | T2 或 T3 | 启用，幅度降低 |
| `ensureHandHasAssign` | T2 | T3 或退役 | dormant |
| `ensureIfDirectExecutorConnections` | T3 (卫生清理) | T3 | 启用 |
| `ensureSpeakerHasTts` | T3 | T3 | 启用 |
| `pruneGestureRedundantTtsNodes` | T3 | dormant | dormant |
| `pruneSpeakerRelayNodes` | T3 | dormant | dormant |

### 质量得分终态目标

| 场景 | 全 net ON coverage | 全 net OFF coverage | 差值 (越小越好) |
|------|-------------------|---------------------|-----------------|
| gesture | ≥ 95% | ≥ 80% | ≤ 15% |
| emo | ≥ 95% | ≥ 70% | ≤ 25% |
| game | ≥ 85% | ≥ 55% | ≤ 30% |

当 OFF coverage 接近 ON coverage 时，说明 prompt layer 已经承担了大部分质量保障，safety net 趋近透明。

### Prompt Fragment 终态

| Fragment | 当前状态 | 目标状态 |
|----------|---------|---------|
| `topology-patterns.ts` | 通用拓扑规则 | + TTS 计数自检 |
| `entity-multiplication.ts` | N 实体 → N IF | + N 主体 → N FACE-NET 串联 + fan-out 路由模式 |
| `notes-spec.ts` | notes.sub 字段规范 | 不变 |
| `game-rps-pattern.ts` | RPS 基础拓扑 | + 完整节点清单 + 结果分支独立规则 |
| `naming-conventions.ts` | 命名前缀规则 | 不变 |
| **NEW** `emotion-interaction-pattern.ts` | — | emo 专用拓扑 + 单能力约束 + 情绪分支模式 |

---

## 8. 验收标准

当以下条件全部满足时，工作流质量稳定化视为完成:

1. [ ] `ensureEmotionInteractionFlow` 从 T1 降级为 T2 (不再完整替换工作流)
2. [ ] 新增 `emotion-interaction-pattern.ts` fragment
3. [ ] emo 场景 OFF coverage ≥ 70%
4. [ ] gesture 场景 OFF coverage ≥ 80%
5. [ ] game fragment 增强后，逐个禁用 4 net 的 coverage 退步 ≤ 15%
6. [ ] 质量门测试写入 CI，防止 fragment 改动导致 coverage 回退
7. [ ] 46+ 条矩阵测试全绿
8. [ ] typecheck + unit test 全绿

[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
