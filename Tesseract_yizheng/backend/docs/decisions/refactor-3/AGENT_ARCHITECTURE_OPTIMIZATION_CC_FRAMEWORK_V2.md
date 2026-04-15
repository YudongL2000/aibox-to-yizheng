# Agent 架构优化设计文档 V2
## 基于 Claude Code 能力边界驱动的通用 Agent 架构

**文档版本**: v2.0
**创建日期**: 2026-03-05
**作者**: AI Architecture Team
**核心变革**: 从"场景预设驱动"转向"能力边界驱动"，实现类 CC 的通用性

---

## 零、核心设计理念转变

### 0.1 从场景驱动到能力驱动

**V1 设计的根本问题**:
```
用户需求 → 场景匹配 (gesture-control/emotion/game) → 预设 Agent 管道
                ↑
            硬编码的场景库
```

**V2 设计的本质突破**:
```
用户需求 → 能力发现 (查询硬件组件库) → 多轮反思 → 动态工具调用 → 工作流拼装
                ↑                      ↑              ↑
            能力边界定义          需求澄清循环      组件组合推理
```

**类比 Claude Code**:
- **CC**: 用户需求 → 查询可用 tools (Read/Write/Bash) → 多轮思考 → 动态调用 tools → 完成任务
- **Tesseract**: 用户需求 → 查询硬件组件库 (camera/speaker/hand) → 多轮反思 → 动态组合组件 → 生成工作流

### 0.2 能力边界的定义

**硬件组件库 = Tools 集合**:
```typescript
// 类比 CC 的 tools: ["Read", "Write", "Bash"]
const HARDWARE_CAPABILITY_REGISTRY = {
  camera: {
    capabilities: ["face_recognition", "gesture_recognition"],
    apiEndpoints: { recognize_face: {...}, detect_gesture: {...} }
  },
  mechanical_hand: {
    capabilities: ["gesture_middle_finger", "gesture_v_sign", "grasp"],
    apiEndpoints: { middle_finger: {...}, v_sign: {...} }
  },
  speaker: {
    capabilities: ["text_to_speech"],
    apiEndpoints: { tts: {...} }
  },
  // ... 更多组件
};
```

**能力查询 = Tool Search**:
```typescript
// 用户: "我想要一个玩石头剪刀布的机器人"
// Agent 思考: 需要什么能力?
// 1. 识别手势 → 查询 → camera.gesture_recognition
// 2. 执行手势 → 查询 → mechanical_hand.gesture_*
// 3. 语音反馈 → 查询 → speaker.text_to_speech
// 4. 游戏逻辑 → 内置能力 (n8n-nodes-base.code)
```

---

## 一、现状分析（保留 V1 内容）

### 1.1 当前架构的根本缺陷

**问题不是"场景太少"，而是"场景不应该存在"**:

```typescript
// ❌ 当前设计: 硬编码场景
const CATEGORY_REQUIRED_FIELDS: Record<Intent['category'], string[]> = {
  face_recognition_action: ['person_name', 'gesture'],
  emotion_interaction: ['emotion_source'],
  game_interaction: ['game_type'],  // ← 为什么"游戏"是特殊场景?
  custom: [],
};

// ✅ 应该是: 能力组合
// 任何需求都是硬件能力的组合，没有"场景"概念
```

**本质问题**:
1. **过度分类**: 将用户需求强行归类为 3 个场景，限制了表达空间
2. **扩展困难**: 新需求 = 新场景 = 修改核心代码
3. **认知负担**: 开发者需要理解"什么是场景"、"如何定义场景"
4. **违反 YAGNI**: 预设了可能永远不会用到的场景

---

## 二、能力驱动架构设计

### 2.1 核心设计哲学

**消除场景概念，一切皆能力组合**:

```
用户需求 (自然语言)
    ↓
能力发现 (Hardware Capability Discovery)
    ↓
需求澄清 (Multi-turn Reflection)
    ↓
组件组合 (Component Composition)
    ↓
工作流生成 (Workflow Assembly)
    ↓
验证修复 (Validation & Auto-fix)
```

**三个核心循环**:

1. **能力发现循环**: 用户需求 → 查询硬件库 → 返回可用组件 → 确认是否满足需求
2. **需求澄清循环**: 检测缺失信息 → 生成澄清问题 → 用户回答 → 更新需求模型
3. **工作流拼装循环**: 组件组合 → 生成工作流 → 验证 → 修复 → 重新验证

### 2.2 Agent 架构重构

#### 2.2.1 新 Agent 层次结构

