# WORKFLOW_OPTIMIZATION_V6.md
# 胜负分支独立化优化

## 问题诊断

### 当前状态
生成的 `RPS_Game_Workflow.json` 胜负判断后的分支结构不完整：
- 8 个胜负 IF 节点的 true 分支全部连接到 **3 个共用 SCREEN 节点**
- 缺少 4 类独立的 TTS + SPEAKER 链路

### 范例结构 (`game_0203.json`)
```
胜负判断 → 4 类独立分支：
├── 空手势分支: SCREEN(Angry) → TTS(empty) → SPEAKER(empty)
├── 平局分支:   SCREEN(Angry) → TTS(draw)  → SPEAKER(draw)
├── 赢分支:     SCREEN(Happy) → TTS(win)   → SPEAKER(win)
└── 输分支:     SCREEN(Sad)   → TTS(lose)  → SPEAKER(lose)
```

### 当前错误结构
```
胜负判断 → 共用分支：
├── 空手势/平局 → http_screen_emoji → http_tts_result → http_speaker_result
├── 3个赢IF    → http_screen_emoji_win_happy → (无后续)
└── 3个输IF    → http_screen_emoji_lose_sad  → (无后续)
```

---

## 优化目标

实现 4 类胜负分支的完整独立链路：

| 分支 | SCREEN | TTS | SPEAKER | emoji | audio_name |
|------|--------|-----|---------|-------|------------|
| 空手势 | `code_screen_execute_empty_angry` | `set_audio_generate_empty` | `code_speaker_execute_empty` | Angry | user_cheat_audio |
| 平局 | `code_screen_execute_draw_angry` | `set_audio_generate_draw` | `code_speaker_execute_draw` | Angry | draw_audio |
| 赢 | `code_screen_execute_win_happy` | `set_audio_generate_win` | `code_speaker_execute_win` | Happy | win_audio |
| 输 | `code_screen_execute_lose_sad` | `set_audio_generate_lose` | `code_speaker_execute_lose` | Sad | lose_audio |

---

## Phase 1: 定义胜负分支规则

### 1.1 创建分支规则常量

**文件**: `src/agents/prompts/result-branch-rules.ts`

```typescript
/**
 * 胜负分支规则定义
 * 每个分支包含完整的 SCREEN → TTS → SPEAKER 链路
 */

export type ResultBranchType = 'empty' | 'draw' | 'win' | 'lose';

export interface ResultBranchConfig {
  type: ResultBranchType;
  screen: {
    nodeName: string;
    emoji: 'Angry' | 'Happy' | 'Sad';
  };
  tts: {
    nodeName: string;
    audioName: string;
    defaultInput: string;
  };
  speaker: {
    nodeName: string;
    audioName: string;
  };
}

export const RESULT_BRANCH_CONFIGS: Record<ResultBranchType, ResultBranchConfig> = {
  empty: {
    type: 'empty',
    screen: { nodeName: 'code_screen_execute_empty_angry', emoji: 'Angry' },
    tts: { nodeName: 'set_audio_generate_empty', audioName: 'user_cheat_audio', defaultInput: '你怎么能耍赖呢！' },
    speaker: { nodeName: 'code_speaker_execute_empty', audioName: 'user_cheat_audio' },
  },
  draw: {
    type: 'draw',
    screen: { nodeName: 'code_screen_execute_draw_angry', emoji: 'Angry' },
    tts: { nodeName: 'set_audio_generate_draw', audioName: 'draw_audio', defaultInput: '平局，再来' },
    speaker: { nodeName: 'code_speaker_execute_draw', audioName: 'draw_audio' },
  },
  win: {
    type: 'win',
    screen: { nodeName: 'code_screen_execute_win_happy', emoji: 'Happy' },
    tts: { nodeName: 'set_audio_generate_win', audioName: 'win_audio', defaultInput: '我赢啦！' },
    speaker: { nodeName: 'code_speaker_execute_win', audioName: 'win_audio' },
  },
  lose: {
    type: 'lose',
    screen: { nodeName: 'code_screen_execute_lose_sad', emoji: 'Sad' },
    tts: { nodeName: 'set_audio_generate_lose', audioName: 'lose_audio', defaultInput: '算你厉害。' },
    speaker: { nodeName: 'code_speaker_execute_lose', audioName: 'lose_audio' },
  },
};

/**
 * IF 节点到分支类型的映射
 */
export const IF_TO_BRANCH_MAP: Record<string, ResultBranchType> = {
  // 空手势
  'if_gesture_empty': 'empty',
  'if_user_gesture_empty': 'empty',

  // 平局
  'if_draw': 'draw',

  // 机器人赢 (3 种情况)
  'if_rock_vs_scissors': 'win',
  'if_scissors_vs_paper': 'win',
  'if_paper_vs_rock': 'win',
  'if_robot_rock_user_scissors_win': 'win',
  'if_robot_scissors_user_paper_win': 'win',
  'if_robot_paper_user_rock_win': 'win',

  // 机器人输 (3 种情况)
  'if_rock_vs_paper': 'lose',
  'if_scissors_vs_rock': 'lose',
  'if_paper_vs_scissors': 'lose',
  'if_robot_rock_user_paper_lose': 'lose',
  'if_robot_scissors_user_rock_lose': 'lose',
  'if_robot_paper_user_scissors_lose': 'lose',
};
```

