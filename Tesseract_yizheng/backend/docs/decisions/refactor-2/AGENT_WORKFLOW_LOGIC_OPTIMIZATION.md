# Agent 工作流逻辑优化方案 v2

**目标**: Agent 生成完整的端到端工作流，节点丰富度与串联逻辑达到样例水平

**问题诊断**: 节点环境变量配置 ✅，但节点数量和串联逻辑 ❌

---

## 问题诊断

### 实际生成（`docs/json/011701.json`）
```
节点数: 4 个
链路: Webhook → 提取数据 → 判断条件 → 准备参数 → (结束)
```

### 目标样例（`docs/refactor_2/json/gesture.json`）
```
节点数: 22 个
链路: 定时触发 → 底盘巡逻 → 摄像头抓拍 → yolov8识别 →
      解析结果 → 判断人物 → 配置响应 → 机械手+TTS+喇叭执行
```

### 核心差距

| 维度 | 实际生成 | 目标样例 | 差距 |
|------|---------|---------|------|
| **节点数量** | 4 | 22 | -82% |
| **硬件调用** | 0 | 8 | 完全缺失 |
| **数据转换** | 2 | 6 | 严重不足 |
| **条件分支** | 1 | 6 | 逻辑简化过度 |
| **触发方式** | Webhook | Schedule | 理解偏差 |

### 根本原因

#### 1. Few-Shot 样例不完整
```
当前 keyNodes（14 个）: 仅包含关键节点配置
缺失: 完整的 nodes 数组和 connections 结构

问题: LLM 无法理解如何串联这些节点
```

#### 2. 缺少工作流模式指导
```
当前: 只有节点级别的配置规范
缺失: 工作流级别的拓扑模式

问题: LLM 不知道"摄像头识别响应"的标准流程是什么
```

#### 3. 拓扑描述过于简化
```
当前 topology: "触发器 → 人脸识别 → IF(识别到老刘) → 机械手动作 → 喇叭播报"
缺失: 每个箭头之间的中间步骤

问题: LLM 无法推断出:
  - "人脸识别"需要先调摄像头API获取图片
  - 再调yolov8 API识别
  - 再提取识别结果
  - "机械手动作"需要先Set配置，再调API，再等待响应
```

---

## 优化方案

### Phase 1: 扩展 Few-Shot 为完整工作流示例（核心）

**目标**: 让 LLM 看到完整的端到端工作流 JSON

#### 方案 1A: 提供精简版完整工作流（推荐）

**操作**:
```typescript
// src/agents/prompts/few-shot-examples.ts

export interface FewShotExample {
  title: string;
  userIntent: string;
  topology: string;
  keyNodes: Array<...>;  // 保留
  fullWorkflowSample: {  // 新增
    nodes: Array<...>;       // 精简版完整节点数组（8-12个核心节点）
    connections: object;     // 完整连接结构
  };
}
```

**精简策略**:
- gesture.json 22 节点 → 精简为 12 节点
- 保留: 触发器、摄像头、识别、判断、执行的完整链路
- 删除: 底盘巡逻的重复分支（保留1个示例即可）

**优点**:
- LLM 看到完整的端到端流程
- 理解节点如何串联（connections 结构）
- Prompt 增量可控（~800 行 JSON per example）

**缺点**:
- Prompt 变长（3个示例 ~2400 行）

#### 方案 1B: 提供分段工作流模板（备选）

**操作**:
```typescript
export const WORKFLOW_PATTERNS = [
  {
    name: '摄像头识别响应模式',
    stages: [
      {
        name: '输入段',
        nodes: [
          // 摄像头抓拍节点
          // Set 提取图片节点
        ]
      },
      {
        name: '处理段',
        nodes: [
          // httpRequest yolov8 识别
          // Set 解析结果
          // IF 判断条件
        ]
      },
      {
        name: '输出段',
        nodes: [
          // Set 配置响应
          // httpRequest 执行硬件
          // httpRequest TTS
          // httpRequest 喇叭
        ]
      }
    ]
  }
];
```

**优点**:
- 模块化，易扩展
- Prompt 增量小

**缺点**:
- LLM 需要额外推理如何组合各段
- 可能仍然生成不完整的流程

---

### Phase 2: 增强拓扑描述（辅助）

**当前 topology 问题**:
```
"触发器 → 人脸识别 → IF(识别到老刘) → 机械手动作 → 喇叭播报"
```

**优化为详细步骤**:
```typescript
topology: `
1. Schedule Trigger (30s)
2. httpRequest - 摄像头抓拍
3. Set - 提取图片 base64
4. httpRequest - yolov8 人脸识别
5. Set - 解析识别结果 (person, confidence)
6. IF - 是否老刘
7. Set - 配置手势与文案
8. httpRequest - 机械手执行手势
9. httpRequest - TTS 生成音频
10. Set - 提取音频 URL
11. httpRequest - 喇叭播放
`
```

