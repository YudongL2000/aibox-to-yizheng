/*
 * [INPUT]: 依赖数字孪生场景协议模型，接收 layoutScene 与 bootstrapScene 的底座/接口/组件安装锚点/接口-组件残差数据。
 * [OUTPUT]: 对外提供 DigitalTwinMountResolver 纯解算器，把接口摆放、组件安装锚点和接口残差收敛成解算后的绝对场景。
 * [POS]: module/device/model 的纯数学辅助层，被数字孪生 controller 和测试共同消费，避免几何公式散落在页面状态机里。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import 'dart:math' as math;

import 'package:aitesseract/module/device/model/device_event_model.dart';

class DigitalTwinMountResolver {
  const DigitalTwinMountResolver._();

  static DigitalTwinSceneConfig resolveScene({
    required DigitalTwinSceneConfig scene,
    required DigitalTwinSceneConfig bootstrapScene,
    DigitalTwinPortComponentOverrideTable portComponentOverrides =
        const DigitalTwinPortComponentOverrideTable(),
  }) {
    if (scene.baseModelId == null ||
        scene.baseModelId!.isEmpty ||
        scene.interfaces.isEmpty) {
      return scene;
    }

    final baseModel = scene.findModelById(scene.baseModelId);
    if (baseModel == null) return scene;
    final bootstrapBaseModel = bootstrapScene.findModelById(scene.baseModelId);
    final interfaceScale = resolveInterfaceScale(
      currentScale: baseModel.scale,
      bootstrapScale: bootstrapBaseModel?.scale ?? baseModel.scale,
    );

    final resolvedModels = <DigitalTwinModelItem>[
      for (final model in scene.models)
        if (model.id == baseModel.id ||
            model.interfaceId == null ||
            model.interfaceId!.isEmpty)
          model
        else
          resolveInterfacePlacement(
            baseModel: baseModel,
            interfacePreset: scene.findInterfaceById(model.interfaceId),
            interfaceScale: interfaceScale,
            model: model,
            portComponentOverride:
                portComponentOverrides.lookup(model.interfaceId, model.id),
          ),
    ];

    return scene.copyWith(models: resolvedModels);
  }

  static DigitalTwinModelItem resolveInterfacePlacement({
    required DigitalTwinModelItem baseModel,
    required DigitalTwinInterfacePreset? interfacePreset,
    required List<double> interfaceScale,
    required DigitalTwinModelItem model,
    DigitalTwinPortComponentOverride portComponentOverride =
        const DigitalTwinPortComponentOverride(),
  }) {
    if (interfacePreset == null) return model;

    final resolvedPosition = composePosition(
      basePosition: baseModel.position,
      baseRotation: baseModel.rotation,
      localPosition: composeLocalPosition(
        anchorPosition: interfacePreset.position,
        anchorRotation: interfacePreset.rotation,
        mountProfilePosition: model.mountPositionOffset,
        portResidualPosition: portComponentOverride.position,
      ),
      localScale: interfaceScale,
    );
    final resolvedRotation = composeRotation(
      baseRotation: baseModel.rotation,
      localRotation: composeLocalRotation(
        anchorRotation: interfacePreset.rotation,
        mountProfileRotation: model.mountRotationOffset,
        portResidualRotation: portComponentOverride.rotation,
      ),
    );

    return model.copyWith(
      position: resolvedPosition,
      rotation: resolvedRotation,
    );
  }

  static List<double> composePosition({
    required List<double> basePosition,
    required List<double> baseRotation,
    required List<double> localPosition,
    required List<double> localScale,
  }) {
    final scaledLocalPosition = scaleVector(localPosition, localScale);
    final rotated = rotateVector(scaledLocalPosition, baseRotation);
    return <double>[
      basePosition[0] + rotated[0],
      basePosition[1] + rotated[1],
      basePosition[2] + rotated[2],
    ];
  }

  static List<double> composeLocalPosition({
    required List<double> anchorPosition,
    required List<double> anchorRotation,
    required List<double> mountProfilePosition,
    List<double> portResidualPosition = const <double>[0, 0, 0],
  }) {
    final combinedCompensation = composeMountOffset(
      mountProfilePosition: mountProfilePosition,
      portResidualPosition: portResidualPosition,
    );
    final rotatedCompensation =
        rotateVector(combinedCompensation, anchorRotation);
    return <double>[
      anchorPosition[0] + rotatedCompensation[0],
      anchorPosition[1] + rotatedCompensation[1],
      anchorPosition[2] + rotatedCompensation[2],
    ];
  }

  static List<double> composeMountOffset({
    required List<double> mountProfilePosition,
    List<double> portResidualPosition = const <double>[0, 0, 0],
  }) {
    return <double>[
      mountProfilePosition[0] + portResidualPosition[0],
      mountProfilePosition[1] + portResidualPosition[1],
      mountProfilePosition[2] + portResidualPosition[2],
    ];
  }

  static List<double> composeLocalRotation({
    required List<double> anchorRotation,
    required List<double> mountProfileRotation,
    List<double> portResidualRotation = const <double>[0, 0, 0],
  }) {
    return composeRotation(
      baseRotation: anchorRotation,
      localRotation: composeRotation(
        baseRotation: mountProfileRotation,
        localRotation: portResidualRotation,
      ),
    );
  }

  static List<double> composeRotation({
    required List<double> baseRotation,
    required List<double> localRotation,
  }) {
    final baseQuaternion = _Quaternion.fromEulerDegrees(baseRotation);
    final localQuaternion = _Quaternion.fromEulerDegrees(localRotation);
    return baseQuaternion.multiply(localQuaternion).toEulerDegrees();
  }

  static List<double> rotateVector(List<double> vector, List<double> rotation) {
    final quaternion = _Quaternion.fromEulerDegrees(rotation);
    return quaternion.rotateVector(vector);
  }

  static List<double> scaleVector(List<double> vector, List<double> scale) {
    return <double>[
      vector[0] * scale[0],
      vector[1] * scale[1],
      vector[2] * scale[2],
    ];
  }

  static List<double> resolveInterfaceScale({
    required List<double> currentScale,
    required List<double> bootstrapScale,
  }) {
    return <double>[
      safeScaleRatio(currentScale[0], bootstrapScale[0]),
      safeScaleRatio(currentScale[1], bootstrapScale[1]),
      safeScaleRatio(currentScale[2], bootstrapScale[2]),
    ];
  }

  static double safeScaleRatio(double current, double bootstrap) {
    final normalizedBootstrap = bootstrap.abs() < 0.0001 ? 1.0 : bootstrap;
    return current / normalizedBootstrap;
  }
}

class _Quaternion {
  final double x;
  final double y;
  final double z;
  final double w;

  const _Quaternion(this.x, this.y, this.z, this.w);

  factory _Quaternion.fromEulerDegrees(List<double> rotation) {
    final rx = _degToRad(rotation.isNotEmpty ? rotation[0] : 0);
    final ry = _degToRad(rotation.length > 1 ? rotation[1] : 0);
    final rz = _degToRad(rotation.length > 2 ? rotation[2] : 0);

    final cx = math.cos(rx * 0.5);
    final sx = math.sin(rx * 0.5);
    final cy = math.cos(ry * 0.5);
    final sy = math.sin(ry * 0.5);
    final cz = math.cos(rz * 0.5);
    final sz = math.sin(rz * 0.5);

    return _Quaternion(
      sx * cy * cz + cx * sy * sz,
      cx * sy * cz - sx * cy * sz,
      cx * cy * sz + sx * sy * cz,
      cx * cy * cz - sx * sy * sz,
    );
  }

  _Quaternion multiply(_Quaternion other) {
    return _Quaternion(
      w * other.x + x * other.w + y * other.z - z * other.y,
      w * other.y - x * other.z + y * other.w + z * other.x,
      w * other.z + x * other.y - y * other.x + z * other.w,
      w * other.w - x * other.x - y * other.y - z * other.z,
    );
  }

  _Quaternion conjugate() => _Quaternion(-x, -y, -z, w);

  List<double> rotateVector(List<double> vector) {
    final pure = _Quaternion(
      vector.isNotEmpty ? vector[0] : 0,
      vector.length > 1 ? vector[1] : 0,
      vector.length > 2 ? vector[2] : 0,
      0,
    );
    final rotated = multiply(pure).multiply(conjugate());
    return <double>[rotated.x, rotated.y, rotated.z];
  }

  List<double> toEulerDegrees() {
    final sinrCosp = 2 * (w * x + y * z);
    final cosrCosp = 1 - 2 * (x * x + y * y);
    final roll = math.atan2(sinrCosp, cosrCosp);

    final sinp = 2 * (w * y - z * x);
    final pitch = sinp.abs() >= 1
        ? (sinp >= 0 ? math.pi / 2 : -math.pi / 2)
        : math.asin(sinp);

    final sinyCosp = 2 * (w * z + x * y);
    final cosyCosp = 1 - 2 * (y * y + z * z);
    final yaw = math.atan2(sinyCosp, cosyCosp);

    return <double>[
      _round3(_radToDeg(roll)),
      _round3(_radToDeg(pitch)),
      _round3(_radToDeg(yaw)),
    ];
  }

  static double _degToRad(double value) => value * math.pi / 180;
  static double _radToDeg(double value) => value * 180 / math.pi;
  static double _round3(double value) => (value * 1000).roundToDouble() / 1000;
}
