import 'package:flutter/material.dart';
import 'package:aitesseract/utils/spatial_design_ref.dart';

class HXProgressWidget extends StatefulWidget {
  // 高度 默认横向最大
  final double height;
  final double value;
  final Color? bgColor;
  final Color? valueColor;

  const HXProgressWidget({
    Key? key,
    this.height = 16,
    this.bgColor,
    this.valueColor,
    required this.value,
  }) : super(key: key);

  @override
  State<HXProgressWidget> createState() => _HXProgressWidgetState();
}

class _HXProgressWidgetState extends State<HXProgressWidget> {
  @override
  Widget build(BuildContext context) {
    final SpatialThemeData spatial = context.spatial;
    final Color bgColor =
        widget.bgColor ?? spatial.surface(SpatialSurfaceTone.panel);
    final Color valueColor = widget.valueColor ?? spatial.palette.accent;
    return Container(
        constraints: const BoxConstraints(
          minWidth: double.infinity,
        ),
        height: widget.height,
        child: CustomPaint(
            painter: SpaceProgressPainter(widget.value,
                bgColor: bgColor, valueColor: valueColor)));
  }
}

class SpaceProgressPainter extends CustomPainter {
  //画笔
  late Paint _mPaint;
  Color valueColor, bgColor;
  double? value;
  double strokeWidth = 4;

  SpaceProgressPainter(
    this.value, {
    required this.bgColor,
    required this.valueColor,
  }) {
    _mPaint = Paint()
      ..style = PaintingStyle.fill
      ..isAntiAlias = true;
  }

  @override
  void paint(Canvas canvas, Size size) {
    //画背景
    _mPaint.color = bgColor;
    canvas.drawRRect(
        RRect.fromRectXY(Offset.zero & size, size.height / 2, size.height / 2),
        _mPaint);
    //画进度
    _mPaint.color = valueColor;
    double valueWidth = value!.clamp(0.0, 1.0) * (size.width - strokeWidth);
    canvas.drawRRect(
        RRect.fromRectXY(
            Offset(strokeWidth / 2, strokeWidth / 2) &
                Size(valueWidth, size.height - strokeWidth),
            (size.height - strokeWidth) / 2,
            (size.height - strokeWidth) / 2),
        _mPaint);
  }

  @override
  bool shouldRepaint(CustomPainter oldDelegate) {
    return true;
  }
}
