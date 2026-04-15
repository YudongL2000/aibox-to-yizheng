import 'package:flutter/material.dart';
import 'package:aitesseract/utils/spatial_design_ref.dart';

class FontIcon extends StatelessWidget {
  final int codePoint;
  final double? size;
  final Color? color;

  FontIcon(this.codePoint, {this.size, this.color});

  @override
  Widget build(BuildContext context) {
    final SpatialThemeData spatial = context.spatial;
    return new Icon(
      IconData(codePoint, fontFamily: "iconfont", matchTextDirection: true),
      color: color ?? spatial.palette.textInverse,
      size: size ?? 20,
    );
  }
}
