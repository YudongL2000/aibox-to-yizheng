import 'package:flutter/material.dart';
import 'package:aitesseract/utils/spatial_design_ref.dart';

import 'interaction_utils.dart';

/// 成功卡片组件
class SuccessCard extends StatelessWidget {
  final String text;
  final Map<String, dynamic>? data;

  const SuccessCard({super.key, required this.text, this.data});

  @override
  Widget build(BuildContext context) {
    final spatial = context.spatial;
    final success = interactionToneColor(context, InteractionTone.success);
    final accent = interactionToneColor(context, InteractionTone.info);
    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: Container(
        padding: EdgeInsets.symmetric(
          horizontal: spatial.space5,
          vertical: spatial.space4 + 4,
        ),
        decoration: interactionPanelDecoration(
          context,
          tone: InteractionTone.success,
          surfaceTone: SpatialSurfaceTone.panel,
        ).copyWith(
          color: Color.alphaBlend(
            success.withValues(alpha: 0.08),
            spatial.surface(SpatialSurfaceTone.panel),
          ),
          borderRadius: BorderRadius.circular(spatial.radiusMd),
        ),
        child: Row(
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                color: spatial.surface(SpatialSurfaceTone.muted),
                shape: BoxShape.circle,
                border: Border.all(color: success.withValues(alpha: 0.42)),
              ),
              child: Icon(
                Icons.person_outline,
                color: success,
                size: 28,
              ),
            ),
            SizedBox(width: spatial.space5),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'FACE PROFILE VERIFIED',
                    style: interactionEyebrowStyle(
                      context,
                      color: success.withValues(alpha: 0.76),
                    ),
                  ),
                  SizedBox(height: spatial.space1),
                  if (data != null) ...[
                    Text(
                      '${data!['name'] ?? ''}',
                      style: spatial.cardTitleStyle().copyWith(
                            color: accent,
                          ),
                    ),
                    SizedBox(height: spatial.space2),
                    Wrap(
                      spacing: 12,
                      runSpacing: 4,
                      children: [
                        Text(
                          'DATA_HASH: ${data!['dataHash'] ?? ''}',
                          style: spatial.monoTextStyle(
                            color: spatial.textMuted,
                            size: 9,
                          ),
                        ),
                        Text(
                          'CONFIDENCE: ${data!['confidence'] ?? ''}',
                          style: spatial.monoTextStyle(
                            color: spatial.textMuted,
                            size: 9,
                          ),
                        ),
                      ],
                    ),
                  ] else
                    Text(
                      text,
                      style: interactionBodyStyle(context, size: 13),
                    ),
                ],
              ),
            ),
            interactionStatusChip(
              context,
              label: 'VERIFIED',
              tone: InteractionTone.success,
            ),
          ],
        ),
      ),
    );
  }
}
