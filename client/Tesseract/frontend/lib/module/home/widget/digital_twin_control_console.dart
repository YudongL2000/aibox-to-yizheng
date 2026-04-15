/*
 * [INPUT]: 依赖 DigitalTwinConsoleController 提供的场景/灯光状态，依赖 DeviceInfoItem 提供组件绑定设备的连接态。
 * [OUTPUT]: 对外提供 DigitalTwinControlConsole 右侧控制台组件，承载接口吸附、选中、绝对位姿、组件大小、等比例滑轨、组件安装锚点、接口-组件残差、接口局部诊断与光照调节 UI。
 * [POS]: module/home/widget 的数字孪生控制台视图层，被 HomeWorkspacePage 挂载以替代页面内联的大块 inspector 逻辑。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import 'package:aitesseract/module/device/model/device_event_model.dart';
import 'package:aitesseract/module/home/controller/digital_twin_console_controller.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class DigitalTwinControlConsole extends StatelessWidget {
  final DigitalTwinConsoleController controller;
  final List<DeviceInfoItem> deviceInfoList;
  final List<String> lightingBackgroundSwatches;
  final double headerHeight;

  const DigitalTwinControlConsole({
    super.key,
    required this.controller,
    required this.deviceInfoList,
    required this.lightingBackgroundSwatches,
    required this.headerHeight,
  });

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: controller,
      builder: (BuildContext context, _) {
        final selectedModel = controller.selectedSceneModel;
        final modeLabel =
            controller.interactionMode == DigitalTwinInteractionMode.rotate
                ? '旋转模式'
                : '平移模式';
        return Container(
          margin: const EdgeInsets.fromLTRB(0, 16, 8, 16),
          decoration: BoxDecoration(
            color: const Color(0xFF151923),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: const Color(0xFF00D9FF).withOpacity(0.2),
              width: 1,
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              SizedBox(
                height: headerHeight,
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: <Widget>[
                      Expanded(
                        child: Text(
                          'DIGITAL TWIN CONTROL CONSOLE',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            color: Colors.white.withOpacity(0.7),
                            fontSize: 12,
                            letterSpacing: 1,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                      _buildInspectorBadge(
                        modeLabel,
                        const Color(0xFF00D9FF),
                      ),
                      const SizedBox(width: 8),
                      _buildInspectorBadge(
                        selectedModel?.id ?? '未选中组件',
                        selectedModel != null
                            ? const Color(0xFF28CA42)
                            : const Color(0xFF7D8597),
                      ),
                    ],
                  ),
                ),
              ),
              const Divider(color: Color(0xFF00D9FF), height: 1, thickness: 1),
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(12),
                  child: _buildTransformInspector(context),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  DeviceInfoItem? _findDeviceById(String deviceId) {
    for (final device in deviceInfoList) {
      if (device.deviceId == deviceId) {
        return device;
      }
    }
    return null;
  }

  String _connectionLabelForModel(DigitalTwinModelItem model) {
    if (model.deviceId.isEmpty) return '未绑定';
    final device = _findDeviceById(model.deviceId);
    if (device == null) return '未上报';
    return device.isPlugIn ? '已连接' : '未连接';
  }

  Color _connectionColorForModel(DigitalTwinModelItem model) {
    switch (_connectionLabelForModel(model)) {
      case '已连接':
        return const Color(0xFF28CA42);
      case '未连接':
        return const Color(0xFFFF6B6B);
      default:
        return const Color(0xFF7D8597);
    }
  }

  String _formatVector(List<double> vector) {
    return vector.map((double value) => value.toStringAsFixed(2)).join(', ');
  }

  Widget _buildTransformInspector(BuildContext context) {
    final selectedModel = controller.selectedSceneModel;
    final allowManualTransform = !controller.selectedSceneModelUsesInterface ||
        controller.selectedSceneModelIsBase;
    final scaleHelpText = controller.selectedSceneModelIsBase
        ? '当前为底座主体。调整底座尺寸后，5 个真实接口的绝对位置会按比例一起重算。'
        : controller.selectedSceneModelUsesInterface
            ? '当前组件已吸附到接口。你仍然可以单独调整它的大小，接口锚点和残差关系不会被解锁。'
            : '大小使用组件局部缩放倍数，默认值为 1.00。';
    final mountProfileHelpText = controller.selectedSceneModelIsBase
        ? '底座主体不参与组件安装锚点与接口残差。'
        : '这里配置的是组件安装锚点。它定义组件天然朝向、安装基点和默认尺寸，会作用到这个组件连接的所有接口。';
    final portResidualHelpText = controller.selectedSceneModelIsBase
        ? '底座主体没有接口残差。'
        : controller.selectedSceneModelUsesInterface
            ? '这里配置的是“当前接口 + 当前组件”的残差微调，只会影响这一对组合，不会牵动同组件在其它接口上的结果。'
            : '只有当组件吸附到接口时，才需要接口-组件残差。';
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: const Color(0xFF0A0E1A),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: const Color(0xFF00D9FF).withOpacity(0.28),
          width: 0.9,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Wrap(
            spacing: 8,
            runSpacing: 8,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: <Widget>[
              const Text(
                'MODEL INSPECTOR',
                style: TextStyle(
                  color: Color(0xFF00D9FF),
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 1,
                ),
              ),
              _buildInspectorBadge(
                controller.isUsingDefaultScene ? '默认场景' : 'workflow.meta',
                controller.isUsingDefaultScene
                    ? const Color(0xFF7D8597)
                    : const Color(0xFF00D9FF),
              ),
              _buildInspectorBadge(
                controller.viewerReady ? 'Viewer Ready' : 'Viewer Syncing',
                controller.viewerReady
                    ? const Color(0xFF28CA42)
                    : const Color(0xFFFFC857),
              ),
              _buildInspectorBadge('全局坐标', const Color(0xFF7AE582)),
              if (selectedModel != null)
                Text(
                  '当前选中: ${selectedModel.id}',
                  style: TextStyle(
                    color: Colors.white.withOpacity(0.78),
                    fontSize: 11,
                  ),
                ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            '位姿以预览窗口全局原点 (0,0,0) 为基准，显示与编辑的都是绝对坐标。',
            style: TextStyle(
              color: Colors.white.withOpacity(0.58),
              fontSize: 10,
            ),
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: <Widget>[
              for (final entry in controller.scene.models.asMap().entries)
                _buildSceneModelChip(entry.key, entry.value),
            ],
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: <Widget>[
              _buildModeButton(
                title: '平移模式',
                mode: DigitalTwinInteractionMode.translate,
                icon: Icons.open_with,
              ),
              _buildModeButton(
                title: '旋转模式',
                mode: DigitalTwinInteractionMode.rotate,
                icon: Icons.threed_rotation,
              ),
            ],
          ),
          if (selectedModel != null) ...<Widget>[
            const SizedBox(height: 10),
            _buildSelectedModelSummary(selectedModel),
            const SizedBox(height: 10),
            _buildInterfacePlacementEditor(),
            const SizedBox(height: 10),
            SizedBox(
              width: 320,
              child: _buildVectorEditor(
                title: 'MODEL SCALE (LOCAL)',
                values: selectedModel.scale,
                enabled: true,
                suffixText: 'x',
                step: 0.05,
                stepLabel: '±0.05x',
                fieldKey: 'scale',
                onSubmitted: controller.updateSelectedModelScaleAxis,
                onNudge: controller.nudgeSelectedModelScaleAxis,
              ),
            ),
            const SizedBox(height: 10),
            _buildProportionalScaleSlider(context),
            const SizedBox(height: 10),
            _buildMountProfileEditor(mountProfileHelpText),
            if (!controller.selectedSceneModelIsBase &&
                controller.selectedSceneModelUsesInterface) ...<Widget>[
              const SizedBox(height: 10),
              _buildPortResidualEditor(portResidualHelpText),
            ],
            const SizedBox(height: 8),
            Text(
              scaleHelpText,
              style: TextStyle(
                color: Colors.white.withOpacity(0.54),
                fontSize: 10,
              ),
            ),
            const SizedBox(height: 10),
            Wrap(
              spacing: 10,
              runSpacing: 10,
              children: <Widget>[
                SizedBox(
                  width: 320,
                  child: _buildVectorEditor(
                    title: 'ABS POSITION (WORLD)',
                    values: selectedModel.position,
                    enabled: allowManualTransform,
                    step: 0.1,
                    stepLabel: '±0.1',
                    fieldKey: 'pos',
                    onSubmitted: (int axisIndex, double value) {
                      controller.updateSelectedModelAxis(
                          false, axisIndex, value);
                    },
                    onNudge: (int axisIndex, double delta) {
                      controller.nudgeSelectedModelAxis(
                          false, axisIndex, delta);
                    },
                  ),
                ),
                SizedBox(
                  width: 320,
                  child: _buildVectorEditor(
                    title: 'ABS ROTATION (WORLD DEG)',
                    values: selectedModel.rotation,
                    enabled: allowManualTransform,
                    suffixText: 'deg',
                    step: 5,
                    stepLabel: '±5°',
                    fieldKey: 'rot',
                    onSubmitted: (int axisIndex, double value) {
                      controller.updateSelectedModelAxis(
                          true, axisIndex, value);
                    },
                    onNudge: (int axisIndex, double delta) {
                      controller.nudgeSelectedModelAxis(true, axisIndex, delta);
                    },
                  ),
                ),
              ],
            ),
            if (!allowManualTransform) ...<Widget>[
              const SizedBox(height: 8),
              Text(
                '该设备已绑定接口，位姿由“接口锚点 × 组件安装锚点 × 当前接口残差”共同驱动。若要直接改绝对位姿，先切换为“自由摆放”。',
                style: TextStyle(
                  color: Colors.white.withOpacity(0.54),
                  fontSize: 10,
                ),
              ),
            ],
          ],
          if (selectedModel != null) ...<Widget>[
            const SizedBox(height: 10),
            _buildConfigExportPanel(context),
          ],
          const SizedBox(height: 10),
          _buildLightingInspector(context),
        ],
      ),
    );
  }

  Widget _buildInspectorBadge(String label, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.12),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: color.withOpacity(0.4)),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontSize: 10,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  Widget _buildSceneModelChip(int index, DigitalTwinModelItem model) {
    final isSelected = model.id == controller.selectedSceneModel?.id;
    final statusColor = _connectionColorForModel(model);
    return InkWell(
      onTap: () => controller.selectSceneModel(model.id),
      borderRadius: BorderRadius.circular(10),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 120),
        width: 210,
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: isSelected
              ? const Color(0xFF00D9FF).withOpacity(0.12)
              : Colors.white.withOpacity(0.03),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: isSelected
                ? const Color(0xFF00D9FF)
                : Colors.white.withOpacity(0.12),
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Row(
              children: <Widget>[
                Text(
                  '#${index + 1}',
                  style: const TextStyle(
                    color: Color(0xFF00D9FF),
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    model.id,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              '设备: ${model.deviceId.isEmpty ? '未绑定' : model.deviceId}',
              style: TextStyle(
                color: Colors.white.withOpacity(0.72),
                fontSize: 11,
              ),
            ),
            if (model.interfaceId != null &&
                model.interfaceId!.isNotEmpty) ...<Widget>[
              const SizedBox(height: 4),
              Text(
                '接口: ${controller.interfaceLabel(model.interfaceId)}',
                style: TextStyle(
                  color: const Color(0xFF7AE582).withOpacity(0.82),
                  fontSize: 10,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
            const SizedBox(height: 4),
            Text(
              '绝对位置: ${_formatVector(model.position)}',
              style: TextStyle(
                color: Colors.white.withOpacity(0.56),
                fontSize: 10,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              '绝对旋转: ${_formatVector(model.rotation)}',
              style: TextStyle(
                color: Colors.white.withOpacity(0.56),
                fontSize: 10,
              ),
            ),
            const SizedBox(height: 8),
            _buildInspectorBadge(_connectionLabelForModel(model), statusColor),
          ],
        ),
      ),
    );
  }

  Widget _buildModeButton({
    required String title,
    required DigitalTwinInteractionMode mode,
    required IconData icon,
  }) {
    final selected = controller.interactionMode == mode;
    return InkWell(
      onTap: () => controller.setInteractionMode(mode),
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        decoration: BoxDecoration(
          color: selected
              ? const Color(0xFF00D9FF).withOpacity(0.14)
              : Colors.white.withOpacity(0.03),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: selected
                ? const Color(0xFF00D9FF)
                : Colors.white.withOpacity(0.14),
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            Icon(icon, size: 16, color: const Color(0xFF00D9FF)),
            const SizedBox(width: 6),
            Text(
              title,
              style: TextStyle(
                color: selected ? const Color(0xFF00D9FF) : Colors.white70,
                fontSize: 11,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSelectedModelSummary(DigitalTwinModelItem model) {
    final interfaceId = controller.selectedSceneModelInterfaceId;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.03),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Colors.white.withOpacity(0.12)),
      ),
      child: Wrap(
        spacing: 10,
        runSpacing: 8,
        crossAxisAlignment: WrapCrossAlignment.center,
        children: <Widget>[
          Text(
            '组件 ${model.id}',
            style: const TextStyle(
              color: Colors.white,
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
          ),
          if (controller.selectedSceneModelIsBase)
            _buildInspectorBadge('底座主体', const Color(0xFF7AE582)),
          if (!controller.selectedSceneModelIsBase &&
              interfaceId != null &&
              interfaceId.isNotEmpty)
            _buildInspectorBadge(
              controller.interfaceLabel(interfaceId),
              const Color(0xFF7AE582),
            ),
          Text(
            '绝对位置 ${_formatVector(model.position)}',
            style: TextStyle(
              color: Colors.white.withOpacity(0.68),
              fontSize: 11,
            ),
          ),
          Text(
            '绝对旋转 ${_formatVector(model.rotation)}',
            style: TextStyle(
              color: Colors.white.withOpacity(0.68),
              fontSize: 11,
            ),
          ),
          Text(
            '组件大小 ${_formatVector(model.scale)}',
            style: TextStyle(
              color: Colors.white.withOpacity(0.68),
              fontSize: 11,
            ),
          ),
          if (!controller.selectedSceneModelIsBase) ...<Widget>[
            Text(
              '组件安装位移 ${_formatVector(model.mountPositionOffset)}',
              style: TextStyle(
                color: Colors.white.withOpacity(0.68),
                fontSize: 11,
              ),
            ),
            Text(
              '组件安装旋转 ${_formatVector(model.mountRotationOffset)}',
              style: TextStyle(
                color: Colors.white.withOpacity(0.68),
                fontSize: 11,
              ),
            ),
            if (controller.selectedSceneModelUsesInterface) ...<Widget>[
              Text(
                '当前接口残差位移 ${_formatVector(controller.selectedPortComponentResidual.position)}',
                style: TextStyle(
                  color: Colors.white.withOpacity(0.68),
                  fontSize: 11,
                ),
              ),
              Text(
                '当前接口残差旋转 ${_formatVector(controller.selectedPortComponentResidual.rotation)}',
                style: TextStyle(
                  color: Colors.white.withOpacity(0.68),
                  fontSize: 11,
                ),
              ),
            ],
          ],
          TextButton.icon(
            onPressed: controller.resetSelectedModelTransform,
            style: TextButton.styleFrom(
              foregroundColor: const Color(0xFF00D9FF),
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              backgroundColor: const Color(0xFF00D9FF).withOpacity(0.08),
            ),
            icon: const Icon(Icons.restart_alt, size: 16),
            label: const Text('重置到场景初始值'),
          ),
        ],
      ),
    );
  }

  Widget _buildInterfacePlacementEditor() {
    if (controller.selectedSceneModelIsBase) {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.03),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: Colors.white.withOpacity(0.12)),
        ),
        child: Text(
          '设备5 当前作为底座主体。其它组件会基于它的 5 个真实接口预设自动解算位置和角度。',
          style: TextStyle(
            color: Colors.white.withOpacity(0.68),
            fontSize: 11,
          ),
        ),
      );
    }

    if (controller.interfacePresets.isEmpty) {
      return const SizedBox.shrink();
    }

    final availableValues = <String>{
      '',
      ...controller.interfacePresets
          .map((DigitalTwinInterfacePreset preset) => preset.id),
    };
    final selectedValue = availableValues.contains(
      controller.selectedSceneModelInterfaceId,
    )
        ? (controller.selectedSceneModelInterfaceId ?? '')
        : '';
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.03),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Colors.white.withOpacity(0.12)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          const Text(
            'INTERFACE SNAP',
            style: TextStyle(
              color: Color(0xFF00D9FF),
              fontSize: 11,
              fontWeight: FontWeight.w600,
              letterSpacing: 0.8,
            ),
          ),
          const SizedBox(height: 8),
          DropdownButtonFormField<String>(
            initialValue: selectedValue,
            decoration: InputDecoration(
              labelText: '放置接口',
              labelStyle: const TextStyle(color: Colors.white54, fontSize: 10),
              isDense: true,
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 8,
                vertical: 10,
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: BorderSide(color: Colors.white.withOpacity(0.14)),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: const BorderSide(color: Color(0xFF00D9FF)),
              ),
            ),
            dropdownColor: const Color(0xFF151923),
            style: const TextStyle(color: Colors.white, fontSize: 11),
            items: <DropdownMenuItem<String>>[
              const DropdownMenuItem<String>(
                value: '',
                child: Text('自由摆放'),
              ),
              ...controller.interfacePresets
                  .map((DigitalTwinInterfacePreset preset) {
                final occupant = controller.interfaceOccupantModelId(preset.id);
                final label = occupant == null
                    ? preset.label
                    : '${preset.label} · 当前占用 $occupant';
                return DropdownMenuItem<String>(
                  value: preset.id,
                  child: Text(label),
                );
              }),
            ],
            onChanged: (String? value) {
              controller.assignSelectedModelToInterface(
                value != null && value.isNotEmpty ? value : null,
              );
            },
          ),
          const SizedBox(height: 8),
          Text(
            '选择接口后，组件会按“接口锚点 × 组件安装锚点 × 当前接口残差”自动解算绝对位姿；若接口已被占用，旧组件会退回自由摆放。',
            style: TextStyle(
              color: Colors.white.withOpacity(0.58),
              fontSize: 10,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildProportionalScaleSlider(BuildContext context) {
    final factor = controller.selectedProportionalScaleFactor.clamp(
      controller.proportionalScaleMin,
      controller.proportionalScaleMax,
    );
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.03),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Colors.white.withOpacity(0.12)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            children: <Widget>[
              const Text(
                'PROPORTIONAL SCALE',
                style: TextStyle(
                  color: Color(0xFF00D9FF),
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 0.8,
                ),
              ),
              const Spacer(),
              Text(
                '${factor.toStringAsFixed(2)}x',
                style: TextStyle(
                  color: Colors.white.withOpacity(0.86),
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(width: 8),
              TextButton(
                onPressed: controller.resetSelectedModelProportionalScale,
                style: TextButton.styleFrom(
                  foregroundColor: const Color(0xFF00D9FF),
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                  backgroundColor: const Color(0xFF00D9FF).withOpacity(0.08),
                ),
                child: const Text('回到 1.00x'),
              ),
            ],
          ),
          const SizedBox(height: 6),
          SliderTheme(
            data: SliderTheme.of(context).copyWith(
              activeTrackColor: const Color(0xFF00D9FF),
              inactiveTrackColor: Colors.white.withOpacity(0.12),
              thumbColor: const Color(0xFF00D9FF),
              overlayColor: const Color(0xFF00D9FF).withOpacity(0.12),
              trackHeight: 4,
            ),
            child: Slider(
              value: factor.toDouble(),
              min: controller.proportionalScaleMin,
              max: controller.proportionalScaleMax,
              divisions: 56,
              label: '${factor.toStringAsFixed(2)}x',
              onChanged: controller.updateSelectedModelProportionalScale,
            ),
          ),
          Row(
            children: <Widget>[
              Text(
                '${controller.proportionalScaleMin.toStringAsFixed(2)}x',
                style: TextStyle(
                  color: Colors.white.withOpacity(0.45),
                  fontSize: 9,
                ),
              ),
              const Spacer(),
              Text(
                '保持当前 XYZ 比例整体缩放',
                style: TextStyle(
                  color: Colors.white.withOpacity(0.52),
                  fontSize: 9,
                ),
              ),
              const Spacer(),
              Text(
                '${controller.proportionalScaleMax.toStringAsFixed(2)}x',
                style: TextStyle(
                  color: Colors.white.withOpacity(0.45),
                  fontSize: 9,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildMountProfileEditor(String helpText) {
    final selectedModel = controller.selectedSceneModel;
    if (selectedModel == null) {
      return const SizedBox.shrink();
    }

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.03),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Colors.white.withOpacity(0.12)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            children: <Widget>[
              const Text(
                'COMPONENT MOUNT PROFILE',
                style: TextStyle(
                  color: Color(0xFF00D9FF),
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 0.8,
                ),
              ),
              const Spacer(),
              if (!controller.selectedSceneModelIsBase)
                TextButton.icon(
                  onPressed: controller.resetSelectedModelMountProfile,
                  style: TextButton.styleFrom(
                    foregroundColor: const Color(0xFF00D9FF),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 8,
                    ),
                    backgroundColor: const Color(0xFF00D9FF).withOpacity(0.08),
                  ),
                  icon: const Icon(Icons.tune, size: 16),
                  label: const Text('重置安装锚点'),
                ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            helpText,
            style: TextStyle(
              color: Colors.white.withOpacity(0.58),
              fontSize: 10,
            ),
          ),
          if (!controller.selectedSceneModelIsBase) ...<Widget>[
            const SizedBox(height: 10),
            Wrap(
              spacing: 10,
              runSpacing: 10,
              children: <Widget>[
                SizedBox(
                  width: 320,
                  child: _buildVectorEditor(
                    title: 'MOUNT POSITION OFFSET (INTERFACE LOCAL)',
                    values: selectedModel.mountPositionOffset,
                    enabled: true,
                    step: 0.05,
                    stepLabel: '±0.05',
                    fieldKey: 'mount_pos',
                    onSubmitted: (int axisIndex, double value) {
                      controller.updateSelectedModelMountProfileAxis(
                        false,
                        axisIndex,
                        value,
                      );
                    },
                    onNudge: (int axisIndex, double delta) {
                      controller.nudgeSelectedModelMountProfileAxis(
                        false,
                        axisIndex,
                        delta,
                      );
                    },
                  ),
                ),
                SizedBox(
                  width: 320,
                  child: _buildVectorEditor(
                    title: 'MOUNT ROTATION OFFSET (INTERFACE LOCAL DEG)',
                    values: selectedModel.mountRotationOffset,
                    enabled: true,
                    suffixText: 'deg',
                    step: 5,
                    stepLabel: '±5°',
                    fieldKey: 'mount_rot',
                    onSubmitted: (int axisIndex, double value) {
                      controller.updateSelectedModelMountProfileAxis(
                        true,
                        axisIndex,
                        value,
                      );
                    },
                    onNudge: (int axisIndex, double delta) {
                      controller.nudgeSelectedModelMountProfileAxis(
                        true,
                        axisIndex,
                        delta,
                      );
                    },
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildPortResidualEditor(String helpText) {
    final selectedModel = controller.selectedSceneModel;
    final interfacePreset = controller.selectedInterfacePreset;
    final rotatedMountProfileOffset =
        controller.selectedInterfaceRotatedMountProfileOffset;
    final rotatedPortResidualOffset =
        controller.selectedInterfaceRotatedPortResidualOffset;
    final combinedMountOffset = controller.selectedCombinedMountOffset;
    final resolvedLocalPosition =
        controller.selectedInterfaceResolvedLocalPosition;
    if (selectedModel == null ||
        controller.selectedSceneModelIsBase ||
        !controller.selectedSceneModelUsesInterface) {
      return const SizedBox.shrink();
    }

    final residual = controller.selectedPortComponentResidual;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.03),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Colors.white.withOpacity(0.12)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            children: <Widget>[
              const Text(
                'PORT-COMPONENT RESIDUAL',
                style: TextStyle(
                  color: Color(0xFF7AE582),
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 0.8,
                ),
              ),
              const Spacer(),
              TextButton.icon(
                onPressed: controller.resetSelectedPortResidualOverride,
                style: TextButton.styleFrom(
                  foregroundColor: const Color(0xFF7AE582),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 8,
                  ),
                  backgroundColor: const Color(0xFF7AE582).withOpacity(0.08),
                ),
                icon: const Icon(Icons.restart_alt, size: 16),
                label: const Text('重置残差'),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            helpText,
            style: TextStyle(
              color: Colors.white.withOpacity(0.58),
              fontSize: 10,
            ),
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: <Widget>[
              SizedBox(
                width: 320,
                child: _buildVectorEditor(
                  title: 'PORT RESIDUAL POSITION (INTERFACE LOCAL)',
                  values: residual.position,
                  enabled: true,
                  step: 0.05,
                  stepLabel: '±0.05',
                  fieldKey: 'port_residual_pos',
                  onSubmitted: (int axisIndex, double value) {
                    controller.updateSelectedPortResidualAxis(
                      false,
                      axisIndex,
                      value,
                    );
                  },
                  onNudge: (int axisIndex, double delta) {
                    controller.nudgeSelectedPortResidualAxis(
                      false,
                      axisIndex,
                      delta,
                    );
                  },
                ),
              ),
              SizedBox(
                width: 320,
                child: _buildVectorEditor(
                  title: 'PORT RESIDUAL ROTATION (INTERFACE LOCAL DEG)',
                  values: residual.rotation,
                  enabled: true,
                  suffixText: 'deg',
                  step: 5,
                  stepLabel: '±5°',
                  fieldKey: 'port_residual_rot',
                  onSubmitted: (int axisIndex, double value) {
                    controller.updateSelectedPortResidualAxis(
                      true,
                      axisIndex,
                      value,
                    );
                  },
                  onNudge: (int axisIndex, double delta) {
                    controller.nudgeSelectedPortResidualAxis(
                      true,
                      axisIndex,
                      delta,
                    );
                  },
                ),
              ),
            ],
          ),
          if (interfacePreset != null &&
              rotatedMountProfileOffset != null &&
              rotatedPortResidualOffset != null &&
              combinedMountOffset != null &&
              resolvedLocalPosition != null) ...<Widget>[
            const SizedBox(height: 10),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFF00D9FF).withOpacity(0.05),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: const Color(0xFF00D9FF).withOpacity(0.18),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  const Text(
                    'INTERFACE LOCAL DEBUG',
                    style: TextStyle(
                      color: Color(0xFF7AE582),
                      fontSize: 10,
                      fontWeight: FontWeight.w600,
                      letterSpacing: 0.8,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    '接口锚点位置 ${_formatVector(interfacePreset.position)}',
                    style: TextStyle(
                      color: Colors.white.withOpacity(0.72),
                      fontSize: 10,
                    ),
                  ),
                  Text(
                    '接口锚点旋转 ${_formatVector(interfacePreset.rotation)}',
                    style: TextStyle(
                      color: Colors.white.withOpacity(0.72),
                      fontSize: 10,
                    ),
                  ),
                  Text(
                    '组件安装锚点 ${_formatVector(selectedModel.mountPositionOffset)}',
                    style: TextStyle(
                      color: Colors.white.withOpacity(0.72),
                      fontSize: 10,
                    ),
                  ),
                  Text(
                    '当前接口残差 ${_formatVector(residual.position)}',
                    style: TextStyle(
                      color: Colors.white.withOpacity(0.72),
                      fontSize: 10,
                    ),
                  ),
                  Text(
                    '安装锚点+残差 ${_formatVector(combinedMountOffset)}',
                    style: TextStyle(
                      color: Colors.white.withOpacity(0.72),
                      fontSize: 10,
                    ),
                  ),
                  Text(
                    '安装锚点旋转后 ${_formatVector(rotatedMountProfileOffset)}',
                    style: TextStyle(
                      color: Colors.white.withOpacity(0.72),
                      fontSize: 10,
                    ),
                  ),
                  Text(
                    '残差旋转后 ${_formatVector(rotatedPortResidualOffset)}',
                    style: TextStyle(
                      color: Colors.white.withOpacity(0.72),
                      fontSize: 10,
                    ),
                  ),
                  Text(
                    '接口+安装+残差(底座本地) ${_formatVector(resolvedLocalPosition)}',
                    style: TextStyle(
                      color: Colors.white.withOpacity(0.88),
                      fontSize: 10,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildConfigExportPanel(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.03),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Colors.white.withOpacity(0.12)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          const Text(
            'CONFIG EXPORT',
            style: TextStyle(
              color: Color(0xFF00D9FF),
              fontSize: 11,
              fontWeight: FontWeight.w600,
              letterSpacing: 0.8,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            '控制台当前值可以直接导出回配置文件。组件安装锚点对应 mount profiles，当前接口残差对应 port residuals。',
            style: TextStyle(
              color: Colors.white.withOpacity(0.58),
              fontSize: 10,
            ),
          ),
          const SizedBox(height: 10),
          _buildExportCard(
            context: context,
            title: 'MOUNT PROFILES JSON',
            targetPath: 'assets/config/digital_twin_mount_profiles.json',
            payload: controller.mountProfilesExportJson,
            accentColor: const Color(0xFF00D9FF),
          ),
          const SizedBox(height: 10),
          _buildExportCard(
            context: context,
            title: 'PORT RESIDUALS JSON',
            targetPath:
                'assets/config/digital_twin_port_component_overrides.json',
            payload: controller.portComponentOverridesExportJson,
            accentColor: const Color(0xFF7AE582),
          ),
        ],
      ),
    );
  }

  Widget _buildExportCard({
    required BuildContext context,
    required String title,
    required String targetPath,
    required String payload,
    required Color accentColor,
  }) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: const Color(0xFF0A0E1A),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Colors.white.withOpacity(0.12)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            children: <Widget>[
              Expanded(
                child: Text(
                  title,
                  style: TextStyle(
                    color: accentColor,
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    letterSpacing: 0.8,
                  ),
                ),
              ),
              TextButton.icon(
                onPressed: () => _copyExportPayload(
                  context: context,
                  payload: payload,
                  label: title,
                ),
                style: TextButton.styleFrom(
                  foregroundColor: accentColor,
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                  backgroundColor: accentColor.withOpacity(0.08),
                ),
                icon: const Icon(Icons.copy_all, size: 16),
                label: const Text('复制 JSON'),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            targetPath,
            style: TextStyle(
              color: Colors.white.withOpacity(0.5),
              fontSize: 10,
            ),
          ),
          const SizedBox(height: 8),
          Container(
            width: double.infinity,
            constraints: const BoxConstraints(maxHeight: 220),
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.03),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.white.withOpacity(0.08)),
            ),
            child: SingleChildScrollView(
              child: SelectableText(
                payload,
                style: TextStyle(
                  color: Colors.white.withOpacity(0.86),
                  fontSize: 10,
                  height: 1.5,
                  fontFamily: 'monospace',
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _copyExportPayload({
    required BuildContext context,
    required String payload,
    required String label,
  }) async {
    await Clipboard.setData(ClipboardData(text: payload));
    if (!context.mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('$label 已复制到剪贴板'),
        duration: const Duration(seconds: 2),
      ),
    );
  }

  Widget _buildLightingInspector(BuildContext context) {
    final lighting = controller.lightingConfig;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.03),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Colors.white.withOpacity(0.12)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            children: <Widget>[
              const Text(
                'SCENE LIGHTING',
                style: TextStyle(
                  color: Color(0xFF00D9FF),
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 0.8,
                ),
              ),
              const Spacer(),
              TextButton.icon(
                onPressed: controller.resetLightingConfig,
                style: TextButton.styleFrom(
                  foregroundColor: const Color(0xFF00D9FF),
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                  backgroundColor: const Color(0xFF00D9FF).withOpacity(0.08),
                ),
                icon: const Icon(Icons.light_mode_outlined, size: 16),
                label: const Text('重置灯光'),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: <Widget>[
              _buildInspectorBadge(
                lighting.backgroundHex,
                const Color(0xFF00D9FF),
              ),
              _buildInspectorBadge(
                '环境 ${lighting.ambientIntensity.toStringAsFixed(2)}',
                const Color(0xFFFFC857),
              ),
              _buildInspectorBadge(
                '主光 ${lighting.keyLightIntensity.toStringAsFixed(2)}',
                const Color(0xFF28CA42),
              ),
            ],
          ),
          const SizedBox(height: 10),
          _buildLightingSlider(
            context: context,
            title: '环境光强度',
            value: lighting.ambientIntensity,
            min: 0,
            max: 2.5,
            onChanged: (double value) {
              controller.updateLightIntensity(isAmbient: true, value: value);
            },
          ),
          const SizedBox(height: 10),
          _buildLightingSlider(
            context: context,
            title: '主光强度',
            value: lighting.keyLightIntensity,
            min: 0,
            max: 2.5,
            onChanged: (double value) {
              controller.updateLightIntensity(isAmbient: false, value: value);
            },
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: <Widget>[
              SizedBox(
                width: 320,
                child: _buildLightingBackgroundEditor(),
              ),
              SizedBox(
                width: 320,
                child: _buildLightingVectorEditor(),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildLightingSlider({
    required BuildContext context,
    required String title,
    required double value,
    required double min,
    required double max,
    required ValueChanged<double> onChanged,
  }) {
    final safeValue = value.clamp(min, max).toDouble();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Row(
          children: <Widget>[
            Text(
              title,
              style: TextStyle(
                color: Colors.white.withOpacity(0.72),
                fontSize: 11,
                fontWeight: FontWeight.w500,
              ),
            ),
            const Spacer(),
            Text(
              safeValue.toStringAsFixed(2),
              style: const TextStyle(
                color: Color(0xFF00D9FF),
                fontSize: 11,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
        SliderTheme(
          data: SliderTheme.of(context).copyWith(
            activeTrackColor: const Color(0xFF00D9FF),
            inactiveTrackColor: Colors.white.withOpacity(0.12),
            thumbColor: const Color(0xFF00D9FF),
            overlayColor: const Color(0xFF00D9FF).withOpacity(0.15),
            trackHeight: 3,
          ),
          child: Slider(
            value: safeValue,
            min: min,
            max: max,
            divisions: 50,
            onChanged: onChanged,
          ),
        ),
      ],
    );
  }

  Widget _buildLightingBackgroundEditor() {
    final lighting = controller.lightingConfig;
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: const Color(0xFF0A0E1A),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Colors.white.withOpacity(0.12)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          const Text(
            'BACKGROUND',
            style: TextStyle(
              color: Color(0xFF00D9FF),
              fontSize: 11,
              fontWeight: FontWeight.w600,
              letterSpacing: 0.8,
            ),
          ),
          const SizedBox(height: 8),
          TextFormField(
            key: ValueKey<String>('lighting-bg:${lighting.backgroundHex}'),
            initialValue: lighting.backgroundHex,
            style: const TextStyle(color: Colors.white, fontSize: 11),
            decoration: InputDecoration(
              labelText: '背景色 Hex',
              suffixText: 'Enter',
              labelStyle: const TextStyle(color: Colors.white54, fontSize: 10),
              suffixStyle: const TextStyle(color: Colors.white38, fontSize: 9),
              isDense: true,
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 8,
                vertical: 8,
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: BorderSide(color: Colors.white.withOpacity(0.14)),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: const BorderSide(color: Color(0xFF00D9FF)),
              ),
            ),
            onFieldSubmitted: controller.updateBackgroundHex,
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: <Widget>[
              for (final hex in lightingBackgroundSwatches)
                _buildLightingSwatch(hex),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildLightingSwatch(String hex) {
    final lighting = controller.lightingConfig;
    final normalized = controller.normalizeHexColor(hex);
    final selected = normalized == lighting.backgroundHex;
    return InkWell(
      onTap: () => controller.updateBackgroundHex(normalized),
      borderRadius: BorderRadius.circular(999),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: selected
              ? const Color(0xFF00D9FF).withOpacity(0.12)
              : Colors.white.withOpacity(0.03),
          borderRadius: BorderRadius.circular(999),
          border: Border.all(
            color: selected
                ? const Color(0xFF00D9FF)
                : Colors.white.withOpacity(0.12),
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            Container(
              width: 12,
              height: 12,
              decoration: BoxDecoration(
                color: controller.parseHexColor(normalized),
                shape: BoxShape.circle,
                border: Border.all(color: Colors.white.withOpacity(0.2)),
              ),
            ),
            const SizedBox(width: 6),
            Text(
              normalized,
              style: TextStyle(
                color: selected ? const Color(0xFF00D9FF) : Colors.white70,
                fontSize: 10,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLightingVectorEditor() {
    const axes = <String>['X', 'Y', 'Z'];
    final values = controller.lightingConfig.keyLightPosition;
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: const Color(0xFF0A0E1A),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Colors.white.withOpacity(0.12)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          const Text(
            'KEY LIGHT POSITION',
            style: TextStyle(
              color: Color(0xFF00D9FF),
              fontSize: 11,
              fontWeight: FontWeight.w600,
              letterSpacing: 0.8,
            ),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: <Widget>[
              for (var index = 0; index < axes.length; index++)
                _buildLightingVectorField(
                  axisIndex: index,
                  axisLabel: axes[index],
                  value: values[index],
                ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildLightingVectorField({
    required int axisIndex,
    required String axisLabel,
    required double value,
  }) {
    const step = 0.5;
    return SizedBox(
      width: 104,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          TextFormField(
            key: ValueKey<String>(
                'light:$axisLabel:${value.toStringAsFixed(2)}'),
            initialValue: value.toStringAsFixed(2),
            style: const TextStyle(color: Colors.white, fontSize: 11),
            decoration: InputDecoration(
              labelText: axisLabel,
              labelStyle: const TextStyle(color: Colors.white54, fontSize: 10),
              isDense: true,
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 8,
                vertical: 8,
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: BorderSide(color: Colors.white.withOpacity(0.14)),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: const BorderSide(color: Color(0xFF00D9FF)),
              ),
            ),
            keyboardType: const TextInputType.numberWithOptions(
              decimal: true,
              signed: true,
            ),
            onFieldSubmitted: (String text) {
              final parsed = double.tryParse(text);
              if (parsed != null) {
                controller.updateKeyLightAxis(axisIndex, parsed);
              }
            },
          ),
          const SizedBox(height: 6),
          Row(
            children: <Widget>[
              _buildNudgeButton(
                icon: Icons.remove,
                enabled: true,
                onTap: () => controller.nudgeKeyLightAxis(axisIndex, -step),
              ),
              Expanded(
                child: Center(
                  child: Text(
                    '±0.5',
                    style: TextStyle(
                      color: Colors.white.withOpacity(0.45),
                      fontSize: 9,
                    ),
                  ),
                ),
              ),
              _buildNudgeButton(
                icon: Icons.add,
                enabled: true,
                onTap: () => controller.nudgeKeyLightAxis(axisIndex, step),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildVectorEditor({
    required String title,
    required List<double> values,
    required bool enabled,
    required double step,
    required String stepLabel,
    required String fieldKey,
    String? suffixText,
    required void Function(int axisIndex, double value) onSubmitted,
    required void Function(int axisIndex, double delta) onNudge,
  }) {
    const axes = <String>['X', 'Y', 'Z'];
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.03),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Colors.white.withOpacity(0.12)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Text(
            title,
            style: const TextStyle(
              color: Color(0xFF00D9FF),
              fontSize: 11,
              fontWeight: FontWeight.w600,
              letterSpacing: 0.8,
            ),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: <Widget>[
              for (var index = 0; index < axes.length; index++)
                _buildTransformField(
                  axisIndex: index,
                  axisLabel: axes[index],
                  value: values[index],
                  enabled: enabled,
                  step: step,
                  stepLabel: stepLabel,
                  fieldKey: fieldKey,
                  suffixText: suffixText,
                  onSubmitted: onSubmitted,
                  onNudge: onNudge,
                ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildTransformField({
    required int axisIndex,
    required String axisLabel,
    required double value,
    required bool enabled,
    required double step,
    required String stepLabel,
    required String fieldKey,
    String? suffixText,
    required void Function(int axisIndex, double value) onSubmitted,
    required void Function(int axisIndex, double delta) onNudge,
  }) {
    return SizedBox(
      width: 104,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          TextFormField(
            key: ValueKey<String>(
              '${controller.selectedModelId ?? 'none'}:$axisLabel:$fieldKey:${value.toStringAsFixed(2)}',
            ),
            initialValue: value.toStringAsFixed(2),
            style: const TextStyle(color: Colors.white, fontSize: 11),
            readOnly: !enabled,
            decoration: InputDecoration(
              labelText: axisLabel,
              suffixText: suffixText,
              labelStyle: const TextStyle(color: Colors.white54, fontSize: 10),
              suffixStyle: const TextStyle(color: Colors.white38, fontSize: 9),
              isDense: true,
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 8,
                vertical: 8,
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: BorderSide(color: Colors.white.withOpacity(0.14)),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: const BorderSide(color: Color(0xFF00D9FF)),
              ),
            ),
            keyboardType: const TextInputType.numberWithOptions(
              decimal: true,
              signed: true,
            ),
            onFieldSubmitted: (String text) {
              if (!enabled) return;
              final parsed = double.tryParse(text);
              if (parsed != null) {
                onSubmitted(axisIndex, parsed);
              }
            },
          ),
          const SizedBox(height: 6),
          Row(
            children: <Widget>[
              _buildNudgeButton(
                icon: Icons.remove,
                enabled: enabled,
                onTap: () {
                  onNudge(axisIndex, -step);
                },
              ),
              Expanded(
                child: Center(
                  child: Text(
                    stepLabel,
                    style: TextStyle(
                      color: Colors.white.withOpacity(0.45),
                      fontSize: 9,
                    ),
                  ),
                ),
              ),
              _buildNudgeButton(
                icon: Icons.add,
                enabled: enabled,
                onTap: () {
                  onNudge(axisIndex, step);
                },
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildNudgeButton({
    required IconData icon,
    required bool enabled,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: enabled ? onTap : null,
      borderRadius: BorderRadius.circular(999),
      child: Container(
        width: 22,
        height: 22,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: Colors.white.withOpacity(enabled ? 0.05 : 0.02),
          border: Border.all(color: Colors.white.withOpacity(0.12)),
        ),
        child: Icon(
          icon,
          size: 12,
          color: enabled
              ? const Color(0xFF00D9FF)
              : Colors.white.withOpacity(0.26),
        ),
      ),
    );
  }
}
