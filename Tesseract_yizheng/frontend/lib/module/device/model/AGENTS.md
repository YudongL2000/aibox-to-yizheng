# model/
> L2 | 父级: /mnt/c/Users/sam/Documents/Sam/code/Tesseract/frontend/AGENTS.md

成员清单
device_action_model.dart: 上行硬件动作协议模型。
device_event_model.dart: 下行设备事件与数字孪生场景协议模型，定义底座接口锚点、模型缩放、组件安装锚点、接口-组件残差、文件/环境覆盖与 scene/model 的绝对位姿语义。
digital_twin_scene_envelope.dart: 数字孪生 scene envelope，承载 preview sessions、top controls 与 runtime state，负责把左侧预览区与顶部控制从页面里剥离出来。
digital_twin_mount_resolver.dart: 数字孪生纯解算器，把底座接口锚点、组件安装锚点、接口-组件残差和缩放比例组合成解算后的绝对场景。

法则
- 数字孪生 `position/rotation` 统一表示预览窗口全局坐标系中的绝对位姿，`rotation` 使用 degree。
- `interfaces` 是底座本地坐标系下的接口锚点预设，挂载设备通过 `interface_id` 吸附到位，不再手写绝对坐标。
- `DigitalTwinSceneConfig.applyInterfaceDefaults()` 负责把文件化接口表注入默认场景或后端场景，避免页面自己拼字段。
- `mount_position_offset / mount_rotation_offset / scale` 共同组成组件安装锚点；前两者修正天然安装姿态，`scale` 用来覆盖天然尺寸。
- `assets/config/digital_twin_mount_profiles.json` 是组件安装锚点的常驻配置源；环境变量优先读取 `DIGITAL_TWIN_MOUNT_PROFILES`，旧别名 `DIGITAL_TWIN_MOUNT_COMPENSATION` 仍可临时覆盖。
- `assets/config/digital_twin_port_component_overrides.json` 只负责 `portId + modelId` 这一对组合的残差校准，不能反向承担组件默认安装姿态。
- raw 硬件端口别名（如 `3-1.3`、`3-1.6`、`/dev/hdmi`）进入 scene/lookup 前必须先规范化成 canonical `port_*`；否则 assembly overlay 和 backend 正式 scene 会各走一套接口锚点语义。
- 组装页临时 overlay 若使用 `assembly-detected-*` 这类运行时 modelId，残差查找仍必须回退到对应 canonical `model_1..4`，否则组装态会和首页正式 digital twin scene 失去同一套校准。
- scene envelope 负责页面级 preview/runtime state，scene 本体只保留几何与挂载语义。
- 几何解算必须留在纯 helper 中，controller 只做状态机与 viewer 协议同步，避免再次把空间公式埋回 UI 状态层。
- 场景 wrapper 允许多种键名，但最终都收敛到 `DigitalTwinSceneConfig`。

变更日志
- 2026-04-15: 新增 raw `3-1.x` / HDMI 端口别名到 canonical `port_*` 的规范化，修复硬件组装页本地 overlay 未命中接口锚点而错位的问题。
- 2026-04-15: `DigitalTwinPortComponentOverrideTable.lookup()` 新增 assembly overlay modelId -> canonical modelId 回退，修复硬件组装页临时模型未命中接口残差而与首页 digital twin 对不齐的问题。

[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
