# controller/
> L2 | 父级: /mnt/c/Users/sam/Documents/Sam/code/Tesseract/frontend/lib/module/home/AGENTS.md

成员清单
digital_twin_console_controller.dart: 数字孪生中控状态机，统一维护场景、灯光、接口吸附、组件安装锚点、接口-组件残差、配置导出、选中项、组件缩放、等比例滑轨锚点与绝对 world transform 同步，并委托纯 resolver 完成挂载几何解算。

法则
- controller 只维护数字孪生控制台状态，不承担 MQTT、WebView、AI 会话职责。
- 任何新增 viewer 状态字段，都先落到 controller，再决定是否暴露给页面。
- controller 内的 `position/rotation` 统一视为预览窗口全局坐标系绝对位姿，重建 viewer 时必须按这组值复原固定位置。
- `scale` 属于场景真相源；底座缩放若影响接口摆放，必须在 controller 里统一解算，不能把比例逻辑散落到页面或 viewer。
- 组件安装锚点与接口-组件残差必须作为两层独立真相源参与接口解算，不能再压成一个“挂载补偿”概念，更不能去污染 5 个真实接口锚点本身。
- 几何组合公式由 `module/device/model/digital_twin_mount_resolver.dart` 独占，controller 不再持有四元数与空间变换细节。
- 接口摆放走“两层场景真相源 + 一层残差表”：`layoutScene` 保存底座接口绑定与组件安装锚点，`scene` 保存解算后的绝对位姿，接口-组件残差独立保存在表结构里，避免把派生值写回配置层。
- 页面层只消费 controller，不再把数字孪生状态回填为本地散装字段。

[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
