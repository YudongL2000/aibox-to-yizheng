# Refactor-5: AI-Native Workflow Composition

> 基于 Refactor-4 后首次端到端测试（2026-03-13 gesture 场景）及三场景 ground truth 对比分析
> 核心论点：**让 LLM 拥有足够的上下文来独立生成正确工作流，而非用模板替代 LLM 思考**

---

## 设计原则

**AI-native 铁律：** 场景 ground truth（`docs/development/scene/*/`）只用于**验证**工作流质量，绝不作为运行时输入注入生成管线。任何将场景模板硬编码为代码的方案都是取巧，都违反了 Refactor-2/3/4 一路坚持的 AI-native 架构原则。

正确的路径是：**修复 LLM 看到的上下文**，让模型自己能生成正确结构，而非绕过模型用模板拼装。

---

## 一、问题诊断

### 1.1 测试对比

**用户输入：** `见到老刘机器人竖个中指骂人，见到老付机器人比个V打招呼`

**目标工作流**（gesture_0315.json）— 12 个节点：

```
scheduleTrigger ─→ httpRequest(CAM) ─→ set(FACE-NET:liu) ─→ set(FACE-NET:fu)
                                                                    ├─→ if(liu) ─→ [code(HAND:中指), set(TTS:"滚") → code(SPEAKER)]
                                                                    └─→ if(fu)  ─→ [code(HAND:V),    set(TTS:"你长得好帅") → code(SPEAKER)]
```

**实际输出**（log）— 5 个节点：

```
webhook ─→ httpRequest(CAM) ─→ set(FACE-NET) ─→ if(单 IF) ─→ code(HAND:中指)
```

### 1.2 差距量化

| 维度 | 目标 | 实际 | 差距 |
|------|------|------|------|
| 节点数 | 11 | 5 | 缺失 55% |
| 人物分支 | 2（老刘 + 老付） | 1（只有老刘） | 缺失 1 人 |
| TTS + Speaker 节点 | 4 | 0 | 完全缺失 |
| IF 节点 | 2（并行 fan-out） | 1（串行） | 拓扑错误 |
| notes 完整率 | 100% | ~40% | device_ID/topology/extra 空 |
| 触发器类型 | scheduleTrigger | webhook | 类型错误 |
| 连接拓扑 | fan-out + parallel | 线性链 | 结构错误 |

### 1.3 根因分析：LLM 的上下文缺陷

问题不在循环机制（Refactor-4 已解决），不在能力发现（LLM 正确识别了双人双动作），而在 **LLM 生成工作流时看到的上下文不足以产出正确结构**。逐层诊断：

**缺陷 1: ComponentComposer 在 LLM 之前截断了语义**

Orchestrator 的 confirm 路径走的是 `ComponentComposer.compose()` → 纯规则驱动：
- 能力列表 `[camera, face_net, conditional_branch, gesture_execute]` 是扁平的
- `capabilitiesToNodes()` 对每个能力生成恰好一个节点（1:1）
- `buildTopology()` 按 stage 排序后串联（线性链）
- 没有 LLM 参与拓扑决策

结果：5 个节点的线性链。LLM 的理解（双人分支、并行执行）在 Orchestrator 的 discovery 阶段被正确捕获，但 **ComponentComposer 无法利用这些语义**。

**缺陷 2: WorkflowArchitect 路径的上下文信号太弱**

如果走 WorkflowArchitect（LLM 驱动）路径，LLM 的系统 prompt 存在以下信号缺失：

| LLM 需要知道的 | 当前状态 | 影响 |
|---------------|---------|------|
| 实体绑定关系（老刘→中指、老付→V） | discovery 输出了 entities 但未传给 architect | 模型不知道要做双分支 |
| 同一能力需实例化多次 | 无显式规则 | 只生成 1 个 HAND 节点 |
| fan-out 拓扑模式 | 规则只说"左→右"串联 | 产出线性链 |
| notes.sub 的完整键名与合法值 | 无 | device_ID/topology 为 null |
| 触发器选择逻辑 | "定时→schedule / 外部事件→webhook"，但无场景偏好 | 错选 webhook |
| 每种 category 的反应链路 | 无（TTS→SPEAKER 是一组，不是孤立节点） | TTS/SPEAKER 被完全跳过 |

**缺陷 3: 蓝图（blueprint）信号丢失**

Reflection 阶段返回的 `supported_capability_ids` 包含 4 个能力，但**未包含实体信息和拓扑提示**。当 blueprint 传给 WorkflowArchitect 的 user message 时，只有组件列表，没有"两个人、两组动作、并行分支"的拓扑指引。

