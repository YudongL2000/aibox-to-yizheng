# MQTT 后端代理配置指南

## 概述

由于 Web 浏览器不支持原生 TCP Socket，无法直接连接标准 MQTT broker（TCP 1883）。本方案通过后端代理服务解决此问题：

1. **后端代理服务**：使用 TCP 连接 MQTT broker (`101.43.169.195:1883`)
2. **Web 客户端**：通过 WebSocket 连接代理服务
3. **消息转发**：代理服务将 MQTT 消息实时转发给 Web 客户端

## 快速开始

### 1. 启动后端代理服务

```bash
cd mqtt_proxy_server
npm install
npm start
```

服务默认监听端口 `3006`，WebSocket 路径：`/mqtt`

### 2. 配置 Flutter Web 端

编辑 `lib/server/mqtt/mqtt_device_config.dart`：

```dart
/// 后端代理 WebSocket 地址（Web 平台使用，替代直接连接 MQTT broker）
static const String? proxyWsUrl = 'ws://你的服务器IP:3006/mqtt';
```

**示例：**
- 本地开发：`ws://localhost:3006/mqtt`
- 服务器部署：`ws://124.70.111.183:3006/mqtt`（根据你的服务器 IP）

### 3. 验证连接

1. 启动后端代理服务（确保 MQTT broker 连接成功）
2. 运行 Flutter Web 应用
3. 点击"连接 MQTT"按钮
4. 查看控制台日志，应该看到：
   ```
   [MQTT代理] ✅ WebSocket 连接成功
   [MQTT代理] ✅ 已连接到 MQTT 代理服务
   ```

## 架构说明

```
┌─────────────┐         TCP (1883)         ┌──────────────┐
│  MQTT Broker │◄──────────────────────────►│  后端代理服务 │
│ 101.43.169.195│                            │   (Node.js)  │
└─────────────┘                            └──────┬───────┘
                                                   │
                                                   │ WebSocket (3006)
                                                   │
                                                   ▼
                                            ┌─────────────┐
                                            │ Flutter Web │
                                            │   (浏览器)   │
                                            └─────────────┘
```

## 部署建议

### 本地开发

```bash
# 终端1：启动代理服务
cd mqtt_proxy_server
npm start

# 终端2：运行 Flutter Web
flutter run -d chrome
```

### 生产环境

#### 使用 PM2（推荐）

```bash
cd mqtt_proxy_server
npm install -g pm2
pm2 start server.js --name mqtt-proxy
pm2 save
pm2 startup
```

#### 使用 Docker

创建 `mqtt_proxy_server/Dockerfile`：

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY server.js .
EXPOSE 3006
CMD ["node", "server.js"]
```

构建和运行：

```bash
cd mqtt_proxy_server
docker build -t mqtt-proxy .
docker run -d -p 3006:3006 --name mqtt-proxy mqtt-proxy
```

## 环境变量配置

代理服务支持通过环境变量配置：

```bash
# MQTT broker 地址（默认: 101.43.169.195）
export MQTT_BROKER=101.43.169.195

# MQTT broker 端口（默认: 1883）
export MQTT_PORT=1883

# MQTT 主题（默认: device/usb/event）
export MQTT_TOPIC=device/usb/event

# WebSocket 服务端口（默认: 3006）
export PORT=3006

npm start
```

## 故障排查

### 1. 代理服务无法连接 MQTT broker

**检查项：**
- MQTT broker 地址和端口是否正确
- 网络是否可达（`ping 101.43.169.195`）
- 防火墙是否开放 1883 端口

**日志示例：**
```
❌ MQTT 错误: connect ECONNREFUSED
```

### 2. Flutter Web 无法连接代理服务

**检查项：**
- 代理服务是否已启动
- WebSocket 端口是否被占用
- 防火墙是否开放 3006 端口
- `proxyWsUrl` 配置是否正确（注意 `ws://` 协议前缀）

**日志示例：**
```
[MQTT代理] ❌ 连接异常: WebSocket connection failed
```

### 3. 消息未收到

**检查项：**
- MQTT broker 是否有消息发布到 `device/usb/event` 主题
- 代理服务日志是否显示收到消息
- Flutter Web 控制台是否有解析错误

**查看代理服务日志：**
```
📨 收到 MQTT 消息 [device/usb/event]: {...}
📤 已转发给 1 个 WebSocket 客户端
```

## 优势

✅ **无需修改 MQTT broker 配置**：broker 只需支持标准 TCP MQTT  
✅ **跨平台兼容**：Native 平台仍可直接连接 broker  
✅ **灵活部署**：代理服务可独立部署和扩展  
✅ **易于调试**：代理服务提供详细日志

## 注意事项

1. **代理服务单点故障**：如果代理服务宕机，所有 Web 客户端将无法接收消息。建议：
   - 使用进程管理器（PM2）自动重启
   - 配置健康检查和监控
   - 考虑多实例部署（负载均衡）

2. **性能考虑**：代理服务会转发所有消息给所有连接的 Web 客户端。如果客户端数量很大，考虑：
   - 使用消息队列（Redis Pub/Sub）
   - 实现消息过滤（按主题、客户端订阅）

3. **安全性**：生产环境建议：
   - 使用 WSS（WebSocket Secure）
   - 添加身份验证
   - 限制连接来源（CORS）
