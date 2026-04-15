import 'dart:async';
import 'dart:convert';

import 'package:aitesseract/module/device/model/device_action_model.dart';
import 'package:aitesseract/module/device/model/device_event_model.dart';
import 'package:aitesseract/server/mqtt/mqtt_device_config.dart';
import 'package:flutter/foundation.dart' show kDebugMode;
import 'package:mqtt_client/mqtt_client.dart';
import 'package:mqtt_client/mqtt_browser_client.dart';

/// 仅 Web 端：通过 WebSocket 订阅 device/usb/event，解析并推送设备事件
class MqttDeviceService {
  MqttClient? _client;
  final StreamController<DeviceEventPayload> _eventController =
      StreamController<DeviceEventPayload>.broadcast();

  /// 收到符合结构的设备事件时推送
  Stream<DeviceEventPayload> get deviceEventStream => _eventController.stream;

  bool _isConnecting = false;
  String? _lastError;

  bool get isConnected {
    return _client?.connectionStatus?.state == MqttConnectionState.connected;
  }

  String? get lastError => _lastError;

  /// 连接并订阅
  Future<bool> connectAndSubscribe() async {
    if (_isConnecting) {
      print('[MQTT] 连接已在进行中，跳过重复请求');
      return false;
    }
    if (!MqttDeviceConfig.isConfigured) {
      _lastError = 'MQTT broker 地址未配置，请通过 TESSERACT_MQTT_HOST 注入';
      return false;
    }
    _isConnecting = true;
    _lastError = null;

    final clientId =
        '${MqttDeviceConfig.clientId}_${DateTime.now().millisecondsSinceEpoch}';
    print('[MQTT] ========== 开始连接 ==========');
    print('[MQTT] Broker: ${MqttDeviceConfig.host}');
    print('[MQTT] WebSocket 端口: ${MqttDeviceConfig.wsPort}');
    print('[MQTT] Client ID: $clientId');
    print('[MQTT] Topic: ${MqttDeviceConfig.topicDeviceEvent}');

    final wsUrl = MqttDeviceConfig.webSocketUrl;
    print('[MQTT] WebSocket URL: $wsUrl');
    print(
      '[MQTT] Path: ${MqttDeviceConfig.wsPath.isNotEmpty ? MqttDeviceConfig.wsPath : '(无路径)'}',
    );

    try {
      _client = MqttBrowserClient(wsUrl, clientId);
      // mqtt_client 会用 client.port 覆盖 URL 中的端口，默认是 1883，必须显式设为 WebSocket 端口
      _client!.port = MqttDeviceConfig.wsPort;

      // 启用日志输出
      _client!.logging(on: true);
      _client!.keepAlivePeriod = 60;
      _client!.connectTimeoutPeriod = 60; // 增加超时时间到 60 秒
      _client!.autoReconnect = true;

      print('[MQTT] 配置完成: keepAlive=60s, timeout=60s, autoReconnect=true');

      print('[MQTT] 正在连接...');

      print('[MQTT] 调用 connect()，等待 broker 响应...');
      final conn = await _client!.connect();

      print('[MQTT] 连接结果: ${conn?.state}');
      print('[MQTT] 返回码: ${conn?.returnCode}');
      if (conn?.returnCode != null) {
        print('[MQTT] 返回码值: ${conn!.returnCode!.index}');
      }

      if (conn?.state != MqttConnectionState.connected) {
        final errorMsg = '连接失败: ${conn?.state}';
        _lastError = errorMsg;
        print('[MQTT] ❌ $errorMsg');
        print(
            '[MQTT] ⚠️ 请确认 broker 已开启 WebSocket（端口 ${MqttDeviceConfig.wsPort}），当前尝试: $wsUrl');
        _isConnecting = false;
        return false;
      }

      print('[MQTT] ✅ 连接成功！');
      print('[MQTT] 正在订阅主题: ${MqttDeviceConfig.topicDeviceEvent}');

      _client!
          .subscribe(MqttDeviceConfig.topicDeviceEvent, MqttQos.atLeastOnce);

      print('[MQTT] ✅ 订阅成功，等待消息...');

      _client!.updates?.listen((List<MqttReceivedMessage<MqttMessage>> list) {
        print('[MQTT] 📨 收到 ${list.length} 条消息');
        for (var msg in list) {
          print('[MQTT]   主题: ${msg.topic}');
          final rec = msg.payload;
          if (rec is MqttPublishMessage) {
            final bytes = rec.payload.message;
            final payload = utf8.decode(bytes);
            print('[MQTT]   内容长度: ${payload.length} 字符');
            if (kDebugMode && payload.length < 500) {
              print(
                  '[MQTT]   内容预览: ${payload.substring(0, payload.length > 200 ? 200 : payload.length)}...');
            }
            _parseAndPublish(payload);
          }
        }
      });

      _isConnecting = false;
      print('[MQTT] ========== 连接完成 ==========');
      return true;
    } catch (e, stackTrace) {
      _lastError = '连接异常: $e';
      print('[MQTT] ❌ 连接异常: $e');
      print('[MQTT] 堆栈跟踪: $stackTrace');

      // 提供端口检测建议
      if (e.toString().contains('NoConnectionException')) {
        print('[MQTT] ========== 端口检测建议 ==========');
        print('[MQTT] 可能原因：WebSocket 端口未开启或端口号不正确');
        print(
            '[MQTT] 当前尝试: ws://${MqttDeviceConfig.host}:${MqttDeviceConfig.wsPort}');
        print('[MQTT] ');
        print('[MQTT] 检测方法：');
        print('[MQTT] 1. 浏览器控制台执行（F12 -> Console）：');
        print(
            '[MQTT]    const ws = new WebSocket("ws://${MqttDeviceConfig.host}:${MqttDeviceConfig.wsPort}");');
        print('[MQTT]    ws.onopen = () => console.log("✅ 端口开启");');
        print('[MQTT]    ws.onerror = (e) => console.log("❌ 端口关闭或不可达");');
        print('[MQTT] ');
        print('[MQTT] 2. 使用 MQTTX 工具测试 WebSocket 连接');
        print('[MQTT] ');
        print('[MQTT] 3. 常见 WebSocket 端口：8083, 8084, 9001, 1884');
        print('[MQTT] ====================================');
      }

      _isConnecting = false;
      return false;
    }
  }

