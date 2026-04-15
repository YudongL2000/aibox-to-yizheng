# Quickstart: 工作流视图同步闭环

## Preconditions

- 启动 `backend` Agent 服务
- 启动 `aily-blockly` Angular dev server
- 用 `npm run electron:reuse` 或等价方式拉起 Electron 客户端
- 准备一个全新的 Tesseract 项目，确保它尚未生成 workflow

## Scenario 1: 空项目启动显示占位态

1. 打开一个没有 workflow 引用的新项目
2. 进入左侧主工作区
3. 验证主画布只显示占位提示文案
4. 验证页面上没有 n8n 主页、工作流列表或历史 workflow 内容

## Scenario 2: 创建成功后主工作区自动切到新 workflow

1. 在右侧聊天区进入教学模式
2. 完成流程推理，点击“创建工作流”
3. 等待聊天区返回创建成功
4. 验证无需点击“打开工作流”，左侧主工作区会自动显示新创建的 workflow
5. 验证显示的 workflow 属于当前项目，而不是主页或历史流程

## Scenario 3: 工作区晚于聊天结果准备完成

1. 让左侧主工作区处于重载或重连阶段
2. 在右侧点击“创建工作流”
3. 验证聊天区先显示创建成功时，左侧不会回退到主页
4. 验证工作区准备完成后，会自动对齐到目标 workflow

## Scenario 4: 项目切换防串台

1. 在项目 A 中触发创建工作流
2. 在结果完全回流前，切换到项目 B
3. 验证项目 B 若无 workflow，则继续显示占位态
4. 验证项目 A 的迟到结果不会污染项目 B 的主工作区

## Latest Validation

- 2026-04-02: `cd /mnt/c/Users/sam/Documents/Sam/code/Tesseract/aily-blockly && npx tsc -p tsconfig.app.json --noEmit` 通过
- 2026-04-02: `cd /mnt/c/Users/sam/Documents/Sam/code/Tesseract/aily-blockly && npx tsc -p tsconfig.spec.json --noEmit` 通过
- 2026-04-02: `cd /mnt/c/Users/sam/Documents/Sam/code/Tesseract/aily-blockly && npx ng build --configuration development` 通过
- 2026-04-02: 本轮共享终端环境未执行 GUI 自动点按；工作区占位态、创建后自动聚焦与延迟对齐闭环已通过代码路径与编译结果核验。