---

## Phase 2: 更新工作流生成器

### 2.1 添加胜负分支生成方法

**文件**: `src/agents/workflow-architect.ts`

在 `normalizeWorkflow()` 中添加调用：

```typescript
private normalizeWorkflow(workflow: WorkflowDefinition): void {
  this.normalizeConnections(workflow);
  this.pruneRedundantSetNodes(workflow);
  this.ensureGameHandExecutor(workflow);
  this.ensureSpeakerHasTts(workflow);
  this.ensureResultBranches(workflow);  // 新增
  this.ensureUniqueNodeNames(workflow.nodes, nameRemap);
}
```

### 2.2 实现 `ensureResultBranches()` 方法

```typescript
/**
 * 确保胜负判断 IF 节点连接到正确的独立分支
 * 规则：每个胜负类型有独立的 SCREEN → TTS → SPEAKER 链路
 */
private ensureResultBranches(workflow: WorkflowDefinition): void {
  const { nodes, connections } = workflow;

  // 1. 识别胜负判断 IF 节点
  const resultIfNodes = nodes.filter(node => {
    const name = node.name?.toLowerCase() || '';
    return IF_TO_BRANCH_MAP[node.name] !== undefined;
  });

  if (resultIfNodes.length === 0) return;

  // 2. 按分支类型分组
  const branchGroups: Record<ResultBranchType, typeof resultIfNodes> = {
    empty: [],
    draw: [],
    win: [],
    lose: [],
  };

  for (const ifNode of resultIfNodes) {
    const branchType = IF_TO_BRANCH_MAP[ifNode.name];
    if (branchType) {
      branchGroups[branchType].push(ifNode);
    }
  }

  // 3. 为每个分支类型创建/确保完整链路
  for (const [branchType, ifNodes] of Object.entries(branchGroups)) {
    if (ifNodes.length === 0) continue;

    const config = RESULT_BRANCH_CONFIGS[branchType as ResultBranchType];

    // 确保 SCREEN 节点存在
    let screenNode = nodes.find(n => n.name === config.screen.nodeName);
    if (!screenNode) {
      screenNode = this.buildResultScreenNode(config);
      nodes.push(screenNode);
    }

    // 确保 TTS 节点存在
    let ttsNode = nodes.find(n => n.name === config.tts.nodeName);
    if (!ttsNode) {
      ttsNode = this.buildResultTtsNode(config);
      nodes.push(ttsNode);
    }

    // 确保 SPEAKER 节点存在
    let speakerNode = nodes.find(n => n.name === config.speaker.nodeName);
    if (!speakerNode) {
      speakerNode = this.buildResultSpeakerNode(config);
      nodes.push(speakerNode);
    }

    // 4. 连接 IF → SCREEN → TTS → SPEAKER
    for (const ifNode of ifNodes) {
      // IF true 分支 → SCREEN
      this.ensureConnection(connections, ifNode.name, config.screen.nodeName, 0);
    }

    // SCREEN → TTS
    this.ensureConnection(connections, config.screen.nodeName, config.tts.nodeName, 0);

    // TTS → SPEAKER
    this.ensureConnection(connections, config.tts.nodeName, config.speaker.nodeName, 0);
  }
}

private buildResultScreenNode(config: ResultBranchConfig): WorkflowNode {
  return {
    id: crypto.randomUUID(),
    name: config.screen.nodeName,
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: [0, 0],
    parameters: { jsCode: 'return items;' },
    notes: JSON.stringify({
      title: '胜负表情展示',
      subtitle: '物理显示单元。根据裁判结果，在屏幕上显示出机器人此时的情绪眼神。',
      category: 'SCREEN',
      extra: 'pending',
      sub: { execute_emoji: config.screen.emoji },
    }),
  };
}

private buildResultTtsNode(config: ResultBranchConfig): WorkflowNode {
  return {
    id: crypto.randomUUID(),
    name: config.tts.nodeName,
    type: 'n8n-nodes-base.set',
    typeVersion: 3.4,
    position: [0, 0],
    parameters: { assignments: { assignments: [] }, options: {} },
    notes: JSON.stringify({
      title: '对战脚本合成',
      subtitle: '策略编排单元。根据输赢结果，匹配对应的表情和回复文字。',
      category: 'TTS',
      extra: 'pending',
      sub: { TTS_input: config.tts.defaultInput, audio_name: config.tts.audioName },
    }),
  };
}

private buildResultSpeakerNode(config: ResultBranchConfig): WorkflowNode {
  return {
    id: crypto.randomUUID(),
    name: config.speaker.nodeName,
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: [0, 0],
    parameters: { jsCode: 'return items;' },
    notes: JSON.stringify({
      title: '结果音频播报',
      subtitle: '物理表达单元。最后播放出语音反馈，完成本轮游戏交互。',
      category: 'SPEAKER',
      extra: 'pending',
      sub: { audio_name: config.speaker.audioName },
    }),
  };
}

private ensureConnection(
  connections: WorkflowConnections,
  fromNode: string,
  toNode: string,
  outputIndex: number
): void {
  if (!connections[fromNode]) {
    connections[fromNode] = { main: [[]] };
  }

  const outputs = connections[fromNode].main;
  while (outputs.length <= outputIndex) {
    outputs.push([]);
  }

  const existingConnection = outputs[outputIndex].find(c => c.node === toNode);
  if (!existingConnection) {
    outputs[outputIndex].push({ node: toNode, type: 'main', index: 0 });
  }
}
```