  void _parseAndPublish(String payload) {
    try {
      final map = jsonDecode(payload) as Map<String, dynamic>?;
      if (map == null) {
        print('[MQTT] ⚠️ 解析失败: payload 不是有效的 JSON');
        return;
      }
      final event = DeviceEventPayload.fromJson(map);
      if (event.deviceInfo.isNotEmpty) {
        print('[MQTT] ✅ 解析成功: ${event.deviceInfo.length} 个设备');
        print('[MQTT]   session_id: ${event.sessionId}');
        print('[MQTT]   target_id: ${event.targetId}');
        print('[MQTT]   timestamp: ${event.timestamp}');
        _eventController.add(event);
      } else {
        print('[MQTT] ⚠️ device_info 为空，忽略');
      }
    } catch (e) {
      print('[MQTT] ❌ JSON 解析异常: $e');
    }
  }

  /// 发布任意 JSON 数据到指定的 MQTT 主题（通用方法）
  Future<bool> publishJson(String topic, Map<String, dynamic> jsonData) async {
    if (!isConnected) {
      print('[MQTT] ❌ 未连接，无法发送消息');
      return false;
    }

    try {
      final jsonStr = jsonEncode(jsonData);
      print('[MQTT] 📤 发布消息到主题: $topic');
      print('[MQTT]   内容: $jsonStr');

      if (_client != null) {
        final builder = MqttClientPayloadBuilder();
        builder.addUTF8String(jsonStr);
        _client!.publishMessage(topic, MqttQos.atLeastOnce, builder.payload!);
        print('[MQTT] ✅ 消息发送成功');
        return true;
      }

      return false;
    } catch (e) {
      print('[MQTT] ❌ 发送消息失败: $e');
      return false;
    }
  }

  /// 发送设备指令到 device/usb/action
  Future<bool> publishAction(DeviceActionPayload actionPayload) async {
    if (!isConnected) {
      print('[MQTT] ❌ 未连接，无法发送指令');
      return false;
    }

    try {
      final jsonStr = jsonEncode(actionPayload.toJson());
      print('[MQTT] 📤 发送设备指令到 ${MqttDeviceConfig.topicDeviceAction}');
      print('[MQTT]   内容: $jsonStr');

      if (_client != null) {
        final builder = MqttClientPayloadBuilder();
        builder.addUTF8String(jsonStr);
        _client!.publishMessage(
          MqttDeviceConfig.topicDeviceAction,
          MqttQos.atLeastOnce,
          builder.payload!,
        );
        print('[MQTT] ✅ 指令发送成功');
        return true;
      }

      return false;
    } catch (e) {
      print('[MQTT] ❌ 发送指令失败: $e');
      return false;
    }
  }

  /// 断开连接
  void disconnect() {
    if (_client != null) {
      print('[MQTT] 🔌 正在断开连接...');
      _client?.disconnect();
      _client = null;
      print('[MQTT] ✅ 已断开连接');
    }
  }

  void dispose() {
    disconnect();
    _eventController.close();
  }
}
