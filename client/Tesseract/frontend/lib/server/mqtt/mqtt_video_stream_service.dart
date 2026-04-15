import 'dart:async';
import 'dart:convert';

import 'package:aitesseract/module/video_stream/model/video_stream_command_model.dart';
import 'package:aitesseract/server/mqtt/mqtt_device_config.dart';
import 'package:mqtt_client/mqtt_client.dart';
import 'package:mqtt_client/mqtt_browser_client.dart';

/// 视频推拉流 MQTT 服务（仅 Web 端）：订阅服务端下发的命令，可选上报流状态
class MqttVideoStreamService {
  MqttClient? _client;
  final StreamController<VideoStreamCommand> _commandController =
      StreamController<VideoStreamCommand>.broadcast();

  Stream<VideoStreamCommand> get commandStream => _commandController.stream;

  bool _isConnecting = false;
  bool get isConnected =>
      _client?.connectionStatus?.state == MqttConnectionState.connected;

  Future<bool> connectAndSubscribe() async {
    if (_isConnecting) return false;
    _isConnecting = true;
    try {
      final clientId = '${MqttVideoStreamConfig.clientIdPrefix}_${DateTime.now().millisecondsSinceEpoch}';
      final wsPath = MqttDeviceConfig.wsPath ?? '';
      final wsUrl = 'ws://${MqttDeviceConfig.host}:${MqttDeviceConfig.wsPort}${wsPath.isNotEmpty ? wsPath : ''}';
      _client = MqttBrowserClient(wsUrl, clientId);
      // mqtt_client 会用 client.port 覆盖 URL 中的端口，默认 1883，必须设为 WebSocket 端口
      _client!.port = MqttDeviceConfig.wsPort;
      _client!.logging(on: false);
      _client!.keepAlivePeriod = 60;
      _client!.connectTimeoutPeriod = 30;
      _client!.autoReconnect = true;

      final conn = await _client!.connect();
      if (conn?.state != MqttConnectionState.connected) {
        _isConnecting = false;
        return false;
      }

      _client!.subscribe(MqttVideoStreamConfig.topicCommand, MqttQos.atLeastOnce);

      _client!.updates?.listen((List<MqttReceivedMessage<MqttMessage>> list) {
        for (var msg in list) {
          final rec = msg.payload;
          if (rec is MqttPublishMessage) {
            final payload = utf8.decode(rec.payload.message);
            _parseAndEmit(payload);
          }
        }
      });

      _isConnecting = false;
      return true;
    } catch (e) {
      _isConnecting = false;
      return false;
    }
  }

  void _parseAndEmit(String payload) {
    try {
      final map = jsonDecode(payload) as Map<String, dynamic>?;
      if (map == null) return;
      final cmd = VideoStreamCommand.fromJson(map);
      if (cmd.action.isNotEmpty) {
        _commandController.add(cmd);
      }
    } catch (_) {}
  }

  /// 向服务端上报流状态（可选）
  void publishStatus(VideoStreamStatus status) {
    try {
      final builder = MqttClientPayloadBuilder();
      builder.addUTF8String(jsonEncode(status.toJson()));
      final payload = builder.payload;
      if (payload != null) {
        _client?.publishMessage(
          MqttVideoStreamConfig.topicStatus,
          MqttQos.atLeastOnce,
          payload,
          retain: false,
        );
      }
    } catch (_) {}
  }

  void disconnect() {
    _client?.disconnect();
    _client = null;
  }

  void dispose() {
    disconnect();
    _commandController.close();
  }
}
