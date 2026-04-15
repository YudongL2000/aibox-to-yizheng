# 优化执行文档 3：节点简洁度与类型映射修复

---

## 问题诊断

### 问题 1：冗余赋值节点过多

**现象**：当前工作流包含大量不必要的 `set` 赋值节点

| 节点名 | 问题 |
|--------|------|
| `set_extract_audio_url` (id:4) | ❌ 冗余，TTS 输出直接传递即可 |
| `set_robot_rock` (id:8) | ❌ 冗余，robotGesture 已在 notes.sub 定义 |
| `set_robot_scissors` (id:10) | ❌ 冗余，同上 |
| `set_robot_paper` (id:12) | ❌ 冗余，同上 |
| `set_extract_image_base64` (id:15) | ❌ 冗余，CAM 输出直接传递即可 |
| `set_extract_user_gesture` (id:17) | ❌ 冗余，YOLO 输出直接传递即可 |
| `set_result_gesture_empty` (id:19) | ❌ 冗余，结果已在 IF 分支确定 |
| `set_result_draw` (id:21) | ❌ 冗余，同上 |
| `set_result_robot_win_1/2/3` (id:23,25,27) | ❌ 冗余，同上 |
| `set_result_robot_lose` (id:29) | ❌ 冗余，同上 |
| `set_extract_result_audio` (id:32) | ❌ 冗余，TTS 输出直接传递即可 |

**范例要求** (game_nodes.md)：
- 赋值节点 (`category: ASSIGN`) 仅在机械臂执行节点后需要
- 其他节点参数已作为 `notes.sub` 字段定义，无需额外赋值

---

### 问题 2：执行器节点类型映射错误

**现象**：执行器节点使用了 `httpRequest` 而非 `code`

| 当前输出 | 范例要求 | 问题 |
|---------|---------|------|
| `http_mechanical_hand_gesture` (httpRequest) | `code_hand_execute_rock` (code) | ❌ HAND 应使用 code |
| `http_speaker_play_countdown` (httpRequest) | `code_speaker_execute_countdown` (code) | ❌ SPEAKER 应使用 code |
| `http_screen_display_emoji` (httpRequest) | `code_screen_execute_win_happy` (code) | ❌ SCREEN 应使用 code |

**范例要求** (game_nodes.md 2.5 执行器)：
```
执行器-"type": "n8n-nodes-base.code"
- 机械手节点-"category": "HAND"
- 喇叭节点-"category": "SPEAKER"
- 屏幕节点-"category": "SCREEN"
```

---

## 节点类型映射规则（严格基于 game_nodes.md）

```typescript
// src/agents/prompts/node-type-mapping.ts

/**
 * 节点类型映射规则
 *
 * | 功能分类 | category | n8n type | parameters |
 * |---------|----------|----------|------------|
 * | 触发器 | BASE | scheduleTrigger | rule.interval: [{}] |
 * | 感知器 | CAM | httpRequest | method, url, options |
 * | 处理器 | TTS/RAM/ASSIGN/YOLO-RPS | set | assignments: [] |
 * | 执行器 | HAND/SPEAKER/SCREEN | code | {} |
 * | 逻辑器 | BASE | if/switch | conditions/rules |
 */

export const CATEGORY_TO_N8N_TYPE: Record<string, string> = {
  // 触发器
  'BASE_TRIGGER': 'n8n-nodes-base.scheduleTrigger',

  // 感知器
  'CAM': 'n8n-nodes-base.httpRequest',

  // 处理器
  'TTS': 'n8n-nodes-base.set',
  'RAM': 'n8n-nodes-base.set',
  'ASSIGN': 'n8n-nodes-base.set',
  'YOLO-RPS': 'n8n-nodes-base.set',

  // 执行器 - 必须使用 code 节点
  'HAND': 'n8n-nodes-base.code',
  'SPEAKER': 'n8n-nodes-base.code',
  'SCREEN': 'n8n-nodes-base.code',

  // 逻辑器
  'BASE_IF': 'n8n-nodes-base.if',
  'BASE_SWITCH': 'n8n-nodes-base.switch'
};

// 验证节点类型是否正确
export function validateNodeType(category: string, actualType: string): boolean {
  const expectedType = CATEGORY_TO_N8N_TYPE[category];
  return expectedType === actualType;
}
```

---

