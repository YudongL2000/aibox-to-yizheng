/**
 * [INPUT]: 依赖 Flutter material 能力。
 * [OUTPUT]: 对外提供 AssemblyChecklistPanel 组件、AssemblyRequirement 与 DetectedHardwareComponent 数据模型、matchesRequirement 别名匹配函数。
 * [POS]: module/home/widget 的硬件组装清单面板，被 HomeWorkspacePage 在数字孪生嵌入模式中消费，负责展示组件拼装进度，并在全部就绪后直接暴露“下发工作流/停止工作流”端侧操作按钮。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import 'package:flutter/material.dart';

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

  const DetectedHardwareComponent({
    required this.componentId,
    required this.deviceId,
    required this.displayName,
    required this.status,
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
];

Set<String> _expandAliases(String id) {
  final String normalized = id
      .trim()
      .toLowerCase()
      .replaceAll(RegExp(r'[\s-]+'), '_')
      .replaceAll(RegExp(r'\d+$'), '');
  final Set<String> result = <String>{id.toLowerCase(), normalized};
  for (final Set<String> group in _kAliasGroups) {
    if (group.contains(normalized) || group.contains(id.toLowerCase())) {
      result.addAll(group);
    }
  }
  return result;
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
  State<AssemblyChecklistPanel> createState() =>
      _AssemblyChecklistPanelState();
}

class _AssemblyChecklistPanelState extends State<AssemblyChecklistPanel> {
  bool _isRequirementMet(AssemblyRequirement req) =>
      matchesRequirement(req, widget.detectedComponents);

  bool get _allMet =>
      widget.requirements.every(_isRequirementMet);

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

  @override
  Widget build(BuildContext context) {
    if (widget.requirements.isEmpty) {
      return Container(
        width: 280,
        color: const Color(0xFF0D1117),
        padding: const EdgeInsets.all(24),
        child: const Center(
          child: Text(
            '无需硬件组装',
            style: TextStyle(
              color: Color(0xFF8B949E),
              fontSize: 14,
              fontFamilyFallback: _kChecklistFontFallback,
            ),
          ),
        ),
      );
    }

    final int metCount =
        widget.requirements.where(_isRequirementMet).length;

    return Container(
      width: 280,
      color: const Color(0xFF0D1117),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          // 头部
          Container(
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                const Text(
                  '硬件组装清单',
                  style: TextStyle(
                    color: Color(0xFFE6EDF3),
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    fontFamilyFallback: _kChecklistFontFallback,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  '$metCount / ${widget.requirements.length} 已接入',
                  style: TextStyle(
                    color: _allMet
                        ? const Color(0xFF3FB950)
                        : const Color(0xFF8B949E),
                    fontSize: 13,
                    fontFamilyFallback: _kChecklistFontFallback,
                  ),
                ),
              ],
            ),
          ),
          const Divider(color: Color(0xFF21262D), height: 1),
          // 清单列表
          Expanded(
            child: ListView.separated(
              padding: const EdgeInsets.symmetric(vertical: 8),
              itemCount: widget.requirements.length,
              separatorBuilder: (_, __) => const SizedBox(height: 2),
              itemBuilder: (BuildContext context, int index) {
                final AssemblyRequirement req = widget.requirements[index];
                final bool met = _isRequirementMet(req);
                return _ChecklistItem(
                  icon: _iconForComponent(req.componentId),
                  label: req.displayName,
                  met: met,
                );
              },
            ),
          ),
          AnimatedSwitcher(
            duration: const Duration(milliseconds: 220),
            child: _allMet
                ? Padding(
                    key: const ValueKey<String>('assembly-complete-cta'),
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: <Widget>[
                        FilledButton.icon(
                          onPressed: widget.workflowActionLoading
                              ? null
                              : widget.onUploadWorkflowPressed,
                          icon: widget.workflowActionLoading
                              ? const SizedBox(
                                  width: 16,
                                  height: 16,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: Colors.white,
                                  ),
                                )
                              : const Icon(Icons.cloud_upload_rounded, size: 18),
                          label: const Text(
                            '下发工作流',
                            style: TextStyle(
                              fontFamilyFallback: _kChecklistFontFallback,
                            ),
                          ),
                          style: FilledButton.styleFrom(
                            backgroundColor: const Color(0xFF238636),
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(
                              horizontal: 14,
                              vertical: 14,
                            ),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
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
                          style: OutlinedButton.styleFrom(
                            foregroundColor: const Color(0xFFFF7B72),
                            side: BorderSide(
                              color: const Color(0xFFFF7B72).withOpacity(0.45),
                            ),
                            padding: const EdgeInsets.symmetric(
                              horizontal: 14,
                              vertical: 14,
                            ),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                        ),
                        if ((widget.workflowActionStatus ?? '').trim().isNotEmpty) ...<Widget>[
                          const SizedBox(height: 12),
                          Text(
                            widget.workflowActionStatus!,
                            style: const TextStyle(
                              color: Color(0xFF8B949E),
                              fontSize: 12,
                              height: 1.4,
                              fontFamilyFallback: _kChecklistFontFallback,
                            ),
                          ),
                        ],
                      ],
                    ),
                  )
                : const SizedBox.shrink(),
          ),
        ],
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
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        children: <Widget>[
          Icon(
            met ? Icons.check_circle : Icons.radio_button_unchecked,
            color: met ? const Color(0xFF3FB950) : const Color(0xFF484F58),
            size: 20,
          ),
          const SizedBox(width: 12),
          Icon(icon, color: const Color(0xFF8B949E), size: 18),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              label,
              style: TextStyle(
                color: met
                    ? const Color(0xFFE6EDF3)
                    : const Color(0xFF8B949E),
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
                  ? const Color(0xFF238636).withOpacity(0.2)
                  : const Color(0xFF21262D),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Text(
              met ? '已接入' : '待接入',
              style: TextStyle(
                color: met
                    ? const Color(0xFF3FB950)
                    : const Color(0xFF8B949E),
                fontSize: 11,
                fontFamilyFallback: _kChecklistFontFallback,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
