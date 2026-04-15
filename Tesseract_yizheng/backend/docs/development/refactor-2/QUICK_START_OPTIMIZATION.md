# Agent 质量优化 - 快速索引

**目标**: 让 Agent 生成与样例（gesture/emo/game.json）相同质量的工作流

---

## 核心问题

```
当前:  LLM 只看到简单的 topology 描述
样例:  包含完整的 IF v2 格式、容错表达式、环境变量

差距:  Few-Shot 样例太简单，Prompt 规范不够详细
```

---

## 优化方案

### 方案概览
```
Phase 1: 扩展 Few-Shot 样例（提取 3 个样例的关键节点）
Phase 2: 增强 System Prompt（详细节点配置规范）
Phase 3: 质量验证（可选）
```

### 关键改进点
```
✅ IF v2 完整格式：combinator + operator{type, operation, name}
✅ 容错表达式：={{$json.x || $json.y || ""}}
✅ 环境变量：={{$env.API_URL || "fallback"}}
✅ httpRequest timeout：options: {timeout: 60000}
```

---

## 文档结构

```
docs/refactor_2/
├── AGENT_QUALITY_OPTIMIZATION.md     ← 优化方案（问题诊断 + 方案设计）
├── AGENT_OPTIMIZATION_TASKS.md       ← 实施清单（具体代码改动）
└── QUICK_START_OPTIMIZATION.md       ← 本文件（快速索引）
```

---

## 快速执行

### 查看优化方案
```bash
cat docs/refactor_2/AGENT_QUALITY_OPTIMIZATION.md
```

### 查看实施清单
```bash
cat docs/refactor_2/AGENT_OPTIMIZATION_TASKS.md
```

### 开始优化
```bash
# 1. 备份
cp src/agents/prompts/few-shot-examples.ts src/agents/prompts/few-shot-examples.ts.bak
cp src/agents/prompts/architect-system.ts src/agents/prompts/architect-system.ts.bak

# 2. 编辑文件
vim src/agents/prompts/few-shot-examples.ts
# 按 AGENT_OPTIMIZATION_TASKS.md 中的代码修改

vim src/agents/prompts/architect-system.ts
# 添加详细节点配置规范

# 3. 验证
npm run typecheck
npm run build

# 4. 测试
npm run agent:dev
```

---

## 核心修改文件

```
src/agents/prompts/few-shot-examples.ts     (~400 行，从 17 行扩展)
src/agents/prompts/architect-system.ts      (~150 行，从 80 行扩展)
```

---

## 预期效果

### 执行前（当前）
```
Agent 生成的 IF 节点：
{
  "conditions": {
    "string": [{ "value1": "...", "value2": "..." }]  ❌ 缺少 combinator
  }
}
```

### 执行后（优化）
```
Agent 生成的 IF 节点：
{
  "conditions": {
    "combinator": "and",                                ✅ 完整格式
    "conditions": [{
      "id": "uuid",
      "operator": { "type": "string", "operation": "equals", "name": "..." }
    }]
  }
}
```

---

## 工作量

```
Phase 1: 更新代码      1 小时
Phase 2: 提取节点      1 小时
Phase 3: 测试验证      1 小时
总计:                  3 小时
```

---

## 关键样例节点提取

### gesture.json（个性化手势）
```
关键节点:
1. Set (容错表达式)          ={{$json.x || $json.y || ""}}
2. httpRequest (环境变量)     {{$env.YOLOV8_API_URL || "fallback"}}
3. Set (多层容错)            ={{$json.a || ($json.b && $json.b.a) || ""}}
4. IF v2 (完整格式)          combinator + operator{type, operation, name}
```

### emo.json（情感交互）
```
关键节点:
1. scheduleTrigger           定时触发
2. httpRequest (环境变量)     {{$env.CAMERA_SNAPSHOT_URL || "..."}}
3. Set (容错)                ={{$json.x || ($json.data && $json.data.x) || ""}}
```

### game.json（猜拳游戏）
```
关键节点:
1. scheduleTrigger           定时触发
2. Set (简单配置)            基础 Set 示例
3. httpRequest (环境变量)     {{$env.TTS_API_URL || "..."}}
4. IF (复杂条件)             多条件判断
```

---

## 验证标准

```
生成的工作流必须包含:
✅ IF v2 的 combinator 字段
✅ IF v2 的 operator 对象（type, operation, name）
✅ httpRequest 的 timeout 配置
✅ 环境变量使用 {{$env.XXX || "fallback"}}
✅ 容错表达式 {{$json.x || $json.y || ""}}
```

---

## 下一步

1. 阅读 AGENT_QUALITY_OPTIMIZATION.md 理解优化方案
2. 按 AGENT_OPTIMIZATION_TASKS.md 执行代码修改
3. 测试生成质量
4. 对比样例验证

---

**位置**: `/mnt/e/tesseract/docs/refactor_2/`
**最后更新**: 2026-01-17
