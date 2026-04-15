import 'package:flutter/material.dart';
import 'package:aitesseract/utils/spatial_design_ref.dart';

import 'interaction_utils.dart';

/// 部署区域组件
class DeploymentSectionWidget extends StatelessWidget {
  final String question;
  final String cancelText;
  final String confirmText;
  final VoidCallback? onCancel;
  final VoidCallback? onConfirm;
  final bool isDeployed;
  final bool isDeploying;
  final double? maxButtonWidth;

  const DeploymentSectionWidget({
    super.key,
    this.question = '',
    this.cancelText = '暂不部署',
    this.confirmText = '一键部署到硬件',
    this.onCancel,
    this.onConfirm,
    this.isDeployed = false,
    this.isDeploying = false,
    this.maxButtonWidth,
  });

  @override
  Widget build(BuildContext context) {
    final spatial = context.spatial;
    final accent = interactionToneColor(context, InteractionTone.success);
    final disabled = isDeployed || isDeploying;
    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: Container(
        padding: EdgeInsets.symmetric(
          horizontal: spatial.space5 + 4,
          vertical: spatial.space5,
        ),
        decoration: interactionPanelDecoration(
          context,
          tone: InteractionTone.success,
          surfaceTone: SpatialSurfaceTone.panel,
          radius: spatial.radiusMd,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'DEPLOYMENT',
              style: interactionEyebrowStyle(
                context,
                color: accent.withValues(alpha: 0.74),
              ),
            ),
            if (question.isNotEmpty) ...[
              SizedBox(height: spatial.space2),
              _questionRichText(context, question, isDeployed: isDeployed),
            ],
            SizedBox(height: spatial.space5),
            _buttonRow(context, disabled),
          ],
        ),
      ),
    );
  }

  Widget _buttonRow(BuildContext context, bool disabled) {
    final spatial = context.spatial;
    final accent = interactionToneColor(context, InteractionTone.success);
    final row = Row(
      children: [
        Expanded(
          child: OutlinedButton(
            onPressed: isDeployed ? null : onCancel,
            style: spatial.secondaryButtonStyle(),
            child: Text(cancelText),
          ),
        ),
        SizedBox(width: spatial.space4),
        Expanded(
          child: FilledButton(
            onPressed: disabled ? null : onConfirm,
            style: spatial.primaryButtonStyle(accent: accent),
            child: Text(
              isDeployed ? '已部署' : (isDeploying ? '部署中...' : confirmText),
            ),
          ),
        ),
      ],
    );

    if (maxButtonWidth != null) {
      final confirmTitle =
          isDeployed ? '已部署' : (isDeploying ? '部署中...' : confirmText);
      final leftW = measureButtonTitleWidth(cancelText, fontSize: 12);
      final rightW = measureButtonTitleWidth(confirmTitle, fontSize: 12);
      final singleMin = (leftW > rightW ? leftW : rightW) + 5;
      final rowMin = 2 * singleMin + 16;
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

  Widget _questionRichText(
    BuildContext context,
    String question, {
    required bool isDeployed,
  }) {
    final accent = interactionToneColor(context, InteractionTone.success);
    final marker = '一键同步';
    final idx = question.indexOf(marker);
    if (idx < 0) {
      return Text(
        question,
        style: interactionBodyStyle(
          context,
          size: 13,
          color: isDeployed
              ? context.spatial.textMuted
              : context.spatial.palette.textPrimary,
        ),
      );
    }
    return RichText(
      text: TextSpan(
        style: interactionBodyStyle(context, size: 13),
        children: [
          TextSpan(text: question.substring(0, idx)),
          TextSpan(
            text: marker,
            style: TextStyle(
              color: accent,
              fontWeight: FontWeight.w700,
            ),
          ),
          TextSpan(text: question.substring(idx + marker.length)),
        ],
      ),
    );
  }
}
