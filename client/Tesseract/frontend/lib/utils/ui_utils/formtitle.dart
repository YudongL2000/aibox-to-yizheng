import 'package:flutter/material.dart';
import 'package:aitesseract/utils/colorUtils/color_util.dart';

class VaildeTitle extends StatelessWidget {
  final bool mustFiled;
  final String title;
  const VaildeTitle({Key? key, required this.mustFiled, required this.title})
      : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Container(
        margin: EdgeInsets.only(left: 10, right: 10, top: 10, bottom: 5),
        child: Row(children: [
          mustFiled
              ? Row(children: [
                  Text('*',
                      style: TextStyle(
                          color: ColorsUtil.color_F57878,
                          fontSize: 18,
                          fontWeight: FontWeight.bold)),
                  SizedBox(width: 5),
                ])
              : SizedBox(),
          Text(title,
              style: TextStyle(color: ColorsUtil.color_black, fontSize: 14)),
        ]));
  }
}
