/*
 * [INPUT]: 依赖 backend dialogueMode 协议与本地设备事件原始数据。
 * [OUTPUT]: 对外提供统一硬件桥事件、组件、状态与 source 抽象接口。
 * [POS]: server/hardware_bridge 的协议核心，被 MQTT 与 MiniClaw 两种适配器共享。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import 'dart:convert';

import 'package:aitesseract/module/device/model/device_action_model.dart';
import 'package:aitesseract/module/device/model/device_event_model.dart';
import 'package:aitesseract/server/api/dialogue_mode_models.dart';

class HardwareBridgeComponent {
  final String componentId;
  final String deviceId;
  final String modelId;
  final String displayName;
  final String portId;
  final DialogueModeHardwareComponentStatus status;
  final Map<String, dynamic> raw;

  const HardwareBridgeComponent({
    required this.componentId,
    required this.deviceId,
    required this.modelId,
    required this.displayName,
    required this.portId,
    required this.status,
    this.raw = const <String, dynamic>{},
  });

  factory HardwareBridgeComponent.fromJson(Map<String, dynamic> json) {
    return HardwareBridgeComponent(
      componentId: json['componentId']?.toString() ??
          json['component_id']?.toString() ??
          json['deviceType']?.toString() ??
          json['device_type']?.toString() ??
          '',
      deviceId:
          json['deviceId']?.toString() ?? json['device_id']?.toString() ?? '',
      modelId: json['modelId']?.toString() ??
          json['model_id']?.toString() ??
          json['deviceType']?.toString() ??
          json['device_type']?.toString() ??
          '',
      displayName: json['displayName']?.toString() ??
          json['display_name']?.toString() ??
          json['deviceType']?.toString() ??
          json['device_type']?.toString() ??
          '',
      portId: json['portId']?.toString() ?? json['port_id']?.toString() ?? '',
      status: _readComponentStatus(json['status']),
      raw: _normalizeMap(json['raw']) ?? const <String, dynamic>{},
    );
  }

  factory HardwareBridgeComponent.fromDeviceInfo(DeviceInfoItem item) {
    final notes = item.notes;
    final componentId = _stringFromAny(
          notes['componentId'],
        ) ??
        _stringFromAny(notes['component_id']) ??
        _stringFromAny(notes['component']) ??
        item.deviceType;
    final displayName = _stringFromAny(notes['displayName']) ??
        _stringFromAny(notes['display_name']) ??
        _stringFromAny(notes['name']) ??
        componentId;
    final modelId = _stringFromAny(notes['modelId']) ??
        _stringFromAny(notes['model_id']) ??
        item.deviceType;
    final status = item.isPlugOut
        ? DialogueModeHardwareComponentStatus.removed
        : DialogueModeHardwareComponentStatus.connected;
    return HardwareBridgeComponent(
      componentId: componentId,
      deviceId: item.deviceId,
      modelId: modelId,
      displayName: displayName,
      portId: item.portId,
      status: status,
      raw: {
        'notes': notes,
        'device_type': item.deviceType,
        'status': item.status,
      },
    );
  }

  HardwareBridgeComponent copyWith({
    String? componentId,
    String? deviceId,
    String? modelId,
    String? displayName,
    String? portId,
    DialogueModeHardwareComponentStatus? status,
    Map<String, dynamic>? raw,
  }) {
    return HardwareBridgeComponent(
      componentId: componentId ?? this.componentId,
      deviceId: deviceId ?? this.deviceId,
      modelId: modelId ?? this.modelId,
      displayName: displayName ?? this.displayName,
      portId: portId ?? this.portId,
      status: status ?? this.status,
      raw: raw ?? this.raw,
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'componentId': componentId,
      'deviceId': deviceId,
      'modelId': modelId,
      'displayName': displayName,
      'portId': portId,
      'status': _componentStatusToJson(status),
      'raw': raw,
    };
  }
}

class HardwareBridgeEvent {
  final DialogueModeHardwareSource source;
  final DialogueModeHardwareEventType eventType;
  final DateTime timestamp;
  final HardwareBridgeComponent? component;
  final List<HardwareBridgeComponent> connectedComponents;
  final Map<String, dynamic> raw;

  const HardwareBridgeEvent({
    required this.source,
    required this.eventType,
    required this.timestamp,
    required this.component,
    required this.connectedComponents,
    required this.raw,
  });

  bool get isSnapshot => eventType == DialogueModeHardwareEventType.snapshot;

  Map<String, dynamic> toValidationJson() {
    return <String, dynamic>{
      'source': _hardwareSourceToJson(source),
      'eventType': _hardwareEventTypeForBackend(eventType),
      'timestamp': timestamp.toUtc().toIso8601String(),
      if (component != null)
        'component': <String, dynamic>{
          'componentId': component!.componentId,
          'deviceId': component!.deviceId,
          'modelId': component!.modelId,
          'displayName': component!.displayName,
          'portId': component!.portId,
          'status': _componentStatusToJson(component!.status),
          if (component!.raw.isNotEmpty) 'raw': component!.raw,
        },
      'connectedComponents': <Map<String, dynamic>>[
        for (final item in connectedComponents)
          <String, dynamic>{
            'componentId': item.componentId,
            'deviceId': item.deviceId,
            'modelId': item.modelId,
            'displayName': item.displayName,
            'portId': item.portId,
            'status': _componentStatusToJson(item.status),
            if (item.raw.isNotEmpty) 'raw': item.raw,
          },
      ],
      if (raw.isNotEmpty) 'raw': raw,
    };
  }

  static HardwareBridgeEvent fromDeviceEventPayload(
      DeviceEventPayload payload) {
    final components = payload.deviceInfo
        .map(HardwareBridgeComponent.fromDeviceInfo)
        .toList(growable: false);
    final component = components.isNotEmpty ? components.first : null;
    final hasSnapshot = payload.deviceInfo.length > 1 ||
        (payload.action.isNotEmpty) ||
        components.any((item) =>
            item.status == DialogueModeHardwareComponentStatus.removed);
    final eventType = components.isEmpty && payload.action.isEmpty
        ? DialogueModeHardwareEventType.heartbeat
        : (hasSnapshot
            ? DialogueModeHardwareEventType.snapshot
            : (component?.status == DialogueModeHardwareComponentStatus.removed
                ? DialogueModeHardwareEventType.deviceRemoved
                : DialogueModeHardwareEventType.deviceInserted));
    return HardwareBridgeEvent(
      source: DialogueModeHardwareSource.mqttProxy,
      eventType: eventType,
      timestamp: _readTimestamp(payload.timestamp),
      component: component,
      connectedComponents: components,
      raw: <String, dynamic>{
        if (payload.sessionId != null) 'session_id': payload.sessionId,
        if (payload.targetId != null) 'target_id': payload.targetId,
        if (payload.timestamp != null) 'timestamp': payload.timestamp,
        'device_info': payload.deviceInfo.map(_deviceInfoItemToJson).toList(),
        if (payload.action.isNotEmpty) 'action': payload.action,
      },
    );
  }

  static HardwareBridgeEvent fromMqttPayload(String payload) {
    try {
      final decoded = jsonDecode(payload);
      final map = _normalizeMap(decoded);
      if (map == null) {
        return HardwareBridgeEvent(
          source: DialogueModeHardwareSource.mqttProxy,
          eventType: DialogueModeHardwareEventType.heartbeat,
          timestamp: DateTime.now().toUtc(),
          component: null,
          connectedComponents: const <HardwareBridgeComponent>[],
          raw: <String, dynamic>{'content': payload},
        );
      }
      return fromMqttJson(map);
    } catch (_) {
      return HardwareBridgeEvent(
        source: DialogueModeHardwareSource.mqttProxy,
        eventType: DialogueModeHardwareEventType.heartbeat,
        timestamp: DateTime.now().toUtc(),
        component: null,
        connectedComponents: const <HardwareBridgeComponent>[],
        raw: <String, dynamic>{'content': payload},
      );
    }
  }

  static HardwareBridgeEvent fromMqttJson(Map<String, dynamic> json) {
    final payload = DeviceEventPayload.fromJson(json);
    final snapshot = fromDeviceEventPayload(payload);
    final rawEventType =
        _readHardwareEventType(json['eventType'] ?? json['event_type']);
    if (rawEventType == DialogueModeHardwareEventType.snapshot) {
      return snapshot.copyWith(raw: json);
    }
    return snapshot.copyWith(eventType: rawEventType, raw: json);
  }

  static HardwareBridgeEvent fromMiniClawMessage(
    dynamic payload, {
    DateTime? timestamp,
  }) {
    final map = _normalizeMap(payload);
    final text = _extractMiniClawText(payload, map);
    final component = map == null ? null : _readMiniClawComponent(map);
    final eventType = _inferMiniClawEventType(map, text);
    final components = component == null
        ? const <HardwareBridgeComponent>[]
        : <HardwareBridgeComponent>[component];
    return HardwareBridgeEvent(
      source: DialogueModeHardwareSource.miniclawWs,
      eventType: eventType,
      timestamp: (timestamp ?? DateTime.now()).toUtc(),
      component: component,
      connectedComponents: components,
      raw: _normalizeRawPayload(payload, map, text),
    );
  }

  HardwareBridgeEvent copyWith({
    DialogueModeHardwareSource? source,
    DialogueModeHardwareEventType? eventType,
    DateTime? timestamp,
    HardwareBridgeComponent? component,
    List<HardwareBridgeComponent>? connectedComponents,
    Map<String, dynamic>? raw,
  }) {
    return HardwareBridgeEvent(
      source: source ?? this.source,
      eventType: eventType ?? this.eventType,
      timestamp: timestamp ?? this.timestamp,
      component: component ?? this.component,
      connectedComponents: connectedComponents ?? this.connectedComponents,
      raw: raw ?? this.raw,
    );
  }
}

class HardwareBridgeState {
  final DialogueModeHardwareSource? activeSource;
  final List<HardwareBridgeComponent> connectedComponents;
  final HardwareBridgeEvent? lastEvent;
  final bool isConnected;
  final String? lastError;

  const HardwareBridgeState({
    required this.activeSource,
    required this.connectedComponents,
    required this.lastEvent,
    required this.isConnected,
    required this.lastError,
  });

  const HardwareBridgeState.empty()
      : activeSource = null,
        connectedComponents = const <HardwareBridgeComponent>[],
        lastEvent = null,
        isConnected = false,
        lastError = null;

  HardwareBridgeState copyWith({
    DialogueModeHardwareSource? activeSource,
    List<HardwareBridgeComponent>? connectedComponents,
    HardwareBridgeEvent? lastEvent,
    bool? isConnected,
    String? lastError,
  }) {
    return HardwareBridgeState(
      activeSource: activeSource ?? this.activeSource,
      connectedComponents: connectedComponents ?? this.connectedComponents,
      lastEvent: lastEvent ?? this.lastEvent,
      isConnected: isConnected ?? this.isConnected,
      lastError: lastError ?? this.lastError,
    );
  }

  HardwareBridgeState apply(
    HardwareBridgeEvent event, {
    DialogueModeHardwareSource? activeSource,
  }) {
    final map = <String, HardwareBridgeComponent>{
      for (final component in connectedComponents)
        component.componentId: component,
    };

    if (event.isSnapshot) {
      map
        ..clear()
        ..addEntries(
          event.connectedComponents.map(
            (component) => MapEntry(component.componentId, component),
          ),
        );
    } else if (event.component != null) {
      final component = event.component!;
      switch (event.eventType) {
        case DialogueModeHardwareEventType.deviceRemoved:
          map[component.componentId] = component.copyWith(
            status: DialogueModeHardwareComponentStatus.removed,
          );
          break;
        case DialogueModeHardwareEventType.deviceError:
          map[component.componentId] = component.copyWith(
            status: DialogueModeHardwareComponentStatus.error,
          );
          break;
        case DialogueModeHardwareEventType.deviceReady:
          map[component.componentId] = component.copyWith(
            status: DialogueModeHardwareComponentStatus.ready,
          );
          break;
        case DialogueModeHardwareEventType.deviceInserted:
          map[component.componentId] = component.copyWith(
            status: DialogueModeHardwareComponentStatus.connected,
          );
          break;
        case DialogueModeHardwareEventType.heartbeat:
          map[component.componentId] = component;
          break;
        case DialogueModeHardwareEventType.snapshot:
          break;
      }
    }

    return copyWith(
      activeSource: activeSource ?? this.activeSource,
      connectedComponents: map.values.toList(growable: false),
      lastEvent: event,
      isConnected: true,
      lastError: null,
    );
  }
}

abstract class HardwareBridgeSource {
  DialogueModeHardwareSource get source;

  Stream<HardwareBridgeEvent> get events;

  bool get isConnected;

  String? get lastError;

  Future<bool> connect();

  Future<void> disconnect();

  Future<bool> publishAction(DeviceActionPayload payload);
}

DateTime _readTimestamp(dynamic raw) {
  final text = raw?.toString();
  if (text == null || text.isEmpty) {
    return DateTime.now().toUtc();
  }
  final parsed = DateTime.tryParse(text);
  return (parsed ?? DateTime.now()).toUtc();
}

Map<String, dynamic>? _normalizeMap(dynamic raw) {
  if (raw is Map<String, dynamic>) {
    return Map<String, dynamic>.from(raw);
  }
  if (raw is Map) {
    return Map<String, dynamic>.from(raw.cast<String, dynamic>());
  }
  if (raw is String) {
    try {
      final decoded = jsonDecode(raw);
      return _normalizeMap(decoded);
    } catch (_) {
      return null;
    }
  }
  return null;
}

Map<String, dynamic> _normalizeRawPayload(
  dynamic payload,
  Map<String, dynamic>? map,
  String text,
) {
  if (map != null) {
    return Map<String, dynamic>.from(map);
  }
  if (payload is String) {
    return <String, dynamic>{'content': payload};
  }
  return <String, dynamic>{'content': text};
}

String _extractMiniClawText(dynamic payload, Map<String, dynamic>? map) {
  if (map != null) {
    final candidate =
        map['content'] ?? map['message'] ?? map['text'] ?? map['data'];
    if (candidate != null) {
      return candidate.toString();
    }
  }
  return payload?.toString() ?? '';
}

HardwareBridgeComponent? _readMiniClawComponent(Map<String, dynamic> map) {
  final componentRaw = _normalizeMap(map['component']) ??
      _normalizeMap(map['device']) ??
      _normalizeMap(map['hardware']);
  if (componentRaw != null) {
    return HardwareBridgeComponent(
      componentId: _stringFromAny(
            componentRaw['componentId'],
          ) ??
          _stringFromAny(componentRaw['component_id']) ??
          _stringFromAny(componentRaw['deviceType']) ??
          _stringFromAny(componentRaw['device_type']) ??
          '',
      deviceId: _stringFromAny(componentRaw['deviceId']) ??
          _stringFromAny(componentRaw['device_id']) ??
          '',
      modelId: _stringFromAny(componentRaw['modelId']) ??
          _stringFromAny(componentRaw['model_id']) ??
          _stringFromAny(componentRaw['deviceType']) ??
          _stringFromAny(componentRaw['device_type']) ??
          '',
      displayName: _stringFromAny(componentRaw['displayName']) ??
          _stringFromAny(componentRaw['display_name']) ??
          _stringFromAny(componentRaw['name']) ??
          '',
      portId: _stringFromAny(componentRaw['portId']) ??
          _stringFromAny(componentRaw['port_id']) ??
          '',
      status: _readComponentStatus(componentRaw['status']),
      raw: componentRaw,
    );
  }

  final notes = _normalizeMap(map['notes']);
  final componentId = _stringFromAny(map['componentId']) ??
      _stringFromAny(map['component_id']) ??
      _stringFromAny(map['deviceType']) ??
      _stringFromAny(map['device_type']) ??
      _stringFromAny(notes?['componentId']) ??
      _stringFromAny(notes?['component_id']) ??
      '';
  if (componentId.isEmpty) return null;

  return HardwareBridgeComponent(
    componentId: componentId,
    deviceId: _stringFromAny(map['deviceId']) ??
        _stringFromAny(map['device_id']) ??
        '',
    modelId: _stringFromAny(map['modelId']) ??
        _stringFromAny(map['model_id']) ??
        componentId,
    displayName: _stringFromAny(map['displayName']) ??
        _stringFromAny(map['display_name']) ??
        componentId,
    portId:
        _stringFromAny(map['portId']) ?? _stringFromAny(map['port_id']) ?? '',
    status: _readComponentStatus(map['status']),
    raw: map,
  );
}

DialogueModeHardwareEventType _inferMiniClawEventType(
  Map<String, dynamic>? map,
  String text,
) {
  final explicit = map == null
      ? null
      : _readHardwareEventType(map['eventType'] ?? map['event_type']);
  if (explicit != null && explicit != DialogueModeHardwareEventType.snapshot) {
    return explicit;
  }

  final lowered = text.toLowerCase();
  if (lowered.contains('插入') ||
      lowered.contains('connected') ||
      lowered.contains('plug in') ||
      lowered.contains('plug_in') ||
      lowered.contains('ready')) {
    return DialogueModeHardwareEventType.deviceInserted;
  }
  if (lowered.contains('拔出') ||
      lowered.contains('removed') ||
      lowered.contains('disconnect') ||
      lowered.contains('plug_out')) {
    return DialogueModeHardwareEventType.deviceRemoved;
  }
  if (lowered.contains('错误') || lowered.contains('error')) {
    return DialogueModeHardwareEventType.deviceError;
  }
  if (lowered.contains('heartbeat') || lowered.contains('ping')) {
    return DialogueModeHardwareEventType.heartbeat;
  }
  return explicit ?? DialogueModeHardwareEventType.snapshot;
}

DialogueModeHardwareEventType _readHardwareEventType(dynamic raw) {
  switch (raw?.toString()) {
    case 'device_inserted':
      return DialogueModeHardwareEventType.deviceInserted;
    case 'device_removed':
      return DialogueModeHardwareEventType.deviceRemoved;
    case 'device_ready':
      return DialogueModeHardwareEventType.deviceReady;
    case 'device_error':
      return DialogueModeHardwareEventType.deviceError;
    case 'error':
      return DialogueModeHardwareEventType.deviceError;
    case 'heartbeat':
      return DialogueModeHardwareEventType.heartbeat;
    case 'snapshot':
      return DialogueModeHardwareEventType.snapshot;
    default:
      return DialogueModeHardwareEventType.snapshot;
  }
}

DialogueModeHardwareComponentStatus _readComponentStatus(dynamic raw) {
  switch (raw?.toString()) {
    case 'connected':
      return DialogueModeHardwareComponentStatus.connected;
    case 'validating':
      return DialogueModeHardwareComponentStatus.validating;
    case 'ready':
      return DialogueModeHardwareComponentStatus.ready;
    case 'error':
      return DialogueModeHardwareComponentStatus.error;
    case 'removed':
      return DialogueModeHardwareComponentStatus.removed;
    case 'plug_out':
      return DialogueModeHardwareComponentStatus.removed;
    default:
      return DialogueModeHardwareComponentStatus.connected;
  }
}

String _componentStatusToJson(DialogueModeHardwareComponentStatus status) {
  switch (status) {
    case DialogueModeHardwareComponentStatus.connected:
      return 'connected';
    case DialogueModeHardwareComponentStatus.validating:
      return 'validating';
    case DialogueModeHardwareComponentStatus.ready:
      return 'ready';
    case DialogueModeHardwareComponentStatus.error:
      return 'error';
    case DialogueModeHardwareComponentStatus.removed:
      return 'removed';
  }
}

String _hardwareSourceToJson(DialogueModeHardwareSource source) {
  switch (source) {
    case DialogueModeHardwareSource.miniclawWs:
      return 'miniclaw_ws';
    case DialogueModeHardwareSource.mqttProxy:
      return 'mqtt_proxy';
    case DialogueModeHardwareSource.backendCache:
      return 'backend_cache';
  }
}

String _hardwareEventTypeForBackend(DialogueModeHardwareEventType eventType) {
  switch (eventType) {
    case DialogueModeHardwareEventType.deviceInserted:
      return 'device_inserted';
    case DialogueModeHardwareEventType.deviceRemoved:
      return 'device_removed';
    case DialogueModeHardwareEventType.deviceReady:
      return 'device_inserted';
    case DialogueModeHardwareEventType.deviceError:
      return 'error';
    case DialogueModeHardwareEventType.heartbeat:
      return 'heartbeat';
    case DialogueModeHardwareEventType.snapshot:
      return 'snapshot';
  }
}

String? _stringFromAny(dynamic value) {
  if (value == null) return null;
  final text = value.toString().trim();
  return text.isEmpty ? null : text;
}

Map<String, dynamic> _deviceInfoItemToJson(DeviceInfoItem item) {
  return <String, dynamic>{
    'port_id': item.portId,
    'status': item.status,
    'device_id': item.deviceId,
    'device_type': item.deviceType,
    if (item.notes.isNotEmpty) 'notes': item.notes,
  };
}