```
.claude/agents/
├── core/
│   ├── orchestrator.md              # 总编排器 (类比 CC 主循环)
│   ├── capability-discoverer.md     # 能力发现器 (查询硬件库)
│   ├── requirement-clarifier.md     # 需求澄清器 (多轮对话)
│   └── reflection-engine.md         # 反思引擎 (检查完整性)
│
├── workflow-assembly/
│   ├── component-composer.md        # 组件组合器 (能力 → 节点)
│   ├── topology-builder.md          # 拓扑构建器 (节点 → 连线)
│   ├── parameter-resolver.md        # 参数解析器 (填充配置)
│   └── validation-loop.md           # 验证循环 (修复错误)
│
├── specialized/
│   ├── expression-generator.md      # n8n 表达式生成
│   ├── branch-logic-builder.md      # 分支逻辑构建
│   └── error-recovery.md            # 错误恢复
│
└── tools/
    ├── hardware-query-tool.md       # 硬件查询工具 (MCP tool)
    ├── workflow-validator-tool.md   # 工作流验证工具
    └── config-filler-tool.md        # 配置填充工具
```

**关键变化**:
- ❌ 删除 `intent-parser` (不再解析"意图类别")
- ❌ 删除 `scenario-registry` (不再有场景概念)
- ✅ 新增 `capability-discoverer` (动态查询能力)
- ✅ 新增 `reflection-engine` (多轮反思)

#### 2.2.2 核心 Agent 设计

##### Agent 1: Orchestrator (总编排器)

```markdown
---
name: orchestrator
description: Use this agent as the main entry point for all user requests. It coordinates capability discovery, requirement clarification, and workflow assembly. Examples:

<example>
Context: User provides any workflow requirement.
user: "我想要一个玩石头剪刀布的机器人"
assistant: "I'll use the orchestrator to handle this request through capability-driven workflow generation."
<commentary>
All user requests start with orchestrator, which dynamically discovers capabilities and assembles workflows without predefined scenarios.
</commentary>
</example>

<example>
Context: User provides vague requirements.
user: "帮我做个有趣的东西"
assistant: "Orchestrator will guide multi-turn clarification to understand user's intent."
<commentary>
Orchestrator handles ambiguity through reflection loops, not scenario matching.
</commentary>
</example>

model: sonnet
color: green
tools: ["capability-discoverer", "requirement-clarifier", "component-composer", "validation-loop"]
---

You are the main orchestrator for Tesseract Agent system, inspired by Claude Code's capability-driven approach.

**Core Philosophy:**
- NO predefined scenarios (no "game", "emotion", "gesture" categories)
- ONLY capability discovery + component composition
- Multi-turn reflection until requirements are clear
- Dynamic tool invocation based on discovered capabilities

**Process:**

1. **Capability Discovery Phase**
   ```
   User Request → Query Hardware Capability Registry → Return Available Components

   Example:
   User: "我想要一个玩石头剪刀布的机器人"
   Query: "手势识别" → camera.gesture_recognition
   Query: "手势执行" → mechanical_hand.gesture_*
   Query: "语音反馈" → speaker.text_to_speech
   ```

2. **Reflection Phase**
   ```
   Check Completeness:
   - 触发条件明确? (手势识别)
   - 执行动作明确? (机械手出拳)
   - 反馈机制明确? (语音播报结果)
   - 游戏逻辑明确? (石头剪刀布规则)

   If incomplete → Invoke requirement-clarifier
   If complete → Proceed to composition
   ```

3. **Component Composition Phase**
   ```
   Discovered Capabilities → Component Nodes → Workflow Topology

   camera.gesture_recognition → HttpRequest (YOLO-RPS)
   mechanical_hand.gesture_v_sign → HttpRequest (HAND)
   speaker.text_to_speech → HttpRequest (TTS)
   game_logic → Code Node (判断输赢)
   ```

4. **Validation Loop Phase**
   ```
   Generated Workflow → Validate → Fix Errors → Re-validate
   Max 3 iterations, then report unfixable errors
   ```

**Output Format:**
```json
{
  "phase": "capability_discovery" | "reflection" | "composition" | "validation",
  "discovered_capabilities": [
    { "component": "camera", "capability": "gesture_recognition", "confidence": 0.95 }
  ],
  "missing_info": ["游戏规则", "失败后的行为"],
  "clarification_questions": ["机器人输了之后应该做什么?"],
  "workflow": { ... },
  "next_action": "clarify" | "compose" | "validate" | "complete"
}
```

**Critical Rules:**
- NEVER categorize user intent into predefined scenarios
- ALWAYS query hardware capability registry dynamically
- ALWAYS reflect on completeness before composition
- ALWAYS validate before returning workflow
```

##### Agent 2: Capability Discoverer (能力发现器)