### 1.4 本质诊断

```
LLM 有能力理解 "见到老刘竖中指、见到老付比V" 需要双分支。
LLM 有能力生成 fan-out 拓扑。
LLM 有能力填充 notes.sub。

但 LLM 没被给到足够的上下文来做这些事。
```

问题不是模型能力不足，而是**上下文工程的失败**——与 Refactor-4 文章（Harness Engineering）的核心论点完全一致：脚手架决定性能。

---

## 二、三场景 Ground Truth 分析

### 2.1 场景概览

| 场景 | 节点数 | 连接数 | 涉及 category | 结构特征 |
|------|--------|--------|---------------|---------|
| **gesture**（手势识别） | 11 | 7 | BASE×3, CAM×1, FACE-NET×1, HAND×2, TTS×2, SPEAKER×2 | 人脸识别 → 双人 fan-out → 每分支并行 HAND + TTS→SPEAKER |
| **game**（石头剪刀布） | 35 | 31 | BASE×12, TTS×5, SPEAKER×5, RAM×1, HAND×3, CAM×1, YOLO-RPS×1, SCREEN×4, ASSIGN×3 | 倒计时 → 随机出拳 → 3路分拣 → 拍照识别 → 7路胜负裁判 → 每路 SCREEN+TTS→SPEAKER |
| **emo**（情绪共情） | 16 | 10 | BASE×3, CAM×1, YOLO-HAND×1, MIC×1, ASR×1, LLM-EMO×1, TTS×2, SCREEN×2, HAND×2, SPEAKER×2 | 双感知（视觉+听觉）→ AI 情绪分类 → 双情绪 fan-out → 每分支并行 SCREEN+HAND+TTS→SPEAKER |

### 2.2 场景间的共性模式

**模式 1: 条件分支乘法**
- gesture: 2 人 × (IF + HAND + TTS + SPEAKER) = 8 个分支节点
- game: 3 出拳 × IF = 3 分拣 + 7 胜负 × (SCREEN + TTS + SPEAKER) = 复杂树
- emo: 2 情绪 × (IF + SCREEN + HAND + TTS + SPEAKER) = 10 个分支节点

所有场景都有**实体/条件驱动的节点乘法**。一个抽象能力（手势执行）需要按具体条件（老刘/老付、石头/剪刀/布、开心/难过）实例化多次。

**模式 2: 反应链路**
- TTS → SPEAKER 始终成对出现
- IF → [并行执行器组] 是通用模式
- 每个条件分支的执行器组合是固定的（IF → HAND + TTS→SPEAKER 或 IF → SCREEN + HAND + TTS→SPEAKER）

**模式 3: notes.sub 的变量流**
- 上游输出变量名（如 `camera1`、`facenet_output`、`audio_liu`）被下游 notes.sub 引用
- 变量名是工作流内部的数据契约，不是随机字符串

### 2.3 各场景能力边界评估

#### gesture 场景（11 节点）

**当前能力可 cover 的部分：**
- ✅ capability 发现：camera, face_net, conditional_branch, gesture_execute 全部正确识别
- ✅ 实体提取：LLM 正确识别了"老刘"和"老付"
- ✅ 核心节点类型：httpRequest, set, if, code 都在白名单内

**当前能力无法 cover 的部分：**
- ❌ 实体→分支乘法：1 个 gesture_execute → 2 个 HAND 节点（绑定不同手势）
- ❌ TTS/SPEAKER 反应链路：用户说"骂人"→ LLM 应推断 TTS+SPEAKER，但能力发现未映射
- ❌ fan-out 拓扑：face_net → [if_liu, if_fu] 并行
- ❌ notes 完整填充

**修复路径：** 增强 discovery 的实体提取 + 增强 architect prompt 的拓扑/notes 规则 + **去掉 ComponentComposer 中间层，让 LLM 直接生成工作流**。

#### game 场景（35 节点）

**当前能力可 cover 的部分：**
- ✅ RAM（随机数）、YOLO-RPS、CAM、HAND、SCREEN、TTS、SPEAKER 全部有 capability 定义
- ✅ ASSIGN 有 capability 定义

**当前能力无法 cover 的部分：**
- ❌ 35 节点的复杂拓扑：3 路出拳分拣 + 7 路胜负裁判 = 需要 LLM 理解石头剪刀布的游戏规则并展开全部分支
- ❌ 时序逻辑：倒计时(TTS→SPEAKER) → 出拳(RAM→3×IF→3×HAND) → 拍照(CAM→YOLO) → 裁判(7×IF→7×执行器组) 是严格的时序链
- ❌ 变量桥接：RAM 输出 `n` → IF 比较 `n==1` → ASSIGN 写入 `robotGesture=rock` → 后续裁判 IF 比较 `robotGesture` 与 `userGesture`

