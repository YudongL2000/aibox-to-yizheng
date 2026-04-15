# Mosquitto WebSocket 配置指南

## 问题说明
Web 浏览器不支持原生 TCP Socket，需要通过 WebSocket 传输 MQTT 协议数据（MQTT over WebSocket）。

## 配置步骤

### 1. 编辑 Mosquitto 配置文件
编辑 `/etc/mosquitto/mosquitto.conf` 或你的配置文件：

```conf
# 标准 MQTT (TCP)
listener 1883
protocol mqtt

# WebSocket 支持（MQTT over WebSocket）
listener 8083
protocol websockets
```

### 2. 重启 Mosquitto
```bash
sudo systemctl restart mosquitto
# 或
mosquitto -c /etc/mosquitto/mosquitto.conf
```

### 3. 验证 WebSocket 端口
```bash
# 检查端口是否监听
netstat -tuln | grep 8083
# 或
ss -tuln | grep 8083
```

### 4. 测试连接
使用 MQTTX 工具：
- Protocol: WebSocket
- Host: 101.43.169.195
- Port: 8083
- Path: / (通常为空或 /mqtt)

## 其他常见 WebSocket 端口
- 8083: 标准 WebSocket (ws://)
- 8084: 标准 WebSocket (ws://)
- 9001: 常见 WebSocket 端口
- 1884: 有时用作 WebSocket 端口

## 注意事项
- WebSocket 端口和 TCP 端口是分开的
- WebSocket 传输的是 MQTT 协议数据，不是纯 WebSocket 消息
- 确保防火墙开放 WebSocket 端口
