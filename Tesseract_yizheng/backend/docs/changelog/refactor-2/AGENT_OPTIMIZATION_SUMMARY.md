# Agent 工作流生成质量优化 - 总结

**目标**: Agent 生成质量达到样例水平（gesture/emo/game.json）

---

## 核心差距

```
样例质量特征:
  ✅ IF v2: conditions.combinator + operator{type, operation, name}
  ✅ 容错表达式: ={{$json.x || $json.y || ""}}
  ✅ 环境变量: ={{$env.API_URL || "fallback"}}
  ✅ httpRequest timeout: options: {timeout: 60000}

当前 Agent:
  ❌ Few-Shot 样例只有 topology 描述
  ❌ Prompt 缺少详细节点配置规范
  ❌ LLM 无法看到完整配置示例
```

---

## 优化方案

### Phase 1: 扩展 Few-Shot（核心）
```
文件: src/agents/prompts/few-shot-examples.ts
改动: 17 行 → ~400 行

添加:
  - keyNodes 字段（关键节点配置）
  - 从 3 个样例提取 10-15 个关键节点
  - 包含完整的 parameters、typeVersion

示例:
{
  nodeType: 'n8n-nodes-base.if',
  purpose: 'IF v2 完整格式示例',
  config: {
    parameters: {
      conditions: {
        combinator: 'and',
        conditions: [{
          operator: {type: 'string', operation: 'equals', name: '...'}
        }]
      }
    },
    typeVersion: 2
  }
}
```

### Phase 2: 增强 Prompt（辅助）
```
文件: src/agents/prompts/architect-system.ts
改动: 80 行 → ~150 行

添加:
  - renderDetailedNodeSpecs() 函数
  - IF v2 完整格式说明
  - 容错表达式模式
  - 环境变量用法
  - httpRequest 必需配置
```

---

## 关键节点提取清单

### gesture.json（6 个节点）
```json
1. Set - 容错表达式
   "value": "={{$json.imageBase64 || $json.image || \"\"}}"

2. httpRequest - 环境变量 + timeout
   "url": "={{$env.YOLOV8_API_URL || \"http://fallback\"}}",
   "options": {"timeout": 60000}

3. Set - 多层容错
   "value": "={{$json.person || $json.bestMatch || ($json.result && $json.result.person) || \"\"}}"

4. IF - v2 完整格式
   "combinator": "and",
   "conditions": [{"operator": {"type": "string", "operation": "equals", "name": "..."}}]

5. Set - 基础配置
6. httpRequest - 机械手
```

### emo.json（4 个节点）
```json
1. scheduleTrigger - 定时触发
2. httpRequest - 摄像头（环境变量）
3. Set - 容错表达式
4. httpRequest - yolov8
```

### game.json（4 个节点）
```json
1. scheduleTrigger
2. Set - 简单配置
3. httpRequest - TTS
4. IF - 复杂多条件
```

---

## 实施步骤

```bash
# 1. 备份
cp src/agents/prompts/few-shot-examples.ts{,.bak}
cp src/agents/prompts/architect-system.ts{,.bak}

# 2. 提取节点
# 从 docs/refactor_2/json/*.json 复制关键节点配置

# 3. 更新 few-shot-examples.ts
# 添加 keyNodes 字段和节点配置

# 4. 更新 architect-system.ts
# 添加详细节点配置规范

# 5. 验证
npm run typecheck && npm run build

# 6. 测试
npm run agent:dev
curl -X POST localhost:3005/api/agent/chat -d '{"message":"见到老刘竖中指"}'
```

---

## 验证标准

```
生成的工作流必须符合:
  ✅ IF 包含 combinator
  ✅ IF operator 包含 type, operation, name
  ✅ httpRequest 包含 options.timeout
  ✅ 使用环境变量 {{$env.XXX || "fallback"}}
  ✅ 使用容错表达式 {{$json.x || $json.y || ""}}
  ✅ typeVersion 正确（if v2, httpRequest v4, set v2）
```

---

## 预期改进

### 执行前
```
IF 缺少 combinator，httpRequest 无 timeout，Set 无容错
生成质量: 60%
```

### 执行后
```
完整 IF v2 格式，httpRequest 配置完整，Set 使用容错表达式
生成质量: 95%
```

---

## 工作量

```
Phase 1: 更新代码    1 小时
Phase 2: 提取节点    1 小时
Phase 3: 测试验证    1 小时
总计:                3 小时
```

---

## 文档位置

```
docs/refactor_2/
├── AGENT_OPTIMIZATION_SUMMARY.md        ← 本文件（总结）
├── AGENT_QUALITY_OPTIMIZATION.md        方案详解
├── AGENT_OPTIMIZATION_TASKS.md          实施清单
└── QUICK_START_OPTIMIZATION.md          快速索引
```

---

**执行人**: Claude Code Agent
**最后更新**: 2026-01-17
**状态**: 待执行