**修复路径：** game 是最复杂的场景。35 个节点即使对人类也很难一次写对。可能需要：
- LLM 多轮生成（先主干、再分支展开）
- 或接受 game 场景的质量需要更多验证轮次来收敛
- architect prompt 需要更强的游戏逻辑推理上下文

**评估：** game 场景是能力边界场景。首轮生成可能只覆盖 60-70% 节点，需要 AgentLoop 验证反馈来收敛。这是可接受的——AI-native 不要求一次完美，要求的是模型在闭环中自我修正。

#### emo 场景（16 节点）

**当前能力可 cover 的部分：**
- ✅ 双感知路径：CAM + MIC 都有 capability
- ✅ 处理链路：YOLO-HAND, ASR, LLM-EMO 都有定义
- ✅ 情绪分支 + 执行器组

**当前能力无法 cover 的部分：**
- ❌ 双感知合流：CAM→YOLO-HAND 和 MIC→ASR→LLM-EMO 是两条并行链路，最终合流到情绪 IF
- ❌ LLM-EMO 的 system_prompt 参数需要写在 notes.sub 中
- ❌ 情绪→执行器映射：happy→Waving+Happy表情、sad→Put_down+Sad表情

**修复路径：** 与 gesture 类似但更复杂。关键是让 LLM 理解"多感知合流→条件分支→并行执行器组"的模式。

**评估：** 当前架构在上下文增强后应能 cover。复杂度介于 gesture 和 game 之间。

### 2.4 能力边界矩阵

| 能力 | gesture | game | emo | 当前状态 |
|------|---------|------|-----|---------|
| 能力发现 | ✅ | ✅ | ✅ | 已可用 |
| 实体提取 | ⚠️ 可识别但未传递 | ⚠️ 规则驱动 | ⚠️ 可识别但未传递 | 需增强 |
| 线性拓扑 | ✅ | ✅ | ✅ | 已可用 |
| fan-out 拓扑 | ❌ | ❌ | ❌ | 需增强 |
| 反应链路（TTS→SPEAKER） | ❌ | ❌ | ❌ | 需增强 |
| notes.sub 完整填充 | ❌ | ❌ | ❌ | 需增强 |
| 条件分支乘法 | ❌ | ❌ | ❌ | 需增强 |
| 变量流传递 | ❌ | ❌ | ❌ | 需增强 |
| 首轮覆盖率预期 | > 90% | 60-70% | > 85% | - |

---

## 三、解决方案：上下文工程 + 管线重构

### 3.1 核心思路

```
不是给 LLM 一个模板让它填空。
是给 LLM 足够的知识让它自己画出正确的图。

ground truth（scene JSON）是考试答案，不是课本。
```

**改什么：**
1. 修复 discovery → composition 的语义传递（实体、拓扑提示）
2. 增强 architect system prompt（反应链路、fan-out 模式、notes 规范）
3. 移除 ComponentComposer 的纯规则路径，统一走 LLM 生成
4. 拆分 workflow-architect.ts（4085 行）

**不改什么：**
- AgentLoop 验证闭环（Refactor-4 产物，保留）
- CapabilityRegistry / hardware-components 定义（已足够）
- MCP 工具层（Refactor-4 已精简）

### 3.2 管线重构设计

#### 当前管线（有问题）：

```
process():
  discovery (LLM)  →  entities + capabilities  →  reflection (LLM)
                                                      ↓
confirm():                                        blueprint
  ComponentComposer.compose(capabilities)  ← 纯规则，无 LLM，无实体
      ↓
  5 节点线性链
      ↓
  AgentLoop.validate() → 通过（结构正确，但语义不完整）
```

问题在：**ComponentComposer 是一道规则驱动的窄门，把 LLM 在 discovery 阶段理解到的丰富语义全部丢弃了。**

#### 新管线设计：

```
process():
  discovery (LLM)  →  capabilities + entities + topology_hint
                           ↓
  reflection (LLM) →  decision + 语义蓝图
                           ↓
confirm():
  WorkflowArchitect.generateWorkflow(
    userIntent,
    capabilities,
    entities,           ← 新增：实体绑定
    topology_hint,      ← 新增：拓扑提示
    hardwareComponents,
  )
      ↓
  LLM 直接生成完整工作流 JSON（带 fan-out、带 notes、带变量流）
      ↓
  AgentLoop.validate() + autofix + model-feedback
```

