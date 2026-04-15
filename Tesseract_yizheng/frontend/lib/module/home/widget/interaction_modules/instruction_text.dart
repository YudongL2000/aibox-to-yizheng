import 'package:flutter/material.dart';
import 'package:aitesseract/utils/spatial_design_ref.dart';

import 'interaction_utils.dart';

/// 指令文本组件
class InstructionText extends StatelessWidget {
  final String text;

  const InstructionText({
    super.key,
    required this.text,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.start,
        children: [
          Flexible(
            child: Container(
              padding: EdgeInsets.symmetric(
                horizontal: context.spatial.space4,
                vertical: context.spatial.space3,
              ),
              decoration: interactionPanelDecoration(
                context,
                surfaceTone: SpatialSurfaceTone.muted,
                radius: context.spatial.radiusMd,
              ).copyWith(
                borderRadius: interactionBubbleRadius(context, isUser: false),
              ),
              child: Text(
                text,
                style: interactionBodyStyle(
                  context,
                  size: 11,
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
