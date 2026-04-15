import 'package:flutter/material.dart';
import 'package:aitesseract/utils/spatial_design_ref.dart';

import 'interaction_utils.dart';

/// 工作流确认组件
class WorkflowConfirmWidget extends StatelessWidget {
  final String? workflowName;
  final int? nodeCount;
  final Map<String, dynamic>? workflowData;
  final VoidCallback? onConfirm;
  final VoidCallback? onCancel;

  const WorkflowConfirmWidget({
    super.key,
    this.workflowName,
    this.nodeCount,
    this.workflowData,
    this.onConfirm,
    this.onCancel,
  });

  @override
  Widget build(BuildContext context) {
    final spatial = context.spatial;
    final accent = interactionToneColor(context, InteractionTone.info);
    return Container(
      padding: EdgeInsets.all(spatial.space4),
      decoration: interactionPanelDecoration(
        context,
        tone: InteractionTone.info,
        surfaceTone: SpatialSurfaceTone.panel,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'WORKFLOW READY',
            style: interactionEyebrowStyle(
              context,
              color: accent.withValues(alpha: 0.72),
            ),
          ),
          SizedBox(height: spatial.space3),
          if (workflowName != null && workflowName!.isNotEmpty) ...[
            _detailRow(context, '工作流名称', workflowName!),
            SizedBox(height: spatial.space2),
          ],
          if (nodeCount != null) ...[
            _detailRow(context, '节点数量', '$nodeCount'),
            SizedBox(height: spatial.space2),
          ],
          if (workflowData != null) ...[
            _detailRow(
              context,
              '工作流ID',
              workflowData!['id']?.toString() ?? '',
            ),
            SizedBox(height: spatial.space2),
          ],
          SizedBox(height: spatial.space4),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: onCancel,
                  style: spatial.secondaryButtonStyle(),
                  child: const Text('取消'),
                ),
              ),
              SizedBox(width: spatial.space3),
              Expanded(
                flex: 2,
                child: FilledButton(
                  onPressed: onConfirm,
                  style: spatial.primaryButtonStyle(accent: accent),
                  child: const Text('确认构建'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _detailRow(BuildContext context, String label, String value) {
    return Row(
      children: [
        Text(
          '$label: ',
          style: interactionEyebrowStyle(
            context,
            color: context.spatial.textMuted,
          ),
        ),
        Expanded(
          child: Text(
            value,
            style: interactionBodyStyle(context, size: 12),
          ),
        ),
      ],
    );
  }
}
