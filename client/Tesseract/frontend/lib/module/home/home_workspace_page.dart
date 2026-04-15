/*
 * [INPUT]: 依赖数字孪生配置资产、DigitalTwinConsoleController、DigitalTwinSceneEnvelope、AiInteractionWindow、model_3d_viewer.dart 提供的场景/preview runtime state 和 iframe ready-handshake/JSON-safe postMessage 协议，以及 assembly_checklist_panel.dart 提供的组装清单面板组件与数据模型。
 * [OUTPUT]: 对外提供 HomeWorkspacePage，根据入口选择"纯数字孪生嵌入模式"或"数字孪生 + AI 面板工作台模式"，并在嵌入模式中归一化跨运行时消息后消费/重放 scene envelope、preview sessions、top controls 与 assembly checklist，同时把 consumed revision、模型选择、顶部控制事件与组装工作流动作回传给父窗口。
 * [POS]: module/home 的工作台总装页，负责保住嵌入入口的单画布形态，同时把左侧 preview 区、顶部控制区与 AI 面板拼成同一张工作台，也是 embedded twin 向 Electron 回报用户交互的唯一出口。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

// ignore_for_file: avoid_web_libraries_in_flutter, deprecated_member_use

import 'dart:async';
import 'dart:convert';
import 'dart:html' as html show MessageEvent, window;

import 'package:aitesseract/module/device/model/device_event_model.dart';
import 'package:aitesseract/module/device/model/digital_twin_scene_envelope.dart';
import 'package:aitesseract/module/home/controller/digital_twin_console_controller.dart';
import 'package:aitesseract/module/home/widget/ai_interaction_window.dart';
import 'package:aitesseract/module/home/widget/model_3d_viewer.dart';
import 'package:aitesseract/module/home/widget/assembly_checklist_panel.dart';
import 'package:aitesseract/module/home/widget/digital_twin_preview_pane.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart' show rootBundle;

class HomeWorkspacePage extends StatefulWidget {
  final String? promptText;
  final bool showAssistantPanel;
  final bool openInDialogueMode;

  const HomeWorkspacePage({
    super.key,
    this.promptText,
    this.showAssistantPanel = false,
    this.openInDialogueMode = false,
  });

  @override
  State<HomeWorkspacePage> createState() => _HomeWorkspacePageState();
}

class _HomeWorkspacePageState extends State<HomeWorkspacePage> {
  static const String _kMountProfilesEnv = String.fromEnvironment(
    'DIGITAL_TWIN_MOUNT_PROFILES',
    defaultValue: '',
  );
  static const String _kMountCompensationEnv = String.fromEnvironment(
    'DIGITAL_TWIN_MOUNT_COMPENSATION',
    defaultValue: '',
  );
  static const String _kInterfaceConfigAsset =
      'assets/config/digital_twin_interfaces.json';
  static const String _kMountProfilesAsset =
      'assets/config/digital_twin_mount_profiles.json';
  static const String _kPortComponentOverrideAsset =
      'assets/config/digital_twin_port_component_overrides.json';

  static const DigitalTwinSceneConfig _defaultDigitalTwinScene =
      DigitalTwinSceneConfig(
    displayMode: 'multi_scene',
    baseModelId: 'model_5',
    interfaces: <DigitalTwinInterfacePreset>[
      DigitalTwinInterfacePreset(
        id: 'port_1',
        label: '接口1 · 侧面A',
        kind: 'side',
        position: <double>[0, 0, 1.62],
        rotation: <double>[0, 0, 0],
      ),
      DigitalTwinInterfacePreset(
        id: 'port_2',
        label: '接口2 · 侧面B',
        kind: 'side',
        position: <double>[1.4, 0, 0.81],
        rotation: <double>[0, 60, 0],
      ),
      DigitalTwinInterfacePreset(
        id: 'port_3',
        label: '接口3 · 侧面C',
        kind: 'side',
        position: <double>[1.4, 0, -0.81],
        rotation: <double>[0, 120, 0],
      ),
      DigitalTwinInterfacePreset(
        id: 'port_4',
        label: '接口4 · 侧面D',
        kind: 'side',
        position: <double>[0, 0, -1.62],
        rotation: <double>[0, 180, 0],
      ),
      DigitalTwinInterfacePreset(
        id: 'port_hdmi',
        label: 'HDMI · 侧面E',
        kind: 'side',
        position: <double>[-1.4, 0, 0.81],
        rotation: <double>[0, 300, 0],
      ),
      DigitalTwinInterfacePreset(
        id: 'port_7',
        label: '接口7 · 底部',
        kind: 'bottom',
        position: <double>[0, -1.72, 0],
        rotation: <double>[90, 0, 0],
      ),
    ],
    models: <DigitalTwinModelItem>[
      DigitalTwinModelItem(
        id: 'model_5',
        url: '/assets/assets/models/base.glb',
        position: <double>[0, 0, 0],
        rotation: <double>[0, 0, 0],
        scale: <double>[2.4, 2.4, 2.4],
        mountPositionOffset: <double>[0, 0, 0],
        mountRotationOffset: <double>[0, 0, 0],
        deviceId: 'device-001',
      ),
    ],
  );

  late final DigitalTwinConsoleController _digitalTwinConsoleController;
  StreamSubscription<html.MessageEvent>? _parentMessageSub;
  DigitalTwinSceneEnvelope? _lastInboundEnvelope;

  // 016-twin-assembly-checklist: 组装清单状态
  List<AssemblyRequirement>? _assemblyRequirements;
  List<DetectedHardwareComponent> _assemblyDetectedComponents = <DetectedHardwareComponent>[];
  String? _assemblySessionId;
  String? _sceneSessionId;
  String? _assemblyNodeName;
  bool _assemblyWorkflowActionLoading = false;
  String? _assemblyWorkflowActionStatus;
  // 017: 待自动确认的剩余硬件节点名称列表
  List<String> _assemblyPendingHardwareNodeNames = <String>[];
  int _lastInboundRevision = 0;
  String? _lastAppliedSceneSignature;
  DigitalTwinSceneConfig? _interfaceDefaults;
  Map<String, DigitalTwinMountCompensationOverride>
      _mountCompensationOverrides =
      const <String, DigitalTwinMountCompensationOverride>{};

  @override
  void initState() {
    super.initState();
    _mountCompensationOverrides = DigitalTwinSceneConfig.parseMountProfileEnv(
      _mountProfilesEnvRaw,
    );
    _digitalTwinConsoleController = DigitalTwinConsoleController(
      defaultScene: _resolvedDefaultDigitalTwinScene,
    )..addListener(_handleDigitalTwinConsoleChanged);
    _parentMessageSub = html.window.onMessage.listen(
      _handleParentWindowMessage,
    );
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _notifyHostDigitalTwinReady();
    });
    // MQTT 连接入口已按当前桌面嵌入诉求停用，页面默认只保留数字孪生画布。
    // _initDeviceMqtt();
    unawaited(_loadDigitalTwinConfigAssets());
  }

  @override
  void dispose() {
    _parentMessageSub?.cancel();
    _digitalTwinConsoleController
      ..removeListener(_handleDigitalTwinConsoleChanged)
      ..dispose();
    super.dispose();
  }

  void _handleDigitalTwinConsoleChanged() {
    if (!mounted) return;
    setState(() {});
  }

  void _applyWorkspaceEnvelope(DigitalTwinSceneEnvelope envelope) {
    final interfaceDefaults = _resolvedDefaultDigitalTwinScene;
    final normalizedScene = envelope.scene
        .applyInterfaceDefaults(
          interfaceDefaults,
          replaceInterfaces: envelope.scene.interfaces.isEmpty,
          replaceBaseModelId: envelope.scene.baseModelId == null ||
              envelope.scene.baseModelId!.isEmpty,
        )
        .applyMountCompensationOverrides(_mountCompensationOverrides);
    final nextEnvelope = envelope.copyWith(
      scene: normalizedScene,
      renderHardwareModels: envelope.renderHardwareModels,
    );
    _lastAppliedSceneSignature = _buildSceneSignature(nextEnvelope);
    _lastInboundEnvelope = nextEnvelope;
    _lastInboundRevision = nextEnvelope.revision;
    _digitalTwinConsoleController.applyDigitalTwinScene(
      nextEnvelope.sceneForRendering(),
    );
    if (mounted) {
      setState(() {});
    }
  }

  String get _mountProfilesEnvRaw => _kMountProfilesEnv.isNotEmpty
      ? _kMountProfilesEnv
      : _kMountCompensationEnv;

  Color get _viewerBackgroundColor =>
      _digitalTwinConsoleController.viewerBackgroundColor;

  DigitalTwinSceneConfig get _viewerBootstrapScene =>
      _digitalTwinConsoleController.viewerBootstrapScene;

  DigitalTwinSceneEnvelope get _workspaceEnvelope =>
      _lastInboundEnvelope ?? _defaultWorkspaceEnvelope;

  DigitalTwinSceneEnvelope get _defaultWorkspaceEnvelope =>
      DigitalTwinSceneEnvelope(
        scene: _resolvedDefaultDigitalTwinScene,
        previewSessions: _defaultPreviewSessions,
        topControls: _defaultTopControls,
        runtimeState: const <String, dynamic>{},
        renderHardwareModels: false,
      );

  List<DigitalTwinPreviewSessionState> get _defaultPreviewSessions =>
      const <DigitalTwinPreviewSessionState>[
        DigitalTwinPreviewSessionState(
          sessionId: 'mic-preview',
          kind: 'microphone',
          label: '内置麦克风',
          active: false,
          renderInScene: false,
          muted: false,
          amplitude: 0.0,
        ),
        DigitalTwinPreviewSessionState(
          sessionId: 'speaker-preview',
          kind: 'speaker',
          label: '内置扬声器',
          active: false,
          renderInScene: false,
          muted: false,
          amplitude: 0.0,
        ),
        DigitalTwinPreviewSessionState(
          sessionId: 'camera-preview',
          kind: 'camera',
          label: 'Camera P2P',
          active: false,
          renderInScene: false,
          muted: false,
          amplitude: 0.0,
          streamUrl: '',
          modelId: 'camera-preview',
        ),
      ];

  List<DigitalTwinTopControlState> get _defaultTopControls =>
      const <DigitalTwinTopControlState>[
        DigitalTwinTopControlState(
          id: 'builtin-mic',
          kind: 'microphone',
          label: '麦克风',
          active: false,
          enabled: true,
          level: 0.0,
        ),
        DigitalTwinTopControlState(
          id: 'builtin-speaker',
          kind: 'speaker',
          label: '扬声器',
          active: false,
          enabled: true,
          level: 0.0,
        ),
      ];

  DigitalTwinSceneConfig get _resolvedDefaultDigitalTwinScene =>
      _applyInterfaceDefaults(
        _defaultDigitalTwinScene,
        replaceInterfaces: true,
        replaceBaseModelId: true,
      ).applyMountCompensationOverrides(_mountCompensationOverrides);

  DigitalTwinSceneConfig _applyInterfaceDefaults(
    DigitalTwinSceneConfig scene, {
    bool replaceInterfaces = false,
    bool replaceBaseModelId = false,
  }) {
    final defaults = _interfaceDefaults;
    if (defaults == null) return scene;
    return scene.applyInterfaceDefaults(
      defaults,
      replaceInterfaces: replaceInterfaces,
      replaceBaseModelId: replaceBaseModelId,
    );
  }

  Future<void> _loadDigitalTwinConfigAssets() async {
    final interfaceDefaults = await _readInterfaceDefaultsAsset();
    final fileOverrides = await _readMountCompensationAsset();
    final portComponentOverrides = await _readPortComponentOverrideAsset();
    final envOverrides = DigitalTwinSceneConfig.parseMountProfileEnv(
      _mountProfilesEnvRaw,
    );
    final mergedOverrides =
        DigitalTwinSceneConfig.mergeMountCompensationOverrides(
      base: fileOverrides,
      override: envOverrides,
    );

    if (!mounted) return;
    setState(() {
      _interfaceDefaults = interfaceDefaults;
      _mountCompensationOverrides = mergedOverrides;
    });
    debugPrint(
      '[DigitalTwin][Embedded] config assets loaded replayRevision=$_lastInboundRevision inboundModels=${_workspaceEnvelope.scene.models.length}',
    );
    _digitalTwinConsoleController.updatePortComponentOverrides(
      portComponentOverrides,
    );
    _digitalTwinConsoleController.updateDefaultScene(
      _resolvedDefaultDigitalTwinScene,
    );
    _applyWorkspaceEnvelope(_workspaceEnvelope);
  }

  Future<DigitalTwinSceneConfig?> _readInterfaceDefaultsAsset() async {
    try {
      final raw = await rootBundle.loadString(_kInterfaceConfigAsset);
      final defaults = DigitalTwinSceneConfig.tryParse(raw);
      if (defaults == null) return null;
      if (defaults.interfaces.isEmpty && defaults.baseModelId == null) {
        return null;
      }
      return defaults;
    } catch (_) {
      return null;
    }
  }

  Future<Map<String, DigitalTwinMountCompensationOverride>>
      _readMountCompensationAsset() async {
    try {
      final raw = await rootBundle.loadString(_kMountProfilesAsset);
      return DigitalTwinSceneConfig.parseMountCompensationConfig(raw);
    } catch (_) {
      return const <String, DigitalTwinMountCompensationOverride>{};
    }
  }

  Future<DigitalTwinPortComponentOverrideTable>
      _readPortComponentOverrideAsset() async {
    try {
      final raw = await rootBundle.loadString(_kPortComponentOverrideAsset);
      return DigitalTwinSceneConfig.parsePortComponentOverrideConfig(raw);
    } catch (_) {
      return const DigitalTwinPortComponentOverrideTable();
    }
  }

  void _handleViewerReady(bool ready) {
    _digitalTwinConsoleController.handleViewerReady(ready);
    debugPrint(
      '[DigitalTwin][Embedded] viewerReady=$ready revision=$_lastInboundRevision models=${_viewerBootstrapScene.models.length}',
    );
    if (ready) {
      _notifyHostDigitalTwinViewerReady();
      _notifyHostDigitalTwinConsumed(
        stage: 'viewer-ready',
        revision: _lastInboundRevision,
        scene: _viewerBootstrapScene,
      );
    }
  }

  void _handleParentWindowMessage(html.MessageEvent event) {
    final payload = _normalizeMessagePayload(event.data);
    if (payload == null) return;
    final String? payloadSessionId = payload['sessionId']?.toString().trim();
    final Map<String, dynamic>? envelopePayload = _normalizeMessagePayload(
      payload['envelope'] ?? payload['sceneEnvelope'],
    );
    final String? envelopeSessionId =
        envelopePayload?['sessionId']?.toString().trim();
    final String? nextSceneSessionId =
        (payloadSessionId != null && payloadSessionId.isNotEmpty)
            ? payloadSessionId
            : (envelopeSessionId != null && envelopeSessionId.isNotEmpty)
                ? envelopeSessionId
                : null;
    if (nextSceneSessionId != null) {
      _sceneSessionId = nextSceneSessionId;
    }

    final String? messageType = payload['type']?.toString();

    // 016-twin-assembly-checklist: 组装清单消息
    if (messageType == 'tesseract-assembly-requirements') {
      _handleAssemblyRequirements(payload['payload'] as Map<String, dynamic>?);
      return;
    }
    if (messageType == 'tesseract-assembly-hardware-state') {
      _handleAssemblyHardwareState(payload['payload'] as Map<String, dynamic>?);
      return;
    }
    if (messageType == 'tesseract-assembly-workflow-status') {
      _handleAssemblyWorkflowStatus(payload);
      return;
    }

    if (messageType != 'tesseract-digital-twin-scene' &&
        messageType != 'preview-state' &&
        messageType != 'tesseract-digital-twin-preview-state') {
      return;
    }

    if (messageType == 'preview-state' ||
        messageType == 'tesseract-digital-twin-preview-state') {
      _handlePreviewStateMessage(payload);
      return;
    }

    final envelope = DigitalTwinSceneEnvelope.tryParse(
      payload['envelope'] ?? payload['sceneEnvelope'] ?? payload,
    );
    if (envelope == null) {
      return;
    }

    final normalizedEnvelope = envelope.copyWith(
      scene: envelope.scene.applyMountCompensationOverrides(
        _mountCompensationOverrides,
      ),
    );
    final nextSignature = _buildSceneSignature(normalizedEnvelope);
    if (_lastAppliedSceneSignature != null && _lastAppliedSceneSignature == nextSignature) {
      debugPrint(
        '[DigitalTwin][Embedded] skip duplicate scene revision=${envelope.revision} source=${envelope.sourcePhase ?? 'n/a'} response=${envelope.responseType ?? 'n/a'}',
      );
      return;
    }

    _lastInboundRevision = envelope.revision;
    debugPrint(
      '[DigitalTwin][Embedded] received scene revision=$_lastInboundRevision source=${envelope.sourcePhase ?? 'n/a'} response=${envelope.responseType ?? 'n/a'} models=${envelope.scene.models.length} ids=${envelope.scene.models.map((DigitalTwinModelItem model) => model.id).join(",")}',
    );
    _applyWorkspaceEnvelope(normalizedEnvelope);
    debugPrint(
      '[DigitalTwin][Embedded] scene applied revision=$_lastInboundRevision viewerModels=${_viewerBootstrapScene.models.length} ids=${_viewerBootstrapScene.models.map((DigitalTwinModelItem model) => model.id).join(",")}',
    );
    _notifyHostDigitalTwinConsumed(
      stage: 'scene-applied',
      revision: _lastInboundRevision,
      scene: _viewerBootstrapScene,
    );
  }

  void _notifyHostDigitalTwinReady() {
    _postMessageToHost(<String, dynamic>{
      'type': 'tesseract-digital-twin-ready',
    });
  }

  void _postMessageToHost(Map<String, dynamic> payload) {
    final parentWindow = html.window.parent;
    if (parentWindow == null || identical(parentWindow, html.window)) {
      return;
    }

    parentWindow.postMessage(jsonEncode(payload), '*');
  }

  void _notifyHostDigitalTwinConsumed({
    required String stage,
    required Object? revision,
    required DigitalTwinSceneConfig? scene,
  }) {
    _postMessageToHost(<String, dynamic>{
      'type': 'tesseract-digital-twin-consumed',
      'stage': stage,
      'revision': revision,
      'modelCount': scene?.models.length ?? 0,
      'modelIds':
          scene?.models.map((DigitalTwinModelItem model) => model.id).toList() ??
              const <String>[],
    });
  }

  void _notifyHostDigitalTwinViewerReady() {
    final scene = _viewerBootstrapScene;
    _postMessageToHost(<String, dynamic>{
      'type': 'tesseract-digital-twin-viewer-ready',
      'stage': 'viewer-ready',
      'revision': _lastInboundRevision,
      'modelCount': scene.models.length,
      'modelIds':
          scene.models.map((DigitalTwinModelItem model) => model.id).toList(),
    });
  }

  Map<String, dynamic>? _normalizeMessagePayload(dynamic raw) {
    if (raw is String && raw.trim().isNotEmpty) {
      try {
        return _normalizeMessagePayload(jsonDecode(raw));
      } catch (_) {
        return null;
      }
    }

    if (raw is Map<String, dynamic>) {
      return Map<String, dynamic>.from(raw);
    }
    if (raw is Map) {
      return Map<String, dynamic>.from(raw.cast<String, dynamic>());
    }

    return null;
  }

  void _onModelTransformsChanged(List<Model3DTransform> transforms) {
    _digitalTwinConsoleController.onModelTransformsChanged(transforms);
  }

  void _handleAssistantSceneUpdated(DigitalTwinSceneConfig? scene) {
    final nextScene = scene ?? _defaultWorkspaceEnvelope.scene;
    _applyWorkspaceEnvelope(
      _workspaceEnvelope.copyWith(
        scene: nextScene,
      ),
    );
  }

  String _buildSceneSignature(DigitalTwinSceneEnvelope envelope) {
    return jsonEncode(<String, dynamic>{
      'scene': envelope.sceneForRendering().toJson(),
      'renderHardwareModels': envelope.renderHardwareModels,
    });
  }

  void _handleTopControlTapped(DigitalTwinTopControlState control) {
    final nextEnvelope = _workspaceEnvelope.upsertTopControl(control);
    _lastInboundEnvelope = nextEnvelope;
    debugPrint(
      '[DigitalTwin][Embedded] top control tapped id=${control.id} kind=${control.kind} active=${control.active}',
    );
    _postMessageToHost(<String, dynamic>{
      'type': 'tesseract-digital-twin-top-control',
      'control': control.toJson(),
      'revision': _lastInboundRevision,
    });
    if (mounted) {
      setState(() {});
    }
  }

  void _handleModelSelectionChanged(String? modelId) {
    final model = _workspaceEnvelope.scene.findModelById(modelId);
    debugPrint(
      '[DigitalTwin][Embedded] model selected modelId=${modelId ?? "null"} deviceId=${model?.deviceId ?? "n/a"} interfaceId=${model?.interfaceId ?? "n/a"}',
    );
    _postMessageToHost(<String, dynamic>{
      'type': 'tesseract-digital-twin-model-selected',
      'revision': _lastInboundRevision,
      'modelId': modelId,
      'model': model?.toJson(),
    });
  }

  void _handlePreviewStateMessage(Map<String, dynamic> payload) {
    final sessionPayload = _normalizeMessagePayload(
          payload['session'] ?? payload['previewSession'] ?? payload,
        ) ??
        payload;
    final controlPayload = _normalizeMessagePayload(
      payload['control'] ?? payload['topControl'],
    );
    final runtimeState = <String, dynamic>{
      ..._workspaceEnvelope.runtimeState,
      ...(_normalizeMessagePayload(
            payload['runtimeState'] ?? payload['runtime_state'],
          ) ??
          const <String, dynamic>{}),
    };
    final sessionId = sessionPayload['sessionId']?.toString() ??
        sessionPayload['session_id']?.toString() ??
        sessionPayload['id']?.toString();
    final currentSession =
        sessionId == null ? null : _findPreviewSessionById(sessionId);
    final controlId = controlPayload?['id']?.toString() ??
        controlPayload?['controlId']?.toString() ??
        controlPayload?['control_id']?.toString();
    final currentControl =
        controlId == null ? null : _findTopControlById(controlId);
    final nextSession = currentSession != null
        ? DigitalTwinPreviewSessionState.fromJson(
            <String, dynamic>{
              ...currentSession.toJson(),
              ...sessionPayload,
              'runtimeState': runtimeState,
              if (controlPayload != null) 'controlState': controlPayload,
            },
          )
        : (sessionId != null &&
                (sessionPayload.containsKey('kind') ||
                    sessionPayload.containsKey('streamUrl') ||
                    sessionPayload.containsKey('stream_url') ||
                    sessionPayload.containsKey('renderInScene') ||
                    sessionPayload.containsKey('render_in_scene'))
            ? DigitalTwinPreviewSessionState.fromJson(sessionPayload)
            : null);
    final nextControl = currentControl != null
        ? DigitalTwinTopControlState.fromJson(
            <String, dynamic>{
              ...currentControl.toJson(),
              ...controlPayload!,
              'runtimeState': runtimeState,
            },
          )
        : (controlPayload != null
            ? DigitalTwinTopControlState.fromJson(controlPayload)
            : null);
    final nextEnvelope = _workspaceEnvelope.copyWith(
      previewSessions: nextSession != null
          ? _workspaceEnvelope.upsertPreviewSession(nextSession).previewSessions
          : _workspaceEnvelope.previewSessions,
      topControls: nextControl != null
          ? _workspaceEnvelope.upsertTopControl(nextControl).topControls
          : _workspaceEnvelope.topControls,
      runtimeState: runtimeState,
      renderHardwareModels: _readBoolValue(
        payload['renderHardwareModels'] ?? payload['render_hardware_models'],
        fallback: _workspaceEnvelope.renderHardwareModels,
      ),
      revision: (payload['revision'] as num?)?.toInt() ?? _lastInboundRevision,
    );
    _applyWorkspaceEnvelope(nextEnvelope);
  }

  DigitalTwinPreviewSessionState? _findPreviewSessionById(String sessionId) {
    for (final session in _workspaceEnvelope.previewSessions) {
      if (session.sessionId == sessionId) {
        return session;
      }
    }
    return null;
  }

  DigitalTwinTopControlState? _findTopControlById(String controlId) {
    for (final control in _workspaceEnvelope.topControls) {
      if (control.id == controlId) {
        return control;
      }
    }
    return null;
  }

  bool _readBoolValue(dynamic raw, {required bool fallback}) {
    if (raw is bool) return raw;
    if (raw is num) return raw != 0;
    if (raw is String) {
      final normalized = raw.trim().toLowerCase();
      if (normalized == 'true' || normalized == '1' || normalized == 'yes') {
        return true;
      }
      if (normalized == 'false' || normalized == '0' || normalized == 'no') {
        return false;
      }
    }
    return fallback;
  }

  void _handleTeachingHandoffRequested(String teachingGoal) {
    Navigator.of(context).pushReplacement(
      MaterialPageRoute<void>(
        builder: (_) => HomeWorkspacePage(
          promptText: teachingGoal,
          showAssistantPanel: true,
          openInDialogueMode: false,
        ),
      ),
    );
  }

  // =========================================================================
  // 016-twin-assembly-checklist: 组装清单消息处理
  // =========================================================================

  void _handleAssemblyRequirements(Map<String, dynamic>? payload) {
    if (payload == null) return;
    setState(() {
      _assemblySessionId = payload['sessionId'] as String?;
      _assemblyNodeName = payload['nodeName'] as String?;
      _assemblyRequirements = (payload['components'] as List<dynamic>?)
              ?.map((dynamic c) {
            final Map<String, dynamic> m = c as Map<String, dynamic>;
            return AssemblyRequirement(
              componentId: m['componentId'] as String? ?? '',
              displayName: m['displayName'] as String? ?? '',
            );
          }).toList() ??
          <AssemblyRequirement>[];
      _assemblyDetectedComponents = <DetectedHardwareComponent>[];
      // 017: 存储待自动确认的硬件节点名称列表
      _assemblyPendingHardwareNodeNames = (payload['allPendingHardwareNodeNames'] as List<dynamic>?)
              ?.whereType<String>()
              .toList() ??
          <String>[];
      _assemblyWorkflowActionLoading = false;
      _assemblyWorkflowActionStatus = null;
    });
  }

  void _handleAssemblyHardwareState(Map<String, dynamic>? payload) {
    if (payload == null) return;
    setState(() {
      _assemblyDetectedComponents = (payload['components'] as List<dynamic>?)
              ?.map((dynamic c) {
            final Map<String, dynamic> m = c as Map<String, dynamic>;
            return DetectedHardwareComponent(
              componentId: m['componentId'] as String? ?? '',
              deviceId: m['deviceId'] as String? ?? '',
              displayName: m['displayName'] as String? ?? '',
              status: m['status'] as String? ?? 'connected',
            );
          }).toList() ??
          <DetectedHardwareComponent>[];
    });
  }

  void _handleAssemblyWorkflowStatus(Map<String, dynamic> payload) {
    setState(() {
      _assemblyWorkflowActionLoading = false;
      _assemblyWorkflowActionStatus = payload['message']?.toString() ?? '端侧操作已完成';
    });
  }

  void _requestAssemblyWorkflowAction(String action) {
    if (_assemblySessionId == null || _assemblySessionId!.isEmpty) {
      setState(() {
        _assemblyWorkflowActionStatus = '缺少 sessionId，无法执行端侧工作流操作';
      });
      return;
    }

    setState(() {
      _assemblyWorkflowActionLoading = true;
      _assemblyWorkflowActionStatus = action == 'upload'
          ? '正在向端侧下发工作流...'
          : '正在停止端侧工作流...';
    });

    _postMessageToHost(<String, dynamic>{
      'type': 'tesseract-assembly-workflow-action',
      'action': action,
      'sessionId': _assemblySessionId,
      'nodeName': _assemblyNodeName,
      'allPendingHardwareNodeNames': _assemblyPendingHardwareNodeNames,
    });
  }

  String? get _currentWorkflowActionSessionId {
    final String assemblySessionId = (_assemblySessionId ?? '').trim();
    if (assemblySessionId.isNotEmpty) {
      return assemblySessionId;
    }
    final String sceneSessionId = (_sceneSessionId ?? '').trim();
    if (sceneSessionId.isNotEmpty) {
      return sceneSessionId;
    }
    return null;
  }

  bool get _shouldShowStandaloneWorkflowActionPanel {
    final bool hasAssemblyPanel =
        _assemblyRequirements != null && _assemblyRequirements!.isNotEmpty;
    final String responseType =
        (_workspaceEnvelope.responseType ?? '').trim().toLowerCase();
    return !hasAssemblyPanel &&
        responseType == 'config_complete' &&
        (_currentWorkflowActionSessionId?.isNotEmpty ?? false);
  }

  void _requestWorkflowAction(String action) {
    final String? sessionId = _currentWorkflowActionSessionId;
    if (sessionId == null || sessionId.isEmpty) {
      setState(() {
        _assemblyWorkflowActionStatus = '缺少 sessionId，无法执行端侧工作流操作';
      });
      return;
    }

    setState(() {
      _assemblyWorkflowActionLoading = true;
      _assemblyWorkflowActionStatus = action == 'upload'
          ? '正在向端侧下发工作流...'
          : '正在停止端侧工作流...';
    });

    _postMessageToHost(<String, dynamic>{
      'type': 'tesseract-digital-twin-workflow-action',
      'action': action,
      'sessionId': sessionId,
    });
  }

  Widget _buildWorkflowActionPanel() {
    final bool isLoading = _assemblyWorkflowActionLoading;
    final String? status = _assemblyWorkflowActionStatus;
    return Container(
      width: 280,
      decoration: BoxDecoration(
        color: const Color(0xFF0D1117),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: const Color(0xFF21262D),
          width: 1,
        ),
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          const Text(
            '端侧工作流',
            style: TextStyle(
              color: Color(0xFFE6EDF3),
              fontSize: 16,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            '当前配置已完成，可直接下发工作流到板端，或停止端侧正在运行的流程。',
            style: TextStyle(
              color: Color(0xFF8B949E),
              fontSize: 13,
              height: 1.5,
            ),
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: isLoading ? null : () => _requestWorkflowAction('upload'),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFBEF264),
                foregroundColor: const Color(0xFF0D1117),
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              icon: isLoading
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.cloud_upload_rounded, size: 18),
              label: const Text('下发工作流到板端'),
            ),
          ),
          const SizedBox(height: 10),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: isLoading ? null : () => _requestWorkflowAction('stop'),
              style: OutlinedButton.styleFrom(
                foregroundColor: const Color(0xFFFF5C8A),
                side: const BorderSide(color: Color(0xFFFF5C8A)),
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              icon: const Icon(Icons.stop_circle_outlined, size: 18),
              label: const Text('停止工作流'),
            ),
          ),
          if ((status ?? '').trim().isNotEmpty) ...<Widget>[
            const SizedBox(height: 12),
            Text(
              status!,
              style: const TextStyle(
                color: Color(0xFF8B949E),
                fontSize: 12,
                height: 1.5,
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildDigitalTwinCanvas() {
    final scene = _workspaceEnvelope.sceneForRendering();
    debugPrint(
      '[DigitalTwin][Embedded] build canvas revision=$_lastInboundRevision models=${scene.models.length} ids=${scene.models.map((DigitalTwinModelItem model) => model.id).join(",")}',
    );
    return ClipRect(
      child: Model3DViewer(
        key: ValueKey<String>(
          'digital-twin-$_lastInboundRevision-${scene.models.map((DigitalTwinModelItem model) => model.id).join("|")}',
        ),
        controller: _digitalTwinConsoleController.viewerController,
        modelUrls: scene.models
            .map((DigitalTwinModelItem model) => model.url)
            .toList(),
        modelIds:
            scene.models.map((DigitalTwinModelItem model) => model.id).toList(),
        layout: 'grid',
        spacing: 2.0,
        initialPositions: scene.models
            .map((DigitalTwinModelItem model) => model.position)
            .toList(),
        initialRotations: scene.models
            .map((DigitalTwinModelItem model) => model.rotation)
            .toList(),
        initialScales: scene.models
            .map((DigitalTwinModelItem model) => model.scale)
            .toList(),
        draggable: false,
        backgroundColor: _viewerBackgroundColor,
        onTransformsChanged: _onModelTransformsChanged,
        onSelectionChanged: _handleModelSelectionChanged,
        onViewerReadyChanged: _handleViewerReady,
      ),
    );
  }

  Widget _buildCanvasStage() {
    final bool showAssemblyPanel =
        _assemblyRequirements != null && _assemblyRequirements!.isNotEmpty;
    final bool showWorkflowActionPanel = _shouldShowStandaloneWorkflowActionPanel;
    final EdgeInsets canvasMargin = EdgeInsets.fromLTRB(
      0,
      16,
      (showAssemblyPanel || showWorkflowActionPanel) ? 0 : 8,
      16,
    );

    final Widget canvas = Container(
      margin: canvasMargin,
      decoration: BoxDecoration(
        color: const Color(0xFF0A0E1A),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: const Color(0xFF00D9FF).withOpacity(0.12),
          width: 1,
        ),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(24),
        child: Stack(
          fit: StackFit.expand,
          children: <Widget>[
            _buildDigitalTwinCanvas(),
            Positioned(
              top: 14,
              left: 14,
              right: 14,
              child: Align(
                alignment: Alignment.topCenter,
                child: DigitalTwinTopControlStrip(
                  controls: _workspaceEnvelope.topControls,
                  onTapped: _handleTopControlTapped,
                ),
              ),
            ),
          ],
        ),
      ),
    );

    if (!showAssemblyPanel && !showWorkflowActionPanel) return canvas;

    final Widget sidePanel = showAssemblyPanel
        ? Container(
            width: 280,
            margin: const EdgeInsets.fromLTRB(0, 16, 8, 16),
            decoration: BoxDecoration(
              color: const Color(0xFF0D1117),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: const Color(0xFF21262D),
                width: 1,
              ),
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: AssemblyChecklistPanel(
                requirements: _assemblyRequirements!,
                detectedComponents: _assemblyDetectedComponents,
                onUploadWorkflowPressed: () =>
                    _requestAssemblyWorkflowAction('upload'),
                onStopWorkflowPressed: () =>
                    _requestAssemblyWorkflowAction('stop'),
                workflowActionLoading: _assemblyWorkflowActionLoading,
                workflowActionStatus: _assemblyWorkflowActionStatus,
              ),
            ),
          )
        : Container(
            width: 280,
            margin: const EdgeInsets.fromLTRB(0, 16, 8, 16),
            child: _buildWorkflowActionPanel(),
          );

    return Row(
      children: <Widget>[
        Expanded(child: canvas),
        sidePanel,
      ],
    );
  }

  Widget _buildWorkspace() {
    return LayoutBuilder(
      builder: (context, constraints) {
        final isCompact = constraints.maxWidth < 1320;
        final previewPane = SizedBox(
          width: isCompact ? constraints.maxWidth : 360,
          child: DigitalTwinPreviewPane(
            previewSessions: _workspaceEnvelope.previewSessions,
            topControls: _workspaceEnvelope.topControls,
            onTopControlTapped: _handleTopControlTapped,
            headerHeight: 56,
          ),
        );
        final assistantPane = SizedBox(
          width: isCompact ? constraints.maxWidth : 460,
          child: AiInteractionWindow(
            initialPrompt: widget.promptText,
            startInDialogueMode: widget.openInDialogueMode,
            onDigitalTwinSceneUpdated: _handleAssistantSceneUpdated,
            onTeachingHandoffRequested: _handleTeachingHandoffRequested,
          ),
        );

        if (isCompact) {
          return Column(
            children: [
              SizedBox(height: 320, child: previewPane),
              const SizedBox(height: 8),
              SizedBox(height: 640, child: _buildCanvasStage()),
              SizedBox(
                height: 640,
                child: assistantPane,
              ),
            ],
          );
        }

        return Row(
          children: <Widget>[
            previewPane,
            Expanded(flex: 3, child: _buildCanvasStage()),
            assistantPane,
          ],
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0A0E1A),
      body: SafeArea(
        child: SizedBox.expand(
          child: ColoredBox(
            color: const Color(0xFF0A0E1A),
            child: widget.showAssistantPanel
                ? _buildWorkspace()
                : LayoutBuilder(
                    builder: (context, constraints) {
                      if (constraints.maxWidth < 1320) {
                        return Column(
                          children: [
                            SizedBox(
                              height: 320,
                              child: DigitalTwinPreviewPane(
                                previewSessions:
                                    _workspaceEnvelope.previewSessions,
                                topControls: _workspaceEnvelope.topControls,
                                onTopControlTapped: _handleTopControlTapped,
                                headerHeight: 56,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Expanded(child: _buildCanvasStage()),
                          ],
                        );
                      }
                      return Row(
                        children: [
                          SizedBox(
                            width: 360,
                            child: DigitalTwinPreviewPane(
                              previewSessions:
                                  _workspaceEnvelope.previewSessions,
                              topControls: _workspaceEnvelope.topControls,
                              onTopControlTapped: _handleTopControlTapped,
                              headerHeight: 56,
                            ),
                          ),
                          Expanded(child: _buildCanvasStage()),
                        ],
                      );
                    },
                  ),
          ),
        ),
      ),
    );
  }
}
