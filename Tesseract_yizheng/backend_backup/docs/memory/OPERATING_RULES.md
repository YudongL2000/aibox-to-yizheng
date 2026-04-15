# Memory Operating Rules

## 目标

让 `docs/memory/` 在长周期开发里持续可用，而不是几周后膨胀成失效文档堆。

## 默认读取顺序

1. `MEMORY.md`
2. 今天的 `daily/YYYY-MM-DD.md`
3. 昨天的 `daily/YYYY-MM-DD.md`
4. 只有在需要时再读 `bank/*`
5. `bank/entities/*` 只按需读取，不预读整个目录

## 默认写入顺序

1. 所有新信息先写 `daily/`
2. 每天收尾时整理 `## Retain`
3. 只有稳定、重复、高价值内容才晋升到 `bank/*`
4. 只有“每次会话都该知道”的内容才进入 `MEMORY.md`

## 晋升门槛

### daily -> bank

满足任意两条即可晋升：

- 连续多次出现
- 对后续开发有稳定指导价值
- 属于已验证经验，而不是一次性猜测
- 预计未来会被反复引用

### bank -> MEMORY

必须同时满足：

- 跨会话始终有用
- 足够稳定，不易频繁变化
- 体积小，适合作为默认装载内容

## 防膨胀策略

- 不保存原始聊天全文
- 不粘贴大段 transcript
- 不保存密钥、token、密码
- `MEMORY.md` 只重写整理，不无限 append
- `world.md / experience.md / opinions.md` 变大时优先拆主题
- `entities/*` 延迟创建，确认实体会反复出现后再建

## 推荐维护节奏

### 每次会话结束

- 在当天 `daily` 追加高价值摘要
- 更新 `## Retain`

### 每天收尾

- 清理低价值流水
- 把值得晋升的内容移到 `bank/*`

### 每周一次

- 重写 `MEMORY.md`
- 删除已经过时的偏好或经验
- 拆分过大的 `bank/*.md`
