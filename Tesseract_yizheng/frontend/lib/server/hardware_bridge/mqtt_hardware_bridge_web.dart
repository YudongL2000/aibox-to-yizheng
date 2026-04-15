/*
 * [INPUT]: 依赖现有 MqttDeviceService 与 device action / event 模型。
 * [OUTPUT]: 对外提供 MQTT 硬件桥适配器，转发设备事件并兼容动作发布。
 * [POS]: server/hardware_bridge 的 MQTT 兼容层，被统一 facade 选择或回退。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import 'dart:async';

import 'package:aitesseract/module/device/model/device_action_model.dart';
import 'package:aitesseract/module/device/model/device_event_model.dart';
import 'package:aitesseract/server/api/dialogue_mode_models.dart';
import 'package:aitesseract/server/hardware_bridge/hardware_bridge_models.dart';
import 'package:aitesseract/server/mqtt/mqtt_device_service.dart';

class MqttHardwareBridge implements HardwareBridgeSource {
  final MqttDeviceService _service;
  final StreamController<HardwareBridgeEvent> _eventController =
      StreamController<HardwareBridgeEvent>.broadcast();
  StreamSubscription<DeviceEventPayload>? _subscription;

  MqttHardwareBridge({MqttDeviceService? service})
      : _service = service ?? MqttDeviceService();

  @override
  DialogueModeHardwareSource get source => DialogueModeHardwareSource.mqttProxy;

  @override
  Stream<HardwareBridgeEvent> get events => _eventController.stream;

  @override
  bool get isConnected => _service.isConnected;

  @override
  String? get lastError => _service.lastError;

  @override
  Future<bool> connect() async {
    final connected = await _service.connectAndSubscribe();
    if (!connected) {
      return false;
    }

    await _subscription?.cancel();
    _subscription = _service.deviceEventStream.listen((payload) {
      _eventController.add(HardwareBridgeEvent.fromDeviceEventPayload(payload));
    });
    return true;
  }

  @override
  Future<void> disconnect() async {
    await _subscription?.cancel();
    _subscription = null;
    _service.dispose();
  }

  @override
  Future<bool> publishAction(DeviceActionPayload payload) {
    return _service.publishAction(payload);
  }

  void dispose() {
    unawaited(disconnect());
    unawaited(_eventController.close());
  }
}