## 简化后的工作流节点结构

### 精简节点列表（33 → 22 节点）

```
1. schedule_trigger_game_start     [BASE]        触发器
2. set_countdown_config            [TTS]         倒数语音配置
3. code_speaker_execute_countdown  [SPEAKER]     倒数播报 ← 类型修复
4. set_random_robot_gesture        [RAM]         随机出拳
5. if_robot_rock_n1                [BASE]        n=1 判断
6. if_robot_scissors_n2            [BASE]        n=2 判断
7. if_robot_paper_n3               [BASE]        n=3 判断
8. code_hand_execute_rock          [HAND]        机械手-石头 ← 类型修复
9. code_hand_execute_scissors      [HAND]        机械手-剪刀 ← 类型修复
10. code_hand_execute_paper        [HAND]        机械手-布 ← 类型修复
11. set_robot_gesture_assign       [ASSIGN]      机器人手势赋值 ← 仅此处需要赋值
12. http_camera_snapshot           [CAM]         摄像头快照
13. set_rps_recognition            [YOLO-RPS]    手势识别
14. if_gesture_empty               [BASE]        空手势判断
15. if_draw                        [BASE]        平局判断
16. if_robot_win                   [BASE]        机器人赢判断
17. if_robot_lose                  [BASE]        机器人输判断
18. code_screen_execute_angry      [SCREEN]      屏幕-愤怒 ← 类型修复
19. code_screen_execute_happy      [SCREEN]      屏幕-开心 ← 类型修复
20. code_screen_execute_sad        [SCREEN]      屏幕-难过 ← 类型修复
21. set_result_tts                 [TTS]         结果语音配置
22. code_speaker_execute_result    [SPEAKER]     结果播报 ← 类型修复
```

---

## Phase 1: 修复节点类型映射

### 1.1 更新 src/agents/prompts/node-templates.ts

```typescript
// ============================================================
// 执行器节点模板（必须使用 code 类型）
// ============================================================

export const EXECUTOR_NODE_TEMPLATES = {
  // 机械手节点
  'HAND': {
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    parameters: {},  // 空参数
    notesTemplate: {
      category: 'HAND',
      sub: {
        execute_gesture: ''  // IntakeAgent 填充: Rock/Scissors/Paper/Victory/...
      }
    }
  },

  // 喇叭节点
  'SPEAKER': {
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    parameters: {},  // 空参数
    notesTemplate: {
      category: 'SPEAKER',
      sub: {
        audio_name: ''  // IntakeAgent 填充: 引用前置 TTS 输出
      }
    }
  },

  // 屏幕节点
  'SCREEN': {
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    parameters: {},  // 空参数
    notesTemplate: {
      category: 'SCREEN',
      sub: {
        execute_emoji: ''  // ConfigAgent 填充: Happy/Sad/Angry/...
      }
    }
  }
};

// 获取执行器节点模板
export function getExecutorTemplate(category: 'HAND' | 'SPEAKER' | 'SCREEN'): any {
  return EXECUTOR_NODE_TEMPLATES[category];
}
```

### 1.2 更新 src/agents/workflow-architect.ts

```typescript
// 节点生成时强制类型映射
private createNode(params: {
  category: NodeCategory;
  action: string;
  detail: string;
  title: string;
  subtitle: string;
  sub?: NodeSubParams;
}): WorkflowNode {
  const { category, action, detail, title, subtitle, sub } = params;

  // 根据 category 确定 n8n 类型
  let n8nType: string;
  let parameters: any;
  let typeVersion: number;

  switch (category) {
    // 执行器 - 必须使用 code
    case 'HAND':
    case 'SPEAKER':
    case 'SCREEN':
      n8nType = 'n8n-nodes-base.code';
      typeVersion = 2;
      parameters = {};
      break;

    // 感知器 - 使用 httpRequest
    case 'CAM':
      n8nType = 'n8n-nodes-base.httpRequest';
      typeVersion = 4.3;
      parameters = {
        method: 'POST',
        url: 'http://robot.local/api/camera/snapshot',
        options: {}
      };
      break;

    // 处理器 - 使用 set
    case 'TTS':
    case 'RAM':
    case 'ASSIGN':
    case 'YOLO-RPS':
      n8nType = 'n8n-nodes-base.set';
      typeVersion = 3.4;
      parameters = {
        assignments: { assignments: [] },
        options: {}
      };
      break;

    // 触发器/逻辑器
    default:
      n8nType = 'n8n-nodes-base.set';
      typeVersion = 3.4;
      parameters = {
        assignments: { assignments: [] },
        options: {}
      };
  }

  const nodeName = this.nameGenerator.generateUniqueName({
    n8nType,
    category,
    action,
    detail
  });

  return {
    id: this.generateNodeId(),
    name: nodeName,
    type: n8nType,
    typeVersion,
    parameters,
    position: this.calculatePosition(),
    notes: JSON.stringify({
      title,
      subtitle,
      category,
      session_ID: this.sessionId,
      extra: this.getInitialExtra(n8nType),
      topology: null,
      device_ID: null,
      sub: sub || {}
    })
  };
}
```

