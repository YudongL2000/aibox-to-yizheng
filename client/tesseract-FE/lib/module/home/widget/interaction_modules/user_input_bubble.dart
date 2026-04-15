import 'package:flutter/material.dart';

/// 用户输入气泡组件
class UserInputBubble extends StatelessWidget {
  final String text;

  const UserInputBubble({
    super.key,
    required this.text,
  });

  @override
  Widget build(BuildContext context) {
    // 参考图2：用户消息气泡 - 右侧、胶囊状、蓝渐变、圆角 24px 4px 24px 24px
    return Padding(
      // 间距缩小为原来的一半
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.end,
        children: [
          Flexible(
            child: Container(
              // 内边距缩小为原来的一半
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [
                    Color(0xFF0066FF),
                    Color(0xFF0044CC),
                  ],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                // 圆角整体缩小一半
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(12),
                  topRight: Radius.circular(2),
                  bottomLeft: Radius.circular(12),
                  bottomRight: Radius.circular(12),
                ),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF0066FF).withOpacity(0.2),
                    blurRadius: 30,
                    offset: const Offset(0, 10),
                  ),
                ],
              ),
              child: Text(
                text,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 11, // 字号 ≈ 原来的 80%
                  fontWeight: FontWeight.w500,
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
