import 'package:flutter/material.dart';
import 'package:aitesseract/utils/ui_utils/hx_text.dart';

class Containers extends StatelessWidget {
  final String? title;
  final Widget content;

  const Containers({Key? key, this.title, required this.content})
      : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.white,
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
                  color: Colors.black,
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
