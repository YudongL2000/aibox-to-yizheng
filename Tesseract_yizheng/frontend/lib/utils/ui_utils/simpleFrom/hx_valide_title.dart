import 'package:flutter/material.dart';
import 'package:aitesseract/utils/spatial_design_ref.dart';

class HxVaildeTitle extends StatelessWidget {
  final String? title;
  final bool? mustFiled;
  final EdgeInsetsGeometry? margin;
  const HxVaildeTitle({Key? key, this.title, this.mustFiled, this.margin})
      : super(key: key);
  @override
  Widget build(BuildContext context) {
    final SpatialThemeData spatial = context.spatial;
    return Container(
        margin:
            margin ?? EdgeInsets.only(left: 20, right: 20, top: 20, bottom: 8),
        child: Row(children: [
          mustFiled ?? false
              ? Row(children: [
                  Text('*',
                      style: TextStyle(
                          color: spatial.status(SpatialStatusTone.danger),
                          fontSize: 14,
                          fontWeight: FontWeight.bold)),
                  SizedBox(width: 5),
                ])
              : SizedBox(),
          Text(title!,
              style:
                  TextStyle(color: spatial.palette.textPrimary, fontSize: 14)),
        ]));
  }
}
