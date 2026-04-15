import 'package:flutter/material.dart';
import 'package:aitesseract/utils/colorUtils/color_util.dart';

class HxVaildeTitle extends StatelessWidget {
  final String? title;
  final bool? mustFiled;
  final EdgeInsetsGeometry? margin;
  const HxVaildeTitle({Key? key, this.title, this.mustFiled, this.margin})
      : super(key: key);
  @override
  Widget build(BuildContext context) {
    return Container(
        margin:
            margin ?? EdgeInsets.only(left: 20, right: 20, top: 20, bottom: 8),
        child: Row(children: [
          mustFiled ?? false
              ? Row(children: [
                  Text('*',
                      style: TextStyle(
                          color: ColorsUtil.color_F57878,
                          fontSize: 14,
                          fontWeight: FontWeight.bold)),
                  SizedBox(width: 5),
                ])
              : SizedBox(),
          Text(title!,
              style: TextStyle(color: ColorsUtil.color_black, fontSize: 14)),
        ]));
  }
}