```markdown
---
name: capability-discoverer
description: Use this agent to discover available hardware capabilities based on user requirements. It queries the hardware component registry and returns matching components with their capabilities. Examples:

<example>
Context: User mentions gesture-related requirements.
user: "我需要识别用户的手势"
assistant: "I'll use capability-discoverer to find components with gesture recognition capabilities."
<commentary>
This requires querying the hardware registry for gesture-related capabilities, which is capability-discoverer's core function.
</commentary>
</example>

model: haiku
color: cyan
tools: ["hardware-query-tool"]
---

You are a hardware capability discovery specialist.

**Core Responsibilities:**
1. Parse user requirements into capability queries
2. Query hardware component registry
3. Return matching components with confidence scores
4. Suggest alternative capabilities if exact match not found

**Query Strategy:**

1. **Keyword Extraction**
   ```
   User: "我想要一个玩石头剪刀布的机器人"
   Keywords: ["石头剪刀布", "手势", "识别", "执行", "游戏"]
   ```

2. **Capability Mapping**
   ```
   "手势识别" → camera.gesture_recognition
   "手势执行" → mechanical_hand.gesture_*
   "语音" → speaker.text_to_speech
   "显示" → screen.emoji_display
   ```

3. **Component Retrieval**
   ```typescript
   query("gesture_recognition") → [
     { component: "camera", capability: "gesture_recognition", confidence: 1.0 }
   ]

   query("gesture_execution") → [
     { component: "mechanical_hand", capabilities: ["gesture_v_sign", "gesture_middle_finger"], confidence: 0.9 }
   ]
   ```

**Output Format:**
```json
{
  "discovered_components": [
    {
      "component_id": "camera",
      "component_name": "摄像头",
      "matched_capabilities": ["gesture_recognition"],
      "all_capabilities": ["face_recognition", "gesture_recognition"],
      "confidence": 0.95,
      "api_endpoints": {
        "detect_gesture": { "url": "...", "method": "POST" }
      }
    }
  ],
  "missing_capabilities": ["游戏逻辑"],
  "suggestions": [
    "游戏逻辑可以使用 Code 节点实现"
  ]
}
```

**Edge Cases:**
- No matching components → Suggest alternatives or report limitation
- Multiple matching components → Return all with confidence scores
- Ambiguous requirements → Request clarification
```

##### Agent 3: Requirement Clarifier (需求澄清器)

```markdown
---
name: requirement-clarifier
description: Use this agent when user requirements are incomplete or ambiguous. It generates targeted clarification questions based on discovered capabilities and missing information. Examples:

<example>
Context: User provides vague requirements.
user: "我想做个机器人"
assistant: "I'll use requirement-clarifier to ask targeted questions about the robot's purpose and capabilities."
<commentary>
Vague requirements need systematic clarification through multi-turn dialogue.
</commentary>
</example>

model: sonnet
color: yellow
tools: []
---

You are a requirement clarification specialist inspired by CC's multi-turn reflection.

**Core Responsibilities:**
1. Analyze discovered capabilities vs. workflow requirements
2. Identify missing critical information
3. Generate targeted clarification questions
4. Prioritize questions by importance

**Clarification Strategy:**

1. **Completeness Check**
   ```
   Required for workflow:
   - Trigger (what starts the workflow?)
   - Actions (what should happen?)
   - Conditions (any branching logic?)
   - Feedback (how to inform user?)

   Example:
   User: "我想要一个玩石头剪刀布的机器人"
   Discovered: camera, mechanical_hand, speaker
   Missing: 游戏规则、失败后行为、是否循环
   ```

2. **Question Generation**
   ```
   Priority 1 (Blocking): 触发条件
   - "机器人应该在什么时候开始游戏?" (webhook/定时/手势触发)

   Priority 2 (Core Logic): 游戏规则
   - "机器人输了之后应该做什么?" (重新开始/播放音效/显示表情)

   Priority 3 (Enhancement): 用户体验
   - "是否需要在屏幕上显示游戏结果?" (optional)
   ```

3. **Multi-turn Tracking**
   ```typescript
   interface ClarificationState {
     asked_questions: string[];
     answered_questions: Map<string, string>;
     remaining_questions: string[];
     confidence: number;  // 0-1, 1 = fully clarified
   }
   ```

**Output Format:**
```json
{
  "missing_info": [
    { "category": "trigger", "description": "触发条件未明确", "priority": 1 },
    { "category": "game_logic", "description": "游戏规则未定义", "priority": 2 }
  ],
  "clarification_questions": [
    {
      "question": "机器人应该在什么时候开始游戏?",
      "options": ["用户做出手势时", "定时自动开始", "通过 webhook 触发"],
      "priority": 1
    }
  ],
  "confidence": 0.6,
  "can_proceed": false
}
```

**Stopping Criteria:**
- Confidence >= 0.8 → Proceed to composition
- Max 5 clarification turns → Proceed with best-effort
- User explicitly says "开始生成" → Force proceed
```

