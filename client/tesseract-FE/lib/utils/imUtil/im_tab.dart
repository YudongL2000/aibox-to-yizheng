import 'package:flutter/material.dart';
import 'package:aitesseract/utils/colorUtils/color_util.dart';
import 'package:aitesseract/utils/ui_utils/hx_text.dart';

class ImTab extends StatefulWidget {
  final callBack;
  final List tabName;
  final int chooseindexParent;

  ImTab(
      {Key? key,
      this.callBack,
      required this.tabName,
      this.chooseindexParent = 0})
      : super(key: key);

  @override
  _WorkSpaceRightTabState createState() => _WorkSpaceRightTabState();
}

class _WorkSpaceRightTabState extends State<ImTab> {
  @override
  void initState() {
    super.initState();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: EdgeInsets.only(top: 10),
      padding: EdgeInsets.only(bottom: 10, left: 10),
      child: Row(
          mainAxisAlignment: MainAxisAlignment.start,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: widget.tabName
              .asMap()
              .keys
              .map((e) => InkWell(
                    onTap: () {
                      widget.callBack(widget.tabName[e]);
                    },
                    hoverColor: ColorsUtil.color_white,
                    child: Container(
                      margin: EdgeInsets.only(right: 20),
                      child: Column(
                        children: [
                          HXText(widget.tabName[e],
                              fontSize: 16,
                              isBold: true,
                              color: widget.chooseindexParent == e
                                  ? Color(0xff3EC3CF)
                                  : ColorsUtil.c69),
                          Container(
                            width: 24,
                            margin: EdgeInsets.only(top: 4),
                            height: 4,
                            decoration: BoxDecoration(
                                color: widget.chooseindexParent == e
                                    ? Color(0xff3EC3CF)
                                    : Color(0x00ffffff),
                                borderRadius: BorderRadius.all(
                                  Radius.circular(2),
                                )),
                          )
                        ],
                      ),
                    ),
                  ))
              .toList()),
    );
  }
}
