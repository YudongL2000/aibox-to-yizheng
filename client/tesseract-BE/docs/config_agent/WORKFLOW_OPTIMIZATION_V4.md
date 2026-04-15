# 优化执行文档 4：020403.json 问题诊断与修复

---

## 问题诊断总览

| 问题类型 | 数量 | 严重程度 |
|---------|------|---------|
| 冗余节点未清理 | 6 个 | 🔴 高 |
| 节点类型映射错误 | 2 个 | 🔴 高 |
| 节点命名不规范 | 多个 | 🟡 中 |
| category 与 notes 不匹配 | 3 个 | 🔴 高 |
| 缺失 HAND 执行器节点 | 3 个 | 🔴 高 |
| SCREEN 节点缺失 | 1 个 | 🔴 高 |

---

## 问题 1：冗余节点未清理

**现象**：仍存在不必要的中间赋值节点

| 节点名 | 问题 | 应处理方式 |
|--------|------|-----------|
| `httpRequest_tts_countdown` (id:3) | ❌ 与 `set_countdown_config` 重复 | 删除 |
| `set_extract_audio_url_countdown` (id:4) | ❌ 冗余提取节点 | 删除 |
| `httpRequest_yolov8_gesture_recognition` (id:14) | ❌ 与 YOLO-RPS 功能重复 | 删除 |
| `set_extract_user_gesture` (id:15) | ❌ 冗余提取节点 | 删除 |
| `set_result_gesture_empty` (id:17) | ❌ 冗余结果赋值 | 删除 |
| `set_extract_result_audio_url` (id:28) | ❌ 冗余提取节点 | 删除 |

**修复**：TTS → SPEAKER 直连，CAM → YOLO-RPS 直连

---

## 问题 2：节点类型映射错误

### 2.1 HAND 执行器缺失

**现象**：`httpRequest_mechanical_hand_execute` 被错误定义为 `YOLO-RPS` 处理器

```json
// 当前错误
{
  "name": "httpRequest_mechanical_hand_execute",
  "type": "n8n-nodes-base.set",  // ❌ 应为 code
  "notes": {
    "category": "YOLO-RPS"       // ❌ 应为 HAND
  }
}
```

**修复**：
```json
// 正确定义
{
  "name": "code_hand_execute",
  "type": "n8n-nodes-base.code",  // ✅
  "parameters": {},
  "notes": {
    "category": "HAND",           // ✅
    "sub": {
      "execute_gesture": ""       // 由前置 ASSIGN 节点决定
    }
  }
}
```

### 2.2 SCREEN 执行器 category 错误

**现象**：`httpRequest_screen_display_emoji` 的 category 被设为 `SPEAKER`

```json
// 当前错误
{
  "name": "httpRequest_screen_display_emoji",
  "type": "n8n-nodes-base.code",
  "notes": {
    "category": "SPEAKER"  // ❌ 应为 SCREEN
  }
}
```

**修复**：
```json
{
  "name": "code_screen_display_emoji",
  "type": "n8n-nodes-base.code",
  "notes": {
    "category": "SCREEN",  // ✅
    "sub": {
      "execute_emoji": ""  // ConfigAgent 填充
    }
  }
}
```

---

## 问题 3：节点命名不规范

**现象**：命名前缀与实际类型不匹配

| 当前命名 | 实际类型 | 正确命名 |
|---------|---------|---------|
| `httpRequest_tts_countdown` | set | `set_tts_countdown` |
| `httpRequest_mechanical_hand_execute` | set | `code_hand_execute` |
| `httpRequest_yolov8_gesture_recognition` | set | `set_yolo_rps_recognition` |
| `httpRequest_screen_display_emoji` | code | `code_screen_display` |
| `httpRequest_tts_result_text` | set | `set_tts_result` |
| `httpRequest_speaker_countdown` | code | `code_speaker_countdown` |
| `httpRequest_speaker_play_result` | code | `code_speaker_result` |

