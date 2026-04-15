/*
 * [INPUT]: 依赖硬件桥 source 抽象、MiniClaw WebSocket、MQTT 适配器与 dialogueMode physical cue 协议。
 * [OUTPUT]: 对外提供统一硬件桥 facade，负责源选择、事件转发、状态归并与物理动作分发。
 * [POS]: server/hardware_bridge 的业务入口层，供对话模式协议与 UI 共享，但不承担业务分支判断。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import 'dart:async';

import 'package:aitesseract/module/device/model/device_action_model.dart';
import 'package:aitesseract/server/api/dialogue_mode_models.dart';
import 'package:aitesseract/server/hardware_bridge/hardware_bridge_config.dart';
import 'package:aitesseract/server/hardware_bridge/hardware_bridge_models.dart';
import 'package:aitesseract/server/hardware_bridge/miniclaw_ws_bridge.dart';
import 'package:aitesseract/server/hardware_bridge/mqtt_hardware_bridge.dart';

class HardwareBridgeService {
  final HardwareBridgeConfig config;
  final List<HardwareBridgeSource> _sources;
  final StreamController<HardwareBridgeEvent> _eventController =
      StreamController<HardwareBridgeEvent>.broadcast();
  final StreamController<HardwareBridgeState> _stateController =
      StreamController<HardwareBridgeState>.broadcast();
  StreamSubscription<HardwareBridgeEvent>? _sourceSubscription;
  HardwareBridgeSource? _activeSource;
  HardwareBridgeState _state = const HardwareBridgeState.empty();

  HardwareBridgeService({
    HardwareBridgeConfig? config,
    List<HardwareBridgeSource>? sources,
  })  : config = config ?? HardwareBridgeConfig.fromEnvironment(),
        _sources = sources ??
            <HardwareBridgeSource>[
              MiniClawWebSocketBridge(
                url: (config ?? HardwareBridgeConfig.fromEnvironment())
                    .miniclawWebSocketUrl,
              ),
              MqttHardwareBridge(),
            ];

  Stream<HardwareBridgeEvent> get events => _eventController.stream;

  Stream<HardwareBridgeState> get states => _stateController.stream;

  HardwareBridgeState get state => _state;

  HardwareBridgeSource? get activeSource => _activeSource;

  Future<bool> connect({DialogueModeHardwareSource? preferredSource}) async {
    if (_activeSource?.isConnected == true) {
      return true;
    }

    final orderedSources =
        _orderSources(preferredSource ?? config.preferredSource);
    for (final source in orderedSources) {
      if (await source.connect()) {
        await _attachSource(source);
        return true;
      }
    }

    _state = _state.copyWith(
      activeSource: null,
      isConnected: false,
      lastError: '未找到可用的硬件桥',
    );
    _stateController.add(_state);
    return false;
  }

  Future<bool> publishAction(DeviceActionPayload payload) async {
    final orderedSources = <HardwareBridgeSource>[
      if (_activeSource != null) _activeSource!,
      ..._sources.where((source) => source != _activeSource),
    ];

    for (final source in orderedSources) {
      if (!source.isConnected) {
        final connected = await source.connect();
        if (!connected) {
          continue;
        }
      }
      if (await source.publishAction(payload)) {
        return true;
      }
    }

    return false;
  }

  Future<bool> dispatchPhysicalCue(
    DialogueModePhysicalCue cue, {
    String? sessionId,
  }) async {
    if (cue.action == DialogueModePhysicalAction.none) {
      return true;
    }

    final component = _resolveCueComponent(cue);
    if (component == null) {
      return false;
    }

    final payload = DeviceActionPayload(
      sessionId: sessionId,
      targetId: '0',
      timestamp: DateTime.now().toUtc().toIso8601String(),
      action: <DeviceActionItem>[
        DeviceActionItem(
          portId: component.portId,
          deviceType: component.componentId,
          commands: <String, dynamic>{
            'action': _physicalActionToWireValue(cue.action),
            if (cue.metadata != null) ...cue.metadata!,
          },
          notes: const <String, dynamic>{'source': 'dialogue_mode'},
        ),
      ],
    );

    return publishAction(payload);
  }

  Future<void> disconnect() async {
    await _sourceSubscription?.cancel();
    _sourceSubscription = null;
    if (_activeSource != null) {
      await _activeSource!.disconnect();
    }
    _activeSource = null;
    _state = const HardwareBridgeState.empty();
    _stateController.add(_state);
  }

  void dispose() {
    unawaited(_dispose());
  }

  Future<void> _dispose() async {
    await disconnect();
    unawaited(_eventController.close());
    unawaited(_stateController.close());
  }

  List<HardwareBridgeSource> _orderSources(
    DialogueModeHardwareSource? preferredSource,
  ) {
    if (preferredSource == null) {
      return _sources.toList(growable: false);
    }
    final preferred = <HardwareBridgeSource>[];
    final others = <HardwareBridgeSource>[];
    for (final source in _sources) {
      if (source.source == preferredSource) {
        preferred.add(source);
      } else {
        others.add(source);
      }
    }
    return <HardwareBridgeSource>[...preferred, ...others];
  }

  Future<void> _attachSource(HardwareBridgeSource source) async {
    await _sourceSubscription?.cancel();
    _activeSource = source;
    _state = _state.copyWith(
      activeSource: source.source,
      isConnected: true,
      lastError: null,
    );
    _stateController.add(_state);
    _sourceSubscription = source.events.listen(_handleEvent);
  }

  void _handleEvent(HardwareBridgeEvent event) {
    _state = _state.apply(event, activeSource: _activeSource?.source);
    _eventController.add(event);
    _stateController.add(_state);
  }

  HardwareBridgeComponent? _resolveCueComponent(DialogueModePhysicalCue cue) {
    if (cue.targetComponentId != null) {
      for (final component in _state.connectedComponents) {
        if (component.componentId == cue.targetComponentId) {
          return component;
        }
      }
    }

    for (final component in _state.connectedComponents) {
      if (component.status != DialogueModeHardwareComponentStatus.removed) {
        return component;
      }
    }
    return null;
  }

  String _physicalActionToWireValue(DialogueModePhysicalAction action) {
    switch (action) {
      case DialogueModePhysicalAction.handStretch:
        return 'hand_stretch';
      case DialogueModePhysicalAction.wake:
        return 'wake';
      case DialogueModePhysicalAction.none:
        return 'none';
    }
  }
}
