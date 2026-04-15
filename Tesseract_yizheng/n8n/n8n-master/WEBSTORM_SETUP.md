# WebStorm 运行 n8n 项目指南

## 📋 前置条件

✅ Node.js v24.13.0（已通过 nvm 安装）  
✅ pnpm 10.22.0（已安装）  
✅ 项目依赖已安装（`pnpm install` 已完成）

## 🔧 WebStorm 配置步骤

### 1. 配置 Node.js 解释器

1. 打开 **WebStorm → Preferences**（macOS）或 **Settings**（Windows/Linux）
2. 导航到 **Languages & Frameworks → Node.js**
3. 在 **Node interpreter** 中选择：
   ```
   ~/.nvm/versions/node/v24.13.0/bin/node
   ```
   或者点击文件夹图标，导航到：
   ```
   /Users/liuxiaolin/.nvm/versions/node/v24.13.0/bin/node
   ```
4. 在 **Package manager** 中选择 **pnpm**
5. 点击 **Apply** 和 **OK**

### 2. 使用运行配置

我已经为你创建了以下运行配置，你可以在 WebStorm 顶部工具栏的运行配置下拉菜单中选择：

#### 🚀 n8n Dev（开发模式 - 推荐）
- **用途**：启动完整的开发环境，支持热重载
- **命令**：`pnpm dev`
- **说明**：启动后端和前端开发服务器，代码修改后自动重新编译和刷新
- **访问地址**：http://localhost:5678

#### ▶️ n8n Start（生产模式）
- **用途**：以生产模式启动 n8n
- **命令**：`pnpm start`
- **说明**：直接启动编译后的 n8n，适合测试生产构建

#### 🔧 n8n Dev (Backend Only)（仅后端）
- **用途**：只启动后端开发服务器
- **命令**：`pnpm dev:be`
- **说明**：不启动前端编辑器 UI，适合只开发后端功能

#### 🎨 n8n Dev (Frontend Only)（仅前端）
- **用途**：启动后端服务器和前端开发服务器
- **命令**：`pnpm dev:fe`
- **说明**：适合主要开发前端界面

### 3. 运行项目

**方法 1：使用运行配置（推荐）**
1. 在 WebStorm 顶部工具栏，点击运行配置下拉菜单
2. 选择 **n8n Dev**
3. 点击绿色的运行按钮 ▶️ 或按 `Ctrl+R`（macOS: `Cmd+R`）

**方法 2：使用终端**
1. 打开 WebStorm 内置终端（View → Tool Windows → Terminal）
2. 执行：
   ```bash
   cd /Users/liuxiaolin/Desktop/n8n_base/n8n-master
   pnpm dev
   ```

### 4. 验证运行状态

启动成功后，你应该看到：
- 后端服务器运行在 `http://localhost:5678`
- 终端中显示编译和启动日志
- 浏览器自动打开（如果配置了 `--open` 参数）

## 🌐 访问应用

启动成功后，在浏览器中访问：
- **本地地址**：http://localhost:5678
- **网络地址**：http://你的IP:5678（局域网内其他设备可访问）

## 🛠️ 常用开发命令

在 WebStorm 终端中可以直接运行：

```bash
# 开发模式（热重载）
pnpm dev

# 仅后端开发
pnpm dev:be

# 仅前端开发
pnpm dev:fe

# 生产模式启动
pnpm start

# 构建项目
pnpm build

# 运行测试
pnpm test

# 代码检查
pnpm lint

# 格式化代码
pnpm format
```

## ⚠️ 常见问题

### 1. Node 版本错误
如果看到版本错误，确保：
- WebStorm 的 Node interpreter 指向 `~/.nvm/versions/node/v24.13.0/bin/node`
- 终端中执行 `node -v` 显示 `v24.13.0`

### 2. pnpm 未找到
确保 WebStorm 的 Package manager 设置为 **pnpm**

### 3. 端口被占用
如果 5678 端口被占用：
```bash
# 查找占用端口的进程
lsof -i :5678

# 杀死进程（替换 PID）
kill -9 <PID>
```

或者设置不同的端口：
```bash
N8N_PORT=3000 pnpm dev
```

### 4. 依赖问题
如果遇到依赖错误，重新安装：
```bash
pnpm install
```

## 📝 开发提示

1. **热重载**：开发模式下，修改代码后会自动重新编译和重启
2. **调试**：可以在 WebStorm 中设置断点进行调试
3. **日志**：查看终端输出了解运行状态和错误信息
4. **数据库**：默认使用 SQLite，数据存储在 `~/.n8n` 目录

## 🔗 相关资源

- [n8n 官方文档](https://docs.n8n.io)
- [贡献指南](CONTRIBUTING.md)
- [手动启动指南](手动启动指南.md)