**命名规范**：
```
{n8nTypePrefix}_{category}_{action}_{detail}

n8nTypePrefix 映射:
- scheduleTrigger → schedule_trigger
- set → set
- code → code
- httpRequest → http
- if → if
- switch → switch
```

---

## 问题 4：缺失 HAND 执行器节点

**现象**：工作流中没有真正的机械手执行节点

**范例要求** (game_nodes.md)：
- 石头/剪刀/布 三个分支各需要一个 HAND 执行器
- 或使用一个通用 HAND 节点，通过 `execute_gesture` 参数区分

**当前流程**：
```
if_robot_gesture_rock → set_robot_gesture_rock → httpRequest_mechanical_hand_execute(YOLO-RPS?!)
```

**正确流程**：
```
if_robot_gesture_rock → set_robot_gesture_rock(ASSIGN) → code_hand_execute(HAND)
```

---

## 问题 5：工作流结构问题

### 5.1 ASSIGN 节点位置错误

**现象**：ASSIGN 节点在 IF 判断后、HAND 执行前，但 HAND 节点缺失

**正确结构**：
```
RAM(随机数) → IF(n=1?) → ASSIGN(robotGesture=rock) → HAND(执行石头)
                                                          ↓
                                                    CAM(拍照) → YOLO-RPS(识别)
```

### 5.2 胜负判断后缺少差异化处理

**现象**：所有胜负分支都连接到同一个 SCREEN 节点

**正确结构**：
```
if_robot_win → code_screen_happy(SCREEN, emoji=Happy)
if_robot_lose → code_screen_sad(SCREEN, emoji=Sad)
if_draw → code_screen_neutral(SCREEN, emoji=Neutral)
if_empty → code_screen_angry(SCREEN, emoji=Angry)
```

---

## 修复方案

### Phase 1: 删除冗余节点

```typescript
// 需要删除的节点 ID 列表
const REDUNDANT_NODES = [
  'node_http_tts_countdown',           // httpRequest_tts_countdown
  'node_set_extract_audio_url',        // set_extract_audio_url_countdown
  'node_http_yolov8_gesture',          // httpRequest_yolov8_gesture_recognition
  'node_set_extract_user_gesture',     // set_extract_user_gesture
  'node_set_result_empty',             // set_result_gesture_empty
  'node_set_extract_result_audio'      // set_extract_result_audio_url
];
```

### Phase 2: 修复节点类型映射

```typescript
// src/agents/prompts/node-type-mapping.ts

// 强制类型映射规则
export const CATEGORY_TYPE_MAPPING = {
  // 执行器必须使用 code
  'HAND': { type: 'n8n-nodes-base.code', parameters: {} },
  'SPEAKER': { type: 'n8n-nodes-base.code', parameters: {} },
  'SCREEN': { type: 'n8n-nodes-base.code', parameters: {} },

  // 感知器使用 httpRequest
  'CAM': { type: 'n8n-nodes-base.httpRequest', parameters: { method: 'POST', url: '', options: {} } },

  // 处理器使用 set
  'TTS': { type: 'n8n-nodes-base.set', parameters: { assignments: { assignments: [] }, options: {} } },
  'RAM': { type: 'n8n-nodes-base.set', parameters: { assignments: { assignments: [] }, options: {} } },
  'ASSIGN': { type: 'n8n-nodes-base.set', parameters: { assignments: { assignments: [] }, options: {} } },
  'YOLO-RPS': { type: 'n8n-nodes-base.set', parameters: { assignments: { assignments: [] }, options: {} } },

  // 触发器/逻辑器
  'BASE_TRIGGER': { type: 'n8n-nodes-base.scheduleTrigger', parameters: { rule: { interval: [{}] } } },
  'BASE_IF': { type: 'n8n-nodes-base.if', parameters: { conditions: { conditions: [], combinator: 'and' }, options: {} } }
};

// 验证并修复节点类型
export function validateAndFixNodeType(node: any): any {
  const notes = JSON.parse(node.notes);
  const category = notes.category;
  const mapping = CATEGORY_TYPE_MAPPING[category];

  if (mapping && node.type !== mapping.type) {
    console.warn(`Node type mismatch: ${node.name} has type ${node.type} but category ${category} requires ${mapping.type}`);
    node.type = mapping.type;
    node.parameters = mapping.parameters;
  }

  return node;
}
```

