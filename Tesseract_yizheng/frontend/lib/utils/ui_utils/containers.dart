import 'package:flutter/material.dart';
import 'package:aitesseract/utils/ui_utils/hx_text.dart';
import 'package:aitesseract/utils/spatial_design_ref.dart';

class Containers extends StatelessWidget {
  final String? title;
  final Widget content;

  const Containers({Key? key, this.title, required this.content})
      : super(key: key);

  @override
  Widget build(BuildContext context) {
    final SpatialThemeData spatial = context.spatial;
    return Container(
      color: spatial.surface(SpatialSurfaceTone.panel),
      padding: EdgeInsets.only(left: 32, top: 32),
      child: Column(
        children: [
          Container(
            // padding: EdgeInsets.fromLTRB(0, 0, 0, 22),
            child: Row(
              children: [
                HXText(
                  this.title ?? "",
                  fontSize: 20,
                  color: spatial.palette.textPrimary,
                  isBold: true,
                ),
              ],
            ),
          ),
          this.content
        ],
      ),
    );
  }
}
