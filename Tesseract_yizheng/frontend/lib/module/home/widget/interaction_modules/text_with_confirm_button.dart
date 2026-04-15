import 'package:flutter/material.dart';
import 'package:aitesseract/utils/spatial_design_ref.dart';

import 'interaction_utils.dart';

/// 文本内容+确认按钮组件
/// 用于 hot_plugging 类型，显示文本和"已拼装完毕"按钮
class TextWithConfirmButton extends StatelessWidget {
  final String text;
  final VoidCallback? onConfirm;

  /// 是否已经点击确认（已拼装完毕）
  final bool isConfirmed;

  /// 交互按钮最大宽度（如 1/4 内容区宽度）
  final double? maxButtonWidth;

  const TextWithConfirmButton({
    super.key,
    required this.text,
    this.onConfirm,
    this.isConfirmed = false,
    this.maxButtonWidth,
  });

  @override
  Widget build(BuildContext context) {
    final spatial = context.spatial;
    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.start,
            children: [
              Flexible(
                child: Container(
                  padding: EdgeInsets.symmetric(
                    horizontal: spatial.space5,
                    vertical: spatial.space4 + 2,
                  ),
                  decoration: interactionPanelDecoration(
                    context,
                    surfaceTone: SpatialSurfaceTone.muted,
                    radius: spatial.radiusMd,
                  ).copyWith(
                    borderRadius: interactionBubbleRadius(
                      context,
                      isUser: false,
                    ),
                  ),
                  child: Text(
                    text,
                    style: interactionBodyStyle(
                      context,
                      size: 14,
                      height: 1.6,
                    ),
                  ),
                ),
              ),
            ],
          ),
          if (onConfirm != null || isConfirmed) ...[
            const SizedBox(height: 12),
            Center(
              child: _wrapButton(
                FilledButton(
                  onPressed: isConfirmed ? null : onConfirm,
                  style: spatial.primaryButtonStyle(
                    accent: isConfirmed
                        ? spatial.surfaceElevated
                        : spatial.palette.semSuccess,
                  ),
                  child: Text(isConfirmed ? '已完成' : '已拼装完毕'),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _wrapButton(Widget button) {
    if (maxButtonWidth != null) {
      // 按当前显示标题测量：isConfirmed ?「已完成」:「已拼装完毕」
      final title = isConfirmed ? '已完成' : '已拼装完毕';
      final minW = (measureButtonTitleWidth(title, fontSize: 14) + 5)
          .clamp(0.0, maxButtonWidth!);
      return ConstrainedBox(
        constraints: BoxConstraints(
          minWidth: minW,
          maxWidth: maxButtonWidth!,
        ),
        child: button,
      );
    }
    return button;
  }
}
