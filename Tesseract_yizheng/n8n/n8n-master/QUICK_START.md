# 快速启动指南

## 🚀 启动开发服务器

### 方法 1：完整开发模式（推荐）
```bash
cd /Users/liuxiaolin/Desktop/n8n_base/n8n-master
pnpm dev
```

### 方法 2：仅前端开发
```bash
pnpm dev:fe
```

### 方法 3：仅后端开发
```bash
pnpm dev:be
```

### 方法 4：在 WebStorm 中运行
1. 打开 WebStorm
2. 在顶部工具栏选择运行配置：**n8n Dev**
3. 点击运行按钮 ▶️

## 🌐 访问页面

启动成功后，在浏览器中访问：

### 主要页面
- **自定义页面**：http://localhost:5678/my-custom-page
- **工作流列表**：http://localhost:5678/home/workflows
- **新建工作流**：http://localhost:5678/workflow/new
- **设置页面**：http://localhost:5678/settings

### 首次访问
如果是第一次运行，可能会跳转到设置页面：
- **设置向导**：http://localhost:5678/setup

## ⚠️ 常见问题

### 1. 端口 5678 被占用
```bash
# 查找占用端口的进程
lsof -i :5678

# 杀死进程（替换 PID）
kill -9 <PID>
```

### 2. 页面显示 404 或无法访问
- 确保开发服务器已启动（检查终端输出）
- 等待编译完成（首次启动需要几分钟）
- 检查浏览器控制台是否有错误

### 3. 需要登录才能访问
自定义页面需要登录，如果未登录会自动跳转到登录页面。

### 4. 编译错误
```bash
# 清理并重新安装依赖
pnpm install

# 重新构建
pnpm build
```

## 📝 验证服务器是否运行

在终端中执行：
```bash
curl http://localhost:5678
```

如果返回 HTML 内容，说明服务器正在运行。

## 🔍 检查日志

开发模式下，终端会显示：
- 编译进度
- 错误信息
- 服务器地址和端口

看到类似以下输出说明启动成功：
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:5678/
```

## 💡 提示

- 开发模式支持热重载，修改代码后会自动刷新
- 首次启动需要编译所有包，可能需要几分钟
- 确保 Node.js 版本是 v24.13.0（使用 `node -v` 检查）
