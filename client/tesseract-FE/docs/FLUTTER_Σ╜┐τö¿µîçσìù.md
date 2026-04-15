# Flutter 开发者 - MQTT 后端代理使用指南

## 📋 快速开始（3 步）

### 步骤 1️⃣：启动后端代理服务

打开终端，进入项目目录：

```bash
cd mqtt_proxy_server
npm install
npm start
```

**预期输出：**
```
✅ MQTT 连接成功: 101.43.169.195:1883
✅ 已订阅主题: device/usb/event
🚀 WebSocket 服务器启动: ws://localhost:3006/mqtt
```

**⚠️ 重要：** 保持这个终端窗口打开，代理服务需要一直运行。

---

### 步骤 2️⃣：配置 Flutter Web 端

编辑文件：`lib/server/mqtt/mqtt_device_config.dart`

找到第 26 行，修改 `proxyWsUrl`：

```dart
// 修改前：
static const String? proxyWsUrl = null;

// 修改后（本地开发）：
static const String? proxyWsUrl = 'ws://localhost:3006/mqtt';

// 或者（服务器部署，替换为你的服务器 IP）：
static const String? proxyWsUrl = 'ws://124.70.111.183:3006/mqtt';
```

**保存文件。**

---

### 步骤 3️⃣：运行 Flutter Web 应用

在另一个终端窗口：

```bash
# 确保在项目根目录
cd /Users/liuxiaolin/Desktop/AI-tesseract/aItesseract

# 运行 Web 版本
flutter run -d chrome
```

**或者使用 VS Code/Cursor：**
- 按 `F5` 或点击运行按钮
- 选择 Chrome 浏览器

---

## ✅ 验证连接

1. **打开浏览器控制台**（F12 或右键 → 检查）
2. **点击页面上的"连接 MQTT"按钮**
3. **查看控制台日志**，应该看到：

```
[MQTT代理] ========== 连接后端代理 ==========
[MQTT代理] 代理地址: ws://localhost:3006/mqtt
[MQTT代理] ✅ WebSocket 连接成功
[MQTT代理] ✅ 已连接到 MQTT 代理服务
```

4. **如果 MQTT broker 有消息**，会看到：

```
[MQTT代理] 📨 收到消息 [device/usb/event]
[MQTT代理] ✅ 解析成功: X 个设备
```

---

## 🔧 常见问题

### ❌ 问题 1：代理服务启动失败

**错误信息：**
```
❌ MQTT 错误: connect ECONNREFUSED
```

**解决方案：**
- 检查 MQTT broker (`101.43.169.195:1883`) 是否可访问
- 检查网络连接
- 确认 broker 服务是否正常运行

---

### ❌ 问题 2：Flutter Web 无法连接代理

**错误信息：**
```
[MQTT代理] ❌ 连接异常: WebSocket connection failed
```

**解决方案：**
1. **确认代理服务已启动**（步骤 1）
2. **检查 `proxyWsUrl` 配置是否正确**
   - 格式必须是：`ws://localhost:3006/mqtt`（注意 `ws://` 前缀）
   - 端口号必须是 `3006`（或你修改的端口）
3. **检查端口是否被占用**：
   ```bash
   lsof -i :3006
   ```

---

### ❌ 问题 3：收到消息但页面不更新

**检查项：**
1. **查看控制台是否有解析错误**
2. **确认 `HomeWorkspacePage` 是否正确监听 `deviceEventStream`**
3. **检查设备数量是否更新**：
   ```dart
   // 在 HomeWorkspacePage 中应该有类似代码：
   _deviceSub = _deviceMqtt.deviceEventStream.listen((event) {
     setState(() {
       _deviceCount = event.deviceInfo.length;
     });
   });
   ```

---

## 📝 开发流程总结

```
1. 启动代理服务（终端1）
   └─> cd mqtt_proxy_server && npm start

2. 配置 Flutter（代码）
   └─> 修改 mqtt_device_config.dart 的 proxyWsUrl

3. 运行 Flutter Web（终端2 或 IDE）
   └─> flutter run -d chrome

4. 测试连接
   └─> 点击"连接 MQTT"按钮，查看控制台日志
```

---

## 🚀 生产环境部署

### 选项 A：在同一服务器部署代理服务

1. **将 `mqtt_proxy_server` 上传到服务器**
2. **在服务器上启动**：
   ```bash
   cd mqtt_proxy_server
   npm install --production
   npm start
   ```
3. **使用 PM2 保持运行**（推荐）：
   ```bash
   npm install -g pm2
   pm2 start server.js --name mqtt-proxy
   pm2 save
   ```
4. **修改 Flutter 配置**：
   ```dart
   static const String? proxyWsUrl = 'ws://你的服务器IP:3006/mqtt';
   ```

### 选项 B：本地开发（代理服务在本地）

- 代理服务：`localhost:3006`
- Flutter 配置：`ws://localhost:3006/mqtt`
- 仅用于本地开发和测试

---

## 📚 相关文件说明

- **`mqtt_proxy_server/`**：后端代理服务（Node.js）
- **`lib/server/mqtt/mqtt_device_config.dart`**：Flutter MQTT 配置
- **`lib/server/mqtt/mqtt_proxy_service.dart`**：代理 WebSocket 客户端
- **`lib/server/mqtt/mqtt_device_service.dart`**：MQTT 服务（自动选择代理或直连）

---

## 💡 提示

- **开发时**：代理服务可以运行在本地（`localhost:3006`）
- **生产环境**：代理服务应该部署在服务器上，并配置正确的 IP 地址
- **Native 平台**（Android/iOS）：不需要代理，直接连接 MQTT broker（TCP 1883）
- **Web 平台**：必须使用代理（因为浏览器不支持 TCP）

---

## 🆘 需要帮助？

如果遇到问题，请检查：
1. 代理服务日志（终端1）
2. Flutter Web 控制台日志（浏览器 F12）
3. 网络连接和防火墙设置
