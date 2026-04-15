/*
 * [INPUT]: 依赖 Flutter material 能力。
 * [OUTPUT]: 对外提供 AssemblyChecklistPanel 组件、AssemblyRequirement 与 DetectedHardwareComponent 数据模型、matchesRequirement 别名匹配函数，并复用 Spatial dark shell 的低圆角 list/button/status 语义；面板自身改为单层 self-contained shell，并在高度受限时改为整卡自滚动，不再依赖父级二次包壳。
 * [POS]: module/home/widget 的硬件组装清单面板，被 HomeWorkspacePage 在数字孪生嵌入模式中消费，负责展示组件拼装进度，并在全部就绪后直接暴露“下发工作流/停止工作流”端侧操作按钮。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import 'package:flutter/material.dart';
import 'package:aitesseract/utils/spatial_design_ref.dart';

const List<String> _kChecklistFontFallback = <String>[
  'PingFang SC',
  'Microsoft YaHei',
  'Noto Sans SC',
  'sans-serif',
];

// =========================================================================
// 数据模型
// =========================================================================

class AssemblyRequirement {
  final String componentId;
  final String displayName;

  const AssemblyRequirement({
    required this.componentId,
    required this.displayName,
  });
}

class DetectedHardwareComponent {
  final String componentId;
  final String deviceId;
  final String displayName;
  final String status;
  final String portId;
  final String modelId;

  const DetectedHardwareComponent({
    required this.componentId,
    required this.deviceId,
    required this.displayName,
    required this.status,
    this.portId = '',
    this.modelId = '',
  });
}

// =========================================================================
// 别名匹配
// =========================================================================

const List<Set<String>> _kAliasGroups = <Set<String>>[
  <String>{'cam', 'camera', 'webcam', 'usb_camera', 'cam_001'},
  <String>{'wheel', 'chassis', 'base'},
  <String>{'mic', 'microphone', 'mic_001'},
  <String>{'mechanical_hand', 'hand', 'claw'},
  <String>{'speaker'},
  <String>{'screen', 'display', 'screen1'},
];

Set<String> _expandAliases(String id) {
  final String normalized = _normalizeAliasToken(id);
  final Set<String> result = <String>{id.toLowerCase(), normalized};
  for (final Set<String> group in _kAliasGroups) {
    if (group.contains(normalized) || group.contains(id.toLowerCase())) {
      result.addAll(group);
    }
  }
  return result;
}

String _normalizeAliasToken(String raw) {
  final StringBuffer buffer = StringBuffer();
  bool previousUnderscore = false;
  for (final int rune in raw.trim().toLowerCase().runes) {
    final String char = String.fromCharCode(rune);
    final bool shouldCollapse = char == ' ' || char == '-' || char == '_';
    if (shouldCollapse) {
      if (!previousUnderscore && buffer.isNotEmpty) {
        buffer.write('_');
      }
      previousUnderscore = true;
      continue;
    }
    buffer.write(char);
    previousUnderscore = false;
  }

  String normalized = buffer.toString();
  int end = normalized.length;
  while (end > 0) {
    final int codeUnit = normalized.codeUnitAt(end - 1);
    if (codeUnit < 48 || codeUnit > 57) {
      break;
    }
    end -= 1;
  }
  if (end > 0 && normalized[end - 1] == '_') {
    end -= 1;
  }
  normalized = normalized.substring(0, end);
  return normalized;
}

bool matchesRequirement(
  AssemblyRequirement req,
  List<DetectedHardwareComponent> detected,
) {
  final Set<String> reqTokens = _expandAliases(req.componentId);
  return detected.any((DetectedHardwareComponent c) {
    if (c.status == 'removed' || c.status == 'error') return false;
    final Set<String> detTokens = _expandAliases(c.componentId);
    return reqTokens.any((String t) => detTokens.contains(t));
  });
}

// =========================================================================
// 组装清单面板
// =========================================================================

class AssemblyChecklistPanel extends StatefulWidget {
  final List<AssemblyRequirement> requirements;
  final List<DetectedHardwareComponent> detectedComponents;
  final VoidCallback onUploadWorkflowPressed;
  final VoidCallback onStopWorkflowPressed;
  final bool workflowActionLoading;
  final String? workflowActionStatus;

  const AssemblyChecklistPanel({
    super.key,
    required this.requirements,
    required this.detectedComponents,
    required this.onUploadWorkflowPressed,
    required this.onStopWorkflowPressed,
    this.workflowActionLoading = false,
    this.workflowActionStatus,
  });

  @override
  State<AssemblyChecklistPanel> createState() => _AssemblyChecklistPanelState();
}

class _AssemblyChecklistPanelState extends State<AssemblyChecklistPanel> {
  bool _isRequirementMet(AssemblyRequirement req) =>
      matchesRequirement(req, widget.detectedComponents);

  bool get _allMet => widget.requirements.every(_isRequirementMet);

  IconData _iconForComponent(String componentId) {
    final String lower = componentId.toLowerCase();
    final Set<String> tokens = _expandAliases(lower);
    if (tokens.contains('camera')) return Icons.videocam;
    if (tokens.contains('mic') || tokens.contains('microphone')) {
      return Icons.mic;
    }
    if (tokens.contains('speaker')) return Icons.volume_up;
    if (tokens.contains('wheel') || tokens.contains('chassis')) {
      return Icons.directions_car;
    }
    if (tokens.contains('mechanical_hand') || tokens.contains('claw')) {
      return Icons.pan_tool;
    }
    return Icons.memory;
  }

  List<Widget> _buildRequirementItems() {
    final List<Widget> children = <Widget>[];
    for (int index = 0; index < widget.requirements.length; index += 1) {
      if (index > 0) {
        children.add(const SizedBox(height: 6));
      }
      final AssemblyRequirement req = widget.requirements[index];
      final bool met = _isRequirementMet(req);
      children.add(
        _ChecklistItem(
          icon: _iconForComponent(req.componentId),
          label: req.displayName,
          met: met,
        ),
      );
    }
    return children;
  }

  @override
  Widget build(BuildContext context) {
    final spatial = context.spatial;
    final accent = _allMet
        ? spatial.status(SpatialStatusTone.success)
        : spatial.status(SpatialStatusTone.neutral);
    if (widget.requirements.isEmpty) {
      return DecoratedBox(
        decoration: spatial.panelDecoration(
          tone: SpatialSurfaceTone.panel,
          accent: accent,
          radius: spatial.radiusMd,
        ),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Center(
            child: Text(
              '无需硬件组装',
              style: spatial.captionTextStyle().copyWith(
                    fontSize: 14,
                    fontFamilyFallback: _kChecklistFontFallback,
                  ),
            ),
          ),
        ),
      );
    }

    final int metCount = widget.requirements.where(_isRequirementMet).length;

    return DecoratedBox(
      decoration: spatial.panelDecoration(
        tone: SpatialSurfaceTone.panel,
        accent: accent,
        radius: spatial.radiusMd,
      ),
      child: LayoutBuilder(
        builder: (BuildContext context, BoxConstraints constraints) {
          final double minHeight =
              constraints.hasBoundedHeight ? constraints.maxHeight : 0;
          return SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
            physics: const ClampingScrollPhysics(),
            child: ConstrainedBox(
              constraints: BoxConstraints(minHeight: minHeight),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Row(
                    children: <Widget>[
                      const Expanded(
                        child: Text(
                          '硬件组装清单',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            fontFamilyFallback: _kChecklistFontFallback,
                          ),
                        ),
                      ),
                      Text(
                        '$metCount / ${widget.requirements.length}',
                        style: spatial
                            .monoTextStyle(
                              color: _allMet ? accent : spatial.textMuted,
                              size: 11,
                            )
                            .copyWith(
                              fontFamilyFallback: _kChecklistFontFallback,
                            ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  ..._buildRequirementItems(),
                  if (_allMet) ...<Widget>[
                    const SizedBox(height: 16),
                    FilledButton.icon(
                      onPressed: widget.workflowActionLoading
                          ? null
                          : widget.onUploadWorkflowPressed,
                      icon: widget.workflowActionLoading
                          ? SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: spatial.palette.textInverse,
                              ),
                            )
                          : const Icon(Icons.cloud_upload_rounded, size: 18),
                      label: const Text(
                        '下发工作流',
                        style: TextStyle(
                          fontFamilyFallback: _kChecklistFontFallback,
                        ),
                      ),
                      style: spatial.primaryButtonStyle(
                        accent: spatial.status(SpatialStatusTone.success),
                      ),
                    ),
                    const SizedBox(height: 10),
                    OutlinedButton.icon(
                      onPressed: widget.workflowActionLoading
                          ? null
                          : widget.onStopWorkflowPressed,
                      icon: const Icon(Icons.stop_circle_outlined, size: 18),
                      label: const Text(
                        '停止工作流',
                        style: TextStyle(
                          fontFamilyFallback: _kChecklistFontFallback,
                        ),
                      ),
                      style: spatial.dangerButtonStyle(),
                    ),
                    if ((widget.workflowActionStatus ?? '')
                        .trim()
                        .isNotEmpty) ...<Widget>[
                      const SizedBox(height: 12),
                      Text(
                        widget.workflowActionStatus!,
                        style: spatial.captionTextStyle().copyWith(
                              fontFamilyFallback: _kChecklistFontFallback,
                            ),
                      ),
                    ],
                  ],
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

// =========================================================================
// 单行清单项
// =========================================================================

class _ChecklistItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool met;

  const _ChecklistItem({
    required this.icon,
    required this.label,
    required this.met,
  });

  @override
  Widget build(BuildContext context) {
    final spatial = context.spatial;
    final success = spatial.status(SpatialStatusTone.success);
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        children: <Widget>[
          Icon(
            met ? Icons.check_circle : Icons.radio_button_unchecked,
            color: met ? success : spatial.textMuted.withValues(alpha: 0.55),
            size: 20,
          ),
          const SizedBox(width: 12),
          Icon(icon, color: spatial.textMuted, size: 18),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              label,
              style: TextStyle(
                color: met ? spatial.palette.textPrimary : spatial.textMuted,
                fontSize: 14,
                fontFamilyFallback: _kChecklistFontFallback,
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
            decoration: BoxDecoration(
              color: met
                  ? success.withValues(alpha: 0.14)
                  : spatial.surface(SpatialSurfaceTone.dataBlock),
              borderRadius: BorderRadius.circular(context.spatial.radiusSm),
              border: Border.all(
                color: met
                    ? success.withValues(alpha: 0.24)
                    : spatial.borderSubtle,
              ),
            ),
            child: Text(
              met ? '已接入' : '待接入',
              style: spatial
                  .monoTextStyle(
                    color: met ? success : spatial.textMuted,
                    size: 10,
                  )
                  .copyWith(
                    fontFamilyFallback: _kChecklistFontFallback,
                  ),
            ),
          ),
        ],
      ),
    );
  }
}
