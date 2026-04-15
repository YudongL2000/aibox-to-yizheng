# 优化执行文档 5：节点依赖规则与 ConfigAgent 跳过逻辑

---

## 问题诊断

### 问题 1：最后的 SPEAKER 节点前缺少 TTS 节点

**020404.json 当前结构**：
```
Code_Screen_Display [SCREEN]
    ↓
Code_Speaker_Result [SPEAKER]  ← ❌ 缺少前置 TTS 节点
```

**范例 game_0203.json 正确结构**：
```
code_screen_execute_win_happy [SCREEN]
    ↓
set_audio_generate_win [TTS]  ← ✅ TTS 节点
    ↓
code_speaker_execute_win [SPEAKER]
```

---

### 问题 2：HAND 节点后缺少 ASSIGN 节点

**020404.json 当前结构**：
```
Code_Hand_Execute [HAND]
    ↓
HttpRequest_Camera_Snapshot [CAM]  ← ❌ 缺少 ASSIGN 节点存储手势状态
```

**范例 game_0203.json 正确结构**：
```
code_hand_execute_rock [HAND]
    ↓
set_robot_gesture_rock [ASSIGN]  ← ✅ ASSIGN 节点存储 robotGesture
    ↓
http_request_camera_snapshot [CAM]
```

---

### 问题 3：ConfigAgent 跳过逻辑未实现

**需要跳过配置的 category**：
- `YOLO-RPS`：处理器，无硬件
- `RAM`：处理器，无硬件
- `ASSIGN`：处理器，无硬件

**需要配置的 category（含硬件组装）**：
- `TTS`：需要配置 `TTS_input`
- `SPEAKER`：需要硬件组装
- `CAM`：需要硬件组装
- `HAND`：需要硬件组装
- `SCREEN`：需要硬件组装 + 配置 `execute_emoji`

---

## 节点依赖规则（核心抽象）

### 规则 1：SPEAKER 节点前必须有 TTS 节点

```typescript
// src/agents/prompts/node-dependency-rules.ts

/**
 * 规则：SPEAKER 前必须有 TTS
 * 原因：SPEAKER 播放的音频来自 TTS 合成
 * 依赖：SPEAKER.sub.audio_name = TTS.sub.audio_name
 */
export const SPEAKER_REQUIRES_TTS = {
  targetCategory: 'SPEAKER',
  requiredPredecessor: 'TTS',
  linkField: 'audio_name',
  errorMessage: 'SPEAKER 节点前必须有 TTS 节点提供音频源'
};

// 验证函数
export function validateSpeakerHasTts(
  speakerNode: WorkflowNode,
  predecessors: WorkflowNode[]
): ValidationResult {
  const hasTts = predecessors.some(n =>
    JSON.parse(n.notes).category === 'TTS'
  );

  if (!hasTts) {
    return {
      valid: false,
      error: SPEAKER_REQUIRES_TTS.errorMessage,
      fix: {
        action: 'INSERT_BEFORE',
        targetNode: speakerNode.name,
        insertNode: {
          category: 'TTS',
          sub: {
            TTS_input: '',  // ConfigAgent 填充
            audio_name: JSON.parse(speakerNode.notes).sub?.audio_name || 'audio'
          }
        }
      }
    };
  }

  return { valid: true };
}
```

### 规则 2：YOLO 节点前必须有 CAM 节点

```typescript
/**
 * 规则：YOLO-RPS 前必须有 CAM
 * 原因：YOLO 识别需要摄像头图像输入
 * 依赖：YOLO-RPS.sub.yolov_input = CAM.sub.output
 */
export const YOLO_REQUIRES_CAM = {
  targetCategory: 'YOLO-RPS',
  requiredPredecessor: 'CAM',
  linkField: { from: 'output', to: 'yolov_input' },
  errorMessage: 'YOLO-RPS 节点前必须有 CAM 节点提供图像输入'
};

// 验证函数
export function validateYoloHasCam(
  yoloNode: WorkflowNode,
  predecessors: WorkflowNode[]
): ValidationResult {
  const hasCam = predecessors.some(n =>
    JSON.parse(n.notes).category === 'CAM'
  );

  if (!hasCam) {
    return {
      valid: false,
      error: YOLO_REQUIRES_CAM.errorMessage,
      fix: {
        action: 'INSERT_BEFORE',
        targetNode: yoloNode.name,
        insertNode: {
          category: 'CAM',
          sub: {
            output: JSON.parse(yoloNode.notes).sub?.yolov_input || 'camera1'
          }
        }
      }
    };
  }

  return { valid: true };
}
```

### 规则 3：HAND 节点后必须有 ASSIGN 节点