### Phase 3: 添加缺失的 HAND 节点

```typescript
// 在 ASSIGN 节点后添加 HAND 执行器
const HAND_NODE_TEMPLATE = {
  type: 'n8n-nodes-base.code',
  typeVersion: 2,
  parameters: {},
  notes: {
    title: '物理手势驱动',
    subtitle: '驱动机械手摆出对应手势形状',
    category: 'HAND',
    extra: 'pending',
    sub: {
      execute_gesture: ''  // 由前置 ASSIGN 的 robotGesture 决定
    }
  }
};
```

### Phase 4: 修复 SCREEN 节点差异化

```typescript
// 不同结果对应不同 SCREEN 节点
const SCREEN_NODES = {
  'win': {
    name: 'code_screen_display_happy',
    notes: { category: 'SCREEN', sub: { execute_emoji: 'Happy' } }
  },
  'lose': {
    name: 'code_screen_display_sad',
    notes: { category: 'SCREEN', sub: { execute_emoji: 'Sad' } }
  },
  'draw': {
    name: 'code_screen_display_neutral',
    notes: { category: 'SCREEN', sub: { execute_emoji: 'Neutral' } }
  },
  'empty': {
    name: 'code_screen_display_angry',
    notes: { category: 'SCREEN', sub: { execute_emoji: 'Angry' } }
  }
};
```

---

## 正确的工作流结构

### 精简后节点列表（30 → 24 节点）

```
阶段 1: 倒数播报
1. schedule_trigger_game_start     [BASE]        触发器
2. set_tts_countdown               [TTS]         倒数语音配置
3. code_speaker_countdown          [SPEAKER]     倒数播报

阶段 2: 机器人出拳
4. set_random_robot_gesture        [RAM]         随机出拳
5. if_robot_gesture_rock           [BASE]        n=1 判断
6. if_robot_gesture_scissors       [BASE]        n=2 判断
7. if_robot_gesture_paper          [BASE]        n=3 判断
8. set_robot_gesture_rock          [ASSIGN]      石头赋值
9. set_robot_gesture_scissors      [ASSIGN]      剪刀赋值
10. set_robot_gesture_paper        [ASSIGN]      布赋值
11. code_hand_execute              [HAND]        机械手执行 ← 新增

阶段 3: 用户识别
12. http_camera_snapshot           [CAM]         摄像头快照
13. set_yolo_rps_recognition       [YOLO-RPS]    手势识别

阶段 4: 胜负判断
14. if_user_gesture_empty          [BASE]        空手势判断
15. if_game_result_draw            [BASE]        平局判断
16. if_robot_win_rock_scissors     [BASE]        机器人赢1
17. if_robot_win_scissors_paper    [BASE]        机器人赢2
18. if_robot_win_paper_rock        [BASE]        机器人赢3
19. if_robot_lose_scissors_rock    [BASE]        机器人输1
20. if_robot_lose_paper_scissors   [BASE]        机器人输2
21. if_robot_lose_rock_paper       [BASE]        机器人输3

阶段 5: 结果反馈
22. code_screen_display            [SCREEN]      屏幕显示 ← category 修复
23. set_tts_result                 [TTS]         结果语音配置
24. code_speaker_result            [SPEAKER]     结果播报
```

---

## 连接关系修复

