import 'package:flutter/material.dart';
import 'package:aitesseract/utils/spatial_design_ref.dart';

///
/// create_user: zhengzaihong
/// email:1096877329@qq.com
/// create_date: 2022/10/20
/// create_time: 18:10
/// describe: 绘制分割线 横轴纵轴
///
class SeparatorView extends StatelessWidget {
  final Color color;
  final double dashWidth;
  final double dashHeight;
  final Axis direction;
  final Color? color;

  const SeparatorView(
      {this.dashHeight = 1,
      this.color,
      this.dashWidth = 10,
      this.direction = Axis.horizontal,
      Key? key})
      : super(key: key);

  @override
  Widget build(BuildContext context) {
    final SpatialThemeData spatial = context.spatial;
    final Color separatorColor = color ?? spatial.palette.borderSolid;

    if (direction == Axis.vertical) {
      return LayoutBuilder(
        builder: (BuildContext context, BoxConstraints constraints) {
          final boxHeight = constraints.constrainHeight();
          final dashCount = (boxHeight / (2 * dashHeight)).floor();
          return Flex(
            children: List.generate(dashCount, (_) {
              return SizedBox(
                width: dashWidth,
                height: dashHeight,
                child: DecoratedBox(
                  decoration: BoxDecoration(color: separatorColor),
                ),
              );
            }),
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            direction: direction,
          );
        },
      );
    }

    return LayoutBuilder(
      builder: (BuildContext context, BoxConstraints constraints) {
        final boxWidth = constraints.constrainWidth();
        final dashCount = (boxWidth / (2 * dashWidth)).floor();
        return Flex(
          children: List.generate(dashCount, (_) {
            return SizedBox(
              width: dashWidth,
              height: dashHeight,
              child: DecoratedBox(
                decoration: BoxDecoration(color: separatorColor),
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
