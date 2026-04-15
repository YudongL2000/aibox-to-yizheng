import 'package:flutter/material.dart';

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
    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 文本内容（使用 InstructionText 样式）
          Row(
            mainAxisAlignment: MainAxisAlignment.start,
            children: [
              Flexible(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 18),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.03),
                    borderRadius: const BorderRadius.only(
                      topLeft: Radius.circular(4),
                      topRight: Radius.circular(24),
                      bottomLeft: Radius.circular(24),
                      bottomRight: Radius.circular(24),
                    ),
                    border: Border.all(
                      color: Colors.white.withOpacity(0.05),
                      width: 1,
                    ),
                  ),
                  child: Text(
                    text,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 14,
                      fontWeight: FontWeight.normal,
                      height: 1.6,
                    ),
                  ),
                ),
              ),
            ],
          ),
          // 确认按钮
          if (onConfirm != null || isConfirmed) ...[
            const SizedBox(height: 12),
            Center(
              child: _wrapButton(
                ElevatedButton(
                  onPressed: isConfirmed ? null : onConfirm,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: isConfirmed
                        ? Colors.grey
                        : const Color(0xFF00D9FF),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(
                      horizontal: 24,
                      vertical: 12,
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
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
      final minW =
          (measureButtonTitleWidth(title, fontSize: 14) + 5)
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