**核心变化：移除 ComponentComposer 作为 confirm 的主路径，让 WorkflowArchitect（LLM 驱动）成为唯一的工作流生成路径。**

ComponentComposer 不删除，但退化为内部辅助（生成初始草图供 LLM 参考），或完全跳过。

#### 多轮 AgentLoop 的上下文管理：TurnContext Diffing

> 借鉴 Codex 的 `reference_context_item` + diff 模式：每轮 turn 只注入**变化的上下文**，而不是每轮都重发完整 prompt。

AgentLoop 验证闭环中，WorkflowArchitect 可能经历多轮：

```
Turn 1: 首次生成 → 完整 prompt（所有 fragment）
         ↓ 验证发现缺失 3 个节点 + notes 不完整
Turn 2: 修复轮 → 只发 validation_feedback fragment + entity_bindings
         ↓ 验证发现 1 个连接错误
Turn 3: 微调轮 → 只发 validation_feedback fragment（更新后）
```

实现：

```typescript
interface TurnContext {
  turnNumber: number;
  referenceFragmentVersions: Map<string, number>;  // 上轮各 fragment 的 version
  currentFragments: ContextFragment[];
}

function buildTurnPrompt(ctx: TurnContext): string {
  if (ctx.turnNumber === 1) {
    // 首轮：注入全部 fragment
    return assembleArchitectPrompt(ctx.currentFragments);
  }
  // 后续轮：只注入 version 变化的 fragment
  const changed = ctx.currentFragments.filter(
    f => f.version !== ctx.referenceFragmentVersions.get(f.id)
  );
  return assembleArchitectPrompt(changed);
}
```

**收益：** 多轮 AgentLoop 的 token 消耗从 O(N × fullPrompt) 降为 O(fullPrompt + N × deltaOnly)。对 game 场景（可能需要 3-5 轮）影响显著。

### 3.3 Discovery 增强：实体提取 + 拓扑提示

当前 discovery prompt 输出：

```json
{
  "reasoning_summary": "...",
  "capability_ids": ["camera.snapshot_input", "face_net.face_recognition", ...],
  "search_terms": ["..."]
}
```

增强为：

```json
{
  "reasoning_summary": "...",
  "capability_ids": ["camera.snapshot_input", "face_net.face_recognition", ...],
  "search_terms": ["..."],
  "entities": [
    { "name": "老刘", "key": "liu", "bindings": { "gesture": "Middle_Finger", "tts_text": "滚" } },
    { "name": "老付", "key": "fu", "bindings": { "gesture": "Victory", "tts_text": "你长得好帅" } }
  ],
  "topology_hint": "fan-out: face_net 识别后按人物分支，每分支并行执行手势+语音"
}
```

Discovery prompt 追加规则：

```
## 实体提取
当用户提到多个人物/对象/条件时，输出 entities 列表：
- name: 中文名
- key: 英文标识
- bindings: 该实体对应的动作参数（gesture, tts_text, emotion, emoji 等）

## 拓扑提示
用一句话描述你理解的工作流结构：
- "线性链: A → B → C"
- "fan-out: A → [B1, B2]，每分支并行执行"
- "先合流再分支: [A, B] → C → [D1, D2]"
```

### 3.4 Architect Prompt 增强：Contextual Fragment 模式

> 借鉴 Codex（OpenAI CLI Agent）的 **Contextual Fragment** 模式：不把所有知识塞进一个巨型 system prompt，而是将不同维度的上下文拆分为**带标记的独立片段**，按需组装、可独立更新、跨 turn 存活。

#### 设计：Fragment-Based Prompt Assembly

当前 architect system prompt 是一个约 3-4K token 的单体函数 `buildArchitectSystemPrompt()`。问题在于：
- 所有知识混在一个字符串里，无法按需更新
- 多轮 AgentLoop 中，每轮都重发完整 prompt，浪费 token
- 新增知识维度（如 notes 规范）只能追加到这个巨型字符串

重构为 fragment 模式：

```typescript
// ── 每种知识维度一个 fragment ──
interface ContextFragment {
  id: string;           // 'topology_patterns' | 'notes_spec' | 'entity_bindings' | ...
  startMarker: string;  // '<TOPOLOGY_PATTERNS>'
  endMarker: string;    // '</TOPOLOGY_PATTERNS>'
  content: string;      // 该维度的具体知识
  version: number;      // 变化时递增，用于 diff
}

// ── 组装 prompt 时按 fragment 组合 ──
function assembleArchitectPrompt(fragments: ContextFragment[]): string {
  return fragments
    .map(f => `${f.startMarker}\n${f.content}\n${f.endMarker}`)
    .join('\n\n');
}
```

