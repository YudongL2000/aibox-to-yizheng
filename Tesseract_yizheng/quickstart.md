# Tesseract Quickstart for Apple Silicon macOS

适用对象：
- macOS on Apple Silicon (`arm64`, M1/M2/M3/M4)
- 已经拉下根仓以及 4 个子仓：
  - `backend/`
  - `frontend/`
  - `aily-blockly/`
  - `n8n/n8n-master/`

目标：
- 本地启动 backend Agent
- 本地启动 Flutter 数字孪生 Web
- 本地启动 Angular + Electron 客户端
- 客户端通过外部 backend 模式工作，避免重启 backend 时把客户端一起带死

## 0. 最短入口

如果你只想直接拉起整套本地环境，先用：

```bash
cd /path/to/Tesseract
chmod +x ./dev-up-macos.sh
./dev-up-macos.sh
```

这条脚本会在 macOS Terminal 中分标签启动：
- backend
- frontend digital twin web
- Angular dev server
- Electron (`external backend mode`)

如果你想瘦身启动链，优先用 profile：

```bash
# 推荐日常开发：3 个 tab
FLUTTER_BIN=/Users/skylerwang/flutter_sdk_3_41_6/bin/flutter ./dev-up-macos.sh --profile compact

# 只做桌面端：2 个 tab（不开 Flutter 数字孪生）
./dev-up-macos.sh --profile desktop
```

profile 含义：
- `full`：4 个 tab，backend + frontend + angular + electron
- `compact`：3 个 tab，backend + frontend + electron；Electron tab 内部自动拉起 Angular
- `desktop`：2 个 tab，backend + electron；不启动 Flutter 数字孪生

如果你不想新开 Terminal 标签，而想在当前 shell 里顺序执行：

```bash
./dev-up-macos.sh --inline
```

## 1. 先决条件

不要用 Rosetta 终端。先确认当前 shell 是原生 arm64：

```bash
uname -m
```

预期输出：

```bash
arm64
```

安装基础依赖：

```bash
xcode-select --install
brew install node pnpm bun cocoapods
```

安装 Flutter：

```bash
brew install --cask flutter
flutter doctor
```

如果你已经有自己的 Flutter，就保证这些命令可用：

```bash
flutter --version
dart --version
node --version
pnpm --version
bun --version
```

## 2. 仓库目录应为这个结构

```bash
Tesseract/
├── backend/
├── frontend/
├── aily-blockly/
└── n8n/
    └── n8n-master/
```

`aily-blockly/scripts/prepare-tesseract-runtime.js` 会显式依赖：
- `../backend`
- `../n8n/n8n-master`

所以目录层级不能改。

## 3. 安装 4 个子仓依赖

### 3.1 backend

```bash
cd backend
bun install
```

如果你暂时不用 Bun，也可以退回：

```bash
npm install
```

### 3.2 frontend

```bash
cd ../frontend
flutter pub get
```

### 3.3 aily-blockly

```bash
cd ../aily-blockly
npm install
```

### 3.4 n8n

```bash
cd ../n8n/n8n-master
pnpm install --frozen-lockfile
```

## 4. 配置 backend/.env

至少确认这些变量是可用的：

```bash
AGENT_PORT=3006
N8N_API_URL=http://127.0.0.1:5678/api/v1
N8N_API_KEY=your_n8n_api_key
base_url=your_llm_base_url
api_key=your_llm_api_key
model=your_model_name
```

如果你还要本地 MQTT，继续补：

```bash
AGENT_MQTT_ENABLED=true
AGENT_MQTT_BROKER=127.0.0.1
AGENT_MQTT_PORT=1883
AGENT_MQTT_DEVICE_ID=aibox001
AGENT_MQTT_KEEPALIVE=60
```

## 5. 初始化 backend

推荐 Bun 路径：

```bash
cd /path/to/Tesseract/backend
bun run agent:db:init:bun
```

如果你走 npm 路径：

```bash
cd /path/to/Tesseract/backend
npm run build
npm run agent:db:init
```

## 6. 启动顺序

推荐开 4 个终端。

### 终端 A：启动 backend

```bash
cd /path/to/Tesseract/backend
npm run agent:restart
```

