# windows/
> L2 | 父级: /mnt/c/Users/sam/Documents/Sam/code/Tesseract/aily-blockly/AGENTS.md

成员清单
AGENTS.md: windows 模块地图，约束弹窗页面与子窗口承载层的职责边界。
iframe/: 通用外部页面承载窗口，负责 iframe/Penpal 桥接与 Electron 子窗口展示。
model-train/: 模型训练相关窗口页面，承载训练任务配置与结果展示。
model-deploy/: 模型部署窗口集合，负责部署参数、板卡配置与下发流程。
project-new/: 新建项目窗口，负责项目初始化输入与模板选择。
settings/: 设置窗口，承载客户端级配置项编辑。
about/: 关于窗口，承载版本、来源与品牌信息。

架构
- `windows/` 只承载“独立窗口页”，不放主工作区业务状态真相源。
- `iframe/` 是外部页面挂载薄层，页面加载成功与数据桥接成功必须解耦，避免把不需要桥接的页面误判为加载失败。
- 数字孪生子窗口的实时场景同步必须在这一层被标准化成统一桥接协议，不能散落到每个业务窗口各自发消息。

[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
