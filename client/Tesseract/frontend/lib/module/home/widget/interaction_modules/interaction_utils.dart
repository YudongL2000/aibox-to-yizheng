import 'package:flutter/material.dart';

/// 测量单行按钮标题文本宽度（用于操作按钮最小宽度：最长标题 + 5）
double measureButtonTitleWidth(
  String text, {
  double fontSize = 12,
  FontWeight fontWeight = FontWeight.w700,
}) {
  final painter = TextPainter(
    text: TextSpan(
      text: text,
      style: TextStyle(fontSize: fontSize, fontWeight: fontWeight),
    ),
    textDirection: TextDirection.ltr,
    maxLines: 1,
  )..layout(minWidth: 0, maxWidth: double.infinity);
  return painter.width;
}
