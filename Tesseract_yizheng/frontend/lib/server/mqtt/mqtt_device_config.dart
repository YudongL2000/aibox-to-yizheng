/// MQTT 设备事件通道配置（与飞书文档一致）
/// 仅 Web 端：使用 WebSocket 端口 8083 连接 broker
class MqttDeviceConfig {
  /// MQTT 服务地址
  static const String host = String.fromEnvironment(
    'TESSERACT_MQTT_HOST',
    defaultValue: '',
  );

  /// WebSocket 端口：8083（MQTT over WebSocket）
  static const int wsPort = int.fromEnvironment(
    'TESSERACT_MQTT_WS_PORT',
    defaultValue: 8083,
  );

  /// WebSocket 路径：/mqtt
  static const String wsPath = String.fromEnvironment(
    'TESSERACT_MQTT_WS_PATH',
    defaultValue: '/mqtt',
  );

  static bool get isConfigured => host.trim().isNotEmpty;

  static String get webSocketUrl {
    if (!isConfigured) {
      return '';
    }
    final normalizedPath = wsPath.trim();
    return 'ws://$host:$wsPort${normalizedPath.isNotEmpty ? normalizedPath : ''}';
  }

  /// 设备插拔事件主题（订阅，接收设备状态）
  static const String topicDeviceEvent = 'device/usb/event';

  /// 设备指令主题（发布，发送控制指令）
  static const String topicDeviceAction = 'device/usb/action';

  /// 本端客户端 ID（与端侧 linux_usb_monitor_client 区分）
  static const String clientId = 'flutter_device_list_client';
}

/// 视频推拉流 MQTT 主题（服务端下发命令，客户端可选上报状态）
class MqttVideoStreamConfig {
  /// 服务端下发：拉流/推流/停止 命令
  static const String topicCommand = 'video/stream/command';

  /// 客户端上报：流状态（ready / pulling / pushing / stopped / error）
  static const String topicStatus = 'video/stream/status';

  static const String clientIdPrefix = 'flutter_video_stream_client';
}