**Fragment 清单：**

| Fragment ID | 标记 | 生命周期 | 内容 |
|-------------|------|---------|------|
| `hardware_context` | `<HARDWARE>` | 静态（每 session 不变） | 硬件组件库 |
| `assembly_rules` | `<ASSEMBLY_RULES>` | 静态 | 组装工厂手册 |
| `topology_patterns` | `<TOPOLOGY_PATTERNS>` | 静态 | 拓扑模式库（新增） |
| `notes_spec` | `<NOTES_SPEC>` | 静态 | notes 字段规范（新增） |
| `entity_bindings` | `<ENTITY_BINDINGS>` | 动态（per request） | 实体列表 + 拓扑提示（新增） |
| `validation_feedback` | `<VALIDATION_FEEDBACK>` | 动态（per turn） | AgentLoop 验证错误（新增） |
| `quality_checklist` | `<QUALITY_CHECKLIST>` | 静态 | 质量自检清单 |

**核心优势：**
- 静态 fragment 只发一次，多轮 AgentLoop 中不重复注入
- 动态 fragment（entity_bindings, validation_feedback）每轮更新
- 新增知识维度只需添加一个 fragment，不碰现有 prompt 代码
- fragment 标记使 LLM 清楚知道"这段是什么知识"，比混在一起更容易遵守

#### 具体 Fragment 内容

当前 prompt 的组装规则只有 `左→右（触发→输入→处理→判断→输出）` 的线性模型。需要增强以下上下文：

#### 增强 1: 拓扑模式库

```
# 拓扑模式

## 线性链
trigger → sensor → processor → executor
适用：单一感知、单一动作。

## 条件分支（fan-out）
processor → [if_condition_A, if_condition_B]
每个 if 的 true 分支并行连接执行器组。false 分支留空。
适用：多人/多条件/多结果场景。

## 多感知合流
[sensor_A → processor_A, sensor_B → processor_B] → decision_node
适用：视觉+听觉等多模态输入。

## 反应链路（固定配对）
TTS 节点（处理器）必须连接 SPEAKER 节点（执行器）。
这是一对固定的上下游依赖，不可拆散。
```

#### 增强 2: 实体驱动的节点乘法

```
# 实体驱动规则
当用户提到 N 个实体（人、条件、状态），对应执行链路需要实例化 N 次：
- N 个 IF 节点（每个判断一个实体条件）
- N × 每分支的执行器节点数

示例（2 人场景）：
  1 个 FACE-NET → 2 个 IF → 每个 IF 下并行 [HAND, TTS→SPEAKER]
  = 1 + 2 + 2×3 = 9 个分支相关节点
```

#### 增强 3: notes.sub 规范

当前 prompt 完全没有 notes.sub 的生成规则。增强：

```
# notes 字段规范

每个节点的 notes 必须包含：
  title: 10 字以内中文标题
  subtitle: 25 字以内中文描述
  category: 从 [MIC|LLM|CAM|HAND|YOLO-HAND|YOLO-RPS|FACE-NET|BASE|TTS|ASR|SCREEN|SPEAKER|WHEEL|RAM|ASSIGN|LLM-EMO] 中选择
  session_ID: 使用当前 sessionId
  extra: "pending"
  topology: 留空字符串
  device_ID: 留空字符串
  sub: 按 category 填充，键名必须与下表匹配

## sub 字段规范（按 category）

CAM:      { output: "camera1" }
MIC:      { output: "microphone1" }
FACE-NET: { facenet_input: "camera1", facenet_output: "facenet_output", face_url: "用户上传的人脸图片地址", face_info: "人物名称" }
YOLO-RPS: { yolov_input: "camera1", yolov_output: "userGesture" }
YOLO-HAND:{ yolov_input: "camera1", yolov_output: "visionLabel" }
ASR:      { asr_input: "microphone1", asr_output: "asr_output" }
LLM-EMO:  { system_prompt: "...", llm_emo_input: "asr_output", llm_emo_output: "emotionText" }
RAM:      { random_rule: N, output: "n" }
ASSIGN:   { input_key: "...", output_key: "..." }
TTS:      { TTS_input: "语音内容", audio_name: "变量名" }
SPEAKER:  { audio_name: "引用前置TTS的audio_name" }
HAND:     { execute_gesture: "手势标识" }
SCREEN:   { execute_emoji: "表情标识" }
BASE(scheduleTrigger): { seconds: N }
```

