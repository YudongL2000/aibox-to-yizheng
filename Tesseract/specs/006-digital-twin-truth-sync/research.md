# Phase 0 Research: 数字孪生唯一真相源同步

## Decision 1: canonical scene 继续只来自 backend `config-state`

- **Decision**: `confirm-node` 的短响应只做即时反馈，客户端最终采用的场景必须来自 backend `config-state -> digital-twin-scene.ts` 的读后校验结果。
- **Rationale**: 用户日志已经证明 `confirm-node` 可能先返回，而真正持久化后的 `topology/deviceId` 稍后才稳定。只信短响应会把过渡态误当成真相源。
- **Alternatives considered**:
  - 只消费 `confirm-node` 响应里的 `digitalTwinScene`：最快，但会继续暴露“聊天说成功、场景没变”的竞态。
  - 让前端自己从 `portId/topology` 拼 scene：违背 backend-first，等于再造第二真相源。

## Decision 2: embedded frontend 不是第二真相源，而是唯一消费端之一

- **Decision**: `frontend` 的数字孪生页面必须被纳入正式闭环设计，作为 canonical scene 的唯一显示消费端之一；它只消费 scene，不推导 scene。
- **Rationale**: 当前真实用户看到的数字孪生就是这张 embedded Flutter 页。把它排除在 plan/tasks 之外，等于允许“backend/Angular 看起来都对，但用户画面仍错”。
- **Alternatives considered**:
  - 只规划 backend + aily-blockly：文档更短，但会漏掉真正的显示端。
  - 把 frontend 也变成场景推导层：会产生第二真相源。

## Decision 3: 需要显式 ready-handshake，而不是假设第一帧一定能送达

- **Decision**: 数字孪生嵌入页在能够消费 scene 时必须向父窗口发送 `tesseract-digital-twin-ready`，父窗口收到后重放当前 scene。
- **Rationale**: `SplashPage` 启动判流与 Flutter Web 初始化会让 `onMessage` 监听晚于父窗口第一次 `postMessage(scene)`，冷启动时首帧很容易丢失。
- **Alternatives considered**:
  - 依赖首次 `postMessage` 足够晚：碰运气，不稳定。
  - 改成轮询 backend：增加第二条数据链，不必要。

## Decision 4: 本地资产加载完成后只能重放最近一次 inbound scene，不能回退成默认底座

- **Decision**: embedded frontend 需要显式保留最近一次收到的 scene，本地接口配置/mount profile 加载完成后重放它，而不是无条件 `applyDigitalTwinScene(null)`。
- **Rationale**: 这正是当前用户仍只看到底座的核心 race：scene 即使被接住，也会被本地默认场景覆盖掉。
- **Alternatives considered**:
  - 本地配置加载前暂不显示 viewer：会拖长首屏时间，且仍可能丢 scene。
  - 每次配置加载都重新向 backend 拉 scene：会把消费端变成第二条同步链。

## Decision 5: 诊断要围绕四跳链路，而不是单点 console

- **Decision**: 闭环诊断至少要覆盖 `confirm-node -> config-state -> Electron set/broadcast -> frontend consume/replay` 四跳。
- **Rationale**: 当前 bug 本质就是局部正确、全局失败。没有 checkpoint 式诊断，排障永远停在“到底是后端没更，还是前端没吃到”的猜测。
- **Alternatives considered**:
  - 继续依赖零散日志：只能看局部，不能看闭环。
  - 只做 GUI 观察：一旦失败无法定位断点。