```typescript
/**
 * 规则：HAND 后必须有 ASSIGN
 * 原因：需要存储机器人手势状态供后续胜负判断使用
 * 依赖：ASSIGN.sub.robotGesture = HAND.sub.execute_gesture
 */
export const HAND_REQUIRES_ASSIGN = {
  targetCategory: 'HAND',
  requiredSuccessor: 'ASSIGN',
  linkField: { from: 'execute_gesture', to: 'robotGesture' },
  errorMessage: 'HAND 节点后必须有 ASSIGN 节点存储手势状态'
};

// 验证函数
export function validateHandHasAssign(
  handNode: WorkflowNode,
  successors: WorkflowNode[]
): ValidationResult {
  const hasAssign = successors.some(n =>
    JSON.parse(n.notes).category === 'ASSIGN'
  );

  if (!hasAssign) {
    const handNotes = JSON.parse(handNode.notes);
    return {
      valid: false,
      error: HAND_REQUIRES_ASSIGN.errorMessage,
      fix: {
        action: 'INSERT_AFTER',
        targetNode: handNode.name,
        insertNode: {
          category: 'ASSIGN',
          sub: {
            robotGesture: handNotes.sub?.execute_gesture?.toLowerCase() || ''
          }
        }
      }
    };
  }

  return { valid: true };
}
```

---

## ConfigAgent 跳过逻辑

### 跳过配置的 category 列表

```typescript
// src/agents/config-agent.ts

/**
 * ConfigAgent 跳过配置的 category
 * 这些节点无硬件组装需求，IntakeAgent 已完成配置
 */
export const CONFIG_SKIP_CATEGORIES: NodeCategory[] = [
  'YOLO-RPS',  // 处理器，无硬件
  'RAM',       // 处理器，无硬件
  'ASSIGN',    // 处理器，无硬件
  'BASE'       // 触发器/逻辑器，无硬件
];

/**
 * ConfigAgent 需要配置的 category
 * 包含硬件组装或需要用户输入的节点
 */
export const CONFIG_REQUIRED_CATEGORIES: NodeCategory[] = [
  'TTS',       // 需要配置 TTS_input
  'SPEAKER',   // 需要硬件组装
  'CAM',       // 需要硬件组装
  'HAND',      // 需要硬件组装
  'SCREEN'     // 需要硬件组装 + 配置 execute_emoji
];

// 判断节点是否需要 ConfigAgent 配置
export function needsConfigAgentConfig(category: NodeCategory): boolean {
  return CONFIG_REQUIRED_CATEGORIES.includes(category);
}
```

### 更新 extractConfigurableNodes 方法

```typescript
// src/agents/config-agent.ts

private extractConfigurableNodes(workflow: any, sessionId: string): ConfigurableNode[] {
  if (!workflow?.nodes) return [];

  return workflow.nodes
    .filter((node: any) => {
      const notes = this.parseNotes(node.notes);
      const category = notes?.category as NodeCategory;

      // 跳过不需要配置的 category
      if (CONFIG_SKIP_CATEGORIES.includes(category)) {
        return false;
      }

      // 只保留需要配置的 category
      return CONFIG_REQUIRED_CATEGORIES.includes(category);
    })
    .map((node: any) => {
      const notes = this.parseNotes(node.notes);
      const category = notes?.category as NodeCategory;

      return {
        name: node.name,
        type: node.type,
        category,
        title: notes?.title || node.name,
        subtitle: notes?.subtitle || '',
        extra: notes?.extra || 'pending',
        configFields: {
          // 硬件配置（所有硬件节点都需要）
          needsTopology: ['CAM', 'HAND', 'SPEAKER', 'SCREEN'].includes(category),
          needsDeviceId: ['CAM', 'HAND', 'SPEAKER', 'SCREEN'].includes(category),
          // sub 字段配置
          needsTtsInput: category === 'TTS',
          needsExecuteEmoji: category === 'SCREEN'
        },
        configValues: {}
      } as ConfigurableNode;
    });
}
```

---

## 工作流生成时自动插入依赖节点

### 更新 workflow-architect.ts

