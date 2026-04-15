import 'package:dotted_border/dotted_border.dart';
import 'package:flutter/material.dart';
import 'package:aitesseract/utils/spatial_design_ref.dart';

import 'interaction_utils.dart';

/// 图片上传区域组件
class ImageUploadArea extends StatelessWidget {
  final VoidCallback? onTap;

  const ImageUploadArea({
    super.key,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final spatial = context.spatial;
    final accent = interactionToneColor(context, InteractionTone.info);
    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: GestureDetector(
        onTap: onTap,
        child: DottedBorder(
          color: accent.withValues(alpha: 0.32),
          dashPattern: const [8, 6],
          strokeWidth: 1,
          radius: Radius.circular(spatial.radiusLg),
          borderType: BorderType.RRect,
          child: Container(
            width: double.infinity,
            height: 200,
            decoration: BoxDecoration(
              color: spatial.surface(SpatialSurfaceTone.muted),
              borderRadius: BorderRadius.circular(spatial.radiusLg),
            ),
            child: Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    '+',
                    style: TextStyle(
                      color: accent.withValues(alpha: 0.62),
                      fontSize: 44,
                      fontWeight: FontWeight.w300,
                      height: 1,
                    ),
                  ),
                  SizedBox(height: spatial.space2),
                  Text(
                    '上传人物图片',
                    style: interactionBodyStyle(
                      context,
                      size: 13,
                      weight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