```typescript
// 正确的连接关系
const CORRECT_CONNECTIONS = {
  // 阶段 1: 倒数播报（直连，无中间节点）
  'schedule_trigger_game_start': ['set_tts_countdown'],
  'set_tts_countdown': ['code_speaker_countdown'],  // ✅ 直连
  'code_speaker_countdown': ['set_random_robot_gesture'],

  // 阶段 2: 机器人出拳
  'set_random_robot_gesture': ['if_robot_gesture_rock', 'if_robot_gesture_scissors', 'if_robot_gesture_paper'],
  'if_robot_gesture_rock': ['set_robot_gesture_rock'],
  'if_robot_gesture_scissors': ['set_robot_gesture_scissors'],
  'if_robot_gesture_paper': ['set_robot_gesture_paper'],
  'set_robot_gesture_rock': ['code_hand_execute'],      // ✅ ASSIGN → HAND
  'set_robot_gesture_scissors': ['code_hand_execute'],
  'set_robot_gesture_paper': ['code_hand_execute'],

  // 阶段 3: 用户识别（直连，无中间节点）
  'code_hand_execute': ['http_camera_snapshot'],
  'http_camera_snapshot': ['set_yolo_rps_recognition'],  // ✅ 直连

  // 阶段 4: 胜负判断
  'set_yolo_rps_recognition': [
    'if_user_gesture_empty',
    'if_game_result_draw',
    'if_robot_win_rock_scissors',
    'if_robot_win_scissors_paper',
    'if_robot_win_paper_rock',
    'if_robot_lose_scissors_rock',
    'if_robot_lose_paper_scissors',
    'if_robot_lose_rock_paper'
  ],

  // 阶段 5: 结果反馈（直连，无中间节点）
  'if_user_gesture_empty': ['code_screen_display'],
  'if_game_result_draw': ['code_screen_display'],
  'if_robot_win_*': ['code_screen_display'],
  'if_robot_lose_*': ['code_screen_display'],
  'code_screen_display': ['set_tts_result'],
  'set_tts_result': ['code_speaker_result']  // ✅ 直连
};
```

---

## 执行顺序

| Phase | 任务 | 文件 | 测试 | Commit |
|-------|------|------|------|--------|
| 1 | 删除冗余节点 | `workflow-architect.ts` | `npm test -- --grep "redundant"` | `fix(architect): remove redundant intermediate nodes` |
| 2 | 修复类型映射 | `node-type-mapping.ts` | `npm test -- --grep "type mapping"` | `fix(prompts): enforce category-type mapping` |
| 3 | 添加 HAND 节点 | `few-shot-examples.ts` | `npm test -- --grep "hand node"` | `fix(prompts): add HAND executor after ASSIGN` |
| 4 | 修复 SCREEN category | `workflow-architect.ts` | `npm test -- --grep "screen"` | `fix(architect): correct SCREEN node category` |
| 5 | 修复连接关系 | `workflow-architect.ts` | `npm test -- --grep "connections"` | `fix(architect): simplify node connections` |

---

## 验证检查清单

### 节点类型检查
- [ ] HAND 节点使用 `n8n-nodes-base.code`
- [ ] SPEAKER 节点使用 `n8n-nodes-base.code`
- [ ] SCREEN 节点使用 `n8n-nodes-base.code`
- [ ] CAM 节点使用 `n8n-nodes-base.httpRequest`
- [ ] TTS/RAM/ASSIGN/YOLO-RPS 使用 `n8n-nodes-base.set`

### category 一致性检查
- [ ] `httpRequest_screen_display_emoji` category 为 `SCREEN`（非 SPEAKER）
- [ ] `httpRequest_mechanical_hand_execute` category 为 `HAND`（非 YOLO-RPS）
- [ ] 所有节点 category 与 notes.sub 字段匹配

### 节点简洁度检查
- [ ] TTS 后无冗余 set 节点，直连 SPEAKER
- [ ] CAM 后无冗余 set 节点，直连 YOLO-RPS
- [ ] ASSIGN 后有 HAND 执行器节点
- [ ] 总节点数 ≤ 25

### 命名规范检查
- [ ] 所有节点名前缀与实际 n8n 类型匹配
- [ ] 格式：`{typePrefix}_{category}_{action}_{detail}`