```typescript
// src/agents/workflow-architect.ts

import {
  validateSpeakerHasTts,
  validateYoloHasCam,
  validateHandHasAssign
} from './prompts/node-dependency-rules';

class WorkflowArchitect {
  // 生成工作流后验证并修复依赖
  async generateWorkflow(intent: UserIntent): Promise<Workflow> {
    const workflow = await this.buildInitialWorkflow(intent);

    // 验证并修复节点依赖
    const fixedWorkflow = this.validateAndFixDependencies(workflow);

    return fixedWorkflow;
  }

  private validateAndFixDependencies(workflow: Workflow): Workflow {
    const nodes = [...workflow.nodes];
    const connections = { ...workflow.connections };
    const insertions: NodeInsertion[] = [];

    for (const node of nodes) {
      const notes = JSON.parse(node.notes);
      const category = notes.category;
      const predecessors = this.getPredecessors(node, workflow);
      const successors = this.getSuccessors(node, workflow);

      // 规则 1: SPEAKER 前必须有 TTS
      if (category === 'SPEAKER') {
        const result = validateSpeakerHasTts(node, predecessors);
        if (!result.valid && result.fix) {
          insertions.push(result.fix);
        }
      }

      // 规则 2: YOLO-RPS 前必须有 CAM
      if (category === 'YOLO-RPS') {
        const result = validateYoloHasCam(node, predecessors);
        if (!result.valid && result.fix) {
          insertions.push(result.fix);
        }
      }

      // 规则 3: HAND 后必须有 ASSIGN
      if (category === 'HAND') {
        const result = validateHandHasAssign(node, successors);
        if (!result.valid && result.fix) {
          insertions.push(result.fix);
        }
      }
    }

    // 应用插入
    return this.applyInsertions(workflow, insertions);
  }

  private applyInsertions(workflow: Workflow, insertions: NodeInsertion[]): Workflow {
    for (const insertion of insertions) {
      if (insertion.action === 'INSERT_BEFORE') {
        this.insertNodeBefore(workflow, insertion.targetNode, insertion.insertNode);
      } else if (insertion.action === 'INSERT_AFTER') {
        this.insertNodeAfter(workflow, insertion.targetNode, insertion.insertNode);
      }
    }
    return workflow;
  }
}
```

---

## 修复后的正确工作流结构

### 020404.json 修复后节点列表

```
阶段 1: 倒数播报
1. Schedule_Trigger_Game         [BASE]        触发器 - 跳过配置
2. Set_Countdown_Config          [TTS]         倒数语音 - 需要配置 TTS_input
3. HttpRequest_Speaker_Countdown [SPEAKER]     倒数播报 - 需要硬件组装

阶段 2: 机器人出拳
4. Set_Random_Number             [RAM]         随机数 - 跳过配置
5. IF_n_equals_1                 [BASE]        判断 - 跳过配置
6. IF_n_equals_2                 [BASE]        判断 - 跳过配置
7. IF_n_equals_3                 [BASE]        判断 - 跳过配置
8. Code_Hand_Execute             [HAND]        机械手 - 需要硬件组装
9. Set_Robot_Gesture_Assign      [ASSIGN]      手势赋值 - 跳过配置 ← 新增

阶段 3: 用户识别
10. HttpRequest_Camera_Snapshot  [CAM]         摄像头 - 需要硬件组装
11. Set_Extract_User_Gesture     [YOLO-RPS]    手势识别 - 跳过配置

阶段 4: 胜负判断
12-19. IF_* 判断节点             [BASE]        逻辑判断 - 跳过配置

阶段 5: 结果反馈
20. Code_Screen_Display          [SCREEN]      屏幕显示 - 需要硬件组装 + execute_emoji
21. Set_Result_TTS               [TTS]         结果语音 - 需要配置 TTS_input ← 新增
22. Code_Speaker_Result          [SPEAKER]     结果播报 - 需要硬件组装
```

### 修复后的连接关系

```typescript
// 修复后的关键连接
const FIXED_CONNECTIONS = {
  // 规则 3 修复: HAND → ASSIGN → CAM
  'Code_Hand_Execute': ['Set_Robot_Gesture_Assign'],
  'Set_Robot_Gesture_Assign': ['HttpRequest_Camera_Snapshot'],

  // 规则 1 修复: SCREEN → TTS → SPEAKER
  'Code_Screen_Display': ['Set_Result_TTS'],
  'Set_Result_TTS': ['Code_Speaker_Result']
};
```

---

## ConfigAgent 配置顺序

### 需要配置的节点（按工作流顺序）

| 序号 | 节点名 | category | 配置内容 |
|------|--------|----------|---------|
| 1 | Set_Countdown_Config | TTS | `TTS_input` 文本输入 |
| 2 | HttpRequest_Speaker_Countdown | SPEAKER | `topology`, `device_ID` 硬件组装 |
| 3 | Code_Hand_Execute | HAND | `topology`, `device_ID` 硬件组装 |
| 4 | HttpRequest_Camera_Snapshot | CAM | `topology`, `device_ID` 硬件组装 |
| 5 | Code_Screen_Display | SCREEN | `topology`, `device_ID` 硬件组装 + `execute_emoji` |
| 6 | Set_Result_TTS | TTS | `TTS_input` 文本输入 |
| 7 | Code_Speaker_Result | SPEAKER | `topology`, `device_ID` 硬件组装 |

### 跳过配置的节点

