import 'package:flutter/material.dart';
import 'package:aitesseract/utils/spatial_design_ref.dart';

import 'interaction_utils.dart';

/// 语音选项组件
class VoiceOption extends StatelessWidget {
  final String voice;
  final bool isSelected;
  final VoidCallback onTap;

  const VoiceOption({
    super.key,
    required this.voice,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: interactionOptionDecoration(
          context,
          isSelected: isSelected,
          tone: InteractionTone.info,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            interactionDot(
              context,
              tone: isSelected ? InteractionTone.info : InteractionTone.neutral,
            ),
            const SizedBox(width: 12),
            Text(
              voice,
              style: interactionBodyStyle(
                context,
                size: 14,
                weight: isSelected ? FontWeight.w600 : FontWeight.w400,
                color: isSelected
                    ? context.spatial.palette.textPrimary
                    : context.spatial.textMuted,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
