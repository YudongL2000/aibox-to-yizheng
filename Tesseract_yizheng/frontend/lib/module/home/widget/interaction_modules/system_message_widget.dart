import 'package:flutter/material.dart';
import 'package:aitesseract/utils/spatial_design_ref.dart';

import 'interaction_utils.dart';

/// 系统消息组件
class SystemMessageWidget extends StatelessWidget {
  final String text;

  const SystemMessageWidget({
    super.key,
    required this.text,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        children: [
          interactionStatusChip(
            context,
            label: 'SYSTEM',
            tone: InteractionTone.neutral,
          ),
          SizedBox(width: context.spatial.space3),
          Expanded(
            child: Text(
              text,
              style: interactionBodyStyle(
                context,
                size: 12,
                color: context.spatial.textMuted,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
