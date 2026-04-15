# n8n Docker Compose 配置修复指南

根据你的 Docker Compose 配置，以下是解决 X-Frame-Options 问题的具体步骤。

## 方案 1：修改容器内文件（快速方案）

### 步骤 1：找到容器名称
```bash
# 查看运行中的容器
docker ps | grep n8n

# 或者查看所有容器（包括停止的）
docker ps -a | grep n8n
```

### 步骤 2：进入容器
```bash
# 假设容器名是 n8n（根据你的 docker-compose.yml 中的服务名）
docker exec -it n8n sh
# 或者如果服务名不同，使用实际的服务名
docker exec -it <your-service-name> sh
```

### 步骤 3：找到并修改 server.js 文件
```bash
# 在容器内执行
# 查找 server.js 文件
find /home/node -name "server.js" -path "*/n8n/dist/src/*" 2>/dev/null

# 通常位置是：
# /home/node/.n8n/node_modules/n8n/dist/src/server.js
# 或者
# /usr/local/lib/node_modules/n8n/dist/src/server.js

# 备份原文件
cp /home/node/.n8n/node_modules/n8n/dist/src/server.js \
   /home/node/.n8n/node_modules/n8n/dist/src/server.js.bak

# 查找 X-Frame-Options 的位置
grep -n "X-Frame-Options" /home/node/.n8n/node_modules/n8n/dist/src/server.js

# 使用 sed 注释掉相关代码
sed -i 's/res\.setHeader("X-Frame-Options"/\/\/ res.setHeader("X-Frame-Options"/g' \
    /home/node/.n8n/node_modules/n8n/dist/src/server.js

# 验证修改
grep "X-Frame-Options" /home/node/.n8n/node_modules/n8n/dist/src/server.js
# 应该看到被注释掉的代码（前面有 //）
```

### 步骤 4：退出并重启容器
```bash
# 退出容器
exit

# 重启容器（使用 docker-compose）
docker-compose restart n8n
# 或者
docker restart n8n
```

### 步骤 5：验证
```bash
# 检查响应头
curl -I http://118.196.33.248:5678 | grep -i "x-frame-options"
# 应该没有输出
```

---

## 方案 2：修改 docker-compose.yml 添加启动脚本（推荐）

### 步骤 1：创建启动脚本
```bash
# 在服务器上创建脚本目录
mkdir -p ~/n8n-scripts
cd ~/n8n-scripts

# 创建修复脚本
cat > fix-x-frame-options.sh << 'EOF'
#!/bin/sh
# 修复 X-Frame-Options 问题

# 查找并修改 server.js
find /home/node -name "server.js" -path "*/n8n/dist/src/*" -exec \
    sed -i 's/res\.setHeader("X-Frame-Options"/\/\/ res.setHeader("X-Frame-Options"/g' {} \; 2>/dev/null || \
find /usr/local -name "server.js" -path "*/n8n/dist/src/*" -exec \
    sed -i 's/res\.setHeader("X-Frame-Options"/\/\/ res.setHeader("X-Frame-Options"/g' {} \; 2>/dev/null || true

# 启动 n8n（如果脚本作为入口点）
exec n8n start
EOF

# 设置执行权限
chmod +x fix-x-frame-options.sh
```

### 步骤 2：修改 docker-compose.yml
在你的 `docker-compose.yml` 中添加卷挂载和入口点：

```yaml
services:
  n8n:
    image: n8nio/n8n:latest
    restart: unless-stopped
    ports:
      - "5678:5678"
    environment:
      - NODE_ENV=production
      - WEBHOOK_URL=http://118.196.33.248:5678/
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=admin123!
      - GENERIC_TIMEZONE=Asia/Shanghai
      - N8N_HOST=http://118.196.33.248/
      - N8N_PORT=5678
      - N8N_PROTOCOL=http
      - N8N_SECURE_COOKIE=false
      - N8N_METRICS=false
    volumes:
      - n8n_data:/home/node/.n8n
      - ~/n8n-scripts/fix-x-frame-options.sh:/fix-x-frame-options.sh:ro
    entrypoint: ["/bin/sh", "/fix-x-frame-options.sh"]
```

### 步骤 3：重启服务
```bash
# 停止并重新创建容器
docker-compose down
docker-compose up -d

# 查看日志
docker-compose logs -f n8n
```

---

## 方案 3：创建自定义 Docker 镜像（永久方案）

