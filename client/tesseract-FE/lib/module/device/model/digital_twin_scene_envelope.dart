/**
 * [INPUT]: 依赖 DigitalTwinSceneConfig 场景模型与运行时 preview/session/control 原始状态。
 * [OUTPUT]: 对外提供 DigitalTwinSceneEnvelope、DigitalTwinPreviewSessionState、DigitalTwinTopControlState，统一承载 scene、preview sessions 与 top controls 的运行时信封。
 * [POS]: module/device/model 的场景信封层，被 HomeWorkspacePage、预览面板与 postMessage/runtime state 入口共同消费。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import 'dart:convert';

import 'package:aitesseract/module/device/model/device_event_model.dart';

class DigitalTwinPreviewSessionState {
  final String sessionId;
  final String kind;
  final String label;
  final String? modelId;
  final String? streamUrl;
  final String? source;
  final bool active;
  final bool renderInScene;
  final bool muted;
  final double amplitude;
  final Map<String, dynamic> runtimeState;
  final Map<String, dynamic> controlState;

  const DigitalTwinPreviewSessionState({
    required this.sessionId,
    required this.kind,
    required this.label,
    this.modelId,
    this.streamUrl,
    this.source,
    this.active = false,
    this.renderInScene = false,
    this.muted = false,
    this.amplitude = 0.35,
    this.runtimeState = const <String, dynamic>{},
    this.controlState = const <String, dynamic>{},
  });

  factory DigitalTwinPreviewSessionState.fromJson(Map<String, dynamic> json) {
    final runtimeState = _readMap(
        json['runtimeState'] ?? json['runtime_state'] ?? json['state']);
    final controlState =
        _readMap(json['controlState'] ?? json['control_state']);
    final kind = _readString(
          json['kind'],
        ) ??
        _readString(json['type']) ??
        'camera';
    final sessionId = _readString(json['sessionId']) ??
        _readString(json['session_id']) ??
        _readString(json['id']) ??
        kind;
    return DigitalTwinPreviewSessionState(
      sessionId: sessionId,
      kind: kind,
      label: _readString(json['label']) ?? _fallbackLabel(kind),
      modelId: _readString(json['modelId']) ??
          _readString(json['model_id']) ??
          _readString(json['sceneModelId']) ??
          _readString(json['scene_model_id']),
      streamUrl:
          _readString(json['streamUrl']) ?? _readString(json['stream_url']),
      source: _readString(json['source']),
      active: _readBool(json['active']) || _readBool(runtimeState['active']),
      renderInScene: _readBool(json['renderInScene']) ||
          _readBool(json['render_in_scene']) ||
          _readBool(runtimeState['renderInScene']) ||
          _readBool(runtimeState['render_in_scene']),
      muted: _readBool(json['muted']) ||
          _readBool(runtimeState['muted']) ||
          _readBool(controlState['muted']),
      amplitude: _readDouble(
        json['amplitude'] ?? runtimeState['amplitude'] ?? runtimeState['level'],
        fallback: 0.35,
      ),
      runtimeState: runtimeState,
      controlState: controlState,
    );
  }

  DigitalTwinPreviewSessionState copyWith({
    String? sessionId,
    String? kind,
    String? label,
    String? modelId,
    String? streamUrl,
    String? source,
    bool? active,
    bool? renderInScene,
    bool? muted,
    double? amplitude,
    Map<String, dynamic>? runtimeState,
    Map<String, dynamic>? controlState,
  }) {
    return DigitalTwinPreviewSessionState(
      sessionId: sessionId ?? this.sessionId,
      kind: kind ?? this.kind,
      label: label ?? this.label,
      modelId: modelId ?? this.modelId,
      streamUrl: streamUrl ?? this.streamUrl,
      source: source ?? this.source,
      active: active ?? this.active,
      renderInScene: renderInScene ?? this.renderInScene,
      muted: muted ?? this.muted,
      amplitude: amplitude ?? this.amplitude,
      runtimeState: runtimeState ?? this.runtimeState,
      controlState: controlState ?? this.controlState,
    );
  }

  bool get isMicrophone => _normalizeKind(kind) == 'microphone';
  bool get isSpeaker => _normalizeKind(kind) == 'speaker';
  bool get isCamera => _normalizeKind(kind) == 'camera';

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'sessionId': sessionId,
      'kind': kind,
      'label': label,
      if (modelId != null && modelId!.isNotEmpty) 'modelId': modelId,
      if (streamUrl != null && streamUrl!.isNotEmpty) 'streamUrl': streamUrl,
      if (source != null && source!.isNotEmpty) 'source': source,
      'active': active,
      'renderInScene': renderInScene,
      'muted': muted,
      'amplitude': amplitude,
      if (runtimeState.isNotEmpty) 'runtimeState': runtimeState,
      if (controlState.isNotEmpty) 'controlState': controlState,
    };
  }
}

class DigitalTwinTopControlState {
  final String id;
  final String kind;
  final String label;
  final String? sessionId;
  final bool enabled;
  final bool active;
  final double level;
  final Map<String, dynamic> runtimeState;
  final Map<String, dynamic> controlState;

  const DigitalTwinTopControlState({
    required this.id,
    required this.kind,
    required this.label,
    this.sessionId,
    this.enabled = true,
    this.active = false,
    this.level = 0.0,
    this.runtimeState = const <String, dynamic>{},
    this.controlState = const <String, dynamic>{},
  });

  factory DigitalTwinTopControlState.fromJson(Map<String, dynamic> json) {
    final runtimeState = _readMap(
        json['runtimeState'] ?? json['runtime_state'] ?? json['state']);
    final controlState =
        _readMap(json['controlState'] ?? json['control_state']);
    final kind =
        _readString(json['kind']) ?? _readString(json['type']) ?? 'toggle';
    final id = _readString(json['id']) ??
        _readString(json['controlId']) ??
        _readString(json['control_id']) ??
        kind;
    return DigitalTwinTopControlState(
      id: id,
      kind: kind,
      label: _readString(json['label']) ?? _fallbackLabel(kind),
      sessionId:
          _readString(json['sessionId']) ?? _readString(json['session_id']),
      enabled: json.containsKey('enabled')
          ? _readBool(json['enabled'])
          : !_readBool(json['disabled']),
      active: _readBool(json['active']) ||
          _readBool(runtimeState['active']) ||
          _readBool(controlState['active']),
      level: _readDouble(
        json['level'] ?? runtimeState['level'] ?? runtimeState['amplitude'],
        fallback: 0.0,
      ),
      runtimeState: runtimeState,
      controlState: controlState,
    );
  }

  DigitalTwinTopControlState copyWith({
    String? id,
    String? kind,
    String? label,
    String? sessionId,
    bool? enabled,
    bool? active,
    double? level,
    Map<String, dynamic>? runtimeState,
    Map<String, dynamic>? controlState,
  }) {
    return DigitalTwinTopControlState(
      id: id ?? this.id,
      kind: kind ?? this.kind,
      label: label ?? this.label,
      sessionId: sessionId ?? this.sessionId,
      enabled: enabled ?? this.enabled,
      active: active ?? this.active,
      level: level ?? this.level,
      runtimeState: runtimeState ?? this.runtimeState,
      controlState: controlState ?? this.controlState,
    );
  }

  bool get isMicControl => _normalizeKind(kind) == 'microphone';
  bool get isSpeakerControl => _normalizeKind(kind) == 'speaker';

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
      'kind': kind,
      'label': label,
      if (sessionId != null && sessionId!.isNotEmpty) 'sessionId': sessionId,
      'enabled': enabled,
      'active': active,
      'level': level,
      if (runtimeState.isNotEmpty) 'runtimeState': runtimeState,
      if (controlState.isNotEmpty) 'controlState': controlState,
    };
  }
}

class DigitalTwinSceneEnvelope {
  final DigitalTwinSceneConfig scene;
  final List<DigitalTwinPreviewSessionState> previewSessions;
  final List<DigitalTwinTopControlState> topControls;
  final Map<String, dynamic> runtimeState;
  final bool renderHardwareModels;
  final String? source;
  final String? sourcePhase;
  final String? responseType;
  final int revision;

  const DigitalTwinSceneEnvelope({
    required this.scene,
    this.previewSessions = const <DigitalTwinPreviewSessionState>[],
    this.topControls = const <DigitalTwinTopControlState>[],
    this.runtimeState = const <String, dynamic>{},
    this.renderHardwareModels = true,
    this.source,
    this.sourcePhase,
    this.responseType,
    this.revision = 0,
  });

  factory DigitalTwinSceneEnvelope.fromJson(Map<String, dynamic> json) {
    final runtimeState = _readMap(
      json['runtimeState'] ?? json['runtime_state'] ?? json['state'],
    );
    final scene = DigitalTwinSceneConfig.tryParse(_extractScenePayload(json)) ??
        DigitalTwinSceneConfig.tryParse(json) ??
        const DigitalTwinSceneConfig(
          displayMode: 'multi_scene',
          models: <DigitalTwinModelItem>[],
        );

    return DigitalTwinSceneEnvelope(
      scene: scene,
      previewSessions: _readPreviewSessions(json, runtimeState),
      topControls: _readTopControls(json, runtimeState),
      runtimeState: runtimeState,
      renderHardwareModels: _readBool(
        json['renderHardwareModels'] ?? json['render_hardware_models'],
        fallback: true,
      ),
      source:
          _readString(json['source']) ?? _readString(runtimeState['source']),
      sourcePhase:
          _readString(json['sourcePhase']) ?? _readString(json['source_phase']),
      responseType: _readString(json['responseType']) ??
          _readString(json['response_type']),
      revision: _readInt(json['revision'] ?? runtimeState['revision']),
    );
  }

  static DigitalTwinSceneEnvelope? tryParse(dynamic raw) {
    final map = _normalizeMap(raw);
    if (map == null) return null;
    if (_looksLikeEnvelope(map) || _looksLikeSceneCarrier(map)) {
      return DigitalTwinSceneEnvelope.fromJson(map);
    }
    return null;
  }

  DigitalTwinSceneEnvelope copyWith({
    DigitalTwinSceneConfig? scene,
    List<DigitalTwinPreviewSessionState>? previewSessions,
    List<DigitalTwinTopControlState>? topControls,
    Map<String, dynamic>? runtimeState,
    bool? renderHardwareModels,
    String? source,
    String? sourcePhase,
    String? responseType,
    int? revision,
  }) {
    return DigitalTwinSceneEnvelope(
      scene: scene ?? this.scene,
      previewSessions: previewSessions ?? this.previewSessions,
      topControls: topControls ?? this.topControls,
      runtimeState: runtimeState ?? this.runtimeState,
      renderHardwareModels: renderHardwareModels ?? this.renderHardwareModels,
      source: source ?? this.source,
      sourcePhase: sourcePhase ?? this.sourcePhase,
      responseType: responseType ?? this.responseType,
      revision: revision ?? this.revision,
    );
  }

  DigitalTwinSceneEnvelope upsertPreviewSession(
    DigitalTwinPreviewSessionState session,
  ) {
    final nextSessions = <DigitalTwinPreviewSessionState>[];
    var replaced = false;
    for (final item in previewSessions) {
      if (item.sessionId == session.sessionId) {
        nextSessions.add(session);
        replaced = true;
      } else {
        nextSessions.add(item);
      }
    }
    if (!replaced) {
      nextSessions.add(session);
    }
    return copyWith(previewSessions: nextSessions);
  }

  DigitalTwinSceneEnvelope upsertTopControl(
      DigitalTwinTopControlState control) {
    final nextControls = <DigitalTwinTopControlState>[];
    var replaced = false;
    for (final item in topControls) {
      if (item.id == control.id) {
        nextControls.add(control);
        replaced = true;
      } else {
        nextControls.add(item);
      }
    }
    if (!replaced) {
      nextControls.add(control);
    }
    return copyWith(topControls: nextControls);
  }

  DigitalTwinSceneConfig sceneForRendering() {
    final hiddenModelIds = <String>{
      for (final session in previewSessions)
        if ((!renderHardwareModels || !session.renderInScene) &&
            ((session.modelId?.isNotEmpty ?? false) ||
                session.sessionId.isNotEmpty))
          (session.modelId?.isNotEmpty ?? false)
              ? session.modelId!
              : session.sessionId,
    };
    if (hiddenModelIds.isEmpty) {
      return scene;
    }

    return scene.copyWith(
      models: scene.models
          .where((DigitalTwinModelItem model) =>
              !hiddenModelIds.contains(model.id))
          .toList(growable: false),
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'scene': scene.toJson(),
      if (previewSessions.isNotEmpty)
        'preview_sessions': previewSessions
            .map((DigitalTwinPreviewSessionState item) => item.toJson())
            .toList(),
      if (topControls.isNotEmpty)
        'top_controls': topControls
            .map((DigitalTwinTopControlState item) => item.toJson())
            .toList(),
      if (runtimeState.isNotEmpty) 'runtime_state': runtimeState,
      'render_hardware_models': renderHardwareModels,
      if (source != null && source!.isNotEmpty) 'source': source,
      if (sourcePhase != null && sourcePhase!.isNotEmpty)
        'sourcePhase': sourcePhase,
      if (responseType != null && responseType!.isNotEmpty)
        'responseType': responseType,
      'revision': revision,
    };
  }
}

Map<String, dynamic>? _normalizeMap(dynamic raw) {
  if (raw is String && raw.trim().isNotEmpty) {
    try {
      return _normalizeMap(jsonDecode(raw));
    } catch (_) {
      return null;
    }
  }

  if (raw is Map<String, dynamic>) {
    return Map<String, dynamic>.from(raw);
  }

  if (raw is Map) {
    final map = <String, dynamic>{};
    for (final entry in raw.entries) {
      map[entry.key.toString()] = entry.value;
    }
    return map;
  }

  return null;
}

Map<String, dynamic> _extractScenePayload(Map<String, dynamic> map) {
  final nestedKeys = <String>[
    'scene',
    'digital_twin_scene',
    'digitalTwinScene',
    'scene_config',
    'sceneConfig',
  ];
  for (final key in nestedKeys) {
    final nested = _normalizeMap(map[key]);
    if (nested != null) {
      return nested;
    }
  }
  return map;
}

bool _looksLikeEnvelope(Map<String, dynamic> map) {
  return map.containsKey('scene') ||
      map.containsKey('preview_sessions') ||
      map.containsKey('previewSessions') ||
      map.containsKey('top_controls') ||
      map.containsKey('topControls') ||
      map.containsKey('runtime_state') ||
      map.containsKey('runtimeState') ||
      map.containsKey('render_hardware_models') ||
      map.containsKey('renderHardwareModels');
}

bool _looksLikeSceneCarrier(Map<String, dynamic> map) {
  return DigitalTwinSceneConfig.tryParse(map) != null;
}

List<DigitalTwinPreviewSessionState> _readPreviewSessions(
  Map<String, dynamic> map,
  Map<String, dynamic> runtimeState,
) {
  final raw = map['preview_sessions'] ??
      map['previewSessions'] ??
      runtimeState['preview_sessions'] ??
      runtimeState['previewSessions'];
  final items = _readList(raw);
  return <DigitalTwinPreviewSessionState>[
    for (final item in items)
      if (item is Map<String, dynamic>)
        DigitalTwinPreviewSessionState.fromJson(item)
      else if (item is Map)
        DigitalTwinPreviewSessionState.fromJson(
          Map<String, dynamic>.from(
            item.map((Object? key, Object? value) =>
                MapEntry(key.toString(), value)),
          ),
        ),
  ];
}

List<DigitalTwinTopControlState> _readTopControls(
  Map<String, dynamic> map,
  Map<String, dynamic> runtimeState,
) {
  final raw = map['top_controls'] ??
      map['topControls'] ??
      runtimeState['top_controls'] ??
      runtimeState['topControls'];
  final items = _readList(raw);
  return <DigitalTwinTopControlState>[
    for (final item in items)
      if (item is Map<String, dynamic>)
        DigitalTwinTopControlState.fromJson(item)
      else if (item is Map)
        DigitalTwinTopControlState.fromJson(
          Map<String, dynamic>.from(
            item.map((Object? key, Object? value) =>
                MapEntry(key.toString(), value)),
          ),
        ),
  ];
}

List<dynamic> _readList(dynamic raw) {
  if (raw is List) return raw;
  if (raw is Map) {
    return raw.values.toList(growable: false);
  }
  return const <dynamic>[];
}

Map<String, dynamic> _readMap(dynamic raw) {
  final normalized = _normalizeMap(raw);
  return normalized ?? <String, dynamic>{};
}

String? _readString(dynamic raw) {
  final value = raw?.toString().trim();
  if (value == null || value.isEmpty) return null;
  return value;
}

bool _readBool(dynamic raw, {bool fallback = false}) {
  if (raw is bool) return raw;
  if (raw is num) return raw != 0;
  if (raw is String) {
    final normalized = raw.trim().toLowerCase();
    if (normalized.isEmpty) return fallback;
    if (normalized == 'true' || normalized == '1' || normalized == 'yes') {
      return true;
    }
    if (normalized == 'false' || normalized == '0' || normalized == 'no') {
      return false;
    }
  }
  return fallback;
}

double _readDouble(dynamic raw, {double fallback = 0}) {
  if (raw is num) return raw.toDouble();
  if (raw is String) {
    return double.tryParse(raw.trim()) ?? fallback;
  }
  return fallback;
}

int _readInt(dynamic raw, {int fallback = 0}) {
  if (raw is int) return raw;
  if (raw is num) return raw.toInt();
  if (raw is String) {
    return int.tryParse(raw.trim()) ?? fallback;
  }
  return fallback;
}

String _normalizeKind(String raw) {
  return raw.trim().toLowerCase().replaceAll(RegExp(r'[^a-z0-9]+'), '_');
}

String _fallbackLabel(String kind) {
  switch (_normalizeKind(kind)) {
    case 'microphone':
    case 'mic':
      return '内置麦克风';
    case 'speaker':
      return '内置扬声器';
    case 'camera':
      return 'Camera Preview';
    default:
      return kind;
  }
}