---

## Phase 2: 移除冗余赋值节点

### 2.1 更新 src/agents/prompts/architect-system.ts

```typescript
// 在 system prompt 中添加节点简洁规则

export const NODE_SIMPLICITY_RULES = `
## 节点简洁规则

### 规则 1: 禁止冗余赋值节点
以下场景不需要额外的 set 赋值节点：
- TTS 输出后：音频 URL 直接传递给 SPEAKER
- CAM 输出后：图像数据直接传递给 YOLO
- YOLO 输出后：手势结果直接传递给 IF 判断
- IF 判断后：结果已确定，无需再赋值

### 规则 2: 仅在机械臂执行后需要 ASSIGN 节点
唯一需要赋值的场景：
- 机械臂执行出拳动作后
- 需要将 robotGesture 写入上下文供后续判断使用

### 规则 3: 数据流直连原则
节点之间的数据通过 n8n 连接自动传递：
- 前置节点的输出自动成为后置节点的输入
- 无需中间节点"提取"或"转换"数据
- notes.sub 中的变量名仅用于 ConfigAgent 配置，不影响数据流

### 正确示例:
\`\`\`
set_countdown_config [TTS]
    ↓ (直连)
code_speaker_execute_countdown [SPEAKER]
    ↓ (直连)
set_random_robot_gesture [RAM]
\`\`\`

### 错误示例:
\`\`\`
set_countdown_config [TTS]
    ↓
http_tts_api [冗余]
    ↓
set_extract_audio_url [冗余]
    ↓
code_speaker_execute_countdown [SPEAKER]
\`\`\`
`;
```

### 2.2 更新 Few-Shot 示例

```typescript
// src/agents/prompts/few-shot-examples.ts