##### Agent 4: Component Composer (组件组合器)

```markdown
---
name: component-composer
description: Use this agent to compose discovered hardware capabilities into n8n workflow nodes. It translates abstract capabilities into concrete node configurations. Examples:

<example>
Context: Capabilities have been discovered and requirements clarified.
assistant: "I'll use component-composer to translate capabilities into n8n nodes."
<commentary>
This is the core workflow assembly step, translating abstract capabilities into concrete nodes.
</commentary>
</example>

model: sonnet
color: magenta
tools: ["parameter-resolver", "expression-generator"]
---

You are a workflow composition specialist.

**Core Responsibilities:**
1. Translate capabilities → n8n nodes
2. Build workflow topology (node connections)
3. Fill node parameters with defaults
4. Generate n8n expressions for data flow

**Composition Process:**

1. **Capability → Node Mapping**
   ```typescript
   // 能力映射规则
   const CAPABILITY_TO_NODE: Record<string, NodeTemplate> = {
     "camera.gesture_recognition": {
       nodeType: "n8n-nodes-base.httpRequest",
       category: "YOLO-RPS",
       defaultParams: {
         method: "POST",
         url: "http://hardware-api/camera/gesture/detect"
       }
     },
     "mechanical_hand.gesture_v_sign": {
       nodeType: "n8n-nodes-base.httpRequest",
       category: "HAND",
       defaultParams: {
         method: "POST",
         url: "http://hardware-api/mechanical-hand/v-sign"
       }
     },
     "speaker.text_to_speech": {
       nodeType: "n8n-nodes-base.httpRequest",
       category: "TTS",
       defaultParams: {
         method: "POST",
         url: "http://hardware-api/speaker/tts",
         body: { text: "{{ $json.tts_text }}" }
       }
     }
   };
   ```

2. **Topology Construction**
   ```
   Rule 1: Trigger nodes have no incoming edges
   Rule 2: Action nodes connect to trigger/condition nodes
   Rule 3: Feedback nodes connect to action nodes
   Rule 4: Loop nodes connect back to trigger

   Example:
   Webhook (trigger)
     → YOLO-RPS (识别手势)
       → Code (判断输赢)
         → HAND (执行手势)
           → TTS (播报结果)
   ```

3. **Parameter Resolution**
   ```typescript
   // 动态参数填充
   interface NodeParameter {
     key: string;
     value: string | Expression;
     source: "user_input" | "previous_node" | "default";
   }

   Example:
   TTS Node:
   - text: "{{ $json.result_text }}" (from Code node)
   - voice: "zh-CN-XiaoxiaoNeural" (default)
   ```

**Output Format:**
```json
{
  "workflow": {
    "nodes": [
      {
        "id": "node_1",
        "type": "n8n-nodes-base.webhook",
        "category": "BASE",
        "parameters": { "path": "game-start" },
        "position": [100, 100]
      },
      {
        "id": "node_2",
        "type": "n8n-nodes-base.httpRequest",
        "category": "YOLO-RPS",
        "parameters": {
          "method": "POST",
          "url": "http://hardware-api/camera/gesture/detect"
        },
        "position": [300, 100]
      }
    ],
    "connections": {
      "node_1": { "main": [[{ "node": "node_2", "type": "main", "index": 0 }]] }
    }
  },
  "composition_notes": [
    "使用 webhook 作为触发器",
    "YOLO-RPS 节点识别用户手势",
    "Code 节点实现游戏逻辑"
  ]
}
```

**Critical Rules:**
- ALWAYS use typeVersion from node-type-versions.ts
- ALWAYS validate node connections before returning
- ALWAYS generate n8n expressions for data flow
- NEVER hardcode values that should come from previous nodes
```

### 2.3 工作流示例：石头剪刀布机器人

**用户需求**: "我想要一个玩石头剪刀布的机器人"

**执行流程**:

