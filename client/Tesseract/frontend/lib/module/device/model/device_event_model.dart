/*
 * [INPUT]: 依赖 dart:convert 的 JSON 解析能力，接收 MQTT 设备事件与数字孪生场景配置原始数据。
 * [OUTPUT]: 对外提供 DeviceEventPayload、DeviceInfoItem、DigitalTwinSceneConfig、DigitalTwinInterfacePreset、DigitalTwinModelItem 等纯数据模型与变换辅助方法，其中 scene 位姿统一代表预览窗口全局坐标系的绝对值，并支持接口锚点、组件安装锚点与接口-组件残差三层挂载语义。
 * [POS]: module/device/model 的协议模型层，被 MQTT 服务、工作台页面和测试用例共同消费。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import 'dart:convert';

import 'package:flutter/foundation.dart' show kIsWeb;

/// MQTT 设备事件 payload 结构（与飞书文档 / device/usb/event 约定一致）
class DeviceEventPayload {
  final String? sessionId;
  final String? targetId;
  final String? timestamp;
  final List<DeviceInfoItem> deviceInfo;
  final List<dynamic> action;

  DeviceEventPayload({
    this.sessionId,
    this.targetId,
    this.timestamp,
    required this.deviceInfo,
    this.action = const [],
  });

  factory DeviceEventPayload.fromJson(Map<String, dynamic> json) {
    final rawList = json['device_info'];
    final list = <DeviceInfoItem>[];
    if (rawList is List) {
      for (final item in rawList) {
        if (item is Map<String, dynamic>) {
          list.add(DeviceInfoItem.fromJson(item));
        }
      }
    }
    final rawAction = json['action'];
    final actionList = rawAction is List ? rawAction : const [];
    return DeviceEventPayload(
      sessionId: json['session_id']?.toString(),
      targetId: json['target_id']?.toString(),
      timestamp: json['timestamp']?.toString(),
      deviceInfo: list,
      action: actionList,
    );
  }
}

/// 单条设备信息（device_info 数组元素）
class DeviceInfoItem {
  final String portId;
  final String status; // plug_in | plug_out
  final String deviceId;
  final String deviceType; // car | screen | cam ...
  final Map<String, dynamic> notes;

  DeviceInfoItem({
    required this.portId,
    required this.status,
    required this.deviceId,
    required this.deviceType,
    this.notes = const {},
  });

  factory DeviceInfoItem.fromJson(Map<String, dynamic> json) {
    final notesRaw = json['notes'];
    var notesMap = <String, dynamic>{};
    if (notesRaw is Map<String, dynamic>) {
      notesMap = Map<String, dynamic>.from(notesRaw);
    } else if (notesRaw is Map) {
      notesMap = Map<String, dynamic>.from(notesRaw.cast<String, dynamic>());
    }
    return DeviceInfoItem(
      portId: json['port_id']?.toString() ?? '',
      status: json['status']?.toString() ?? '',
      deviceId: json['device_id']?.toString() ?? '',
      deviceType: json['device_type']?.toString() ?? '',
      notes: notesMap,
    );
  }

  bool get isPlugIn => status == 'plug_in';
  bool get isPlugOut => status == 'plug_out';
}

/// 数字孪生交互模式：平移 / 旋转。
enum DigitalTwinInteractionMode { translate, rotate }

/// 数字孪生场景配置。
class DigitalTwinSceneConfig {
  final String displayMode;
  final String? baseModelId;
  final List<DigitalTwinInterfacePreset> interfaces;
  final List<DigitalTwinModelItem> models;

  const DigitalTwinSceneConfig({
    required this.displayMode,
    this.baseModelId,
    this.interfaces = const <DigitalTwinInterfacePreset>[],
    required this.models,
  });

  factory DigitalTwinSceneConfig.fromJson(Map<String, dynamic> json) {
    final rawInterfaces = json['interfaces'];
    final interfaces = <DigitalTwinInterfacePreset>[];
    if (rawInterfaces is List) {
      for (final item in rawInterfaces) {
        if (item is Map<String, dynamic>) {
          interfaces.add(DigitalTwinInterfacePreset.fromJson(item));
        }
      }
    }

    final rawModels = json['models'];
    final models = <DigitalTwinModelItem>[];
    if (rawModels is List) {
      for (final item in rawModels) {
        if (item is Map<String, dynamic>) {
          models.add(DigitalTwinModelItem.fromJson(item));
        }
      }
    }

    return DigitalTwinSceneConfig(
      displayMode: json['display_mode']?.toString() ?? 'multi_scene',
      baseModelId: json['base_model_id']?.toString(),
      interfaces: interfaces,
      models: models,
    );
  }

  static DigitalTwinSceneConfig? tryParse(dynamic raw) {
    final map = _normalizeMap(raw);
    if (map == null) return null;

    if (_looksLikeSceneConfig(map)) {
      return DigitalTwinSceneConfig.fromJson(map);
    }

    for (final key in _sceneKeys) {
      final nestedScene = tryParse(map[key]);
      if (nestedScene != null) {
        return nestedScene;
      }
    }

    return null;
  }

  bool get isMultiScene => displayMode == 'multi_scene';

  DigitalTwinModelItem? findModelById(String? modelId) {
    if (modelId == null || modelId.isEmpty) return null;
    for (final model in models) {
      if (model.id == modelId) return model;
    }
    return null;
  }

  DigitalTwinInterfacePreset? findInterfaceById(String? interfaceId) {
    if (interfaceId == null || interfaceId.isEmpty) return null;
    for (final interface in interfaces) {
      if (interface.id == interfaceId) return interface;
    }
    return null;
  }

  DigitalTwinSceneConfig copyWith({
    String? displayMode,
    String? baseModelId,
    List<DigitalTwinInterfacePreset>? interfaces,
    List<DigitalTwinModelItem>? models,
  }) {
    return DigitalTwinSceneConfig(
      displayMode: displayMode ?? this.displayMode,
      baseModelId: baseModelId ?? this.baseModelId,
      interfaces: interfaces ?? this.interfaces,
      models: models ?? this.models,
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'display_mode': displayMode,
      if (baseModelId != null && baseModelId!.isNotEmpty)
        'base_model_id': baseModelId,
      'interfaces': interfaces
          .map((DigitalTwinInterfacePreset item) => item.toJson())
          .toList(),
      'models':
          models.map((DigitalTwinModelItem item) => item.toJson()).toList(),
    };
  }

  Map<String, dynamic> exportMountProfilesMap() {
    final result = <String, dynamic>{};
    for (final model in models) {
      if (model.id == baseModelId) continue;
      result[model.id] = <String, dynamic>{
        'position': List<double>.from(model.mountPositionOffset),
        'rotation': List<double>.from(model.mountRotationOffset),
        'scale': List<double>.from(model.scale),
      };
    }
    return result;
  }

  DigitalTwinSceneConfig applyInterfaceDefaults(
    DigitalTwinSceneConfig defaults, {
    bool replaceInterfaces = false,
    bool replaceBaseModelId = false,
  }) {
    return copyWith(
      baseModelId: replaceBaseModelId
          ? (defaults.baseModelId ?? baseModelId)
          : ((baseModelId?.isNotEmpty ?? false)
              ? baseModelId
              : defaults.baseModelId),
      interfaces: replaceInterfaces && defaults.interfaces.isNotEmpty
          ? defaults.interfaces
          : (interfaces.isNotEmpty ? interfaces : defaults.interfaces),
    );
  }

  DigitalTwinSceneConfig updateModel(
    String modelId, {
    String? interfaceId,
    List<double>? position,
    List<double>? rotation,
    List<double>? scale,
    List<double>? mountPositionOffset,
    List<double>? mountRotationOffset,
  }) {
    return copyWith(
      models: <DigitalTwinModelItem>[
        for (final model in models)
          if (model.id == modelId)
            model.copyWith(
              interfaceId: interfaceId,
              position: position,
              rotation: rotation,
              scale: scale,
              mountPositionOffset: mountPositionOffset,
              mountRotationOffset: mountRotationOffset,
            )
          else
            model,
      ],
    );
  }

  DigitalTwinSceneConfig applyMountProfiles(
    Map<String, DigitalTwinMountCompensationOverride> overrides,
  ) {
    if (overrides.isEmpty) return this;
    return copyWith(
      models: <DigitalTwinModelItem>[
        for (final model in models)
          if (overrides.containsKey(model.id))
            model.copyWith(
              scale: overrides[model.id]!.scale,
              mountPositionOffset: overrides[model.id]!.position,
              mountRotationOffset: overrides[model.id]!.rotation,
            )
          else
            model,
      ],
    );
  }

  DigitalTwinSceneConfig applyMountCompensationOverrides(
    Map<String, DigitalTwinMountCompensationOverride> overrides,
  ) {
    return applyMountProfiles(overrides);
  }

  static Map<String, DigitalTwinMountCompensationOverride> parseMountProfileEnv(
      String raw) {
    return parseMountCompensationEnv(raw);
  }

  static Map<String, DigitalTwinMountCompensationOverride>
      parseMountCompensationEnv(String raw) {
    final normalized = raw.trim();
    if (normalized.isEmpty) {
      return const <String, DigitalTwinMountCompensationOverride>{};
    }

    final fromJson = parseMountCompensationConfig(normalized);
    if (fromJson.isNotEmpty) return fromJson;

    return _parseMountCompensationCompact(normalized);
  }

  static Map<String, DigitalTwinMountCompensationOverride>
      parseMountProfileConfig(String raw) {
    return parseMountCompensationConfig(raw);
  }

  static Map<String, DigitalTwinMountCompensationOverride>
      parseMountCompensationConfig(String raw) {
    final normalized = raw.trim();
    if (normalized.isEmpty) {
      return const <String, DigitalTwinMountCompensationOverride>{};
    }

    final map = _normalizeMap(normalized);
    if (map == null || map.isEmpty) {
      return const <String, DigitalTwinMountCompensationOverride>{};
    }

    final overrideMap = _extractMountCompensationPayload(map);
    if (overrideMap == null || overrideMap.isEmpty) {
      return const <String, DigitalTwinMountCompensationOverride>{};
    }

    return _parseMountCompensationMap(overrideMap);
  }

  static Map<String, DigitalTwinMountCompensationOverride> mergeMountProfiles({
    required Map<String, DigitalTwinMountCompensationOverride> base,
    required Map<String, DigitalTwinMountCompensationOverride> override,
  }) {
    return mergeMountCompensationOverrides(base: base, override: override);
  }

  static Map<String, DigitalTwinMountCompensationOverride>
      mergeMountCompensationOverrides({
    required Map<String, DigitalTwinMountCompensationOverride> base,
    required Map<String, DigitalTwinMountCompensationOverride> override,
  }) {
    if (base.isEmpty) {
      return Map<String, DigitalTwinMountCompensationOverride>.from(override);
    }
    if (override.isEmpty) {
      return Map<String, DigitalTwinMountCompensationOverride>.from(base);
    }
    return <String, DigitalTwinMountCompensationOverride>{
      ...base,
      ...override,
    };
  }

  static Map<String, DigitalTwinMountCompensationOverride>
      _parseMountCompensationCompact(String raw) {
    final result = <String, DigitalTwinMountCompensationOverride>{};
    for (final entry in raw.split(';')) {
      final normalizedEntry = entry.trim();
      if (normalizedEntry.isEmpty || !normalizedEntry.contains('=')) continue;
      final parts = normalizedEntry.split('=');
      if (parts.length < 2) continue;
      final modelId = parts.first.trim();
      final vectorPart = parts.sublist(1).join('=').trim();
      if (modelId.isEmpty || vectorPart.isEmpty) continue;

      final segments = vectorPart.split('|');
      result[modelId] = DigitalTwinMountCompensationOverride(
        position: DigitalTwinModelItem._readVector3(
          _parseCompactVector(segments.isNotEmpty ? segments[0] : ''),
        ),
        rotation: DigitalTwinModelItem._readVector3(
          _parseCompactVector(segments.length > 1 ? segments[1] : ''),
        ),
      );
    }
    return result;
  }

  static List<double> _parseCompactVector(String raw) {
    return raw
        .split(',')
        .map((String item) => double.tryParse(item.trim()))
        .whereType<double>()
        .toList();
  }

  static Map<String, DigitalTwinMountCompensationOverride>
      _parseMountCompensationMap(Map<String, dynamic> rawMap) {
    final result = <String, DigitalTwinMountCompensationOverride>{};
    for (final entry in rawMap.entries) {
      final itemMap = _normalizeMap(entry.value);
      if (itemMap == null) continue;
      result[entry.key] = DigitalTwinMountCompensationOverride.fromJson(
        itemMap,
      );
    }
    return result;
  }

  static Map<String, dynamic>? _extractMountCompensationPayload(
    Map<String, dynamic> rawMap,
  ) {
    if (_looksLikeMountCompensationMap(rawMap)) {
      return rawMap;
    }

    for (final key in _mountCompensationKeys) {
      final nested = _normalizeMap(rawMap[key]);
      if (nested == null) continue;
      if (_looksLikeMountCompensationMap(nested)) {
        return nested;
      }
    }

    return null;
  }

  static DigitalTwinPortComponentOverrideTable parsePortComponentOverrideConfig(
    String raw,
  ) {
    final normalized = raw.trim();
    if (normalized.isEmpty) {
      return const DigitalTwinPortComponentOverrideTable();
    }

    final map = _normalizeMap(normalized);
    if (map == null || map.isEmpty) {
      return const DigitalTwinPortComponentOverrideTable();
    }

    final payload = _extractPortComponentOverridePayload(map);
    if (payload == null || payload.isEmpty) {
      return const DigitalTwinPortComponentOverrideTable();
    }

    return DigitalTwinPortComponentOverrideTable.fromJson(payload);
  }

  static const List<String> _sceneKeys = <String>[
    'digital_twin_scene',
    'digitalTwinScene',
    'digitalTwin',
    'scene',
    'scene_config',
    'sceneConfig',
  ];

  static const List<String> _mountCompensationKeys = <String>[
    'mount_profiles',
    'mountProfiles',
    'digital_twin_mount_profiles',
    'digitalTwinMountProfiles',
    'mount_compensation',
    'mountCompensation',
    'digital_twin_mount_compensation',
    'digitalTwinMountCompensation',
    'models',
  ];

  static const List<String> _portComponentOverrideKeys = <String>[
    'port_component_overrides',
    'portComponentOverrides',
    'digital_twin_port_component_overrides',
    'digitalTwinPortComponentOverrides',
    'overrides',
  ];

  static bool _looksLikeSceneConfig(Map<String, dynamic> json) {
    return json.containsKey('display_mode') ||
        json.containsKey('models') ||
        json.containsKey('base_model_id') ||
        json.containsKey('interfaces');
  }

  static bool _looksLikeMountCompensationMap(Map<String, dynamic> json) {
    if (json.isEmpty) return true;
    for (final value in json.values) {
      final itemMap = _normalizeMap(value);
      if (itemMap == null) continue;
      if (itemMap.containsKey('position') ||
          itemMap.containsKey('rotation') ||
          itemMap.containsKey('scale') ||
          itemMap.containsKey('mount_position_offset') ||
          itemMap.containsKey('mount_rotation_offset') ||
          itemMap.containsKey('mount_scale')) {
        return true;
      }
    }
    return false;
  }

  static bool _looksLikePortComponentOverrideMap(Map<String, dynamic> json) {
    if (json.isEmpty) return true;
    for (final portEntry in json.values) {
      final portMap = _normalizeMap(portEntry);
      if (portMap == null) continue;
      for (final overrideEntry in portMap.values) {
        final overrideMap = _normalizeMap(overrideEntry);
        if (overrideMap == null) continue;
        if (overrideMap.containsKey('position') ||
            overrideMap.containsKey('rotation') ||
            overrideMap.containsKey('residual_position') ||
            overrideMap.containsKey('residual_rotation')) {
          return true;
        }
      }
    }
    return false;
  }

  static Map<String, dynamic>? _extractPortComponentOverridePayload(
    Map<String, dynamic> rawMap,
  ) {
    if (_looksLikePortComponentOverrideMap(rawMap)) {
      return rawMap;
    }

    for (final key in _portComponentOverrideKeys) {
      final nested = _normalizeMap(rawMap[key]);
      if (nested == null) continue;
      if (_looksLikePortComponentOverrideMap(nested)) {
        return nested;
      }
    }

    return null;
  }

  static Map<String, dynamic>? _normalizeMap(dynamic raw) {
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
}

/// 组件级安装锚点。
/// 旧协议曾把它叫作 mount compensation；当前语义已收口为“组件自身的默认安装姿态/安装基点/默认尺寸”。
/// position / rotation 默认以接口本地坐标系为基准，用于修正模型天然朝向与安装基点。
/// scale 用于覆盖组件默认尺寸，方便把天然比例不一致的模型快速拉回可用区间。
class DigitalTwinMountCompensationOverride {
  final List<double> position;
  final List<double> rotation;
  final List<double>? scale;

  const DigitalTwinMountCompensationOverride({
    this.position = const <double>[0, 0, 0],
    this.rotation = const <double>[0, 0, 0],
    this.scale,
  });

  factory DigitalTwinMountCompensationOverride.fromJson(
    Map<String, dynamic> json,
  ) {
    return DigitalTwinMountCompensationOverride(
      position: DigitalTwinModelItem._readVector3(
        json['position'] ?? json['mount_position_offset'],
      ),
      rotation: DigitalTwinModelItem._readVector3(
        json['rotation'] ?? json['mount_rotation_offset'],
      ),
      scale: _readOptionalScale(json),
    );
  }

  static List<double>? _readOptionalScale(Map<String, dynamic> json) {
    if (!json.containsKey('scale') && !json.containsKey('mount_scale')) {
      return null;
    }
    return DigitalTwinModelItem._readVector3(
      json['scale'] ?? json['mount_scale'],
      fallback: const <double>[1, 1, 1],
    );
  }
}

/// 接口-组件残差校准。
/// 只描述某个组件挂到某个接口时“还差一点”的微调，不承担组件默认安装姿态的职责。
class DigitalTwinPortComponentOverride {
  final List<double> position;
  final List<double> rotation;

  const DigitalTwinPortComponentOverride({
    this.position = const <double>[0, 0, 0],
    this.rotation = const <double>[0, 0, 0],
  });

  factory DigitalTwinPortComponentOverride.fromJson(Map<String, dynamic> json) {
    return DigitalTwinPortComponentOverride(
      position: DigitalTwinModelItem._readVector3(
        json['position'] ?? json['residual_position'],
      ),
      rotation: DigitalTwinModelItem._readVector3(
        json['rotation'] ?? json['residual_rotation'],
      ),
    );
  }

  bool get isIdentity =>
      position[0] == 0 &&
      position[1] == 0 &&
      position[2] == 0 &&
      rotation[0] == 0 &&
      rotation[1] == 0 &&
      rotation[2] == 0;

  DigitalTwinPortComponentOverride copyWith({
    List<double>? position,
    List<double>? rotation,
  }) {
    return DigitalTwinPortComponentOverride(
      position: DigitalTwinModelItem._copyVector3(position ?? this.position),
      rotation: DigitalTwinModelItem._copyVector3(rotation ?? this.rotation),
    );
  }
}

/// 接口-组件残差表。
/// 结构为 `portId -> modelId -> residualOverride`。
class DigitalTwinPortComponentOverrideTable {
  final Map<String, Map<String, DigitalTwinPortComponentOverride>> items;

  const DigitalTwinPortComponentOverrideTable({
    this.items =
        const <String, Map<String, DigitalTwinPortComponentOverride>>{},
  });

  factory DigitalTwinPortComponentOverrideTable.fromJson(
    Map<String, dynamic> json,
  ) {
    final result = <String, Map<String, DigitalTwinPortComponentOverride>>{};
    for (final portEntry in json.entries) {
      final portMap = DigitalTwinSceneConfig._normalizeMap(portEntry.value);
      if (portMap == null || portMap.isEmpty) continue;

      final modelOverrides = <String, DigitalTwinPortComponentOverride>{};
      for (final modelEntry in portMap.entries) {
        final overrideMap =
            DigitalTwinSceneConfig._normalizeMap(modelEntry.value);
        if (overrideMap == null) continue;
        modelOverrides[modelEntry.key] =
            DigitalTwinPortComponentOverride.fromJson(overrideMap);
      }
      if (modelOverrides.isNotEmpty) {
        result[portEntry.key] = modelOverrides;
      }
    }
    return DigitalTwinPortComponentOverrideTable(items: result);
  }

  bool get isEmpty => items.isEmpty;

  DigitalTwinPortComponentOverride lookup(String? portId, String? modelId) {
    if (portId == null ||
        portId.isEmpty ||
        modelId == null ||
        modelId.isEmpty) {
      return const DigitalTwinPortComponentOverride();
    }
    return items[portId]?[modelId] ?? const DigitalTwinPortComponentOverride();
  }

  DigitalTwinPortComponentOverrideTable upsert({
    required String portId,
    required String modelId,
    required DigitalTwinPortComponentOverride override,
  }) {
    final nextItems = <String, Map<String, DigitalTwinPortComponentOverride>>{
      for (final entry in items.entries)
        entry.key: <String, DigitalTwinPortComponentOverride>{
          ...entry.value,
        },
    };

    final nextPortMap = <String, DigitalTwinPortComponentOverride>{
      ...(nextItems[portId] ??
          const <String, DigitalTwinPortComponentOverride>{}),
    };
    if (override.isIdentity) {
      nextPortMap.remove(modelId);
    } else {
      nextPortMap[modelId] = override;
    }

    if (nextPortMap.isEmpty) {
      nextItems.remove(portId);
    } else {
      nextItems[portId] = nextPortMap;
    }

    return DigitalTwinPortComponentOverrideTable(items: nextItems);
  }

  Map<String, dynamic> toConfigMap() {
    final result = <String, dynamic>{};
    for (final portEntry in items.entries) {
      final modelOverrides = <String, dynamic>{};
      for (final modelEntry in portEntry.value.entries) {
        modelOverrides[modelEntry.key] = <String, dynamic>{
          'position': List<double>.from(modelEntry.value.position),
          'rotation': List<double>.from(modelEntry.value.rotation),
        };
      }
      if (modelOverrides.isNotEmpty) {
        result[portEntry.key] = modelOverrides;
      }
    }
    return <String, dynamic>{
      'port_component_overrides': result,
    };
  }
}

/// 底座接口预设。
/// `position / rotation` 以底座模型本地坐标系为基准，用于快速解算挂载设备的绝对位姿。
class DigitalTwinInterfacePreset {
  final String id;
  final String label;
  final String kind;
  final List<double> position;
  final List<double> rotation;

  const DigitalTwinInterfacePreset({
    required this.id,
    required this.label,
    required this.kind,
    required this.position,
    required this.rotation,
  });

  factory DigitalTwinInterfacePreset.fromJson(Map<String, dynamic> json) {
    return DigitalTwinInterfacePreset(
      id: json['id']?.toString() ?? '',
      label: json['label']?.toString() ?? '',
      kind: json['kind']?.toString() ?? 'side',
      position: DigitalTwinModelItem._readVector3(json['position']),
      rotation: DigitalTwinModelItem._readVector3(json['rotation']),
    );
  }

  DigitalTwinInterfacePreset copyWith({
    String? id,
    String? label,
    String? kind,
    List<double>? position,
    List<double>? rotation,
  }) {
    return DigitalTwinInterfacePreset(
      id: id ?? this.id,
      label: label ?? this.label,
      kind: kind ?? this.kind,
      position: DigitalTwinModelItem._copyVector3(position ?? this.position),
      rotation: DigitalTwinModelItem._copyVector3(rotation ?? this.rotation),
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
      'label': label,
      'kind': kind,
      'position': List<double>.from(position),
      'rotation': List<double>.from(rotation),
    };
  }
}

/// 单个数字孪生模型定义。
/// position / rotation 都固定为三轴向量，并统一表示预览窗口全局坐标系中的绝对位姿。
/// rotation 单位统一为 degree。
/// mountPositionOffset / mountRotationOffset 表示组件安装锚点，不再承担接口残差语义。
class DigitalTwinModelItem {
  final String id;
  final String url;
  final String? interfaceId;
  final List<double> position;
  final List<double> rotation;
  final List<double> scale;
  final List<double> mountPositionOffset;
  final List<double> mountRotationOffset;
  final String deviceId;

  const DigitalTwinModelItem({
    required this.id,
    required this.url,
    this.interfaceId,
    required this.position,
    required this.rotation,
    this.scale = const <double>[1, 1, 1],
    this.mountPositionOffset = const <double>[0, 0, 0],
    this.mountRotationOffset = const <double>[0, 0, 0],
    required this.deviceId,
  });

  /// Flutter Web 将 `pubspec` 中的 `assets/models/*.glb` 发布到 `/assets/assets/models/`。
  /// 工作流模板或后端若写成 `/assets/models/...` 会在浏览器里 404，这里统一纠正。
  /// 在 Web 上还会用 [Uri.base] 解析为带 `base-href` 前缀的绝对地址，避免部署在非根路径时 404。
  static String normalizeFlutterWebModelAssetUrl(String url) {
    final trimmed = url.trim();
    if (trimmed.isEmpty) return trimmed;
    final uri = Uri.tryParse(trimmed);
    if (uri != null &&
        uri.hasScheme &&
        (uri.scheme == 'http' || uri.scheme == 'https')) {
      final mappedPath = _mapAssetsModelsPathToBundlePath(uri.path);
      final next = mappedPath != uri.path ? uri.replace(path: mappedPath) : uri;
      if (kIsWeb &&
          _uriSameOrigin(next, Uri.base.removeFragment()) &&
          mappedPath.startsWith('/assets/')) {
        return _resolveAssetUnderFlutterBase(mappedPath);
      }
      return next.toString();
    }
    var path = trimmed;
    if (!path.startsWith('/')) {
      path = '/$path';
    }
    final mapped = _mapAssetsModelsPathToBundlePath(path);
    if (kIsWeb && mapped.startsWith('/assets/')) {
      return _resolveAssetUnderFlutterBase(mapped);
    }
    return mapped;
  }

  static bool _uriSameOrigin(Uri a, Uri b) =>
      a.scheme == b.scheme && a.host == b.host && a.port == b.port;

  /// [siteRootPath] 形如 `/assets/assets/models/foo.glb`（不含 `base-href` 段）。
  static String _resolveAssetUnderFlutterBase(String siteRootPath) {
    final base = Uri.base.removeFragment();
    final p = siteRootPath.startsWith('/') ? siteRootPath.substring(1) : siteRootPath;
    return base.resolve(p).toString();
  }

  static String _mapAssetsModelsPathToBundlePath(String absolutePath) {
    final re = RegExp(r'^/assets/models/(.+)$', caseSensitive: false);
    final match = re.firstMatch(absolutePath);
    if (match != null) {
      return '/assets/assets/models/${match[1]}';
    }
    return absolutePath;
  }

  factory DigitalTwinModelItem.fromJson(Map<String, dynamic> json) {
    return DigitalTwinModelItem(
      id: json['id']?.toString() ?? '',
      url: normalizeFlutterWebModelAssetUrl(json['url']?.toString() ?? ''),
      interfaceId:
          json['interface_id']?.toString() ?? json['port_id']?.toString(),
      position: _readVector3(json['position']),
      rotation: _readVector3(json['rotation']),
      scale: _readVector3(json['scale'], fallback: const <double>[1, 1, 1]),
      mountPositionOffset: _readVector3(
        json['mount_position_offset'] ?? json['mountPositionOffset'],
      ),
      mountRotationOffset: _readVector3(
        json['mount_rotation_offset'] ?? json['mountRotationOffset'],
      ),
      deviceId: json['device_id']?.toString() ?? '',
    );
  }

  DigitalTwinModelItem copyWith({
    String? id,
    String? url,
    String? interfaceId,
    List<double>? position,
    List<double>? rotation,
    List<double>? scale,
    List<double>? mountPositionOffset,
    List<double>? mountRotationOffset,
    String? deviceId,
  }) {
    return DigitalTwinModelItem(
      id: id ?? this.id,
      url: url != null
          ? normalizeFlutterWebModelAssetUrl(url)
          : this.url,
      interfaceId: interfaceId ?? this.interfaceId,
      position: _copyVector3(position ?? this.position),
      rotation: _copyVector3(rotation ?? this.rotation),
      scale: _copyVector3(scale ?? this.scale),
      mountPositionOffset:
          _copyVector3(mountPositionOffset ?? this.mountPositionOffset),
      mountRotationOffset:
          _copyVector3(mountRotationOffset ?? this.mountRotationOffset),
      deviceId: deviceId ?? this.deviceId,
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
      'url': url,
      if (interfaceId != null && interfaceId!.isNotEmpty)
        'interface_id': interfaceId,
      'position': List<double>.from(position),
      'rotation': List<double>.from(rotation),
      'scale': List<double>.from(scale),
      'mount_position_offset': List<double>.from(mountPositionOffset),
      'mount_rotation_offset': List<double>.from(mountRotationOffset),
      if (deviceId.isNotEmpty) 'device_id': deviceId,
    };
  }

  static List<double> _readVector3(
    dynamic raw, {
    List<double> fallback = const <double>[0, 0, 0],
  }) {
    final vector = _copyVector3(fallback);
    if (raw is List) {
      for (var i = 0; i < raw.length && i < 3; i++) {
        final value = raw[i];
        if (value is num) {
          vector[i] = value.toDouble();
        }
      }
    }
    return vector;
  }

  static List<double> _copyVector3(List<double> raw) {
    final copy = <double>[0, 0, 0];
    for (var i = 0; i < raw.length && i < 3; i++) {
      copy[i] = raw[i].toDouble();
    }
    return copy;
  }
}