export const SIMPLIFIED_GAME_WORKFLOW = {
  name: "RockPaperScissorsGame",
  description: "精简版猜拳游戏工作流（22节点）",

  nodes: [
    // ===== 1. 触发器 =====
    {
      name: "schedule_trigger_game_start",
      type: "n8n-nodes-base.scheduleTrigger",
      typeVersion: 1.1,
      parameters: { rule: { interval: [{}] } },
      notes: {
        title: "游戏开始触发器",
        subtitle: "每隔固定时间自动开启一轮新流程",
        category: "BASE",
        extra: "configured",
        sub: { seconds: 5 }
      }
    },

    // ===== 2. 倒数语音配置 =====
    {
      name: "set_countdown_config",
      type: "n8n-nodes-base.set",
      typeVersion: 3.4,
      parameters: { assignments: { assignments: [] }, options: {} },
      notes: {
        title: "倒数语音合成",
        subtitle: "配置倒数播报文本",
        category: "TTS",
        extra: "pending",
        sub: { TTS_input: "", audio_name: "count_down" }
      }
    },

    // ===== 3. 倒数播报（执行器-code）=====
    {
      name: "code_speaker_execute_countdown",
      type: "n8n-nodes-base.code",  // ✅ 正确类型
      typeVersion: 2,
      parameters: {},  // ✅ 空参数
      notes: {
        title: "倒数音频播报",
        subtitle: "通过喇叭播放倒数语音",
        category: "SPEAKER",
        extra: "pending",
        sub: { audio_name: "count_down" }
      }
    },

    // ===== 4. 随机出拳 =====
    {
      name: "set_random_robot_gesture",
      type: "n8n-nodes-base.set",
      typeVersion: 3.4,
      parameters: { assignments: { assignments: [] }, options: {} },
      notes: {
        title: "随机出拳计算",
        subtitle: "随机生成机器人出拳值",
        category: "RAM",
        extra: "pending",
        sub: { random_rule: 3, output: "n" }
      }
    },

    // ===== 5-7. IF 判断 n=1/2/3 =====
    {
      name: "if_robot_rock_n1",
      type: "n8n-nodes-base.if",
      typeVersion: 2.2,
      parameters: { conditions: { conditions: [], combinator: "and" }, options: {} },
      notes: {
        title: "石头判断",
        subtitle: "判断 n=1 时出石头",
        category: "BASE",
        extra: "configured"
      }
    },
    // ... if_robot_scissors_n2, if_robot_paper_n3 类似

    // ===== 8-10. 机械手执行（执行器-code）=====
    {
      name: "code_hand_execute_rock",
      type: "n8n-nodes-base.code",  // ✅ 正确类型
      typeVersion: 2,
      parameters: {},  // ✅ 空参数
      notes: {
        title: "物理手势驱动-石头",
        subtitle: "驱动机械手摆出石头形状",
        category: "HAND",
        extra: "pending",
        sub: { execute_gesture: "Rock" }
      }
    },
    // ... code_hand_execute_scissors, code_hand_execute_paper 类似

    // ===== 11. 机器人手势赋值（唯一需要的 ASSIGN）=====
    {
      name: "set_robot_gesture_assign",
      type: "n8n-nodes-base.set",
      typeVersion: 3.4,
      parameters: { assignments: { assignments: [] }, options: {} },
      notes: {
        title: "机器人手势赋值",
        subtitle: "将机器人出拳结果写入上下文",
        category: "ASSIGN",
        extra: "pending",
        sub: { robotGesture: "" }  // 由前置 HAND 节点决定
      }
    },

    // ===== 12. 摄像头快照 =====
    {
      name: "http_camera_snapshot",
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4.3,
      parameters: { method: "POST", url: "http://robot.local/api/camera/snapshot", options: {} },
      notes: {
        title: "用户快照",
        subtitle: "捕捉用户手势画面",
        category: "CAM",
        extra: "pending",
        sub: { output: "camera1" }
      }
    },

    // ===== 13. 手势识别 =====
    {
      name: "set_rps_recognition",
      type: "n8n-nodes-base.set",
      typeVersion: 3.4,
      parameters: { assignments: { assignments: [] }, options: {} },
      notes: {
        title: "用户出拳结果登记",
        subtitle: "识别并登记用户手势",
        category: "YOLO-RPS",
        extra: "pending",
        sub: { yolov_input: "camera1", yolov_output: "userGesture" }
      }
    },

    // ===== 14-17. 胜负判断 IF =====
    {
      name: "if_gesture_empty",
      type: "n8n-nodes-base.if",
      typeVersion: 2.2,
      parameters: { conditions: { conditions: [], combinator: "and" }, options: {} },
      notes: {
        title: "空手势判断",
        subtitle: "判断是否识别失败",
        category: "BASE",
        extra: "configured"
      }
    },
    // ... if_draw, if_robot_win, if_robot_lose 类似

    // ===== 18-20. 屏幕显示（执行器-code）=====
    {
      name: "code_screen_execute_angry",
      type: "n8n-nodes-base.code",  // ✅ 正确类型
      typeVersion: 2,
      parameters: {},  // ✅ 空参数
      notes: {
        title: "表情显示-愤怒",
        subtitle: "显示愤怒表情（识别失败/平局）",
        category: "SCREEN",
        extra: "pending",
        sub: { execute_emoji: "Angry" }
      }
    },
    // ... code_screen_execute_happy, code_screen_execute_sad 类似

    // ===== 21. 结果语音配置 =====
    {
      name: "set_result_tts",
      type: "n8n-nodes-base.set",
      typeVersion: 3.4,
      parameters: { assignments: { assignments: [] }, options: {} },
      notes: {
        title: "结果语音合成",
        subtitle: "配置结果播报文本",
        category: "TTS",
        extra: "pending",
        sub: { TTS_input: "", audio_name: "result" }
      }
    },

    // ===== 22. 结果播报（执行器-code）=====
    {
      name: "code_speaker_execute_result",
      type: "n8n-nodes-base.code",  // ✅ 正确类型
      typeVersion: 2,
      parameters: {},  // ✅ 空参数
      notes: {
        title: "结果音频播报",
        subtitle: "播放对战结果语音",
        category: "SPEAKER",
        extra: "pending",
        sub: { audio_name: "result" }
      }
    }
  ]
};
```

---

## Phase 3: 测试与验证

### 3.1 测试用例

```typescript
// tests/unit/agents/node-type-mapping.test.ts