---

## Phase 3: 添加测试用例

**文件**: `tests/unit/agents/result-branch-rules.test.ts`

```typescript
import { describe, expect, it } from 'vitest';
import {
  RESULT_BRANCH_CONFIGS,
  IF_TO_BRANCH_MAP,
  ResultBranchType,
} from '../../../src/agents/prompts/result-branch-rules';

describe('RESULT_BRANCH_CONFIGS', () => {
  it('包含 4 种分支类型', () => {
    expect(Object.keys(RESULT_BRANCH_CONFIGS)).toEqual(['empty', 'draw', 'win', 'lose']);
  });

  it('每个分支有完整的 SCREEN/TTS/SPEAKER 配置', () => {
    for (const config of Object.values(RESULT_BRANCH_CONFIGS)) {
      expect(config.screen.nodeName).toBeTruthy();
      expect(config.screen.emoji).toMatch(/^(Angry|Happy|Sad)$/);
      expect(config.tts.nodeName).toBeTruthy();
      expect(config.tts.audioName).toBeTruthy();
      expect(config.speaker.nodeName).toBeTruthy();
    }
  });

  it('win 分支使用 Happy 表情', () => {
    expect(RESULT_BRANCH_CONFIGS.win.screen.emoji).toBe('Happy');
  });

  it('lose 分支使用 Sad 表情', () => {
    expect(RESULT_BRANCH_CONFIGS.lose.screen.emoji).toBe('Sad');
  });

  it('empty/draw 分支使用 Angry 表情', () => {
    expect(RESULT_BRANCH_CONFIGS.empty.screen.emoji).toBe('Angry');
    expect(RESULT_BRANCH_CONFIGS.draw.screen.emoji).toBe('Angry');
  });
});

describe('IF_TO_BRANCH_MAP', () => {
  it('空手势 IF 映射到 empty', () => {
    expect(IF_TO_BRANCH_MAP['if_gesture_empty']).toBe('empty');
    expect(IF_TO_BRANCH_MAP['if_user_gesture_empty']).toBe('empty');
  });

  it('平局 IF 映射到 draw', () => {
    expect(IF_TO_BRANCH_MAP['if_draw']).toBe('draw');
  });

  it('3 个赢的 IF 映射到 win', () => {
    expect(IF_TO_BRANCH_MAP['if_rock_vs_scissors']).toBe('win');
    expect(IF_TO_BRANCH_MAP['if_scissors_vs_paper']).toBe('win');
    expect(IF_TO_BRANCH_MAP['if_paper_vs_rock']).toBe('win');
  });

  it('3 个输的 IF 映射到 lose', () => {
    expect(IF_TO_BRANCH_MAP['if_rock_vs_paper']).toBe('lose');
    expect(IF_TO_BRANCH_MAP['if_scissors_vs_rock']).toBe('lose');
    expect(IF_TO_BRANCH_MAP['if_paper_vs_scissors']).toBe('lose');
  });
});
```

