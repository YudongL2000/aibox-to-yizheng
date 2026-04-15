import 'package:flutter/material.dart';
import 'package:aitesseract/utils/spatial_design_ref.dart';

// 虚线
class DashLine extends StatelessWidget {
  const DashLine(
      {Key? key,
      this.width = 2.0,
      this.height = 1.0,
      this.color,
      this.direction = Axis.horizontal,
      this.isDash = true})
      : super(key: key);

  final double width; // 虚线宽度
  final double height; // 虚线高度
  final Color? color; // 虚线颜色
  final Axis direction; // 虚线方向
  final bool isDash;

  @override
  Widget build(BuildContext context) {
    final Color fallbackColor = color ?? context.spatial.palette.borderSolid;
    return LayoutBuilder(
      builder: (BuildContext context, BoxConstraints constraints) {
        final boxWidth = direction == Axis.horizontal
            ? constraints.constrainWidth()
            : constraints.constrainHeight();
        final dashCount =
            isDash ? (boxWidth / (2 * width)).floor() : boxWidth.floor();

        return Flex(
          children: List.generate(dashCount, (_) {
            return SizedBox(
              width: direction == Axis.horizontal ? width : height,
              height: direction == Axis.horizontal ? height : width,
              child: DecoratedBox(
                decoration: BoxDecoration(color: fallbackColor),
              ),
            );
          }),
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          direction: direction,
        );
      },
    );
  }
}
