/*
 * [INPUT]: 依赖 Flutter Material、Spatial design tokens 与 workflow 详情键值。
 * [OUTPUT]: 对外提供 WorkflowDetailsWidget，渲染 workflow 标题、有效详情项与确认/继续 CTA，并在继续交流时提供按钮级 loading 反馈。
 * [POS]: module/home/widget/interaction_modules 的 workflow 结果卡片，用于承接 blueprint confirm 后的工作流确认阶段。
 * [PROTOCOL]: 变更时更新此头部，然后检查同目录 README.md / 上层 AGENTS.md。
 */

import 'package:flutter/material.dart';
import 'package:aitesseract/utils/spatial_design_ref.dart';

import 'interaction_utils.dart';

/// 工作流详情组件
class WorkflowDetailsWidget extends StatelessWidget {
  final Map<String, String> details;
  final VoidCallback? onContinue;
  final VoidCallback? onConfirm;
  final bool isCreated;
  final bool isCreating;
  final bool isContinuing;
  final double? maxButtonWidth;

  const WorkflowDetailsWidget({
    super.key,
    required this.details,
    this.onContinue,
    this.onConfirm,
    this.isCreated = false,
    this.isCreating = false,
    this.isContinuing = false,
    this.maxButtonWidth,
  });

  @override
  Widget build(BuildContext context) {
    final spatial = context.spatial;
    final visibleDetails = details.entries
        .where(
          (entry) =>
              entry.key.trim().isNotEmpty && entry.value.trim().isNotEmpty,
        )
        .toList(growable: false);
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Container(
        padding: EdgeInsets.all(spatial.space4),
        decoration: interactionPanelDecoration(
          context,
          tone: isCreated ? InteractionTone.neutral : InteractionTone.info,
          surfaceTone:
              isCreated ? SpatialSurfaceTone.muted : SpatialSurfaceTone.panel,
          radius: spatial.radiusMd,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'WORKFLOW SPEC',
              style: interactionEyebrowStyle(
                context,
                color: interactionToneColor(
                  context,
                  isCreated ? InteractionTone.neutral : InteractionTone.info,
                ).withValues(alpha: 0.74),
              ),
            ),
            SizedBox(
              height: visibleDetails.isEmpty ? spatial.space3 : spatial.space2,
            ),
            ...visibleDetails
                .map((entry) => _detailItem(context, entry.key, entry.value)),
            if (visibleDetails.isNotEmpty) SizedBox(height: spatial.space3),
            _buttonRow(context),
          ],
        ),
      ),
    );
  }

  Widget _buttonRow(BuildContext context) {
    final spatial = context.spatial;
    final accent = interactionToneColor(context, InteractionTone.info);
    final disabled = isCreated || isCreating;
    final row = Row(
      children: [
        Expanded(
          child: OutlinedButton(
            onPressed: isContinuing ? null : onContinue,
            style: spatial.secondaryButtonStyle(),
            child: interactionActionButtonChild(
              context,
              label: isContinuing ? '发送中...' : '继续交流',
              isLoading: isContinuing,
              color: spatial.palette.textPrimary,
            ),
          ),
        ),
        SizedBox(width: spatial.space2),
        Expanded(
          child: FilledButton(
            onPressed: disabled ? null : onConfirm,
            style: spatial.primaryButtonStyle(accent: accent),
            child: Text(
              isCreated
                  ? (isCreating ? '构建中...' : '已创建工作流')
                  : (isCreating ? '构建中...' : '确认构建工作流'),
            ),
          ),
        ),
      ],
    );

    if (maxButtonWidth != null) {
      final leftW = measureButtonTitleWidth(
        isContinuing ? '发送中...' : '继续交流',
        fontSize: 9,
      );
      final rightTitle = isCreated
          ? (isCreating ? '构建中...' : '已创建工作流')
          : (isCreating ? '构建中...' : '确认构建工作流');
      final rightW = measureButtonTitleWidth(rightTitle, fontSize: 9);
      final singleMin = (leftW > rightW ? leftW : rightW) + 5;
      final rowMin = 2 * singleMin + 8;
      final minW = rowMin.clamp(0.0, maxButtonWidth!);
      return Center(
        child: ConstrainedBox(
          constraints: BoxConstraints(
            minWidth: minW,
            maxWidth: maxButtonWidth!,
          ),
          child: row,
        ),
      );
    }
    return Center(child: row);
  }

  Widget _detailItem(BuildContext context, String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(right: 8, top: 4),
            child: interactionDot(context, tone: InteractionTone.info, size: 6),
          ),
          Expanded(
            child: RichText(
              text: TextSpan(
                children: [
                  TextSpan(
                    text: '$label: ',
                    style: interactionEyebrowStyle(
                      context,
                      color: context.spatial.textMuted,
                    ),
                  ),
                  TextSpan(
                    text: value,
                    style: interactionBodyStyle(context, size: 10),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
