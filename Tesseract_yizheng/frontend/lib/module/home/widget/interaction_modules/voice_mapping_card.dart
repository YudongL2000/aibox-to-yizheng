import 'package:flutter/material.dart';
import 'package:aitesseract/utils/spatial_design_ref.dart';

import 'interaction_utils.dart';

/// 语音映射卡片组件
class VoiceMappingCard extends StatelessWidget {
  final Map<String, dynamic> voiceData;

  const VoiceMappingCard({
    super.key,
    required this.voiceData,
  });

  @override
  Widget build(BuildContext context) {
    final spatial = context.spatial;
    final accent = interactionToneColor(context, InteractionTone.info);
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Container(
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
              'VOICE PROFILE',
              style: interactionEyebrowStyle(
                context,
                color: accent.withValues(alpha: 0.72),
              ),
            ),
            SizedBox(height: spatial.space3),
            Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: accent.withValues(alpha: 0.12),
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: accent.withValues(alpha: 0.34),
                    ),
                  ),
                  child: Icon(
                    Icons.mic,
                    color: accent,
                    size: 20,
                  ),
                ),
                SizedBox(width: spatial.space3),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '${voiceData['voice'] ?? ''}',
                        style: interactionBodyStyle(
                          context,
                          size: 14,
                          weight: FontWeight.w600,
                        ),
                      ),
                      SizedBox(height: spatial.space1),
                      Wrap(
                        spacing: spatial.space4,
                        runSpacing: spatial.space1,
                        children: [
                          _metaItem(
                            context,
                            label: 'TIMBRE_ID',
                            value: voiceData['timbreId'] ?? '',
                            accent: accent,
                          ),
                          _metaItem(
                            context,
                            label: 'EMO_COEF',
                            value: '${voiceData['emoCoef'] ?? 0}',
                            accent: accent,
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                interactionStatusChip(
                  context,
                  label: 'SYNCED',
                  tone: InteractionTone.info,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _metaItem(
    BuildContext context, {
    required String label,
    required String value,
    required Color accent,
  }) {
    return RichText(
      text: TextSpan(
        children: [
          TextSpan(
            text: '$label: ',
            style: interactionEyebrowStyle(context),
          ),
          TextSpan(
            text: value,
            style: context.spatial.monoTextStyle(color: accent),
          ),
        ],
      ),
    );
  }
}