#### 增强 4: 节点命名规范

```
# 命名规范
- 触发器: schedule_trigger_{seconds}s
- 感知器: http_request_{功能}  (如 http_request_camera_snapshot)
- 处理器: set_{category}_{用途}  (如 set_face_net_recognition, set_tts_text_liu)
- 逻辑器: if_{条件语义}  (如 if_identity_is_liu, if_emotion_is_happy)
- 执行器: code_{category}_{用途}  (如 code_hand_execute_liu, code_speaker_play_audio_liu)
```

### 3.5 Blueprint 增强：从能力列表到语义蓝图

当前 blueprint 只包含组件列表。增强为携带实体和拓扑语义：

```typescript
interface EnhancedBlueprint {
  capabilities: string[];
  entities: Entity[];              // ← 新增
  topologyHint: string;            // ← 新增
  minimumNodes: number;            // ← 根据 entities * 执行器数量估算
  componentAssembly: string[];     // 现有
}
```

User message 模板增强：

```
请为以下需求生成一个n8n工作流：

用户意图: {intent}
识别到的实体: {entities 列表}
拓扑提示: {topologyHint}
最低节点数: {entityCount × branchSize + mainChainSize}

请按以下逻辑组装：
1. 主链: {trigger → sensors → processors}
2. 分支: 每个实体生成 1 个 IF + 对应的执行器组
3. 反应链路: TTS 后必须连接 SPEAKER

所有节点必须包含完整 notes（参照 notes 字段规范）。
```

### 3.6 Composition 路径统一

**删除 ComponentComposer 作为 confirm 的主路径。**

```typescript
// ── 当前 ──
async confirm(sessionId: string) {
  const workflow = this.componentComposer.compose(capabilities);  // 纯规则
  return this.agentLoop.run(workflow, state);
}

// ── 重构后 ──
async confirm(sessionId: string) {
  const result = await this.workflowArchitect.generateWorkflow({
    userIntent: state.userMessage,
    entities: state.entities,              // 从 discovery 传递
    topologyHint: state.topologyHint,      // 从 discovery 传递
    hardwareComponents: state.capabilities,
    conversationHistory: state.history,
    blueprint: state.blueprint,
  });

  // AgentLoop 验证闭环（不变）
  return this.agentLoop.run(result.workflow, state);
}
```

ComponentComposer 保留为可选的"初始草图生成器"，当 WorkflowArchitect 首轮失败时，可以用 ComponentComposer 的线性骨架喂给 LLM 做增强：

```typescript
// 可选 fallback：用规则骨架辅助 LLM
if (!result.success) {
  const skeleton = this.componentComposer.compose(capabilities);
  result = await this.workflowArchitect.generateWorkflow({
    ...request,
    skeletonHint: skeleton,  // 仅作为参考，不是最终输出
  });
}
```

---

## 四、WorkflowArchitect 拆分方案

### 4.1 现状

`workflow-architect.ts` 4085 行，至少 7 种职责混杂。这是仓库中最大的文件，也是 Refactor-4 遗留的最高优先级技术债。

### 4.2 拆分目标

```
当前：
  workflow-architect.ts (4085 行)

重构后：
  workflow-architect.ts (< 400 行)
    └─ 公共 API + LLM 对话循环 + 调度

  workflow-architect/
    ├─ json-extractor.ts (< 300 行)
    │   └─ 从 LLM 响应中提取 JSON + 格式校验
    ├─ node-normalizer.ts (< 400 行)
    │   └─ 分类推断 + 名称标准化 + 参数修复 + typeVersion
    ├─ topology-resolver.ts (< 300 行)
    │   └─ 连接补全 + 孤立节点检测 + 重复边去除
    ├─ notes-enricher.ts (< 300 行)
    │   └─ title/subtitle/sub/device_ID/topology 补全
    ├─ scene-post-processor.ts (< 400 行)
    │   └─ 手势/游戏/情感场景的后处理修复（逐步弱化）
    └─ AGENTS.md
```

### 4.3 后处理 vs prompt 增强的对偶关系

当前 workflow-architect.ts 里大量代码是**后处理补丁**（ensureGestureIdentityFlow, ensureEmotionInteractionFlow 等），它们在 LLM 生成的结果上做硬编码修复。

这些后处理的存在说明 **LLM 的上下文不够好**。随着 prompt 增强（§3.4），这些后处理应逐步变得不需要：

