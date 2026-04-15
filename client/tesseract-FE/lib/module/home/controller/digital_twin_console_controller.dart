/*
 * [INPUT]: 依赖数字孪生场景模型、纯挂载解算器、交互模式枚举与 Model3DViewerController 协议桥。
 * [OUTPUT]: 对外提供 DigitalTwinConsoleController，统一维护场景、灯光、选中项、组件缩放、组件安装锚点、接口-组件残差与 viewer 同步逻辑，并把场景位姿收敛为预览窗口全局坐标系的绝对值。
 * [POS]: module/home/controller 的数字孪生中控状态机，被 HomeWorkspacePage 消费以摆脱页面内联状态泥团。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import 'dart:math' as math;
import 'dart:convert';

import 'package:aitesseract/module/device/model/device_event_model.dart';
import 'package:aitesseract/module/device/model/digital_twin_mount_resolver.dart';
import 'package:aitesseract/module/home/widget/model_3d_viewer.dart';
import 'package:flutter/material.dart';

class DigitalTwinConsoleController extends ChangeNotifier {
  static const double _kProportionalScaleMin = 0.2;
  static const double _kProportionalScaleMax = 3.0;

  DigitalTwinSceneConfig _defaultScene;
  final Model3DViewerController viewerController;

  DigitalTwinSceneConfig _layoutScene;
  DigitalTwinSceneConfig _scene;
  DigitalTwinSceneConfig _viewerBootstrapLayoutScene;
  DigitalTwinSceneConfig _viewerBootstrapScene;
  DigitalTwinPortComponentOverrideTable _portComponentOverrides;
  DigitalTwinPortComponentOverrideTable _bootstrapPortComponentOverrides;
  Model3DLightingConfig _lightingConfig;
  String? _selectedModelId;
  String? _proportionalScaleAnchorModelId;
  List<double> _proportionalScaleAnchor;
  double _proportionalScaleFactor;
  DigitalTwinInteractionMode _interactionMode;
  bool _viewerReady;
  bool _isUsingDefaultScene;

  DigitalTwinConsoleController({
    required DigitalTwinSceneConfig defaultScene,
    Model3DViewerController? viewerController,
    Model3DLightingConfig initialLighting = const Model3DLightingConfig(),
  })  : _defaultScene = defaultScene,
        viewerController = viewerController ?? Model3DViewerController(),
        _layoutScene = defaultScene,
        _scene = const DigitalTwinSceneConfig(
          displayMode: 'multi_scene',
          models: <DigitalTwinModelItem>[],
        ),
        _viewerBootstrapLayoutScene = defaultScene,
        _viewerBootstrapScene = const DigitalTwinSceneConfig(
          displayMode: 'multi_scene',
          models: <DigitalTwinModelItem>[],
        ),
        _portComponentOverrides = const DigitalTwinPortComponentOverrideTable(),
        _bootstrapPortComponentOverrides =
            const DigitalTwinPortComponentOverrideTable(),
        _lightingConfig = initialLighting,
        _selectedModelId = defaultScene.models.isNotEmpty
            ? defaultScene.models.first.id
            : null,
        _proportionalScaleAnchor = const <double>[1, 1, 1],
        _proportionalScaleFactor = 1.0,
        _interactionMode = DigitalTwinInteractionMode.translate,
        _viewerReady = false,
        _isUsingDefaultScene = true {
    _scene = _resolveScene(_layoutScene);
    _viewerBootstrapScene = _scene;
    _captureSelectedScaleAnchor();
  }

  DigitalTwinSceneConfig get layoutScene => _layoutScene;
  DigitalTwinSceneConfig get scene => _scene;
  DigitalTwinSceneConfig get viewerBootstrapScene => _viewerBootstrapScene;
  Model3DLightingConfig get lightingConfig => _lightingConfig;
  String? get selectedModelId => _selectedModelId;
  DigitalTwinInteractionMode get interactionMode => _interactionMode;
  bool get viewerReady => _viewerReady;
  bool get isUsingDefaultScene => _isUsingDefaultScene;
  String? get baseModelId => _layoutScene.baseModelId;
  List<DigitalTwinInterfacePreset> get interfacePresets =>
      _layoutScene.interfaces;
  double get proportionalScaleMin => _kProportionalScaleMin;
  double get proportionalScaleMax => _kProportionalScaleMax;
  double get selectedProportionalScaleFactor => _proportionalScaleFactor;
  String get mountProfilesExportJson =>
      const JsonEncoder.withIndent('  ').convert(
        _layoutScene.exportMountProfilesMap(),
      );
  String get portComponentOverridesExportJson =>
      const JsonEncoder.withIndent('  ').convert(
        _portComponentOverrides.toConfigMap(),
      );

  DigitalTwinModelItem? get selectedSceneModel {
    final selected = _scene.findModelById(_selectedModelId);
    if (selected != null) return selected;
    if (_scene.models.isEmpty) return null;
    return _scene.models.first;
  }

  DigitalTwinModelItem? get selectedLayoutModel {
    final selected = _layoutScene.findModelById(_selectedModelId);
    if (selected != null) return selected;
    if (_layoutScene.models.isEmpty) return null;
    return _layoutScene.models.first;
  }

  bool get selectedSceneModelIsBase {
    final selected = selectedSceneModel;
    return selected != null && selected.id == baseModelId;
  }

  bool get selectedSceneModelUsesInterface {
    final selected = selectedLayoutModel;
    return selected != null &&
        !selectedSceneModelIsBase &&
        (selected.interfaceId?.isNotEmpty ?? false);
  }

  String? get selectedSceneModelInterfaceId {
    final interfaceId = selectedLayoutModel?.interfaceId;
    if (interfaceId == null || interfaceId.isEmpty) return null;
    return interfaceId;
  }

  DigitalTwinInterfacePreset? get selectedInterfacePreset =>
      _layoutScene.findInterfaceById(selectedSceneModelInterfaceId);

  DigitalTwinPortComponentOverride get selectedPortComponentResidual {
    final selected = selectedLayoutModel;
    if (selected == null || selectedSceneModelIsBase) {
      return const DigitalTwinPortComponentOverride();
    }
    return _portComponentOverrides.lookup(selected.interfaceId, selected.id);
  }

  List<double>? get selectedInterfaceRotatedMountProfileOffset {
    final preset = selectedInterfacePreset;
    final model = selectedLayoutModel;
    if (preset == null || model == null || selectedSceneModelIsBase) {
      return null;
    }
    return DigitalTwinMountResolver.rotateVector(
      model.mountPositionOffset,
      preset.rotation,
    );
  }

  List<double>? get selectedInterfaceRotatedPortResidualOffset {
    final preset = selectedInterfacePreset;
    final model = selectedLayoutModel;
    if (preset == null || model == null || selectedSceneModelIsBase) {
      return null;
    }
    return DigitalTwinMountResolver.rotateVector(
      selectedPortComponentResidual.position,
      preset.rotation,
    );
  }

  List<double>? get selectedCombinedMountOffset {
    final model = selectedLayoutModel;
    if (model == null || selectedSceneModelIsBase) {
      return null;
    }
    return DigitalTwinMountResolver.composeMountOffset(
      mountProfilePosition: model.mountPositionOffset,
      portResidualPosition: selectedPortComponentResidual.position,
    );
  }

  List<double>? get selectedInterfaceResolvedLocalPosition {
    final preset = selectedInterfacePreset;
    final model = selectedLayoutModel;
    if (preset == null || model == null || selectedSceneModelIsBase) {
      return null;
    }
    return DigitalTwinMountResolver.composeLocalPosition(
      anchorPosition: preset.position,
      anchorRotation: preset.rotation,
      mountProfilePosition: model.mountPositionOffset,
      portResidualPosition: selectedPortComponentResidual.position,
    );
  }

  Color get viewerBackgroundColor =>
      parseHexColor(_lightingConfig.backgroundHex);

  String normalizeHexColor(String value, {String fallback = '#0A0E1A'}) {
    final normalized = value.trim().replaceFirst('#', '').toUpperCase();
    if (!RegExp(r'^[0-9A-F]{6}$').hasMatch(normalized)) {
      return fallback;
    }
    return '#$normalized';
  }

  Color parseHexColor(String value) {
    final normalized = normalizeHexColor(value);
    final raw = normalized.replaceFirst('#', '');
    return Color(int.parse('FF$raw', radix: 16));
  }

  String interfaceLabel(String? interfaceId) {
    if (interfaceId == null || interfaceId.isEmpty) return '自由摆放';
    final preset = _layoutScene.findInterfaceById(interfaceId);
    if (preset == null) return interfaceId;
    return preset.label.isNotEmpty ? preset.label : preset.id;
  }

  String? interfaceOccupantModelId(String interfaceId) {
    for (final model in _layoutScene.models) {
      if (model.id != _selectedModelId && model.interfaceId == interfaceId) {
        return model.id;
      }
    }
    return null;
  }

  List<Model3DTransform> _buildViewerTransforms([
    DigitalTwinSceneConfig? scene,
  ]) {
    final source = scene ?? _scene;
    return List<Model3DTransform>.generate(source.models.length, (int index) {
      final model = source.models[index];
      return Model3DTransform(
        index: index,
        modelId: model.id,
        posX: model.position[0],
        posY: model.position[1],
        posZ: model.position[2],
        rotX: model.rotation[0],
        rotY: model.rotation[1],
        rotZ: model.rotation[2],
        scaleX: model.scale[0],
        scaleY: model.scale[1],
        scaleZ: model.scale[2],
      );
    });
  }

  Model3DInteractionMode _toViewerMode(DigitalTwinInteractionMode mode) {
    switch (mode) {
      case DigitalTwinInteractionMode.rotate:
        return Model3DInteractionMode.rotate;
      case DigitalTwinInteractionMode.translate:
        return Model3DInteractionMode.translate;
    }
  }

  void syncViewerSceneState({bool requestSnapshot = false}) {
    debugPrint(
      '[DigitalTwin][Controller] syncViewerSceneState models=${_scene.models.length} selected=${_selectedModelId ?? "none"} requestSnapshot=$requestSnapshot',
    );
    viewerController.setLightingConfig(_lightingConfig);
    viewerController.updateTransforms(_buildViewerTransforms());
    viewerController.setSelectedModel(_selectedModelId);
    viewerController.setInteractionMode(_toViewerMode(_interactionMode));
    if (requestSnapshot) {
      viewerController.requestSnapshot();
    }
  }

  void applyDigitalTwinScene(DigitalTwinSceneConfig? scene) {
    final nextScene =
        scene != null && scene.models.isNotEmpty ? scene : _defaultScene;
    debugPrint(
      '[DigitalTwin][Controller] applyDigitalTwinScene incoming=${scene?.models.length ?? 0} next=${nextScene.models.length} usingDefault=${scene == null || scene.models.isEmpty}',
    );
    _viewerBootstrapLayoutScene = nextScene;
    _layoutScene = nextScene;
    _scene = _resolveScene(nextScene);
    _viewerBootstrapScene = _scene;
    _selectedModelId = _scene.findModelById(_selectedModelId)?.id ??
        (_scene.models.isNotEmpty ? _scene.models.first.id : null);
    _viewerReady = false;
    _isUsingDefaultScene = scene == null || scene.models.isEmpty;
    _captureSelectedScaleAnchor();
    notifyListeners();
  }

  void updateDefaultScene(DigitalTwinSceneConfig defaultScene) {
    _defaultScene = defaultScene;
  }

  void updatePortComponentOverrides(
    DigitalTwinPortComponentOverrideTable overrides,
  ) {
    _portComponentOverrides = overrides;
    _bootstrapPortComponentOverrides = overrides;
    _scene = _resolveScene(_layoutScene);
    _viewerBootstrapScene = _scene;
    if (_viewerReady) {
      viewerController.updateTransforms(_buildViewerTransforms());
    }
    notifyListeners();
  }

  void handleViewerReady(bool ready) {
    _viewerReady = ready;
    debugPrint(
      '[DigitalTwin][Controller] handleViewerReady ready=$ready models=${_scene.models.length}',
    );
    notifyListeners();
    if (ready) {
      syncViewerSceneState(requestSnapshot: true);
    }
  }

  void handleModelSelectionChanged(String? modelId) {
    final nextModelId =
        modelId != null && modelId.isNotEmpty ? modelId : _selectedModelId;
    if (nextModelId == _selectedModelId) return;
    _selectedModelId = nextModelId;
    _captureSelectedScaleAnchor();
    notifyListeners();
  }

  void selectSceneModel(String modelId) {
    if (_selectedModelId == modelId) return;
    _selectedModelId = modelId;
    _captureSelectedScaleAnchor();
    viewerController.setSelectedModel(modelId);
    notifyListeners();
  }

  void setInteractionMode(DigitalTwinInteractionMode mode) {
    if (_interactionMode == mode) return;
    _interactionMode = mode;
    viewerController.setInteractionMode(_toViewerMode(mode));
    notifyListeners();
  }

  void updateLightingConfig(Model3DLightingConfig nextConfig) {
    _lightingConfig = nextConfig;
    viewerController.setLightingConfig(nextConfig);
    notifyListeners();
  }

  void updateLightIntensity({
    required bool isAmbient,
    required double value,
  }) {
    final nextValue = value.clamp(0.0, 2.5).toDouble();
    updateLightingConfig(
      isAmbient
          ? _lightingConfig.copyWith(ambientIntensity: nextValue)
          : _lightingConfig.copyWith(keyLightIntensity: nextValue),
    );
  }

  void updateKeyLightAxis(int axisIndex, double value) {
    switch (axisIndex) {
      case 0:
        updateLightingConfig(_lightingConfig.copyWith(keyLightPosX: value));
        break;
      case 1:
        updateLightingConfig(_lightingConfig.copyWith(keyLightPosY: value));
        break;
      case 2:
        updateLightingConfig(_lightingConfig.copyWith(keyLightPosZ: value));
        break;
    }
  }

  void nudgeKeyLightAxis(int axisIndex, double delta) {
    final values = _lightingConfig.keyLightPosition;
    updateKeyLightAxis(axisIndex, values[axisIndex] + delta);
  }

  void updateBackgroundHex(String value) {
    final nextHex = normalizeHexColor(
      value,
      fallback: _lightingConfig.backgroundHex,
    );
    updateLightingConfig(_lightingConfig.copyWith(backgroundHex: nextHex));
  }

  void resetLightingConfig() {
    updateLightingConfig(const Model3DLightingConfig());
  }

  void updateSelectedModelAxis(bool isRotation, int axisIndex, double value) {
    final selected = selectedLayoutModel;
    if (selected == null) return;
    if ((selected.interfaceId?.isNotEmpty ?? false) &&
        selected.id != baseModelId) {
      return;
    }

    final nextPosition = List<double>.from(selected.position);
    final nextRotation = List<double>.from(selected.rotation);
    if (isRotation) {
      nextRotation[axisIndex] = value;
    } else {
      nextPosition[axisIndex] = value;
    }

    _layoutScene = _layoutScene.updateModel(
      selected.id,
      position: nextPosition,
      rotation: nextRotation,
    );
    _scene = _resolveScene(_layoutScene);
    viewerController.updateTransforms(_buildViewerTransforms());
    notifyListeners();
  }

  void nudgeSelectedModelAxis(bool isRotation, int axisIndex, double delta) {
    final selected = selectedSceneModel;
    if (selected == null) return;
    final current = isRotation
        ? selected.rotation[axisIndex]
        : selected.position[axisIndex];
    updateSelectedModelAxis(isRotation, axisIndex, current + delta);
  }

  void updateSelectedModelScaleAxis(int axisIndex, double value) {
    final selected = selectedLayoutModel;
    if (selected == null) return;

    final nextScale = List<double>.from(selected.scale);
    nextScale[axisIndex] = _normalizeScaleValue(value);

    _layoutScene = _layoutScene.updateModel(
      selected.id,
      scale: nextScale,
    );
    _scene = _resolveScene(_layoutScene);
    viewerController.updateTransforms(_buildViewerTransforms());
    _captureSelectedScaleAnchor();
    notifyListeners();
  }

  void nudgeSelectedModelScaleAxis(int axisIndex, double delta) {
    final selected = selectedSceneModel;
    if (selected == null) return;
    updateSelectedModelScaleAxis(
      axisIndex,
      selected.scale[axisIndex] + delta,
    );
  }

  void updateSelectedModelProportionalScale(double factor) {
    final selected = selectedLayoutModel;
    if (selected == null) return;

    _captureSelectedScaleAnchorIfNeeded();
    final nextFactor =
        factor.clamp(_kProportionalScaleMin, _kProportionalScaleMax).toDouble();
    final nextScale = <double>[
      _normalizeScaleValue(_proportionalScaleAnchor[0] * nextFactor),
      _normalizeScaleValue(_proportionalScaleAnchor[1] * nextFactor),
      _normalizeScaleValue(_proportionalScaleAnchor[2] * nextFactor),
    ];

    _layoutScene = _layoutScene.updateModel(selected.id, scale: nextScale);
    _scene = _resolveScene(_layoutScene);
    _proportionalScaleFactor = nextFactor;
    viewerController.updateTransforms(_buildViewerTransforms());
    notifyListeners();
  }

  void resetSelectedModelProportionalScale() {
    updateSelectedModelProportionalScale(1.0);
  }

  void resetSelectedModelTransform() {
    final selected = selectedLayoutModel;
    if (selected == null) return;
    final bootstrapModel =
        _viewerBootstrapLayoutScene.findModelById(selected.id);
    if (bootstrapModel == null) return;
    _layoutScene = _layoutScene.updateModel(
      selected.id,
      interfaceId: bootstrapModel.interfaceId ?? '',
      position: bootstrapModel.position,
      rotation: bootstrapModel.rotation,
      scale: bootstrapModel.scale,
      mountPositionOffset: bootstrapModel.mountPositionOffset,
      mountRotationOffset: bootstrapModel.mountRotationOffset,
    );
    _scene = _resolveScene(_layoutScene);
    viewerController.updateTransforms(_buildViewerTransforms());
    _captureSelectedScaleAnchor();
    notifyListeners();
  }

  void updateSelectedModelMountProfileAxis(
    bool isRotation,
    int axisIndex,
    double value,
  ) {
    final selected = selectedLayoutModel;
    if (selected == null || selected.id == baseModelId) return;

    final nextPositionOffset = List<double>.from(selected.mountPositionOffset);
    final nextRotationOffset = List<double>.from(selected.mountRotationOffset);
    if (isRotation) {
      nextRotationOffset[axisIndex] = value;
    } else {
      nextPositionOffset[axisIndex] = value;
    }

    _layoutScene = _layoutScene.updateModel(
      selected.id,
      mountPositionOffset: nextPositionOffset,
      mountRotationOffset: nextRotationOffset,
    );
    _scene = _resolveScene(_layoutScene);
    viewerController.updateTransforms(_buildViewerTransforms());
    notifyListeners();
  }

  void updateSelectedModelMountOffsetAxis(
    bool isRotation,
    int axisIndex,
    double value,
  ) {
    updateSelectedModelMountProfileAxis(isRotation, axisIndex, value);
  }

  void nudgeSelectedModelMountProfileAxis(
    bool isRotation,
    int axisIndex,
    double delta,
  ) {
    final selected = selectedLayoutModel;
    if (selected == null || selected.id == baseModelId) return;
    final current = isRotation
        ? selected.mountRotationOffset[axisIndex]
        : selected.mountPositionOffset[axisIndex];
    updateSelectedModelMountOffsetAxis(
      isRotation,
      axisIndex,
      current + delta,
    );
  }

  void nudgeSelectedModelMountOffsetAxis(
    bool isRotation,
    int axisIndex,
    double delta,
  ) {
    nudgeSelectedModelMountProfileAxis(isRotation, axisIndex, delta);
  }

  void resetSelectedModelMountProfile() {
    final selected = selectedLayoutModel;
    if (selected == null || selected.id == baseModelId) return;
    final bootstrapModel =
        _viewerBootstrapLayoutScene.findModelById(selected.id);
    if (bootstrapModel == null) return;
    _layoutScene = _layoutScene.updateModel(
      selected.id,
      mountPositionOffset: bootstrapModel.mountPositionOffset,
      mountRotationOffset: bootstrapModel.mountRotationOffset,
    );
    _scene = _resolveScene(_layoutScene);
    viewerController.updateTransforms(_buildViewerTransforms());
    notifyListeners();
  }

  void resetSelectedModelMountOffset() {
    resetSelectedModelMountProfile();
  }

  void updateSelectedPortResidualAxis(
    bool isRotation,
    int axisIndex,
    double value,
  ) {
    final selected = selectedLayoutModel;
    final interfaceId = selectedSceneModelInterfaceId;
    if (selected == null ||
        interfaceId == null ||
        interfaceId.isEmpty ||
        selected.id == baseModelId) {
      return;
    }

    final current = _portComponentOverrides.lookup(interfaceId, selected.id);
    final nextPosition = List<double>.from(current.position);
    final nextRotation = List<double>.from(current.rotation);
    if (isRotation) {
      nextRotation[axisIndex] = value;
    } else {
      nextPosition[axisIndex] = value;
    }

    _portComponentOverrides = _portComponentOverrides.upsert(
      portId: interfaceId,
      modelId: selected.id,
      override: DigitalTwinPortComponentOverride(
        position: nextPosition,
        rotation: nextRotation,
      ),
    );
    _scene = _resolveScene(_layoutScene);
    viewerController.updateTransforms(_buildViewerTransforms());
    notifyListeners();
  }

  void nudgeSelectedPortResidualAxis(
    bool isRotation,
    int axisIndex,
    double delta,
  ) {
    final current = selectedPortComponentResidual;
    final value =
        isRotation ? current.rotation[axisIndex] : current.position[axisIndex];
    updateSelectedPortResidualAxis(isRotation, axisIndex, value + delta);
  }

  void resetSelectedPortResidualOverride() {
    final selected = selectedLayoutModel;
    final interfaceId = selectedSceneModelInterfaceId;
    if (selected == null ||
        interfaceId == null ||
        interfaceId.isEmpty ||
        selected.id == baseModelId) {
      return;
    }

    final bootstrapOverride = _bootstrapPortComponentOverrides.lookup(
      interfaceId,
      selected.id,
    );
    _portComponentOverrides = _portComponentOverrides.upsert(
      portId: interfaceId,
      modelId: selected.id,
      override: bootstrapOverride,
    );
    _scene = _resolveScene(_layoutScene);
    viewerController.updateTransforms(_buildViewerTransforms());
    notifyListeners();
  }

  void onModelTransformsChanged(List<Model3DTransform> transforms) {
    if (transforms.isEmpty) return;
    var nextLayout = _layoutScene;
    for (final transform in transforms) {
      final model = nextLayout.findModelById(transform.modelId);
      if (model == null) continue;
      final isAttached = model.interfaceId?.isNotEmpty ?? false;
      final isBase = model.id == baseModelId;
      nextLayout = nextLayout.updateModel(
        transform.modelId,
        position: (isAttached && !isBase) ? model.position : transform.position,
        rotation: (isAttached && !isBase) ? model.rotation : transform.rotation,
        scale: transform.scale,
      );
    }
    _layoutScene = nextLayout;
    _scene = _resolveScene(nextLayout);
    _selectedModelId = _scene.findModelById(_selectedModelId)?.id ??
        (_scene.models.isNotEmpty ? _scene.models.first.id : null);
    _captureSelectedScaleAnchorIfNeeded();
    notifyListeners();
  }

  void assignSelectedModelToInterface(String? interfaceId) {
    final selected = selectedLayoutModel;
    if (selected == null || selected.id == baseModelId) return;

    var nextLayout = _layoutScene;
    final currentResolved = _scene.findModelById(selected.id) ?? selected;
    final normalizedInterfaceId =
        interfaceId != null && interfaceId.isNotEmpty ? interfaceId : null;

    if (normalizedInterfaceId != null) {
      final occupantId = interfaceOccupantModelId(normalizedInterfaceId);
      if (occupantId != null) {
        final occupantResolved = _scene.findModelById(occupantId);
        nextLayout = nextLayout.updateModel(
          occupantId,
          interfaceId: '',
          position: occupantResolved?.position,
          rotation: occupantResolved?.rotation,
        );
      }
    }

    nextLayout = nextLayout.updateModel(
      selected.id,
      interfaceId: normalizedInterfaceId ?? '',
      position: currentResolved.position,
      rotation: currentResolved.rotation,
    );

    _layoutScene = nextLayout;
    _scene = _resolveScene(nextLayout);
    viewerController.updateTransforms(_buildViewerTransforms());
    _captureSelectedScaleAnchor();
    notifyListeners();
  }

  DigitalTwinSceneConfig _resolveScene(DigitalTwinSceneConfig scene) {
    return DigitalTwinMountResolver.resolveScene(
      scene: scene,
      bootstrapScene: _viewerBootstrapLayoutScene,
      portComponentOverrides: _portComponentOverrides,
    );
  }

  double _normalizeScaleValue(double value) {
    if (!value.isFinite) return 1.0;
    return math.max(0.05, value);
  }

  // --- 等比例缩放锚点 ---
  // 滑轨只表达“整体倍数”，真实的 XYZ 比例来自当前选中组件的锚点比例。
  void _captureSelectedScaleAnchor() {
    final selected = selectedLayoutModel;
    if (selected == null) {
      _proportionalScaleAnchorModelId = null;
      _proportionalScaleAnchor = const <double>[1, 1, 1];
      _proportionalScaleFactor = 1.0;
      return;
    }
    _proportionalScaleAnchorModelId = selected.id;
    _proportionalScaleAnchor = List<double>.from(selected.scale);
    _proportionalScaleFactor = 1.0;
  }

  void _captureSelectedScaleAnchorIfNeeded() {
    final selected = selectedLayoutModel;
    if (selected == null) return;
    if (_proportionalScaleAnchorModelId == selected.id) return;
    _captureSelectedScaleAnchor();
  }
}