---

## Phase 4: 验证与清理

### 4.1 构建验证
```bash
npm run build
```

### 4.2 运行测试
```bash
npm test -- tests/unit/agents/result-branch-rules.test.ts
```

### 4.3 生成新工作流验证
生成新的猜拳工作流，验证：
1. 4 类分支各有独立的 SCREEN → TTS → SPEAKER 链路
2. 每个 IF 的 true 分支连接到正确的 SCREEN 节点
3. 节点命名符合范例规范

---

## 预期结果

优化后的工作流结构：

```
胜负判断 IF 节点
├── if_gesture_empty ──────────┐
│                              ├→ code_screen_execute_empty_angry → set_audio_generate_empty → code_speaker_execute_empty
│                              │
├── if_draw ───────────────────┐
│                              ├→ code_screen_execute_draw_angry → set_audio_generate_draw → code_speaker_execute_draw
│                              │
├── if_rock_vs_scissors ───────┐
├── if_scissors_vs_paper ──────┼→ code_screen_execute_win_happy → set_audio_generate_win → code_speaker_execute_win
├── if_paper_vs_rock ──────────┘
│
├── if_rock_vs_paper ──────────┐
├── if_scissors_vs_rock ───────┼→ code_screen_execute_lose_sad → set_audio_generate_lose → code_speaker_execute_lose
└── if_paper_vs_scissors ──────┘
```

---

## 变更文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/agents/prompts/result-branch-rules.ts` | 新增 | 胜负分支规则定义 |
| `src/agents/workflow-architect.ts` | 修改 | 添加 `ensureResultBranches()` 方法 |
| `tests/unit/agents/result-branch-rules.test.ts` | 新增 | 分支规则单元测试 |