| 后处理函数 | 补的是什么缺 | prompt 增强后 |
|-----------|-------------|--------------|
| ensureGestureIdentityFlow | fan-out 拓扑 | LLM 应自行生成 |
| ensureEmotionInteractionFlow | 多感知合流 | LLM 应自行生成 |
| ensureGameHandExecutor | 缺失 HAND 节点 | LLM 应自行生成 |
| ensureIfDirectExecutorConnections | IF→执行器直连 | LLM 应自行生成 |

**迁移策略：** 拆分后保留这些后处理在 scene-post-processor.ts 中，作为安全网。随着 prompt 增强验证通过，逐步 disable 每个后处理并跑 ground truth 验证。当 LLM 生成质量稳定后，这些后处理自然退役。

---

## 五、验证体系：Ground Truth 驱动

### 5.1 Ground Truth 定义

`docs/development/scene/` 下的三个场景 JSON 是验收基准：

| 场景 | ground truth 文件 | 节点数 | 验证维度 |
|------|-------------------|--------|---------|
| gesture | `gesture/gesture_0315.json` | 12 | 双人分支、N人×FACE-NET、TTS→SPEAKER 配对、notes 完整 |
| game | `game/game_0203.json` | 35 | 时序正确、7路裁判、变量流 |
| emo | `emo/emo_0310.json` | 16 | 双感知合流、情绪分支、SCREEN+HAND+TTS→SPEAKER |

### 5.2 自动化验证框架

```typescript
// ── ground truth 验证器 ──
interface GroundTruthResult {
  nodeCount: { expected: number; actual: number; coverage: number };
  categories: { expected: Record<string, number>; actual: Record<string, number>; match: boolean };
  topologyMatch: boolean;           // fan-out 结构是否正确
  notesCompleteness: number;        // notes 非空率
  variableFlowIntegrity: boolean;   // 上游输出 → 下游输入 变量名一致
}

// 每个场景的验证标准
const ACCEPTANCE_THRESHOLDS = {
  gesture: { nodeCoverage: 0.90, notesCompleteness: 0.90 },
  game:    { nodeCoverage: 0.70, notesCompleteness: 0.80 },  // game 接受更低的首轮覆盖率
  emo:     { nodeCoverage: 0.85, notesCompleteness: 0.90 },
};
```

### 5.3 回归测试

在 `tests/integration/agents/` 新增 ground truth 回归测试：

```typescript
describe('WorkflowArchitect ground truth', () => {
  it('gesture: 覆盖率 > 90%', async () => {
    const result = await architect.generateWorkfl{
      userIntent: '见到老刘机器人竖个中指骂人，见到老付机器人比个V打招呼',
      ...gestureContext,
    });
    const score = evaluateAgainstGroundTruth(result.workflow, gestureGroundTruth);
    expect(score.nodeCount.coverage).toBeGreaterThan(0.90);
  });
});
```

> 注：这些测试因为依赖 LLM 调用，归类为集成测试。但 ground truth 结构对比脚本本身可以纯本地跑。

---

## 六、执行计划

### 6.1 分支矩阵

| 分支 | 范围 | 优先级 |
|-------|--------|
| `feat/discovery-entities` | discovery prompt 增强（实体提取 + 拓扑提示） | P0 |
| `feat/architect-context` | architect system prompt 增强（拓扑模式 + notes 规范 + 实体乘法） | P0 |
| `feat/composition-unify` | confirm 路径统一走 WorkflowArchitect，移除 ComponentComposer 主路径 | P0 |
| `feat/architect-split` | workflow-architect.ts 拆分为子模块 | P1 |
| `feat/ground-truth-eval` | ground truth 自动化验证框架 | P1 |

### 6.2 验收标准

#### 量化目标

| 指标 | 当前值 | 目标值 | 测量方法 |
|------|--------|--------|---------|
| gesture 节点覆盖率 | 45%（5/11） | > 90% | 与 gesture_0315.json 对比 |
| gesture notes 完整率 | ~40% | > 90% | notes 字段非空率 |
| emo 节点覆盖率 | 未测试 | > 85% | 与 emo_0310.json 对比 |
| emo notes 完整率 | 未测试 | > 90% | notes 字段非空率 |
| game 节点覆盖率 | 未测试 | > 70% | 与 game_0203.json 对比（允许多轮收敛） |
| workflow-architect.ts 行数 | 4085 | < 500 | 核心拆分后 |
| 后处理函数存留数 | ~5 | 逐步削减到 0 | prompt 增强验证后 |

#### 质量保证

- [ ] gesture 场景端到端：11 节点、双分支、TTS→SPEAKER 配对
- [ ] emo 场景端到端：16 节点、双感知合流、情绪分支
- [ ] 通用路径不退化：非场景输入仍能生成合理工作流
- [ ] TypeScript 类型检查通过
- [ ] 现有测试不退化

