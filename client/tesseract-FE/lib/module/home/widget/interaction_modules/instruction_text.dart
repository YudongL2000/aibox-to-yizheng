import 'package:flutter/material.dart';

/// 指令文本组件
class InstructionText extends StatelessWidget {
  final String text;

  const InstructionText({
    super.key,
    required this.text,
  });

  @override
  Widget build(BuildContext context) {
    // 参考图2：AI 回复气泡 - 左侧、深灰、圆角 4px 24px 24px 24px
    return Padding(
      // 间距缩小为原来的一半
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.start,
        children: [
          Flexible(
            child: Container(
              // 内边距缩小为原来的一半
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.03),
                // 圆角整体缩小一半
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(2),
                  topRight: Radius.circular(12),
                  bottomLeft: Radius.circular(12),
                  bottomRight: Radius.circular(12),
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
                  fontSize: 11, // 字号 ≈ 原来的 80%
                  fontWeight: FontWeight.normal,
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
