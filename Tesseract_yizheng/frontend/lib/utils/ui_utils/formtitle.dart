import 'package:flutter/material.dart';
import 'package:aitesseract/utils/spatial_design_ref.dart';

class VaildeTitle extends StatelessWidget {
  final bool mustFiled;
  final String title;
  const VaildeTitle({Key? key, required this.mustFiled, required this.title})
      : super(key: key);

  @override
  Widget build(BuildContext context) {
    final SpatialThemeData spatial = context.spatial;
    return Container(
        margin: EdgeInsets.only(left: 10, right: 10, top: 10, bottom: 5),
        child: Row(children: [
          mustFiled
              ? Row(children: [
                  Text('*',
                      style: TextStyle(
                          color: spatial.status(SpatialStatusTone.danger),
                          fontSize: 18,
                          fontWeight: FontWeight.bold)),
                  SizedBox(width: 5),
                ])
              : SizedBox(),
          Text(title,
              style:
                  TextStyle(color: spatial.palette.textPrimary, fontSize: 14)),
        ]));
  }
}