说明：
- 这条命令默认只重启 backend 自己
- 不会杀掉 Electron 客户端

如果你更喜欢 Bun 直跑：

```bash
cd /path/to/Tesseract/backend
bun run agent:dev:bun
```

### 终端 B：启动 Flutter 数字孪生 Web

```bash
cd /path/to/Tesseract/frontend
./dev_web_start.sh
```

预期：
- Flutter Web Server: `http://127.0.0.1:18081`
- 外部访问入口: `http://127.0.0.1:18082`

### 终端 C：启动 Angular dev server

```bash
cd /path/to/Tesseract/aily-blockly
npm start -- --host 127.0.0.1 --port 4200
```

### 终端 D：启动 Electron 客户端（外部 backend 模式）

```bash
cd /path/to/Tesseract/aily-blockly
npm run electron:reuse:external
```

这个模式很重要：
- Electron 只 attach 已运行的 backend
- 不会自己托管 backend
- 你后续重启 backend，不需要关闭客户端，也不会重新编译 Angular

## 7. 首次启动时的附加说明

`aily-blockly` 首次启动会执行：

```bash
npm run prepare:tesseract-runtime
```

这一步会检查并在必要时补齐：
- `backend/node_modules`
- `backend/dist`
- `n8n/n8n-master/node_modules`
- `n8n/n8n-master/packages/cli/dist`

所以第一次会比较慢，这是正常的。

## 8. 日常调试的最短路径

第一次完整启动完成后，日常开发只需要保持这三条：

终端 A：

```bash
cd /path/to/Tesseract/backend
npm run agent:restart
```

终端 B：

```bash
cd /path/to/Tesseract/frontend
./dev_web_start.sh
```

终端 C：

```bash
cd /path/to/Tesseract/aily-blockly
npm start -- --host 127.0.0.1 --port 4200
```

终端 D：

```bash
cd /path/to/Tesseract/aily-blockly
npm run electron:reuse:external
```

以后只重启 backend：

```bash
cd /path/to/Tesseract/backend
npm run agent:restart
```

客户端不需要关。

如果你已经接受根仓单入口脚本，日常也可以直接用：

```bash
cd /path/to/Tesseract
./dev-up-macos.sh
```

按需裁剪：

```bash
./dev-up-macos.sh --no-frontend
./dev-up-macos.sh --no-electron
./dev-up-macos.sh --inline --no-backend
```

## 9. 健康检查

### backend

```bash
curl http://127.0.0.1:3006/api/agent/runtime-status
```

### Flutter 数字孪生

浏览器打开：

```bash
http://127.0.0.1:18082/?entry=digital-twin&source=aily-blockly
```

### Angular dev server

浏览器打开：

```bash
http://127.0.0.1:4200
```

## 10. 常见问题

### 10.1 backend 端口被占用

```bash
cd /path/to/Tesseract/backend
npm run agent:restart
```

如果你明确知道当前 backend 是被 Electron 托管的老模式实例占住，才用：

```bash
cd /path/to/Tesseract/backend
npm run agent:restart:hosted
```

### 10.2 Electron 打开后提示 backend 不可用

你用了 `electron:reuse:external`，说明它不会帮你启动 backend。先确认：

```bash
curl http://127.0.0.1:3006/api/agent/runtime-status
```

### 10.3 数字孪生窗口打不开

先确认：

```bash
http://127.0.0.1:18082/?entry=digital-twin&source=aily-blockly
```

如果浏览器也打不开，问题在 `frontend/dev_web_start.sh` 这条链，不在 Electron。

### 10.4 n8n 相关报错

先确认 sibling workspace 真在这个位置：

```bash
/path/to/Tesseract/n8n/n8n-master
```

然后确认：

```bash
cd /path/to/Tesseract/n8n/n8n-master
pnpm install --frozen-lockfile
```

## 11. 推荐的稳定工作方式

开发时固定用这套职责分离：
- `backend` 独立启动
- `frontend` 独立启动
- `aily-blockly` 只做壳层与渲染
- Electron 用 `external backend mode`

这样边界最清楚，也最不容易出现“重启后端导致客户端退出、重新编译、丢状态”的连锁问题。
