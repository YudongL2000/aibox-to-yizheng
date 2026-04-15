# n8n 服务器配置操作指南

## 第一步：确认部署方式

### 检查 n8n 部署方式

**方法 1：检查是否使用 Docker**
```bash
# SSH 登录到服务器
ssh user@your-server-ip

# 检查 Docker 容器
docker ps | grep n8n
# 或者
docker ps -a | grep n8n
```

**方法 2：检查是否使用 systemd 服务**
```bash
systemctl status n8n
# 或者
systemctl list-units | grep n8n
```

**方法 3：检查是否使用 pm2**
```bash
pm2 list | grep n8n
```

**方法 4：检查是否直接运行**
```bash
ps aux | grep n8n
```

---

## 第二步：根据部署方式选择操作

### 方案 A：Docker 部署（最常见）

#### 步骤 1：进入容器
```bash
# 找到容器名称
docker ps | grep n8n

# 进入容器（假设容器名为 n8n）
docker exec -it n8n sh
# 或者
docker exec -it n8n bash
```

#### 步骤 2：找到 n8n 源码位置
```bash
# 在容器内执行
find / -name "server.js" -path "*/n8n/dist/*" 2>/dev/null
# 或者
find /home/node -name "*.js" -path "*/n8n/dist/src/*" 2>/dev/null
```

通常位置：
- `/home/node/.n8n/node_modules/n8n/dist/src/server.js`
- `/usr/local/lib/node_modules/n8n/dist/src/server.js`

#### 步骤 3：备份并修改文件
```bash
# 备份原文件
cp /home/node/.n8n/node_modules/n8n/dist/src/server.js \
   /home/node/.n8n/node_modules/n8n/dist/src/server.js.bak

# 查找 X-Frame-Options
grep -n "X-Frame-Options" /home/node/.n8n/node_modules/n8n/dist/src/server.js

# 使用 sed 注释掉相关代码
sed -i 's/res\.setHeader("X-Frame-Options"/\/\/ res.setHeader("X-Frame-Options"/g' \
    /home/node/.n8n/node_modules/n8n/dist/src/server.js
```

#### 步骤 4：退出容器并重启
```bash
# 退出容器
exit

# 重启容器
docker restart n8n
```

#### 步骤 5：验证修改
```bash
# 检查响应头
curl -I http://your-server-ip:5678 | grep -i "x-frame-options"
# 应该没有输出，或者输出被注释掉了
```

---

### 方案 B：使用 Nginx 反向代理（推荐，最简单）

如果你有 Nginx 在 n8n 前面，这是最简单的方法：

#### 步骤 1：编辑 Nginx 配置
```bash
# 找到 Nginx 配置文件
sudo nano /etc/nginx/sites-available/default
# 或者
sudo nano /etc/nginx/nginx.conf
```

#### 步骤 2：添加或修改配置
```nginx
server {
    listen 80;
    server_name your-domain.com;  # 或 your-server-ip

    location / {
        proxy_pass http://localhost:5678;  # n8n 的本地地址
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 关键：移除 X-Frame-Options 头
        proxy_hide_header X-Frame-Options;
        
        # 可选：设置允许所有来源
        add_header X-Frame-Options "ALLOWALL" always;
    }
}
```

#### 步骤 3：测试并重载配置
```bash
# 测试配置是否正确
sudo nginx -t

# 如果测试通过，重载配置
sudo systemctl reload nginx
# 或者
sudo service nginx reload
```

#### 步骤 4：验证
```bash
# 检查响应头（通过 Nginx）
curl -I http://your-domain.com | grep -i "x-frame-options"
# 应该没有输出或显示 ALLOWALL
```

---

### 方案 C：systemd 服务部署

#### 步骤 1：找到 n8n 安装目录
```bash
# 查看服务配置
systemctl cat n8n

# 或者查看进程
ps aux | grep n8n
```

#### 步骤 2：找到并修改源码
```bash
# 通常安装在：
# /opt/n8n/
# /usr/local/lib/node_modules/n8n/
# ~/.n8n/node_modules/n8n/

# 找到文件
find / -name "server.js" -path "*/n8n/dist/src/*" 2>/dev/null

# 备份并修改
sudo cp /path/to/n8n/dist/src/server.js /path/to/n8n/dist/src/server.js.bak
sudo sed -i 's/res\.setHeader("X-Frame-Options"/\/\/ res.setHeader("X-Frame-Options"/g' \
    /path/to/n8n/dist/src/server.js
```

#### 步骤 3：重启服务
```bash
sudo systemctl restart n8n
sudo systemctl status n8n
```

