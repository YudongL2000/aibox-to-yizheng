# Phase 0 Research: 工作流视图同步闭环

## Decision 1: 活动工作区的主画布真相源必须是 workspace 级 workflow 引用

- **Decision**: 把“当前活动工作区应显示哪个 workflow”收口成单一 workflow 引用；聊天创建结果只负责更新该引用，左侧工作区只负责消费它。
- **Rationale**: 现在的问题不是 workflow 没创建，而是 workflow 创建结果、活动工作区上下文、左侧 webview 当前页三套状态互相漂移。只要没有单一真相源，主页、旧流程和新流程就会交替抢占主画布。
- **Alternatives considered**:
  - 直接由聊天按钮临时驱动 webview 跳页：快，但会让刷新/重进项目后再次失真。
  - 继续依赖外部浏览器 URL：简单，但主路径闭环仍然断裂。

## Decision 2: 无 workflow 的活动工作区必须短路为占位态

- **Decision**: 只要当前活动工作区没有 workflow 引用，主工作区就显示占位提示，绝不展示 embedded n8n 的主页或流程列表。
- **Rationale**: 主页不是“空态”，主页是另一种内容。只要允许主页露出，用户就无法判断“尚未生成”还是“串到别的流程”。
- **Alternatives considered**:
  - 允许主页作为默认空态：最容易实现，但会持续制造误诊。
  - 加文案叠在主页上：仍旧让第三方内容占据视觉中心，边界不干净。

## Decision 3: “创建工作流成功”必须自动更新客户端主工作区，而不是退回人工点击

- **Decision**: 聊天区拿到创建成功结果后，应直接推动当前客户端工作区聚焦到新 workflow；“打开工作流”仅保留为辅助动作。
- **Rationale**: 用户任务是“创建并查看流程”，不是“创建后再学习额外按钮”。任何依赖手动补点的方案都属于闭环断裂。
- **Alternatives considered**:
  - 保留手动“打开工作流”为主路径：现状已证明不可接受。
  - 每次都用浏览器打开：会把客户端主画布留在错误状态。

## Decision 4: 嵌入式工作区准备延迟时，使用待对齐目标而不是回退主页

- **Decision**: 若聊天区先收到 workflow 创建成功，而左侧工作区尚未准备好，则保留一个待对齐目标，在工作区可用后继续自动切换。
- **Rationale**: 这是典型的时序问题。好设计不是加更多 if，而是承认“目标 workflow”是一等状态，并让迟到的 view 去对齐它；工作区切换时则直接让旧结果失效。
- **Alternatives considered**:
  - 工作区未就绪就忽略这次切换：会造成“创建成功但不显示”的裂脑。
  - 未就绪时回退主页：会把短暂竞态变成稳定错误。

## Decision 5: `frontend` 的 webUI 经验只作为行为参考，不作为第二实现

- **Decision**: 借鉴 `frontend` 中“创建成功后立即把 workflow URL/ID 回灌到当前视图”的模式，但本 feature 的正式实现仍落在 `aily-blockly`。
- **Rationale**: 用户现在碰到的问题发生在 desktop 客户端；真正要修的是 `aily-blockly` 的嵌入式工作区同步链，而不是再复制一套 webUI。
- **Alternatives considered**:
  - 直接迁移 `frontend` 代码：快，但会把两套 UI 再次绑死。
  - 完全不参考 `frontend`：容易忽视已有正确行为模式。