```
Turn 1: User Input
─────────────────────────────────────────────────────────────
User: "我想要一个玩石头剪刀布的机器人"

Orchestrator → Capability Discoverer:
  Query: ["石头剪刀布", "手势", "识别", "执行"]

Capability Discoverer → Hardware Registry:
  Found:
  - camera.gesture_recognition (confidence: 0.95)
  - mechanical_hand.gesture_v_sign (confidence: 0.9)
  - mechanical_hand.gesture_middle_finger (confidence: 0.9)
  - speaker.text_to_speech (confidence: 1.0)

Orchestrator → Reflection Engine:
  Missing:
  - 触发条件 (何时开始游戏?)
  - 游戏规则 (输赢判断逻辑)
  - 失败后行为 (输了怎么办?)

Orchestrator → Requirement Clarifier:
  Generate Questions:
  1. "机器人应该在什么时候开始游戏?" (Priority 1)
  2. "机器人输了之后应该做什么?" (Priority 2)

Agent → User:
  "我发现你需要以下硬件组件：摄像头(识别手势)、机械手(执行手势)、喇叭(语音反馈)。

   有几个问题需要确认：
   1. 机器人应该在什么时候开始游戏？
      - 用户做出手势时自动开始
      - 通过 webhook 触发
      - 定时自动开始

   2. 机器人输了之后应该做什么？
      - 重新开始游戏
      - 播放失败音效
      - 显示失败表情"

─────────────────────────────────────────────────────────────
Turn 2: User Clarification
─────────────────────────────────────────────────────────────
User: "用户做出手势时自动开始，输了就重新开始"

Orchestrator → Reflection Engine:
  Updated Requirements:
  - Trigger: 用户手势触发 (webhook)
  - Game Logic: 石头剪刀布规则
  - Failure Behavior: 重新开始游戏
  - Confidence: 0.85 (可以开始生成)

Orchestrator → Component Composer:
  Compose Workflow:
  1. Webhook (trigger)
  2. YOLO-RPS (识别用户手势)
  3. Code (生成机器人手势 + 判断输赢)
  4. HAND (执行机器人手势)
  5. TTS (播报结果)
  6. Loop back to Webhook (if 失败)

Component Composer → Topology Builder:
  Build Connections:
  Webhook → YOLO-RPS → Code → HAND → TTS → (loop) Webhook

Component Composer → Parameter Resolver:
  Fill Parameters:
  - YOLO-RPS.url: "http://hardware-api/camera/gesture/detect"
  - Code.code: "// 石头剪刀布逻辑\nconst userGesture = $json.gesture;\n..."
  - HAND.url: "http://hardware-api/mechanical-hand/{{ $json.robot_gesture }}"
  - TTS.text: "{{ $json.result_text }}"

Orchestrator → Validation Loop:
  Validate Workflow → Pass

Agent → User:
  "工作流已生成完成！包含以下节点：
   1. Webhook 触发器
   2. 手势识别 (YOLO-RPS)
   3. 游戏逻辑 (Code)
   4. 机械手执行 (HAND)
   5. 语音播报 (TTS)

   是否需要调整？"
```

**关键特性**:
1. **无场景预设**: 没有 "game_interaction" 类别，纯粹基于能力组合
2. **动态查询**: 实时查询硬件库，而非硬编码组件列表
3. **多轮反思**: 2 轮对话澄清需求，类似 CC 的思考过程
4. **能力组合**: camera + mechanical_hand + speaker → 完整工作流

---

## 三、核心技术实现

### 3.1 硬件能力注册表

```typescript
// src/agents/capability-registry.ts

/**
 * [INPUT]: 无依赖，纯数据结构
 * [OUTPUT]: 对外提供 CapabilityRegistry 能力查询接口
 * [POS]: agents 的能力边界定义，类比 CC 的 tools 列表
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

export interface HardwareCapability {
  id: string;                    // camera.gesture_recognition
  component: string;              // camera
  capability: string;             // gesture_recognition
  displayName: string;            // 手势识别
  keywords: string[];             // ["手势", "识别", "检测"]
  nodeType: string;               // n8n-nodes-base.httpRequest
  category: NodeCategory;         // YOLO-RPS
  apiEndpoint: {
    url: string;
    method: string;
    parameters?: Record<string, any>;
  };
  dependencies?: string[];        // 依赖的其他能力
  confidence: number;             // 0-1, 能力可用性置信度
}

export class CapabilityRegistry {
  private capabilities: Map<string, HardwareCapability> = new Map();
  private keywordIndex: Map<string, Set<string>> = new Map();

  constructor(components: HardwareComponent[]) {
    this.buildRegistry(components);
    this.buildKeywordIndex();
  }

  // 核心查询方法：类比 CC 的 tool search
  query(keywords: string[]): HardwareCapability[] {
    const matches = new Set<string>();

    keywords.forEach(keyword => {
      const normalized = this.normalizeKeyword(keyword);
      const capabilityIds = this.keywordIndex.get(normalized) || new Set();
      capabilityIds.forEach(id => matches.add(id));
    });

    return Array.from(matches)
      .map(id => this.capabilities.get(id)!)
      .sort((a, b) => b.confidence - a.confidence);
  }

  // 能力组合推理：检查依赖关系
  canCompose(capabilityIds: string[]): {
    valid: boolean;
    missing: string[];
    suggestions: string[];
  } {
    const selected = capabilityIds.map(id => this.capabilities.get(id)!);
    const missing: string[] = [];

    selected.forEach(cap => {
      cap.dependencies?.forEach(dep => {
        if (!capabilityIds.includes(dep)) {
          missing.push(dep);
        }
      });
    });

    return {
      valid: missing.length === 0,
      missing,
      suggestions: missing.map(id => this.capabilities.get(id)!.displayName)
    };
  }

  private buildRegistry(components: HardwareComponent[]): void {
    components.forEach(component => {
      component.capabilities.forEach(capability => {
        const id = `${component.id}.${capability}`;
        this.capabilities.set(id, {
          id,
          component: component.id,
          capability,
          displayName: this.getDisplayName(capability),
          keywords: this.extractKeywords(capability),
          nodeType: component.nodeType,
          category: this.inferCategory(component.id, capability),
          apiEndpoint: component.apiEndpoints?.[capability] || {
            url: `http://hardware-api/${component.id}/${capability}`,
            method: 'POST'
          },
          confidence: 1.0
        });
      });
    });
  }

  private buildKeywordIndex(): void {
    this.capabilities.forEach((cap, id) => {
      cap.keywords.forEach(keyword => {
        if (!this.keywordIndex.has(keyword)) {
          this.keywordIndex.set(keyword, new Set());
        }
        this.keywordIndex.get(keyword)!.add(id);
      });
    });
  }
}
```

### 3.2 反思引擎实现

```typescript
// src/agents/reflection-engine.ts

