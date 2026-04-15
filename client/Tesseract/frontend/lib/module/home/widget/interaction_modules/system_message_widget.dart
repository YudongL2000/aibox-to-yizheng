import 'package:flutter/material.dart';

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
      child: Text(
        text,
        style: TextStyle(
          color: Colors.white.withOpacity(0.6),
          fontSize: 12,
        ),
      ),
    );
  }
}