| category | 节点示例 | 跳过原因 |
|----------|---------|---------|
| BASE | Schedule_Trigger_Game, IF_* | 触发器/逻辑器，无硬件 |
| RAM | Set_Random_Number | 处理器，无硬件 |
| ASSIGN | Set_Robot_Gesture_Assign | 处理器，无硬件 |
| YOLO-RPS | Set_Extract_User_Gesture | 处理器，无硬件 |

---

## 执行顺序

| Phase | 任务 | 文件 | Commit |
|-------|------|------|--------|
| 1 | 实现节点依赖规则 | `node-dependency-rules.ts` | `feat(prompts): add node dependency validation rules` |
| 2 | 更新工作流生成器 | `workflow-architect.ts` | `fix(architect): auto-insert missing dependency nodes` |
| 3 | 更新 ConfigAgent 跳过逻辑 | `config-agent.ts` | `feat(agent): skip YOLO-RPS/RAM/ASSIGN in ConfigAgent` |
| 4 | 添加测试用例 | `node-dependency.test.ts` | `test(prompts): add node dependency validation tests` |

---

## 测试用例

```typescript
// tests/unit/agents/node-dependency.test.ts

describe('Node Dependency Rules', () => {
  describe('SPEAKER requires TTS', () => {
    it('should fail when SPEAKER has no TTS predecessor', () => {
      const speakerNode = createNode({ category: 'SPEAKER' });
      const predecessors = [createNode({ category: 'SCREEN' })];

      const result = validateSpeakerHasTts(speakerNode, predecessors);

      expect(result.valid).toBe(false);
      expect(result.fix?.action).toBe('INSERT_BEFORE');
      expect(result.fix?.insertNode.category).toBe('TTS');
    });

    it('should pass when SPEAKER has TTS predecessor', () => {
      const speakerNode = createNode({ category: 'SPEAKER' });
      const predecessors = [createNode({ category: 'TTS' })];

      const result = validateSpeakerHasTts(speakerNode, predecessors);

      expect(result.valid).toBe(true);
    });
  });

  describe('YOLO-RPS requires CAM', () => {
    it('should fail when YOLO-RPS has no CAM predecessor', () => {
      const yoloNode = createNode({ category: 'YOLO-RPS' });
      const predecessors = [createNode({ category: 'HAND' })];

      const result = validateYoloHasCam(yoloNode, predecessors);

      expect(result.valid).toBe(false);
      expect(result.fix?.insertNode.category).toBe('CAM');
    });
  });

  describe('HAND requires ASSIGN', () => {
    it('should fail when HAND has no ASSIGN successor', () => {
      const handNode = createNode({
        category: 'HAND',
        sub: { execute_gesture: 'Rock' }
      });
      const successors = [createNode({ category: 'CAM' })];

      const result = validateHandHasAssign(handNode, successors);

      expect(result.valid).toBe(false);
      expect(result.fix?.action).toBe('INSERT_AFTER');
      expect(result.fix?.insertNode.sub.robotGesture).toBe('rock');
    });
  });
});

describe('ConfigAgent Skip Logic', () => {
  it('should skip YOLO-RPS, RAM, ASSIGN categories', () => {
    expect(needsConfigAgentConfig('YOLO-RPS')).toBe(false);
    expect(needsConfigAgentConfig('RAM')).toBe(false);
    expect(needsConfigAgentConfig('ASSIGN')).toBe(false);
    expect(needsConfigAgentConfig('BASE')).toBe(false);
  });

  it('should require config for TTS, SPEAKER, CAM, HAND, SCREEN', () => {
    expect(needsConfigAgentConfig('TTS')).toBe(true);
    expect(needsConfigAgentConfig('SPEAKER')).toBe(true);
    expect(needsConfigAgentConfig('CAM')).toBe(true);
    expect(needsConfigAgentConfig('HAND')).toBe(true);
    expect(needsConfigAgentConfig('SCREEN')).toBe(true);
  });
});
```

---

## 验证检查清单

### 节点依赖检查
- [ ] 每个 SPEAKER 节点前有 TTS 节点
- [ ] 每个 YOLO-RPS 节点前有 CAM 节点
- [ ] 每个 HAND 节点后有 ASSIGN 节点
- [ ] TTS.sub.audio_name = SPEAKER.sub.audio_name
- [ ] CAM.sub.output = YOLO-RPS.sub.yolov_input
- [ ] HAND.sub.execute_gesture → ASSIGN.sub.robotGesture

### ConfigAgent 跳过检查
- [ ] YOLO-RPS 节点被跳过
- [ ] RAM 节点被跳过
- [ ] ASSIGN 节点被跳过
- [ ] BASE 节点被跳过
- [ ] TTS/SPEAKER/CAM/HAND/SCREEN 节点被配置
- [ ] SCREEN 节点配置后走硬件组装流程
