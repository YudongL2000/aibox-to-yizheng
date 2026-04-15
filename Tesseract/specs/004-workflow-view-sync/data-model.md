# Data Model: 工作流视图同步闭环

## ActiveWorkspaceView

- **Purpose**: 表示客户端左侧活动工作区当前应该显示什么。
- **Fields**:
  - `projectPath?`: 可选项目身份
  - `displayState`: `placeholder | pending_sync | workflow_ready | sync_failed`
  - `activeWorkflowRef`: 当前已生效的 workflow 引用，可为空
  - `pendingWorkflowRef`: 等待嵌入式工作区对齐的 workflow 引用，可为空
  - `lastSyncError`: 最近一次同步失败说明，可为空
- **Rules**:
  - `displayState = placeholder` 时不得显示主页或历史流程
  - `workflow_ready` 时 `activeWorkflowRef` 必须存在

## WorkflowReference

- **Purpose**: 绑定“当前活动工作区应该显示哪个 workflow”的业务引用。
- **Fields**:
  - `workflowId`
  - `workflowUrl`
  - `sourceSessionId`
  - `projectPath?`
- **Rules**:
  - 同一时刻一个活动工作区只认一条当前引用
  - 任何外部 URL 都只是这条引用的派生表现，不是新的真相源

## WorkflowCreationResult

- **Purpose**: 聊天区“创建工作流”动作的结果，用于更新活动工作区视图状态。
- **Fields**:
  - `sessionId`
  - `projectPath?`
  - `workflowRef`
  - `status`: `created | failed`
  - `message`
- **Rules**:
  - `status = created` 时必须附带可用的 `workflowRef`
  - `status = failed` 时不得污染当前 `activeWorkflowRef`

## EmbeddedWorkspaceSyncTarget

- **Purpose**: 在嵌入式工作区尚未准备好时，暂存待对齐目标。
- **Fields**:
  - `projectPath?`
  - `workflowRef`
  - `requestedAt`
  - `expiresAt`
- **Rules**:
  - 只允许作用于同一活动工作区
  - 工作区切换后旧 target 必须失效

## State Transitions

- `placeholder -> pending_sync`: 当前项目收到成功的 workflow 创建结果
- `pending_sync -> workflow_ready`: 嵌入式工作区完成对齐并显示目标 workflow
- `pending_sync -> sync_failed`: 对齐超时或目标引用不可用
- `sync_failed -> pending_sync`: 用户重试或系统重新收到有效 workflow 引用
- `workflow_ready -> placeholder`: 用户切换到一个尚未生成 workflow 的新工作区