describe('Node Type Mapping', () => {
  describe('Executor nodes must use code type', () => {
    it('HAND category should map to code', () => {
      const node = createNode({ category: 'HAND', action: 'execute', detail: 'rock' });
      expect(node.type).toBe('n8n-nodes-base.code');
      expect(node.parameters).toEqual({});
    });

    it('SPEAKER category should map to code', () => {
      const node = createNode({ category: 'SPEAKER', action: 'execute', detail: 'countdown' });
      expect(node.type).toBe('n8n-nodes-base.code');
      expect(node.parameters).toEqual({});
    });

    it('SCREEN category should map to code', () => {
      const node = createNode({ category: 'SCREEN', action: 'execute', detail: 'happy' });
      expect(node.type).toBe('n8n-nodes-base.code');
      expect(node.parameters).toEqual({});
    });
  });

  describe('Processor nodes must use set type', () => {
    it('TTS category should map to set', () => {
      const node = createNode({ category: 'TTS', action: 'generate', detail: 'countdown' });
      expect(node.type).toBe('n8n-nodes-base.set');
    });

    it('YOLO-RPS category should map to set', () => {
      const node = createNode({ category: 'YOLO-RPS', action: 'recognize', detail: 'gesture' });
      expect(node.type).toBe('n8n-nodes-base.set');
    });
  });

  describe('Sensor nodes must use httpRequest type', () => {
    it('CAM category should map to httpRequest', () => {
      const node = createNode({ category: 'CAM', action: 'capture', detail: 'snapshot' });
      expect(node.type).toBe('n8n-nodes-base.httpRequest');
    });
  });
});

describe('Node Simplicity', () => {
  it('should not create redundant set nodes after TTS', () => {
    const workflow = generateGameWorkflow();
    const ttsNode = workflow.nodes.find(n => n.notes.category === 'TTS');
    const nextNode = getNextNode(workflow, ttsNode);

    // TTS 后应直接连接 SPEAKER，不应有中间 set 节点
    expect(nextNode.notes.category).toBe('SPEAKER');
  });

  it('should only have one ASSIGN node after HAND execution', () => {
    const workflow = generateGameWorkflow();
    const assignNodes = workflow.nodes.filter(n => n.notes.category === 'ASSIGN');

    // 整个工作流只应有一个 ASSIGN 节点
    expect(assignNodes.length).toBe(1);
    expect(assignNodes[0].name).toContain('robot_gesture');
  });
});
```

---

## 执行顺序

| Phase | 文件 | 测试命令 | Commit |
|-------|------|---------|--------|
| 1 | `node-templates.ts`, `workflow-architect.ts` | `npm test -- --grep "node type"` | `fix(architect): map executor nodes to code type` |
| 2 | `architect-system.ts`, `few-shot-examples.ts` | `npm test -- --grep "simplicity"` | `fix(prompts): remove redundant set nodes` |
| 3 | `node-type-mapping.test.ts` | `npm test -- --grep "mapping"` | `test(architect): add node type mapping tests` |

---

## 验证检查清单

### 节点类型检查
- [ ] HAND 节点使用 `n8n-nodes-base.code`
- [ ] SPEAKER 节点使用 `n8n-nodes-base.code`
- [ ] SCREEN 节点使用 `n8n-nodes-base.code`
- [ ] 执行器节点 parameters 为空 `{}`

### 节点简洁度检查
- [ ] TTS 后无冗余 set 节点
- [ ] CAM 后无冗余 set 节点
- [ ] YOLO 后无冗余 set 节点
- [ ] IF 判断后无冗余 set 节点
- [ ] 仅 HAND 执行后有一个 ASSIGN 节点
- [ ] 总节点数 ≤ 25（原 33 节点精简至 22）

### 数据流检查
- [ ] 节点间直连，无中间"提取"节点
- [ ] notes.sub 仅用于 ConfigAgent 配置
- [ ] 业务逻辑不依赖中间赋值节点
