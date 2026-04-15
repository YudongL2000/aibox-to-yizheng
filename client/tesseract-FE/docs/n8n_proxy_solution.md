# n8n iframe 加载解决方案

## 问题说明
n8n 默认设置了 `X-Frame-Options: sameorigin`，阻止了在 iframe 中加载。这不是付费问题，而是安全策略。

## 解决方案

### 方案 1：使用 Nginx 反向代理（推荐）

在 Nginx 配置中添加代理，移除 X-Frame-Options 头：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location /n8n/ {
        proxy_pass http://118.196.33.248:5678/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 移除 X-Frame-Options 头
        proxy_hide_header X-Frame-Options;
        
        # 或者设置为允许所有来源
        add_header X-Frame-Options "ALLOWALL" always;
    }
}
```

然后修改代码中的 URL 为：`http://your-domain.com/n8n/workflow/xxx`

### 方案 2：修改 n8n 环境变量（无效）

⚠️ **注意**：`N8N_SECURE_COOKIE` 不影响 X-Frame-Options，此方案无效。

X-Frame-Options 是在 HTTP 响应头中设置的，需要在服务器层面处理。

### 方案 2：使用后端代理 API（推荐，已集成到代码中）

在后端 API 服务器（`http://124.70.111.183:3005`）上创建一个代理接口：

```javascript
// Node.js Express 示例
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

// n8n 代理中间件
app.use('/n8n-proxy', createProxyMiddleware({
  target: 'http://118.196.33.248:5678',
  changeOrigin: true,
  pathRewrite: {
    '^/n8n-proxy': '', // 移除 /n8n-proxy 前缀
  },
  onProxyRes: function (proxyRes, req, res) {
    // 移除 X-Frame-Options 头（解决 iframe 拒绝问题）
    delete proxyRes.headers['x-frame-options'];
    // 或者设置为允许所有来源（不推荐，安全性较低）
    // res.setHeader('X-Frame-Options', 'ALLOWALL');
  },
  onError: function(err, req, res) {
    res.status(500).send('Proxy error: ' + err.message);
  }
}));
```

**重要提示**：
- ❌ `response.setHeader("X-Frame-Options", "SAMEORIGIN")` 仍然会阻止跨域 iframe
- ✅ 要解决 iframe 拒绝问题，需要**移除** X-Frame-Options 头，而不是设置为 SAMEORIGIN
- ✅ 或者在后端代理中删除该响应头

**代码已自动支持**：当检测到 n8n 直接 URL 时，会自动转换为代理 URL。

### 方案 4：修改 n8n 服务器配置（需要服务器访问权限）

#### 方法 1：修改 n8n 源码（Docker 部署）

如果 n8n 是通过 Docker 部署的，需要修改源码并重新构建：

**步骤 1：找到 n8n 安装目录**
```bash
# 如果是 Docker 部署
docker exec -it <n8n-container-name> sh
# 或者找到 n8n 的 node_modules 目录
```

**步骤 2：找到服务器配置文件**
n8n 的服务器配置通常在：
- `node_modules/n8n/dist/src/server.js` 或
- `node_modules/n8n/dist/src/Server.js`

**步骤 3：修改代码**
在服务器初始化代码中添加中间件：

```typescript
// 在 app.use() 之前添加
app.use((req, res, next) => {
  // 移除 X-Frame-Options 头
  res.removeHeader('X-Frame-Options');
  // 或者设置允许所有来源
  res.setHeader('X-Frame-Options', 'ALLOWALL');
  next();
});
```

**步骤 4：重启 n8n 服务**
```bash
# Docker 方式
docker restart <n8n-container-name>

# 或者如果使用 systemd
sudo systemctl restart n8n

# 或者如果使用 npm/pm2
pm2 restart n8n
```

#### 方法 2：使用环境变量（如果 n8n 支持）

某些版本的 n8n 可能支持通过环境变量配置：

```bash
# 在 .env 文件中添加
N8N_SECURE_COOKIE=false
N8N_PROTOCOL=http

# 或者在启动命令中
N8N_SECURE_COOKIE=false n8n start
```

**注意**：这个方法可能无效，因为 X-Frame-Options 通常在代码中硬编码。

#### 方法 3：使用 Nginx 反向代理（推荐，无需修改 n8n）

如果 n8n 前面有 Nginx，在 Nginx 配置中处理：

```nginx
server {
    listen 80;
    server_name your-n8n-domain.com;

    location / {
        proxy_pass http://localhost:5678;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 移除 X-Frame-Options 头
        proxy_hide_header X-Frame-Options;
        
        # 可选：设置允许所有来源
        add_header X-Frame-Options "ALLOWALL" always;
    }
}
```

然后重启 Nginx：
```bash
sudo nginx -t  # 测试配置
sudo systemctl reload nginx  # 重新加载配置
```

#### 方法 4：修改 n8n Docker 镜像（自定义镜像）

如果需要长期解决方案，可以创建自定义 Docker 镜像：

**Dockerfile:**
```dockerfile
FROM n8nio/n8n:latest

# 安装必要的工具
USER root
RUN apk add --no-cache sed

# 修改 n8n 源码
RUN sed -i 's/res\.setHeader("X-Frame-Options"/\/\/ res.setHeader("X-Frame-Options"/g' \
    /home/node/.n8n/node_modules/n8n/dist/src/server.js || true

USER node
```

**构建和运行:**
```bash
docker build -t n8n-custom .
docker run -d --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8n-custom
```

#### 注意事项：

1. **备份**：修改前先备份原始文件
2. **版本更新**：n8n 更新后可能需要重新修改
3. **安全性**：移除 X-Frame-Options 会降低安全性，建议只在内部网络使用
4. **测试**：修改后测试 iframe 加载是否正常

## 临时方案

如果无法修改服务器配置，可以在错误提示中点击"在新标签页打开"按钮，在新窗口中查看 n8n 工作流。

## 注意事项

1. **安全性**：移除 X-Frame-Options 会降低安全性，建议只在内部网络使用
2. **CORS**：确保 n8n 服务器允许跨域请求
3. **HTTPS**：如果使用 HTTPS，需要配置 SSL 证书
