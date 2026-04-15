import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:aitesseract/utils/spatial_design_ref.dart';

import 'interaction_utils.dart';

/// 图片预览组件
class ImagePreview extends StatelessWidget {
  final String? imageUrl;
  final String? imageBase64;
  final String? profile;
  final VoidCallback? onConfirm;
  final VoidCallback? onReselect;
  final bool isSubmitting;
  final String confirmText;
  final String submittingText;

  const ImagePreview({
    super.key,
    this.imageUrl,
    this.imageBase64,
    this.profile,
    this.onConfirm,
    this.onReselect,
    this.isSubmitting = false,
    this.confirmText = '确认',
    this.submittingText = '处理中...',
  });

  @override
  Widget build(BuildContext context) {
    final spatial = context.spatial;
    final accent = interactionToneColor(context, InteractionTone.info);
    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: Container(
        width: double.infinity,
        padding: EdgeInsets.all(spatial.space5),
        decoration: interactionPanelDecoration(
          context,
          tone: InteractionTone.info,
          surfaceTone: SpatialSurfaceTone.panel,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Text(
                  'IMAGE PREVIEW',
                  style: interactionEyebrowStyle(
                    context,
                    color: accent.withValues(alpha: 0.74),
                  ),
                ),
                const Spacer(),
                interactionStatusChip(
                  context,
                  label: isSubmitting ? 'PROCESSING' : 'READY',
                  tone: InteractionTone.info,
                ),
              ],
            ),
            SizedBox(height: spatial.space4),
            Container(
              width: double.infinity,
              height: 120,
              decoration: interactionPanelDecoration(
                context,
                surfaceTone: SpatialSurfaceTone.muted,
                radius: spatial.radiusMd,
              ),
              child: _buildImageContent(),
            ),
            if (onConfirm != null || onReselect != null) ...[
              SizedBox(height: spatial.space5),
              Row(
                children: [
                  if (onReselect != null)
                    Expanded(
                      child: OutlinedButton(
                        onPressed: isSubmitting ? null : onReselect,
                        style: spatial.secondaryButtonStyle(),
                        child: const Text('重新选择'),
                      ),
                    ),
                  if (onReselect != null && onConfirm != null)
                    SizedBox(width: spatial.space3),
                  if (onConfirm != null)
                    Expanded(
                      flex: onReselect != null ? 2 : 1,
                      child: FilledButton(
                        onPressed: isSubmitting ? null : onConfirm,
                        style: spatial.primaryButtonStyle(accent: accent),
                        child: interactionActionButtonChild(
                          context,
                          label: isSubmitting ? submittingText : confirmText,
                          isLoading: isSubmitting,
                        ),
                      ),
                    ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildImageContent() {
    if (imageUrl != null) {
      return ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: Image.network(
          imageUrl!,
          fit: BoxFit.cover,
          errorBuilder: (context, error, stackTrace) {
            return _buildPlaceholder();
          },
        ),
      );
    }

    if (imageBase64 != null) {
      try {
        String base64String = imageBase64!;
        if (base64String.contains(',')) {
          base64String = base64String.split(',').last;
        }
        final bytes = base64Decode(base64String);
        return ClipRRect(
          borderRadius: BorderRadius.circular(12),
          child: Image.memory(
            bytes,
            fit: BoxFit.cover,
            errorBuilder: (context, error, stackTrace) {
              return _buildPlaceholder();
            },
          ),
        );
      } catch (_) {
        return _buildPlaceholder();
      }
    }

    return _buildPlaceholder();
  }

  Widget _buildPlaceholder() {
    return Builder(
      builder: (context) => Center(
        child: Icon(
          Icons.image_outlined,
          color: interactionToneColor(context, InteractionTone.info)
              .withValues(alpha: 0.42),
          size: 28,
        ),
      ),
    );
  }
}
