# Research: Mock 插拔端口同步与数字孪生实时挂载

## 决策 1: snapshot 必须成为一等协议

- **Decision**: 插拔事件协议同时支持 `component` 和 `connectedComponents`，并让 `connectedComponents` 在 snapshot 场景下成为第一优先级。
- **Why**: 真实 bug 不是 viewer 不会挂载，而是上游把全量快照压扁成单组件事件，导致端口拓扑信息天然丢失。
- **Alternatives considered**:
  - 继续只传单个 `component`：会让多组件场景永远不可信。
  - 让前端自己补全快照：会制造第二套真相源。

## 决策 2: backend 继续产出唯一 digitalTwinScene

- **Decision**: 任何 hotplug 校验结果都必须由 backend 产出 `digitalTwinScene`。
- **Why**: 渲染层只认识 `interface_id + mount offsets`，如果前端再自己拼场景，迟早会和 backend readiness 分裂。
- **Alternatives considered**:
  - 容器前端本地拼 scene：短期快，长期必腐烂。

## 决策 3: 默认底座通过“空 scene -> 默认场景”保底

- **Decision**: 无组件时传空 scene 或 null，让数字孪生控制器回退到默认底座场景。
- **Why**: 这是最稳的单一路径，不需要额外造“底座模式”分支。
- **Alternatives considered**:
  - 每次显式构造仅底座 scene：可行，但会增加重复代码。

## 决策 4: 端口身份只在归一化层解析一次

- **Decision**: `portId` / `port_id` / 文本推断 / `device_info[].port_id` 的兼容只允许在桥接/DTO 层做一次。
- **Why**: 多层重复兼容会导致字段漂移，最后没人知道真实口径是什么。