---

## 七、与历次 Refactor 的关系

```
Refactor-2: 能力发现 → 建立 capability 体系
Refactor-3: Agent 架构 → AI-native 路径确立
Refactor-4: Harness 优化 → 单循环、token 预算、统一验证
Refactor-5: 上下文工程 → 让 LLM 生成正确的工作流
```

每一轮都在坚守同一条线：**让 AI 做决策，让代码做脚手架。** Refactor-5 延续这个原则——不是给 LLM 一个模板让它填空，而是给 LLM 足够的知识让它自己画出正确的图。

---

## 八、Codex 架构借鉴

> 参考 OpenAI Codex CLI Agent（`codex-rs/core/`）的架构设计，提炼适用于本项目的模式。

### 8.1 借鉴的模式

| Codex 模式 | 原始实现 | Refactor-5 应用 |
|-----------|---------|----------------|
| **Contextual Fragment** | `contextual_user_message.rs` — 用 start/end marker 包裹不同维度的上下文（AGENTS.md、environment、skill），使其可识别、可更新、跨 compaction 存活 | §3.4 Fragment-Based Prompt Assembly — 将 architect 的知识拆为 7 个带标记 fragment |
| **TurnContext Diffing** | `record_context_updates_and_set_reference_context_item()` — 维护 `reference_context_item` 基线，每轮只注入变化的上下文 | §3.2 多轮 AgentLoop 中只发 delta fragment，降低 token 消耗 |
| **Pre-sampling Compaction** | `run_pre_sampling_compact()` — 每轮 turn 前检查 token 是否超限，超限则先 compact 再调用模型 | §3.6 confirm 路径中，调用 WorkflowArchitect 前检查 context 总量，超限时压缩 validation history |
| **SessionTask Trait** | `tasks/mod.rs` — RegularTask / CompactTask / ReviewTask 等实现同一个 `SessionTask` trait，共享生命周期但各自独立 | §4.2 拆分后的 WorkflowArchitect 子模块可以各自实现 PostProcessor trait |
| **Completion Watcher** | `agent/control.rs` — 子 agent 完成后通过 detached watcher 注入通知到父 session | AgentLoop 的验证反馈可以作为异步通知注入，而非同步阻塞 |

### 8.2 不借鉴的模式

| Codex 模式 | 为何不借鉴 |
|-----------|----------|
| Multi-thread / Sub-agent 多线程 | 我们的工作流生成是单 session 单 LLM 调用，不需要多 agent 并行 |
| Rollout Persistence (JSONL) | 我们已有 session 持久化机制（Refactor-4 的 session-state），无需重造 |
| Ghost Snapshot / Undo | 工作流生成是前向的，没有 undo 需求 |
| Sandbox / Approval Policy | 我们不执行任意 shell 命令，安全模型不同 |

### 8.3 关键启示

Codex 的架构本质上解决的是同一个问题：**如何为 LLM 组装正确的上下文**。

- Codex 面对的是代码仓库上下文（文件内容、shell 状态、AGENTS.md 指令）
- 我们面对的是硬件机器人上下文（组件库、拓扑规则、notes 规范、实体绑定）

两者共通的设计哲学：

```
上下文不是一个字符串，是一组可寻址的、可版本化的、带标记的知识片段。
组装 prompt 不是字符串拼接，是 fragment 的声明式组合。
多轮对话不是重发一切，是 diff-based 的增量注入。
```

---

## 九、风险与缓解

| 风险 | 概率 | 影响 | 缓解 |
|------|------|-------|
| LLM 在 prompt 增强后仍无法稳定生成 fan-out | 中 | 高 | 保留 scene-post-processor 作为安全网 |
| game 场景 35 节点超出 LLM 单次生成能力 | 高 | 中 | 接受多轮收敛，AgentLoop 已支持 |
| 实体提取 LLM 不稳定 | 中 | 中 | few-shot 示例 + JSON 格式校验 |
| ComponentComposer 移除后通用场景退化 | 低 | 中 | 保留为 optional fallback |
| workflow-architect 拆分引入回归 | 中 | 中 | 渐进拆分，一个文件一个文件迁移 |
| 多轮 AgentLoop token 膨胀 | 中 | 中 | TurnContext diffing 只发 delta；超限时 pre-sampling compact validation history |
| Fragment 数量过多导致 prompt 分散 | 低 | 低 | 控制在 7 个以内；静态 fragment 合并为 2-3 个大块 |

---

Conceived by Sam
