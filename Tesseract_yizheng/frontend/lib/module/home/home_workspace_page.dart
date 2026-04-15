/*
 * [INPUT]: 依赖数字孪生配置资产、DigitalTwinConsoleController、DigitalTwinSceneEnvelope、AiInteractionWindow、model_3d_viewer.dart 提供的场景/preview runtime state 和 iframe ready-handshake/JSON-safe postMessage 协议，以及 assembly_checklist_panel.dart 提供的组装清单面板组件与数据模型。
 * [OUTPUT]: 对外提供 HomeWorkspacePage，根据入口选择"纯数字孪生嵌入模式"或"顶部浏览器式 tabs 的数字孪生 + Workflow 工作台模式"，并默认把常规工作台落到 Digital Twin 主视图；嵌入模式中继续归一化跨运行时消息后消费/重放 scene envelope、preview sessions、top controls 与 assembly checklist，同时把 consumed revision、模型选择、顶部控制事件与组装工作流动作回传给父窗口，并把工作台压成单层矩形 tabs + 带单层 wireframe grid backdrop 的内容区；配件 preview 不再占用独立工作区，而是作为画布内 overlay 叠加在数字孪生 stage 上，同时通过 PointerInterceptor 保证 overlay/top-control 在 HtmlElementView viewer 之上仍可点击，并让 Digital Twin 与 Workflow 共用同一套页面基底配色与宿主 theme token。
 * [POS]: module/home 的工作台总装页，负责保住嵌入入口的单画布形态，同时把数字孪生页与 Workflow 页组织成同级主视图，也是 embedded twin 向 Electron 回报用户交互的唯一出口与 Flutter 工作台 shell/grid 语言收口点。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

// ignore_for_file: avoid_web_libraries_in_flutter, deprecated_member_use

import 'dart:async';
import 'dart:convert';
import 'dart:html' as html show MessageEvent, window;
import 'dart:math' as math;

import 'package:aitesseract/module/device/model/device_event_model.dart';
import 'package:aitesseract/module/device/model/digital_twin_scene_envelope.dart';
import 'package:aitesseract/module/home/controller/digital_twin_console_controller.dart';
import 'package:aitesseract/module/home/widget/ai_interaction_window.dart';
import 'package:aitesseract/module/home/widget/model_3d_viewer.dart';
import 'package:aitesseract/module/home/widget/assembly_checklist_panel.dart';
import 'package:aitesseract/module/home/widget/digital_twin_preview_pane.dart';
import 'package:aitesseract/utils/spatial_design_ref.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart' show rootBundle;
import 'package:pointer_interceptor/pointer_interceptor.dart';

class HomeWorkspacePage extends StatefulWidget {
  final String? promptText;
  final bool showAssistantPanel;
  final bool openInDialogueMode;
  final HomeWorkspaceInitialSurface initialSurface;

  const HomeWorkspacePage({
    super.key,
    this.promptText,
    this.showAssistantPanel = false,
    this.openInDialogueMode = false,
    this.initialSurface = HomeWorkspaceInitialSurface.digitalTwin,
  });

  @override
  State<HomeWorkspacePage> createState() => _HomeWorkspacePageState();
}

enum HomeWorkspaceInitialSurface { digitalTwin, workflow }

enum _WorkspaceSurface { digitalTwin, workflow }

class _AssemblySceneModelPreset {
  final String kind;
  final String url;
  final List<double> scale;
  final List<double> mountPositionOffset;
  final List<double> mountRotationOffset;

  const _AssemblySceneModelPreset({
    required this.kind,
    required this.url,
    required this.scale,
    required this.mountPositionOffset,
    required this.mountRotationOffset,
  });
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
  static const String _kAssemblyOverlayModelPrefix = 'assembly-detected-';
  static const Map<String, _AssemblySceneModelPreset>
      _kAssemblySceneModelPresets = <String, _AssemblySceneModelPreset>{
    'camera': _AssemblySceneModelPreset(
      kind: 'camera',
      url: '/assets/assets/models/cam.glb',
      scale: <double>[2.16, 2.16, 2.16],
      mountPositionOffset: <double>[0, -0.6, -0.05],
      mountRotationOffset: <double>[0, 0, 0],
    ),
    'hand': _AssemblySceneModelPreset(
      kind: 'hand',
      url: '/assets/assets/models/hand.glb',
      scale: <double>[2.16, 2.16, 2.16],
      mountPositionOffset: <double>[0, -1, 0],
      mountRotationOffset: <double>[85, 0, 0],
    ),
    'wheel': _AssemblySceneModelPreset(
      kind: 'wheel',
      url: '/assets/assets/models/car.glb',
      scale: <double>[3, 3, 3],
      mountPositionOffset: <double>[0, -1.23, -0.52],
      mountRotationOffset: <double>[90, 0, 0],
    ),
    'screen': _AssemblySceneModelPreset(
      kind: 'screen',
      url: '/assets/assets/models/screen.glb',
      scale: <double>[2.16, 2.16, 2.16],
      mountPositionOffset: <double>[0, 0, 0],
      mountRotationOffset: <double>[0, 0, 90],
    ),
  };

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
  List<DetectedHardwareComponent> _assemblyDetectedComponents =
      <DetectedHardwareComponent>[];
  String? _assemblySessionId;
  String? _assemblyNodeName;
  String? _sceneSessionId;
  bool _assemblyWorkflowActionLoading = false;
  String? _assemblyWorkflowActionStatus;
  // 017: 待自动确认的剩余硬件节点名称列表
  List<String> _assemblyPendingHardwareNodeNames = <String>[];
  int _lastInboundRevision = 0;
  String? _lastAppliedSceneSignature;
  String? _lastWorkflowUrl;
  DigitalTwinSceneConfig? _interfaceDefaults;
  Map<String, DigitalTwinMountCompensationOverride>
      _mountCompensationOverrides =
      const <String, DigitalTwinMountCompensationOverride>{};
  late _WorkspaceSurface _activeSurface;

  @override
  void initState() {
    super.initState();
    _activeSurface = !widget.showAssistantPanel
        ? _WorkspaceSurface.digitalTwin
        : (widget.initialSurface == HomeWorkspaceInitialSurface.workflow
            ? _WorkspaceSurface.workflow
            : _WorkspaceSurface.digitalTwin);
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
    final sceneWithAssemblyOverlay =
        _mergeAssemblyDetectedModelsIntoScene(normalizedScene);
    final nextEnvelope = envelope.copyWith(
      scene: sceneWithAssemblyOverlay,
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

  bool get _showTabbedWorkspace => widget.showAssistantPanel;

  bool get _isDigitalTwinSurfaceActive =>
      _activeSurface == _WorkspaceSurface.digitalTwin;

  bool get _isWorkflowSurfaceActive =>
      _activeSurface == _WorkspaceSurface.workflow;

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

  SpatialThemeData get _spatial => context.spatial;

  Color _toneColor(SpatialStatusTone tone) => _spatial.status(tone);

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
    if (payloadSessionId != null && payloadSessionId.isNotEmpty) {
      _sceneSessionId = payloadSessionId;
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
    if (_lastAppliedSceneSignature != null &&
        _lastAppliedSceneSignature == nextSignature) {
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
      'modelIds': scene?.models
              .map((DigitalTwinModelItem model) => model.id)
              .toList() ??
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

  void _handleWorkflowUrlUpdated(String workflowUrl) {
    final normalized = workflowUrl.trim();
    if (_lastWorkflowUrl == normalized) return;
    setState(() {
      _lastWorkflowUrl = normalized.isEmpty ? null : normalized;
    });
  }

  void _setActiveSurface(_WorkspaceSurface surface) {
    if (!_showTabbedWorkspace || _activeSurface == surface) {
      return;
    }
    setState(() {
      _activeSurface = surface;
    });
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
          initialSurface: HomeWorkspaceInitialSurface.workflow,
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
      _assemblyRequirements =
          (payload['components'] as List<dynamic>?)?.map((dynamic c) {
                final Map<String, dynamic> m = c as Map<String, dynamic>;
                return AssemblyRequirement(
                  componentId: m['componentId'] as String? ?? '',
                  displayName: m['displayName'] as String? ?? '',
                );
              }).toList() ??
              <AssemblyRequirement>[];
      _assemblyDetectedComponents = <DetectedHardwareComponent>[];
      // 017: 存储待自动确认的硬件节点名称列表
      _assemblyPendingHardwareNodeNames =
          (payload['allPendingHardwareNodeNames'] as List<dynamic>?)
                  ?.whereType<String>()
                  .toList() ??
              <String>[];
      _assemblyWorkflowActionLoading = false;
      _assemblyWorkflowActionStatus = null;
    });
  }

  void _handleAssemblyHardwareState(Map<String, dynamic>? payload) {
    if (payload == null) return;
    final detectedComponents =
        (payload['components'] as List<dynamic>?)?.map((dynamic c) {
              final Map<String, dynamic> m = c as Map<String, dynamic>;
              return DetectedHardwareComponent(
                componentId: m['componentId'] as String? ?? '',
                deviceId: m['deviceId'] as String? ?? '',
                displayName: m['displayName'] as String? ?? '',
                status: m['status'] as String? ?? 'connected',
                portId:
                    m['portId'] as String? ?? m['port_id'] as String? ?? '',
                modelId:
                    m['modelId'] as String? ?? m['model_id'] as String? ?? '',
              );
            }).toList() ??
            <DetectedHardwareComponent>[];
    setState(() {
      _assemblyDetectedComponents = detectedComponents;
    });
    _applyWorkspaceEnvelope(_workspaceEnvelope);
  }

  DigitalTwinSceneConfig _mergeAssemblyDetectedModelsIntoScene(
    DigitalTwinSceneConfig scene,
  ) {
    if (_assemblyRequirements == null || _assemblyRequirements!.isEmpty) {
      return _stripAssemblyOverlayModels(scene);
    }

    final List<DigitalTwinModelItem> preservedModels = scene.models
        .where(
          (DigitalTwinModelItem model) =>
              !model.id.startsWith(_kAssemblyOverlayModelPrefix),
        )
        .toList();
    final Set<String> occupiedPorts = preservedModels
        .where((DigitalTwinModelItem model) => model.id != scene.baseModelId)
        .map((DigitalTwinModelItem model) => model.interfaceId ?? '')
        .where((String interfaceId) => interfaceId.isNotEmpty)
        .toSet();
    final List<DigitalTwinModelItem> overlayModels = <DigitalTwinModelItem>[];

    for (final DetectedHardwareComponent component in _assemblyDetectedComponents) {
      if (!_isAssemblyRenderableComponent(component)) {
        continue;
      }
      if (occupiedPorts.contains(component.portId)) {
        continue;
      }
      final _AssemblySceneModelPreset? preset =
          _resolveAssemblySceneModelPreset(component.componentId);
      if (preset == null) {
        continue;
      }
      overlayModels.add(
        DigitalTwinModelItem(
          id:
              '$_kAssemblyOverlayModelPrefix${preset.kind}-${component.deviceId}',
          url: preset.url,
          interfaceId: component.portId,
          position: const <double>[0, 0, 0],
          rotation: const <double>[0, 0, 0],
          scale: preset.scale,
          mountPositionOffset: preset.mountPositionOffset,
          mountRotationOffset: preset.mountRotationOffset,
          deviceId: component.deviceId,
        ),
      );
    }

    if (overlayModels.isEmpty &&
        preservedModels.length == scene.models.length) {
      return scene;
    }

    return scene.copyWith(
      models: <DigitalTwinModelItem>[
        ...preservedModels,
        ...overlayModels,
      ],
    );
  }

  DigitalTwinSceneConfig _stripAssemblyOverlayModels(DigitalTwinSceneConfig scene) {
    final List<DigitalTwinModelItem> preservedModels = scene.models
        .where(
          (DigitalTwinModelItem model) =>
              !model.id.startsWith(_kAssemblyOverlayModelPrefix),
        )
        .toList();
    if (preservedModels.length == scene.models.length) {
      return scene;
    }
    return scene.copyWith(models: preservedModels);
  }

  bool _isAssemblyRenderableComponent(DetectedHardwareComponent component) {
    final String kind = _normalizeAssemblyComponentKind(component.componentId);
    return component.status != 'removed' &&
        _matchesAssemblyRequirement(component) &&
        component.portId.isNotEmpty &&
        _kAssemblySceneModelPresets.containsKey(kind);
  }

  bool _matchesAssemblyRequirement(DetectedHardwareComponent component) {
    final List<AssemblyRequirement> requirements =
        _assemblyRequirements ?? const <AssemblyRequirement>[];
    if (requirements.isEmpty) {
      return false;
    }
    final String componentKind =
        _normalizeAssemblyComponentKind(component.componentId);
    return requirements.any((AssemblyRequirement requirement) {
      return _normalizeAssemblyComponentKind(requirement.componentId) ==
          componentKind;
    });
  }

  _AssemblySceneModelPreset? _resolveAssemblySceneModelPreset(String componentId) {
    final String kind = _normalizeAssemblyComponentKind(componentId);
    return _kAssemblySceneModelPresets[kind];
  }

  String _normalizeAssemblyComponentKind(String raw) {
    final String normalized = raw.trim().toLowerCase();
    if (normalized.isEmpty) {
      return normalized;
    }
    final String compact = normalized.replaceAll(RegExp(r'[\s._-]+'), '');
    if (compact.contains('cam') || compact.contains('camera')) {
      return 'camera';
    }
    if (compact.contains('hand') || compact.contains('mechanicalhand')) {
      return 'hand';
    }
    if (compact.contains('wheel') ||
        compact.contains('chassis') ||
        compact.contains('car')) {
      return 'wheel';
    }
    if (compact.contains('screen') ||
        compact.contains('display') ||
        compact.contains('hdmi')) {
      return 'screen';
    }
    return compact;
  }

  void _handleAssemblyWorkflowStatus(Map<String, dynamic> payload) {
    setState(() {
      _assemblyWorkflowActionLoading = false;
      _assemblyWorkflowActionStatus =
          payload['message']?.toString() ?? '端侧操作已完成';
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
      _assemblyWorkflowActionStatus =
          action == 'upload' ? '正在向端侧下发工作流...' : '正在停止端侧工作流...';
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
      _assemblyWorkflowActionStatus =
          action == 'upload' ? '正在向端侧下发工作流...' : '正在停止端侧工作流...';
    });

    _postMessageToHost(<String, dynamic>{
      'type': 'tesseract-digital-twin-workflow-action',
      'action': action,
      'sessionId': sessionId,
    });
  }

  Widget _buildWorkflowActionPanel() {
    final spatial = context.spatial;
    final Color accent = spatial.status(SpatialStatusTone.success);
    return DecoratedBox(
      decoration: spatial.panelDecoration(
        tone: SpatialSurfaceTone.panel,
        accent: accent,
        radius: spatial.radiusMd,
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Text(
              '端侧工作流',
              style: spatial.sectionTextStyle().copyWith(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                  ),
            ),
            const SizedBox(height: 8),
            Text(
              '当前配置已完成，可直接下发工作流到板端，或停止端侧正在运行的流程。',
              style: spatial.captionTextStyle(),
            ),
            const SizedBox(height: 14),
            FilledButton.icon(
              onPressed: _assemblyWorkflowActionLoading
                  ? null
                  : () => _requestWorkflowAction('upload'),
              icon: _assemblyWorkflowActionLoading
                  ? SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: spatial.palette.textInverse,
                      ),
                    )
                  : const Icon(Icons.cloud_upload_rounded, size: 18),
              label: const Text('下发工作流到板端'),
              style: spatial.primaryButtonStyle(accent: accent),
            ),
            const SizedBox(height: 10),
            OutlinedButton.icon(
              onPressed: _assemblyWorkflowActionLoading
                  ? null
                  : () => _requestWorkflowAction('stop'),
              icon: const Icon(Icons.stop_circle_outlined, size: 18),
              label: const Text('停止工作流'),
              style: spatial.dangerButtonStyle(),
            ),
            if ((_assemblyWorkflowActionStatus ?? '').trim().isNotEmpty) ...<Widget>[
              const SizedBox(height: 12),
              Text(
                _assemblyWorkflowActionStatus!,
                style: spatial.captionTextStyle(),
              ),
            ],
          ],
        ),
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

  Widget _buildCanvasStage({required bool isCompact}) {
    final bool showAssemblyPanel =
        _assemblyRequirements != null && _assemblyRequirements!.isNotEmpty;
    final bool showWorkflowActionPanel = _shouldShowStandaloneWorkflowActionPanel;

    final Widget canvas = ClipRect(
      child: LayoutBuilder(
        builder: (BuildContext context, BoxConstraints constraints) {
          final bool hasTopControls = _workspaceEnvelope.topControls.isNotEmpty;
          final bool hasPreviewSessions =
              _workspaceEnvelope.previewSessions.isNotEmpty;
          final double previewOverlayTop =
              hasTopControls ? (isCompact ? 68.0 : 72.0) : 12.0;
          final double previewOverlayWidth = _resolvePreviewOverlayWidth(
            maxWidth: constraints.maxWidth,
            isCompact: isCompact,
          );

          return Stack(
            fit: StackFit.expand,
            children: <Widget>[
              _buildDigitalTwinCanvas(),
              if (hasTopControls)
                Positioned(
                  top: 12,
                  left: 12,
                  right: 12,
                  child: PointerInterceptor(
                    child: DigitalTwinTopControlStrip(
                      controls: _workspaceEnvelope.topControls,
                      onTapped: _handleTopControlTapped,
                    ),
                  ),
                ),
              if (hasPreviewSessions)
                Positioned(
                  top: previewOverlayTop,
                  left: 12,
                  width: previewOverlayWidth,
                  child: PointerInterceptor(
                    child: ConstrainedBox(
                      constraints: BoxConstraints(
                        maxHeight: math.max(
                          160.0,
                          constraints.maxHeight - previewOverlayTop - 12.0,
                        ),
                      ),
                      child: _buildPreviewPane(
                        padding: EdgeInsets.zero,
                      ),
                    ),
                  ),
                ),
            ],
          );
        },
      ),
    );

    if (!showAssemblyPanel && !showWorkflowActionPanel) return canvas;

    final Widget sidePanel = showAssemblyPanel
        ? SizedBox(
      width: isCompact ? double.infinity : 280,
      child: AssemblyChecklistPanel(
        requirements: _assemblyRequirements!,
        detectedComponents: _assemblyDetectedComponents,
        onUploadWorkflowPressed: () => _requestAssemblyWorkflowAction('upload'),
        onStopWorkflowPressed: () => _requestAssemblyWorkflowAction('stop'),
        workflowActionLoading: _assemblyWorkflowActionLoading,
        workflowActionStatus: _assemblyWorkflowActionStatus,
      ),
    )
        : SizedBox(
            width: isCompact ? double.infinity : 280,
            child: _buildWorkflowActionPanel(),
          );

    if (isCompact) {
      return Column(
        children: <Widget>[
          Expanded(flex: 3, child: canvas),
          const SizedBox(height: 12),
          Expanded(flex: 2, child: sidePanel),
        ],
      );
    }

    return Row(
      children: <Widget>[
        Expanded(child: canvas),
        const SizedBox(width: 12),
        sidePanel,
      ],
    );
  }

  double _resolvePreviewOverlayWidth({
    required double maxWidth,
    required bool isCompact,
  }) {
    final double availableWidth = math.max(
      188.0,
      maxWidth - (isCompact ? 24.0 : 28.0),
    );
    if (isCompact) {
      return math.min(availableWidth, 320.0);
    }
    final double preferredWidth = math.min(maxWidth * 0.34, 332.0);
    return math.min(availableWidth, math.max(248.0, preferredWidth));
  }

  Widget _buildPreviewPane({
    EdgeInsetsGeometry padding = const EdgeInsets.symmetric(vertical: 12),
  }) {
    return DigitalTwinPreviewPane(
      previewSessions: _workspaceEnvelope.previewSessions,
      padding: padding,
    );
  }

  Widget _buildAssistantPane() {
    return AiInteractionWindow(
      initialPrompt: widget.promptText,
      startInDialogueMode: widget.openInDialogueMode,
      onWorkflowUrlUpdated: _handleWorkflowUrlUpdated,
      onDigitalTwinSceneUpdated: _handleAssistantSceneUpdated,
      onTeachingHandoffRequested: _handleTeachingHandoffRequested,
      isThreeColumnLayout: false,
    );
  }

  Widget _buildDigitalTwinWorkbench({required bool isCompact}) {
    return _buildCanvasStage(isCompact: isCompact);
  }

  Widget _buildDigitalTwinSurface(bool isCompact) {
    return Padding(
      padding: EdgeInsets.fromLTRB(
        isCompact ? 12 : 16,
        0,
        isCompact ? 12 : 16,
        12,
      ),
      child: _buildDigitalTwinWorkbench(isCompact: isCompact),
    );
  }

  Widget _buildWorkflowSurface(bool isCompact) {
    return Padding(
      padding: EdgeInsets.fromLTRB(
        isCompact ? 12 : 16,
        0,
        isCompact ? 12 : 16,
        12,
      ),
      child: _buildAssistantPane(),
    );
  }

  Widget _buildWorkbenchBackdrop({
    required Widget child,
    required SpatialStatusTone tone,
  }) {
    final spatial = _spatial;
    return ClipRect(
      child: Stack(
        fit: StackFit.expand,
        children: <Widget>[
          Positioned.fill(
            child: IgnorePointer(
              child: CustomPaint(
                painter: _WorkbenchGridPainter(
                  baseColor: spatial.palette.bgBase,
                  minorGridColor:
                      spatial.palette.textPrimary.withValues(alpha: 0.035),
                  majorGridColor: spatial.borderSubtle.withValues(alpha: 0.22),
                  accentColor: _toneColor(tone).withValues(alpha: 0.08),
                ),
              ),
            ),
          ),
          child,
        ],
      ),
    );
  }

  Widget _buildWorkspaceTab({
    required bool active,
    required String title,
    required IconData icon,
    required SpatialStatusTone tone,
    required VoidCallback onTap,
  }) {
    final spatial = _spatial;
    final accent = _toneColor(tone);
    return AnimatedContainer(
      duration: spatial.motionFast,
      curve: Curves.easeOutCubic,
      margin: const EdgeInsets.only(right: 10),
      decoration: BoxDecoration(
        color: active
            ? accent.withValues(alpha: 0.12)
            : spatial.surface(SpatialSurfaceTone.muted),
        borderRadius: BorderRadius.circular(spatial.radiusMd),
        border: Border.all(
          color: active ? accent.withValues(alpha: 0.34) : spatial.borderSubtle,
        ),
      ),
      child: Material(
        type: MaterialType.transparency,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(spatial.radiusMd),
          child: Padding(
            padding: EdgeInsets.symmetric(
              horizontal: spatial.space3,
              vertical: spatial.space2,
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: <Widget>[
                Icon(
                  icon,
                  size: 16,
                  color: active ? accent : spatial.textMuted,
                ),
                SizedBox(width: spatial.space2),
                Text(
                  title,
                  style: spatial.bodyTextStyle().copyWith(
                        fontWeight: FontWeight.w700,
                        color: active
                            ? spatial.palette.textPrimary
                            : spatial.palette.textPrimary
                                .withValues(alpha: 0.82),
                      ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildWorkspaceChrome({required bool isCompact}) {
    return Padding(
      padding: EdgeInsets.fromLTRB(
        isCompact ? 12 : 16,
        12,
        isCompact ? 12 : 16,
        0,
      ),
      child: Align(
        alignment: Alignment.centerLeft,
        child: SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: <Widget>[
              _buildWorkspaceTab(
                active: _isDigitalTwinSurfaceActive,
                title: 'Digital Twin',
                icon: Icons.hub_rounded,
                tone: SpatialStatusTone.success,
                onTap: () => _setActiveSurface(_WorkspaceSurface.digitalTwin),
              ),
              _buildWorkspaceTab(
                active: _isWorkflowSurfaceActive,
                title: 'Workflow',
                icon: Icons.account_tree_rounded,
                tone: SpatialStatusTone.warning,
                onTap: () => _setActiveSurface(_WorkspaceSurface.workflow),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTabbedWorkspace() {
    return LayoutBuilder(
      builder: (BuildContext context, BoxConstraints constraints) {
        final bool isCompact = constraints.maxWidth < 1200;
        return Column(
          children: <Widget>[
            _buildWorkspaceChrome(isCompact: isCompact),
            const SizedBox(height: 8),
            Expanded(
              child: _buildWorkbenchBackdrop(
                tone: SpatialStatusTone.warning,
                child: IndexedStack(
                  index:
                      _activeSurface == _WorkspaceSurface.digitalTwin ? 0 : 1,
                  children: <Widget>[
                    _buildDigitalTwinSurface(isCompact),
                    _buildWorkflowSurface(isCompact),
                  ],
                ),
              ),
            ),
          ],
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: widget.showAssistantPanel
          ? _spatial.palette.bgBase
          : _spatial.surfacePanel,
      body: SafeArea(
        child: widget.showAssistantPanel
            ? _buildTabbedWorkspace()
            : LayoutBuilder(
                builder: (context, constraints) {
                  return Padding(
                    padding: const EdgeInsets.all(12),
                    child: _buildDigitalTwinWorkbench(
                      isCompact: constraints.maxWidth < 1320,
                    ),
                  );
                },
              ),
      ),
    );
  }
}

final class _WorkbenchGridPainter extends CustomPainter {
  const _WorkbenchGridPainter({
    required this.baseColor,
    required this.minorGridColor,
    required this.majorGridColor,
    required this.accentColor,
  });

  final Color baseColor;
  final Color minorGridColor;
  final Color majorGridColor;
  final Color accentColor;

  static const double _spacing = 32;

  @override
  void paint(Canvas canvas, Size size) {
    canvas.drawRect(
      Offset.zero & size,
      Paint()..color = baseColor,
    );

    final Paint minorPaint = Paint()
      ..color = minorGridColor
      ..strokeWidth = 1;
    final Paint majorPaint = Paint()
      ..color = majorGridColor
      ..strokeWidth = 1;
    final Paint accentPaint = Paint()
      ..shader = LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: <Color>[
          accentColor,
          accentColor.withValues(alpha: 0),
        ],
      ).createShader(Rect.fromLTWH(0, 0, size.width, 140));

    canvas.drawRect(
      Rect.fromLTWH(0, 0, size.width, 140),
      accentPaint,
    );

    int index = 0;
    for (double x = 0; x <= size.width; x += _spacing, index += 1) {
      canvas.drawLine(
        Offset(x, 0),
        Offset(x, size.height),
        index % 4 == 0 ? majorPaint : minorPaint,
      );
    }

    index = 0;
    for (double y = 0; y <= size.height; y += _spacing, index += 1) {
      canvas.drawLine(
        Offset(0, y),
        Offset(size.width, y),
        index % 4 == 0 ? majorPaint : minorPaint,
      );
    }
  }

  @override
  bool shouldRepaint(covariant _WorkbenchGridPainter oldDelegate) {
    return oldDelegate.baseColor != baseColor ||
        oldDelegate.minorGridColor != minorGridColor ||
        oldDelegate.majorGridColor != majorGridColor ||
        oldDelegate.accentColor != accentColor;
  }
}