---

### 方案 D：pm2 部署

#### 步骤 1：找到 n8n 目录
```bash
pm2 info n8n
# 查看工作目录
```

#### 步骤 2：修改源码（同方案 C）
```bash
# 找到并修改 server.js
find ~ -name "server.js" -path "*/n8n/dist/src/*" 2>/dev/null
```

#### 步骤 3：重启
```bash
pm2 restart n8n
pm2 logs n8n
```

---

## 第三步：验证配置

### 测试 iframe 加载

1. **检查响应头**：
```bash
curl -I http://your-server-ip:5678/workflow/your-workflow-id
```

应该看到：
- ❌ 没有 `X-Frame-Options: SAMEORIGIN`
- ✅ 或者 `X-Frame-Options: ALLOWALL`

2. **在浏览器中测试**：
   - 打开浏览器开发者工具（F12）
   - 访问 n8n 工作流 URL
   - 查看 Network 标签
   - 检查响应头中是否还有 `X-Frame-Options: SAMEORIGIN`

3. **测试 iframe 加载**：
   - 创建一个简单的 HTML 文件测试：
```html
<!DOCTYPE html>
<html>
<head>
    <title>Test n8n iframe</title>
</head>
<body>
    <iframe src="http://your-server-ip:5678/workflow/your-workflow-id?embedded=true" 
            width="100%" 
            height="600px">
    </iframe>
</body>
</html>
```

---

## 常见问题排查

### 问题 1：修改后仍然有 X-Frame-Options

**可能原因**：
- 修改的文件不对
- 需要清除缓存
- Nginx 配置未生效

**解决方法**：
```bash
# 清除浏览器缓存
# 或者使用无痕模式测试

# 检查 Nginx 配置
sudo nginx -t
sudo systemctl reload nginx

# 检查是否有多个地方设置了 X-Frame-Options
grep -r "X-Frame-Options" /path/to/n8n/
```

### 问题 2：Docker 容器重启后修改丢失

**解决方法**：使用自定义 Docker 镜像（见方案 E）

### 问题 3：找不到 server.js 文件

**可能原因**：
- n8n 版本不同，文件位置不同
- 文件是编译后的，需要修改源码

**解决方法**：
```bash
# 搜索所有相关文件
find / -name "*server*" -path "*/n8n/*" 2>/dev/null

# 或者直接搜索 X-Frame-Options
grep -r "X-Frame-Options" /path/to/n8n/
```

---

## 方案 E：创建自定义 Docker 镜像（永久方案）

如果使用 Docker，可以创建自定义镜像，这样更新时不会丢失配置：

### 步骤 1：创建 Dockerfile
```bash
# 在服务器上创建目录
mkdir -p ~/n8n-custom
cd ~/n8n-custom

# 创建 Dockerfile
cat > Dockerfile << 'EOF'
FROM n8nio/n8n:latest

USER root

# 安装 sed（如果镜像中没有）
RUN apk add --no-cache sed || \
    (apt-get update && apt-get install -y sed) || \
    (yum install -y sed) || true

# 修改 n8n 源码，移除 X-Frame-Options
RUN find /home/node -name "server.js" -path "*/n8n/dist/src/*" -exec \
    sed -i 's/res\.setHeader("X-Frame-Options"/\/\/ res.setHeader("X-Frame-Options"/g' {} \; || \
    find /usr/local -name "server.js" -path "*/n8n/dist/src/*" -exec \
    sed -i 's/res\.setHeader("X-Frame-Options"/\/\/ res.setHeader("X-Frame-Options"/g' {} \; || true

USER node
EOF
```

### 步骤 2：构建镜像
```bash
docker build -t n8n-custom:latest .
```

### 步骤 3：停止旧容器并启动新容器
```bash
# 停止旧容器
docker stop n8n
docker rm n8n

# 启动新容器（使用自定义镜像）
docker run -d \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8n-custom:latest
```

---

## 推荐方案

**最简单**：使用 Nginx 反向代理（方案 B）
- ✅ 无需修改 n8n 源码
- ✅ 配置简单
- ✅ 不影响 n8n 更新

**最稳定**：创建自定义 Docker 镜像（方案 E）
- ✅ 永久解决
- ✅ 更新时不会丢失
- ✅ 适合生产环境

---

## 完成后

修改完成后，确保：
1. ✅ 响应头中没有 `X-Frame-Options: SAMEORIGIN`
2. ✅ iframe 可以正常加载
3. ✅ 工作流 URL 添加了 `embedded=true` 参数（代码已自动处理）
