/*
 * [INPUT]: 依赖 dart:html WebSocket 与 MiniClaw/Mimiclaw 文本或 JSON 消息。
 * [OUTPUT]: 对外提供 MiniClaw WebSocket 桥，实现设备事件的标准化输出。
 * [POS]: server/hardware_bridge 的 Web 实现，和 MQTT 适配器并列。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import 'dart:async';
import 'dart:html' as html;

import 'package:aitesseract/module/device/model/device_action_model.dart';
import 'package:aitesseract/server/api/dialogue_mode_models.dart';
import 'package:aitesseract/server/hardware_bridge/hardware_bridge_models.dart';

class MiniClawWebSocketBridge implements HardwareBridgeSource {
  final String url;
  final StreamController<HardwareBridgeEvent> _eventController =
      StreamController<HardwareBridgeEvent>.broadcast();
  html.WebSocket? _socket;
  StreamSubscription<html.MessageEvent>? _messageSubscription;
  StreamSubscription<html.Event>? _openSubscription;
  StreamSubscription<html.Event>? _errorSubscription;
  StreamSubscription<html.CloseEvent>? _closeSubscription;
  bool _connected = false;
  String? _lastError;

  MiniClawWebSocketBridge({required this.url});

  @override
  DialogueModeHardwareSource get source =>
      DialogueModeHardwareSource.miniclawWs;

  @override
  Stream<HardwareBridgeEvent> get events => _eventController.stream;

  @override
  bool get isConnected => _connected;

  @override
  String? get lastError => _lastError;

  @override
  Future<bool> connect() async {
    if (url.trim().isEmpty) {
      _lastError = 'MiniClaw WebSocket URL is empty';
      return false;
    }

    await disconnect();

    final completer = Completer<bool>();
    try {
      _socket = html.WebSocket(url);
      _socket!.binaryType = 'blob';
      _openSubscription = _socket!.onOpen.listen((_) {
        _connected = true;
        if (!completer.isCompleted) {
          completer.complete(true);
        }
      });
      _messageSubscription = _socket!.onMessage.listen((event) {
        _eventController.add(
          HardwareBridgeEvent.fromMiniClawMessage(event.data),
        );
      });
      _errorSubscription = _socket!.onError.listen((_) {
        _connected = false;
        _lastError = 'MiniClaw WebSocket error';
        if (!completer.isCompleted) {
          completer.complete(false);
        }
      });
      _closeSubscription = _socket!.onClose.listen((_) {
        _connected = false;
      });
    } catch (error) {
      _lastError = error.toString();
      return false;
    }

    return completer.future.timeout(
      const Duration(seconds: 8),
      onTimeout: () {
        _lastError = 'MiniClaw WebSocket connection timeout';
        _connected = false;
        return false;
      },
    );
  }

  @override
  Future<void> disconnect() async {
    _connected = false;
    await _messageSubscription?.cancel();
    await _openSubscription?.cancel();
    await _errorSubscription?.cancel();
    await _closeSubscription?.cancel();
    _messageSubscription = null;
    _openSubscription = null;
    _errorSubscription = null;
    _closeSubscription = null;
    _socket?.close();
    _socket = null;
  }

  @override
  Future<bool> publishAction(DeviceActionPayload payload) async => false;

  void dispose() {
    unawaited(disconnect());
    unawaited(_eventController.close());
  }
}
