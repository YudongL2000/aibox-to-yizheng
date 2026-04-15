/*
 * [INPUT]: 仅在非 Web / 测试环境下生效。
 * [OUTPUT]: 对外提供 MiniClaw WebSocket 桥的空实现，避免 VM 直接依赖 dart:html。
 * [POS]: server/hardware_bridge 的测试兜底实现。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import 'dart:async';

import 'package:aitesseract/module/device/model/device_action_model.dart';
import 'package:aitesseract/server/api/dialogue_mode_models.dart';
import 'package:aitesseract/server/hardware_bridge/hardware_bridge_models.dart';

class MiniClawWebSocketBridge implements HardwareBridgeSource {
  final String url;
  final StreamController<HardwareBridgeEvent> _eventController =
      StreamController<HardwareBridgeEvent>.broadcast();

  MiniClawWebSocketBridge({required this.url});

  @override
  DialogueModeHardwareSource get source =>
      DialogueModeHardwareSource.miniclawWs;

  @override
  Stream<HardwareBridgeEvent> get events => _eventController.stream;

  @override
  bool get isConnected => false;

  @override
  String? get lastError => 'MiniClaw WebSocket bridge is only available on web';

  @override
  Future<bool> connect() async => false;

  @override
  Future<void> disconnect() async {}

  @override
  Future<bool> publishAction(DeviceActionPayload payload) async => false;

  void dispose() {
    unawaited(_eventController.close());
  }
}
