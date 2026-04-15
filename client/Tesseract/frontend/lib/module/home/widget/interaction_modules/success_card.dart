import 'package:flutter/material.dart';

/// 成功卡片组件
class SuccessCard extends StatelessWidget {
  final String text;
  final Map<String, dynamic>? data;

  const SuccessCard({super.key, required this.text, this.data});

  @override
  Widget build(BuildContext context) {
    // 参考图5：Neural Imprint Success 卡片 - 左侧绿条、holo 图标、VERIFIED 白边
    const cyan = Color(0xFF00F2FF);
    const success = Color(0xFF4ADE80);
    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
        decoration: BoxDecoration(
          color: cyan.withOpacity(0.02),
          borderRadius: const BorderRadius.only(
            topLeft: Radius.circular(12),
            topRight: Radius.circular(32),
            bottomLeft: Radius.circular(12),
            bottomRight: Radius.circular(32),
          ),
          border: Border.all(color: Colors.white.withOpacity(0.05), width: 1),
          // borderLeft: const BorderSide(
          //   color: success,
          //   width: 4,
          // ),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            // 左侧 holo 图标（虚线光晕）
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                color: const Color(0xFF0A0F1D),
                shape: BoxShape.circle,
                border: Border.all(color: cyan, width: 1.5),
                boxShadow: [
                  BoxShadow(color: cyan.withOpacity(0.2), blurRadius: 15),
                ],
              ),
              child: const Icon(
                Icons.person_outline,
                color: Colors.white54,
                size: 28,
              ),
            ),
            const SizedBox(width: 20),
            // 内容
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Neural Imprint Success',
                    style: TextStyle(
                      color: cyan.withOpacity(0.6),
                      fontSize: 10,
                      letterSpacing: 1,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 2),
                  if (data != null) ...[
                    RichText(
                      text: TextSpan(
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.5,
                        ),
                        children: [
                          const TextSpan(text: '已经成功记住 '),
                          TextSpan(
                            text: data!['name'] ?? '',
                            style: const TextStyle(
                              color: cyan,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          const TextSpan(text: ' 的长相'),
                        ],
                      ),
                    ),
                    const SizedBox(height: 6),
                    Wrap(
                      spacing: 12,
                      runSpacing: 4,
                      children: [
                        Text(
                          'DATA_HASH: ${data!['dataHash'] ?? ''}',
                          style: TextStyle(
                            color: const Color(0xFF475569),
                            fontSize: 9,
                            fontFamily: 'monospace',
                          ),
                        ),
                        Text(
                          'CONFIDENCE: ${data!['confidence'] ?? ''}',
                          style: TextStyle(
                            color: const Color(0xFF475569),
                            fontSize: 9,
                            fontFamily: 'monospace',
                          ),
                        ),
                      ],
                    ),
                  ] else
                    Text(
                      text,
                      style: const TextStyle(color: Colors.white, fontSize: 13),
                    ),
                ],
              ),
            ),
            // 右侧 VERIFIED 白边按钮
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: success.withOpacity(0.1),
                borderRadius: BorderRadius.circular(4),
                border: Border.all(color: success.withOpacity(0.3), width: 1),
              ),
              child: const Text(
                'VERIFIED',
                style: TextStyle(
                  color: success,
                  fontSize: 10,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 1.2,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