**优点**:
- 步骤明确，LLM 可直接映射为节点
- 包含节点类型提示（httpRequest, Set, IF）

---

### Phase 3: 添加工作流模式库（高级）

**新建文件**: `src/agents/prompts/workflow-patterns.ts`

```typescript
export const WORKFLOW_PATTERNS = {
  '摄像头识别响应': {
    description: '摄像头输入 → AI识别 → 条件判断 → 硬件执行 → 音频播报',
    minNodes: 8,
    requiredStages: [
      '输入采集（摄像头/麦克风）',
      'AI处理（yolov8/ASR/LLM）',
      '条件判断（IF节点）',
      '硬件执行（机械手/机械臂/底盘/屏幕）',
      '音频输出（TTS + 喇叭）'
    ],
    template: {
      nodes: [...],  // 模板节点
      connections: {...}
    }
  },

  '定时巡逻感知': {
    description: '定时触发 → 随机移动 → 多传感器采集 → 综合判断 → 响应',
    minNodes: 10,
    requiredStages: [...]
  },

  '多硬件协同': {
    description: '并行采集多传感器 → 融合处理 → 协同执行',
    minNodes: 12,
    requiredStages: [...]
  }
};
```

**集成到 System Prompt**:
```typescript
function renderWorkflowPatterns(): string {
  return `
## 工作流设计模式（必须遵守）

### 模式1: 摄像头识别响应（最低8个节点）
输入段:
  1. httpRequest - 摄像头抓拍 (环境变量)
  2. Set - 提取图片数据 (容错表达式)

处理段:
  3. httpRequest - AI识别 (yolov8/ASR)
  4. Set - 解析识别结果 (容错表达式)
  5. IF - 条件判断 (v2 完整格式)

输出段:
  6. Set - 配置响应参数
  7. httpRequest - 硬件执行 (机械手/机械臂)
  8. httpRequest - TTS 生成
  9. Set - 提取音频URL
  10. httpRequest - 喇叭播放
`;
}
```

---

### Phase 4: 增强 Architect 推理逻辑（可选）

**新增 Prompt 指令**:
```typescript
# 工作流生成步骤（强制执行）

STEP 1: 拆解用户需求为详细步骤
  - 识别硬件输入（摄像头/麦克风/传感器）
  - 识别AI处理（yolov8/ASR/LLM/StructBERT）
  - 识别硬件输出（机械手/机械臂/喇叭/屏幕/底盘）
  - 识别数据流转（每个步骤的输入输出）

STEP 2: 为每个步骤分配节点类型
  - 硬件输入/输出 → httpRequest (必须包含环境变量 + timeout)
  - 数据提取/转换 → Set (必须使用容错表达式)
  - 条件判断 → IF (v2 完整格式)
  - 定时/事件 → Trigger

STEP 3: 构建节点数组
  - 节点数量检查: 至少 8-10 个节点
  - 每个硬件API调用前后必须有 Set 节点做数据转换

STEP 4: 构建连接关系
  - 输入段 → 处理段 → 输出段 线性串联
  - IF 节点 true 分支连接后续执行
  - 确保无孤立节点

STEP 5: 质量自检
  - ✅ 是否包含所有必需的硬件API调用？
  - ✅ 是否包含足够的数据转换节点？
  - ✅ 是否使用了环境变量和容错表达式？
  - ✅ 节点数量是否合理（8-20个）？
```

---

## 推荐实施方案（组合）

### 核心方案: Phase 1A + Phase 2

**优先级**: P0（必须执行）

**操作**:
1. 更新 `few-shot-examples.ts`
   - 添加 `fullWorkflowSample` 字段
   - 从 gesture.json 精简为 12 节点核心流程
   - 从 emo.json 精简为 10 节点核心流程
   - 从 game.json 精简为 10 节点核心流程

2. 更新 `topology` 为详细步骤列表
   - 每个步骤标注节点类型
   - 明确输入输出

3. 更新 `architect-system.ts`
   - 渲染 `fullWorkflowSample` 到 Prompt
   - 添加"工作流生成步骤"指令

**预期 Prompt 增量**: +2500 行（3个完整示例）

**预期效果**: 节点数量 4 → 10-12，逻辑链路完整

---

### 辅助方案: Phase 3

**优先级**: P1（建议执行）

**操作**:
1. 新建 `workflow-patterns.ts`
2. 定义 3-5 个标准模式
3. 集成到 System Prompt

**预期 Prompt 增量**: +300 行

**预期效果**: 模式匹配准确率 +20%

---

### 高级方案: Phase 4

**优先级**: P2（可选执行）

**操作**:
1. 添加"工作流生成步骤"强制推理指令
2. 添加节点数量检查逻辑

**预期 Prompt 增量**: +200 行

**预期效果**: 质量稳定性 +15%

---

## 精简版完整工作流提取清单

### gesture.json (22 节点 → 12 节点)

