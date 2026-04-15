import 'package:flutter/material.dart';
import 'package:aitesseract/utils/spatial_design_ref.dart';

import 'interaction_utils.dart';

/// 用户输入气泡组件
class UserInputBubble extends StatelessWidget {
  final String text;

  const UserInputBubble({
    super.key,
    required this.text,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.end,
        children: [
          Flexible(
            child: Container(
              padding: EdgeInsets.symmetric(
                horizontal: context.spatial.space4,
                vertical: context.spatial.space3,
              ),
              decoration: interactionPanelDecoration(
                context,
                tone: InteractionTone.info,
                surfaceTone: SpatialSurfaceTone.elevated,
                radius: context.spatial.radiusMd,
              ).copyWith(
                color: Color.alphaBlend(
                  interactionToneColor(context, InteractionTone.info)
                      .withValues(alpha: 0.16),
                  context.spatial.surface(SpatialSurfaceTone.elevated),
                ),
                borderRadius: interactionBubbleRadius(context, isUser: true),
              ),
              child: Text(
                text,
                style: interactionBodyStyle(
                  context,
                  size: 11,
                  weight: FontWeight.w500,
                  height: 1.6,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
