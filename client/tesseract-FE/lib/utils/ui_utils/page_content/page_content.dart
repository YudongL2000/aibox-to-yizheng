import 'package:flutter/material.dart';
import 'package:aitesseract/utils/colorUtils/color_util.dart';
import 'package:aitesseract/utils/ui_utils/hx_text.dart';

class PageContent extends StatelessWidget {
  final Widget? topWidget;
  final String title;
  final Widget? middleWidget;
  final Widget? bottomWidget;
  const PageContent(
      {Key? key,
      this.topWidget,
      this.middleWidget,
      this.bottomWidget,
      required this.title})
      : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Color(0xffffffff),
      padding: EdgeInsets.all(32),
      child: Column(
        children: [
          Container(
            margin: EdgeInsets.only(bottom: 24),
            child: HXText(title, fontSize: 20, color: ColorsUtil.color_black),
          ),
          topWidget ?? Container(),
          middleWidget ?? Container(),
          bottomWidget ?? Container()
        ],
      ),
    );
  }
}