**保留核心链路**:
```json
1. Schedule Trigger (30s)                    ← 触发器
2. httpRequest - 摄像头抓拍                   ← 输入
3. Set - 提取图片 base64                      ← 数据转换
4. httpRequest - yolov8 识别                  ← AI处理
5. Set - 解析识别结果                         ← 数据转换
6. IF - 是否老刘                              ← 条件判断
7. Set - 配置手势与文案                       ← 响应配置
8. httpRequest - 机械手执行                   ← 硬件执行
9. httpRequest - TTS 生成                     ← AI处理
10. Set - 提取音频URL                         ← 数据转换
11. httpRequest - 喇叭播放                    ← 硬件执行
12. (可选) IF - 是否老付 分支示例
```

**删除冗余**:
- 底盘巡逻的 3 个 IF 分支（保留 1 个示例即可）
- 重复的 Set Random n
- 多余的底盘移动节点（保留原理说明）

**connections 结构**:
- 完整保留，展示如何串联

---

### emo.json (20 节点 → 10 节点)

**保留核心链路**:
```json
1. Schedule Trigger
2. httpRequest - 摄像头
3. Set - 提取图片
4. httpRequest - yolov8 手势识别
5. Set - 识别结果
6. IF - 是高兴/难过
7. Set - 响应配置
8. httpRequest - 屏幕emoji
9. httpRequest - TTS
10. httpRequest - 喇叭
```

**删除冗余**:
- 麦克风 + ASR + StructBERT 分支（已有摄像头分支即可）
- 机械臂动作（与核心流程无关）

---

### game.json (30 节点 → 10 节点)

**保留核心链路**:
```json
1. Schedule Trigger
2. Set - 倒数文案
3. httpRequest - TTS 倒数
4. httpRequest - 喇叭播放倒数
5. Set - 机器人随机手势
6. httpRequest - 摄像头抓拍
7. httpRequest - yolov8 识别
8. Set - 识别用户手势
9. IF - 判断输赢（保留2个示例）
10. Set - 结果配置
11. httpRequest - 屏幕emoji
12. httpRequest - TTS
13. httpRequest - 喇叭
```

**删除冗余**:
- 8 个输赢判断 IF → 保留 2 个（赢、输各1个）
- 平局/识别空 的处理

---

## 验证标准（执行后）

### 节点数量检查
```
最低标准: 8-10 个节点
理想标准: 10-15 个节点
包含:
  ✅ 至少 3 个 httpRequest (硬件API)
  ✅ 至少 3 个 Set (数据转换)
  ✅ 至少 1 个 IF (条件判断)
  ✅ 1 个 Trigger
```

### 逻辑链路检查
```
输入段:
  ✅ 硬件输入节点 (摄像头/麦克风)
  ✅ 数据提取节点 (Set)

处理段:
  ✅ AI识别节点 (httpRequest yolov8/ASR)
  ✅ 结果解析节点 (Set)
  ✅ 条件判断节点 (IF)

输出段:
  ✅ 响应配置节点 (Set)
  ✅ 硬件执行节点 (httpRequest 机械手/机械臂)
  ✅ TTS节点 (httpRequest)
  ✅ 喇叭节点 (httpRequest)
```

### 质量检查
```
环境变量:
  ✅ 所有 httpRequest 使用 {{$env.XXX || "fallback"}}

容错表达式:
  ✅ 所有 Set 数据提取使用 {{$json.x || $json.y || ""}}

IF v2 格式:
  ✅ 包含 combinator
  ✅ operator 包含 {type, operation, name}

节点命名:
  ✅ 清晰的中文命名（httpRequest - 摄像头抓拍）
```

---

## 工作量估算

| Phase | 任务 | 工时 |
|-------|------|------|
| **Phase 1A** | 精简 gesture.json 为 12 节点 | 30分钟 |
| | 精简 emo.json 为 10 节点 | 30分钟 |
| | 精简 game.json 为 10 节点 | 30分钟 |
| | 更新 few-shot-examples.ts | 45分钟 |
| | 更新 architect-system.ts 渲染 | 15分钟 |
| **Phase 2** | 编写详细 topology | 30分钟 |
| **Phase 3** | 创建 workflow-patterns.ts | 45分钟 |
| | 集成到 System Prompt | 15分钟 |
| **Phase 4** | 添加推理步骤指令 | 30分钟 |
| **测试** | 生成测试 + 验证 | 60分钟 |
| **总计** | | **5 小时** |

---

## 下一步

1. **确认方案**: 是否采用 Phase 1A + Phase 2 核心方案？
2. **开始执行**: 提取精简版完整工作流
3. **测试验证**: 生成"见到老刘竖个中指骂人"并对比

---

**位置**: `/mnt/e/tesseract/docs/refactor_2/AGENT_WORKFLOW_LOGIC_OPTIMIZATION.md`
**最后更新**: 2026-01-17