### 步骤 1：创建 Dockerfile
```bash
# 在服务器上创建目录
mkdir -p ~/n8n-custom
cd ~/n8n-custom

# 创建 Dockerfile
cat > Dockerfile << 'EOF'
FROM n8nio/n8n:latest

USER root

# 安装 sed（如果需要）
RUN apk add --no-cache sed || \
    (apt-get update && apt-get install -y sed) || \
    (yum install -y sed) || true

# 创建启动脚本
RUN echo '#!/bin/sh' > /fix-and-start.sh && \
    echo 'find /home/node -name "server.js" -path "*/n8n/dist/src/*" -exec sed -i "s/res\.setHeader(\"X-Frame-Options\"/\/\/ res.setHeader(\"X-Frame-Options\"/g" {} \; 2>/dev/null || true' >> /fix-and-start.sh && \
    echo 'find /usr/local -name "server.js" -path "*/n8n/dist/src/*" -exec sed -i "s/res\.setHeader(\"X-Frame-Options\"/\/\/ res.setHeader(\"X-Frame-Options\"/g" {} \; 2>/dev/null || true' >> /fix-and-start.sh && \
    echo 'exec n8n start' >> /fix-and-start.sh && \
    chmod +x /fix-and-start.sh

USER node

ENTRYPOINT ["/fix-and-start.sh"]
EOF
```

### 步骤 2：构建镜像
```bash
docker build -t n8n-custom:latest .
```

### 步骤 3：修改 docker-compose.yml
```yaml
services:
  n8n:
    image: n8n-custom:latest  # 改为自定义镜像
    restart: unless-stopped
    ports:
      - "5678:5678"
    environment:
      - NODE_ENV=production
      - WEBHOOK_URL=http://118.196.33.248:5678/
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=admin123!
      - GENERIC_TIMEZONE=Asia/Shanghai
      - N8N_HOST=http://118.196.33.248/
      - N8N_PORT=5678
      - N8N_PROTOCOL=http
      - N8N_SECURE_COOKIE=false
      - N8N_METRICS=false
    volumes:
      - n8n_data:/home/node/.n8n
```

### 步骤 4：重启服务
```bash
docker-compose down
docker-compose up -d
```

---

## 方案 4：使用 Nginx 反向代理（最简单，推荐）

如果你有 Nginx，这是最简单的方法，无需修改容器：

### 步骤 1：配置 Nginx
```bash
sudo nano /etc/nginx/sites-available/default
```

添加或修改配置：
```nginx
server {
    listen 80;
    server_name 118.196.33.248;

    location / {
        proxy_pass http://localhost:5678;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 移除 X-Frame-Options 头
        proxy_hide_header X-Frame-Options;
        
        # 如果需要基本认证，传递认证头
        proxy_set_header Authorization $http_authorization;
        proxy_pass_header Authorization;
    }
}
```

### 步骤 2：测试并重载
```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 步骤 3：修改 docker-compose.yml 中的 URL
如果使用 Nginx，可以修改环境变量：
```yaml
environment:
  - N8N_HOST=http://118.196.33.248/  # 保持不变，或改为 Nginx 地址
  - WEBHOOK_URL=http://118.196.33.248:5678/  # 或改为 Nginx 地址
```

---

## 推荐方案

**最快**：方案 1（直接修改容器内文件）
- ✅ 5 分钟完成
- ⚠️ 容器重启后需要重新修改

**最稳定**：方案 3（自定义镜像）
- ✅ 永久解决
- ✅ 更新时不会丢失
- ✅ 适合生产环境

**最简单**：方案 4（Nginx 反向代理）
- ✅ 无需修改容器
- ✅ 配置简单
- ✅ 不影响 n8n 更新

---

## 验证步骤

无论使用哪种方案，最后都要验证：

```bash
# 1. 检查响应头
curl -I http://118.196.33.248:5678 | grep -i "x-frame-options"
# 应该没有输出

# 2. 测试 iframe 加载
# 在浏览器中访问：
# http://118.196.33.248:5678/workflow/your-workflow-id?embedded=true
```

---

## 注意事项

1. **基本认证**：你的配置启用了基本认证（admin/admin123!），在 iframe 中加载时可能需要处理认证
2. **数据持久化**：使用命名卷 `n8n_data`，修改不会影响数据
3. **备份**：修改前建议备份容器或创建快照
