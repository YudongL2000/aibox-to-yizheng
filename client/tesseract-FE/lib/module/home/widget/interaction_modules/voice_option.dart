import 'package:flutter/material.dart';

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
        decoration: BoxDecoration(
          color: isSelected
              ? const Color(0xFF1A2332) // 深蓝色背景（比整体背景稍亮）
              : const Color(0xFF0A0E1A), // 深色背景
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected
                ? const Color(0xFF00D9FF) // 亮蓝色边框
                : Colors.white.withOpacity(0.2), // 浅灰色细边框
            width: isSelected ? 2 : 1,
          ),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: const Color(0xFF00D9FF).withOpacity(0.5),
                    blurRadius: 8,
                    spreadRadius: 0,
                  ),
                ]
              : null,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            // 左侧圆点指示器
            Container(
              width: 8,
              height: 8,
              decoration: BoxDecoration(
                color: isSelected
                    ? const Color(0xFF00D9FF) // 亮蓝色圆点
                    : Colors.white.withOpacity(0.3), // 深灰色圆点
                shape: BoxShape.circle,
                boxShadow: isSelected
                    ? [
                        BoxShadow(
                          color: const Color(0xFF00D9FF).withOpacity(0.8),
                          blurRadius: 4,
                          spreadRadius: 1,
                        ),
                      ]
                    : null,
              ),
            ),
            const SizedBox(width: 12),
            // 选项文本
            Text(
              voice,
              style: TextStyle(
                color: isSelected ? Colors.white : Colors.white.withOpacity(0.6),
                fontSize: 14,
                fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
