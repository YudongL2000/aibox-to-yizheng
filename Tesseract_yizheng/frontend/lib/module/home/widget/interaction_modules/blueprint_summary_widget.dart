import 'package:flutter/material.dart';
import 'package:aitesseract/utils/spatial_design_ref.dart';

import 'interaction_utils.dart';

/// 蓝图摘要组件
class BlueprintSummaryWidget extends StatelessWidget {
  final String? intentSummary;
  final List<String>? missingFields;
  final List<Map<String, dynamic>>? triggers;
  final List<Map<String, dynamic>>? logic;
  final List<Map<String, dynamic>>? executors;
  final VoidCallback? onContinue;
  final VoidCallback? onConfirm;
  final bool isBuilt;
  final double? maxButtonWidth;

  const BlueprintSummaryWidget({
    super.key,
    this.intentSummary,
    this.missingFields,
    this.triggers,
    this.logic,
    this.executors,
    this.onContinue,
    this.onConfirm,
    this.isBuilt = false,
    this.maxButtonWidth,
  });

  @override
  Widget build(BuildContext context) {
    final spatial = context.spatial;
    final accent = interactionToneColor(
      context,
      isBuilt ? InteractionTone.neutral : InteractionTone.info,
    );

    return Container(
      padding: EdgeInsets.all(spatial.space4),
      decoration: interactionPanelDecoration(
        context,
        tone: isBuilt ? InteractionTone.neutral : InteractionTone.info,
        surfaceTone:
            isBuilt ? SpatialSurfaceTone.muted : SpatialSurfaceTone.panel,
        radius: spatial.radiusMd,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            isBuilt ? 'WORKFLOW BUILT' : 'WORKFLOW BLUEPRINT',
            style: interactionEyebrowStyle(
              context,
              color: accent.withValues(alpha: 0.74),
            ),
          ),
          SizedBox(height: spatial.space2),
          if (intentSummary != null && intentSummary!.isNotEmpty) ...[
            _section(context, '意图摘要', intentSummary!, isBuilt),
            SizedBox(height: spatial.space2),
          ],
          if (triggers != null && triggers!.isNotEmpty) ...[
            _section(context, '触发器', '${triggers!.length} 个触发器', isBuilt),
            SizedBox(height: spatial.space2),
          ],
          if (logic != null && logic!.isNotEmpty) ...[
            _section(context, '逻辑节点', '${logic!.length} 个逻辑节点', isBuilt),
            SizedBox(height: spatial.space2),
          ],
          if (executors != null && executors!.isNotEmpty) ...[
            _section(context, '执行器', '${executors!.length} 个执行器', isBuilt),
            SizedBox(height: spatial.space2),
          ],
          if (missingFields != null && missingFields!.isNotEmpty)
            _section(context, '缺失字段', missingFields!.join(', '), isBuilt),
          if (onContinue != null || onConfirm != null) ...[
            SizedBox(height: spatial.space3),
            _buttonRow(context),
          ],
        ],
      ),
    );
  }

  Widget _buttonRow(BuildContext context) {
    final spatial = context.spatial;
    final accent = interactionToneColor(context, InteractionTone.info);
    final row = Row(
      children: [
        if (onContinue != null)
          Expanded(
            child: OutlinedButton(
              onPressed: onContinue,
              style: spatial.secondaryButtonStyle(),
              child: const Text('继续交流'),
            ),
          ),
        if (onContinue != null && onConfirm != null)
          SizedBox(width: spatial.space2),
        if (onConfirm != null)
          Expanded(
            child: FilledButton(
              onPressed: isBuilt ? null : onConfirm,
              style: spatial.primaryButtonStyle(accent: accent),
              child: Text(isBuilt ? '已构建' : '确认构建'),
            ),
          ),
      ],
    );

    if (maxButtonWidth != null) {
      final leftW = measureButtonTitleWidth('继续交流', fontSize: 9);
      final rightTitle = isBuilt ? '已构建' : '确认构建';
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

  Widget _section(
    BuildContext context,
    String label,
    String value,
    bool built,
  ) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 56,
          child: Text(
            '$label:',
            style: interactionEyebrowStyle(
              context,
              color:
                  context.spatial.textMuted.withValues(alpha: built ? 0.7 : 1),
            ),
          ),
        ),
        Expanded(
          child: Text(
            value,
            style: interactionBodyStyle(
              context,
              size: 10,
              color: built
                  ? context.spatial.textMuted
                  : context.spatial.palette.textPrimary,
            ),
          ),
        ),
      ],
    );
  }
}