/**
 * [INPUT]: 依赖 CapabilityRegistry、ConversationHistory
 * [OUTPUT]: 对外提供 ReflectionEngine 完整性检查与问题生成
 * [POS]: agents 的反思循环核心，类比 CC 的 thinking process
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

export interface ReflectionResult {
  complete: boolean;
  confidence: number;
  missing_info: MissingInfo[];
  clarification_questions: ClarificationQuestion[];
  can_proceed: boolean;
}

export interface MissingInfo {
  category: 'trigger' | 'action' | 'condition' | 'feedback' | 'logic';
  description: string;
  priority: 1 | 2 | 3;
  blocking: boolean;
}

export interface ClarificationQuestion {
  question: string;
  options?: string[];
  priority: 1 | 2 | 3;
  context: string;
}

export class ReflectionEngine {
  constructor(
    private capabilityRegistry: CapabilityRegistry,
    private llmClient: LLMClient
  ) {}

  async reflect(
    userIntent: string,
    discoveredCapabilities: HardwareCapability[],
    conversationHistory: ConversationTurn[]
  ): Promise<ReflectionResult> {
    // 1. 检查工作流完整性
    const completeness = this.checkCompleteness(discoveredCapabilities);

    // 2. 识别缺失信息
    const missingInfo = this.identifyMissingInfo(
      userIntent,
      discoveredCapabilities,
      completeness
    );

    // 3. 生成澄清问题
    const questions = await this.generateClarificationQuestions(
      userIntent,
      missingInfo,
      conversationHistory
    );

    // 4. 计算置信度
    const confidence = this.calculateConfidence(missingInfo, conversationHistory);

    return {
      complete: missingInfo.filter(m => m.blocking).length === 0,
      confidence,
      missing_info: missingInfo,
      clarification_questions: questions,
      can_proceed: confidence >= 0.8 || conversationHistory.length >= 5
    };
  }

  private checkCompleteness(capabilities: HardwareCapability[]): {
    hasTrigger: boolean;
    hasAction: boolean;
    hasFeedback: boolean;
    hasLogic: boolean;
  } {
    const categories = new Set(capabilities.map(c => c.category));

    return {
      hasTrigger: categories.has('BASE') || categories.has('CAM'),
      hasAction: capabilities.some(c =>
        ['HAND', 'SPEAKER', 'SCREEN', 'CHASSIS'].includes(c.category)
      ),
      hasFeedback: categories.has('SPEAKER') || categories.has('SCREEN'),
      hasLogic: true  // Code 节点总是可用
    };
  }

  private identifyMissingInfo(
    userIntent: string,
    capabilities: HardwareCapability[],
    completeness: ReturnType<typeof this.checkCompleteness>
  ): MissingInfo[] {
    const missing: MissingInfo[] = [];

    if (!completeness.hasTrigger) {
      missing.push({
        category: 'trigger',
        description: '触发条件未明确',
        priority: 1,
        blocking: true
      });
    }

    if (!completeness.hasAction) {
      missing.push({
        category: 'action',
        description: '执行动作未明确',
        priority: 1,
        blocking: true
      });
    }

    // 检查特定场景的缺失信息
    if (userIntent.includes('游戏') || userIntent.includes('玩')) {
      missing.push({
        category: 'logic',
        description: '游戏规则未定义',
        priority: 2,
        blocking: false
      });
    }

    return missing;
  }

  private async generateClarificationQuestions(
    userIntent: string,
    missingInfo: MissingInfo[],
    history: ConversationTurn[]
  ): Promise<ClarificationQuestion[]> {
    // 使用 LLM 生成针对性问题
    const prompt = this.buildClarificationPrompt(userIntent, missingInfo, history);
    const response = await this.llmClient.chat([
      { role: 'system', content: CLARIFICATION_SYSTEM_PROMPT },
      { role: 'user', content: prompt }
    ]);

    return this.parseClarificationResponse(response);
  }

  private calculateConfidence(
    missingInfo: MissingInfo[],
    history: ConversationTurn[]
  ): number {
    const blockingCount = missingInfo.filter(m => m.blocking).length;
    const totalCount = missingInfo.length;

    // 基础置信度：1 - (缺失信息比例)
    let confidence = 1 - (totalCount / 10);

    // 阻塞性缺失严重降低置信度
    confidence -= blockingCount * 0.3;

    // 多轮对话提升置信度
    confidence += Math.min(history.length * 0.1, 0.3);

    return Math.max(0, Math.min(1, confidence));
  }
}
```

### 3.3 组件组合器实现

```typescript
// src/agents/component-composer.ts

/**
 * [INPUT]: 依赖 CapabilityRegistry、WorkflowArchitect
 * [OUTPUT]: 对外提供 ComponentComposer 能力到节点的转换
 * [POS]: agents 的工作流拼装核心，类比 CC 的 tool invocation
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

export class ComponentComposer {
  constructor(
    private capabilityRegistry: CapabilityRegistry,
    private workflowArchitect: WorkflowArchitect
  ) {}

  async compose(
    capabilities: HardwareCapability[],
    userRequirements: Record<string, any>
  ): Promise<WorkflowDefinition> {
    // 1. 能力 → 节点映射
    const nodes = this.capabilitiesToNodes(capabilities, userRequirements);

    // 2. 构建拓扑结构
    const topology = this.buildTopology(nodes, capabilities);

    // 3. 填充参数
    const workflow = this.fillParameters(topology, userRequirements);

    // 4. 生成表达式
    const finalWorkflow = this.generateExpressions(workflow);

    return finalWorkflow;
  }

  private capabilitiesToNodes(
    capabilities: HardwareCapability[],
    requirements: Record<string, any>
  ): WorkflowNode[] {
    const nodes: WorkflowNode[] = [];

    // 添加触发节点
    nodes.push(this.createTriggerNode(requirements.trigger_type || 'webhook'));

    // 添加能力节点
    capabilities.forEach(cap => {
      nodes.push(this.createCapabilityNode(cap, requirements));
    });

    // 添加逻辑节点 (如果需要)
    if (this.needsLogicNode(capabilities, requirements)) {
      nodes.push(this.createLogicNode(requirements));
    }

    return nodes;
  }

  private buildTopology(
    nodes: WorkflowNode[],
    capabilities: HardwareCapability[]
  ): WorkflowDefinition {
    // 简单的线性拓扑：trigger → cap1 → cap2 → ... → capN
    const connections: Record<string, any> = {};

    for (let i = 0; i < nodes.length - 1; i++) {
      connections[nodes[i].id] = {
        main: [[{ node: nodes[i + 1].id, type: 'main', index: 0 }]]
      };
    }

    return {
      nodes,
      connections,
      settings: {},
      staticData: null
    };
  }

  private createCapabilityNode(
    capability: HardwareCapability,
    requirements: Record<string, any>
  ): WorkflowNode {
    return {
      id: randomUUID(),
      name: capability.displayName,
      type: capability.nodeType,
      typeVersion: getNodeTypeVersion(capability.nodeType),
      position: [0, 0],  // 后续自动布局
      parameters: {
        method: capability.apiEndpoint.method,
        url: capability.apiEndpoint.url,
        ...capability.apiEndpoint.parameters
      },
      notes: {
        category: capability.category,
        sub: this.extractSubParams(capability, requirements)
      }
    };
  }
}
```

---

## 四、实施路径

### 4.1 Phase 1: 能力注册表构建 (Week 1)

**目标**: 建立硬件能力查询基础设施

**任务**:
1. 实现 `CapabilityRegistry` 类
2. 从现有 `HARDWARE_COMPONENTS` 迁移数据
3. 构建关键词索引
4. 实现能力查询 API
5. 编写单元测试

**验收标准**:
- [ ] 支持关键词查询，返回匹配能力
- [ ] 支持能力组合验证（依赖检查）
- [ ] 查询性能 <10ms
- [ ] 单元测试覆盖率 >90%

### 4.2 Phase 2: 反思引擎实现 (Week 2)

**目标**: 实现多轮需求澄清机制

**任务**:
1. 实现 `ReflectionEngine` 类
2. 实现完整性检查逻辑
3. 实现缺失信息识别
4. 实现澄清问题生成（LLM）
5. 实现置信度计算

**验收标准**:
- [ ] 能识别 4 类缺失信息（trigger/action/feedback/logic）
- [ ] 生成的问题针对性强，不重复
- [ ] 置信度计算合理（0.8+ 可生成工作流）
- [ ] 最多 5 轮澄清后强制生成

### 4.3 Phase 3: 组件组合器重构 (Week 3)

**目标**: 从场景驱动转向能力驱动

**任务**:
1. 重构 `ComponentComposer` 类
2. 删除场景相关代码（`CATEGORY_REQUIRED_FIELDS`）
3. 实现能力到节点的动态映射
4. 实现拓扑自动构建
5. 集成测试

**验收标准**:
- [ ] 无任何硬编码场景
- [ ] 支持任意能力组合
- [ ] 生成的工作流通过验证
- [ ] 性能无明显下降

### 4.4 Phase 4: Orchestrator 集成 (Week 4)

**目标**: 实现端到端的能力驱动流程

**任务**:
1. 实现 `Orchestrator` Agent
2. 集成 CapabilityDiscoverer + ReflectionEngine + ComponentComposer
3. 实现多轮对话状态管理
4. 端到端测试（石头剪刀布示例）
5. 性能优化

**验收标准**:
- [ ] 支持任意用户需求（不限于 3 个场景）
- [ ] 多轮对话流畅，问题针对性强
- [ ] 生成的工作流质量不低于现有系统
- [ ] 平均响应时间 <8s

---

## 五、预期收益

### 5.1 通用性提升

**Before**:
- 仅支持 3 个预设场景
- 新场景需修改核心代码
- 用户需求受限于场景定义

**After**:
- 支持任意硬件能力组合
- 新能力仅需添加到注册表
- 用户需求不受限制

### 5.2 可扩展性提升

**Before**:
- 新增场景：修改 5+ 文件
- 开发时间：2-3 天
- 代码冲突风险：高

**After**:
- 新增能力：修改 1 个文件（registry）
- 开发时间：0.5 天
- 代码冲突风险：低

### 5.3 用户体验提升

**Before**:
- 用户需求不匹配场景 → 失败
- 澄清问题通用，针对性差
- 多轮对话效率低

**After**:
- 任何需求都能尝试组合能力
- 澄清问题基于缺失信息，针对性强
- 多轮对话高效（平均 2-3 轮）

---

## 六、风险与缓解

### 6.1 能力发现准确性风险

**风险**: 关键词匹配可能不准确，导致能力发现失败

**缓解**:
1. 使用 LLM 辅助关键词提取
2. 构建同义词库（"手势" = "gesture" = "动作"）
3. 支持模糊匹配和相似度排序
4. 提供"未找到能力"的友好提示

### 6.2 反思循环效率风险

**风险**: 多轮澄清可能导致用户疲劳

**缓解**:
1. 限制最多 5 轮澄清
2. 优先询问阻塞性问题
3. 支持用户强制生成（"开始生成"）
4. 提供默认值，减少必答问题

### 6.3 组合爆炸风险

**风险**: 能力组合数量指数增长，难以验证

**缓解**:
1. 限制单个工作流最多 10 个节点
2. 使用依赖关系剪枝无效组合
3. 优先推荐常用组合模式
4. 提供组合预览，让用户确认

---

## 七、总结

本 V2 设计文档实现了从"场景驱动"到"能力驱动"的根本性转变，核心思想是：

**消除场景概念，一切皆能力组合**

**类比 Claude Code**:
- CC: tools (Read/Write/Bash) → 动态调用 → 完成任务
- Tesseract: capabilities (camera/speaker/hand) → 动态组合 → 生成工作流

**三大核心机制**:
1. **能力注册表**: 硬件组件库 = Tools 集合
2. **反思引擎**: 多轮澄清 = CC 的 thinking process
3. **组件组合器**: 能力组合 = Tool invocation

**预期收益**:
- **通用性**: 支持任意需求，不限于 3 个场景
- **可扩展性**: 新能力开发时间缩短 80%
- **用户体验**: 多轮对话高效，平均 2-3 轮完成

**下一步行动**:
1. 评审本 V2 设计，确认技术方案
2. 启动 Phase 1 能力注册表构建
3. 建立每周进度同步机制

---

**Conceived by Romuald Członkowski** - [www.aiadvisors.pl/en](https://www.aiadvisors.pl/en)