# config/
> L2 | 父级: /mnt/c/Users/sam/Documents/Sam/code/tesseract_FE/AGENTS.md

成员清单
digital_twin_interfaces.json: 数字孪生底座接口锚点表，维护 `base_model_id` 与 5 个真实接口（`port_1..4`, `port_7`）在底座本地坐标系下的默认位姿。
digital_twin_mount_profiles.json: 数字孪生组件安装锚点常驻配置，按 `modelId -> {position, rotation, scale}` 维护默认安装偏移和默认尺寸。
digital_twin_port_component_overrides.json: 数字孪生接口-组件残差表，按 `portId -> modelId -> {position, rotation}` 维护现场校准微调。

法则
- 这里存放“长期有效、便于手工编辑”的数字孪生配置，不放运行时快照。
- JSON 只描述协议真相源，不夹带注释字段和 UI 状态。
- 接口表负责“底座上哪里能挂”，组件安装锚点负责“组件天然怎么对接”，接口-组件残差负责“某个接口现场还差多少”。
- 环境变量只能覆盖组件安装锚点，不能反向替代这份目录里的文件成为主配置源。

[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
