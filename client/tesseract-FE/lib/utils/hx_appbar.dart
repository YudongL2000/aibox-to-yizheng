import 'package:flutter/material.dart';
import 'package:aitesseract/utils/colorUtils/color_util.dart';
import 'package:aitesseract/utils/ui_utils/hx_text.dart';

class HXAppBar extends StatefulWidget {
  final String title;
  final String? rightTitle;
  final VoidCallback? rightButtonClick;

   HXAppBar(this.title,{this.rightTitle,this.rightButtonClick,Key? key,}) : super(key:key);

  @override
  State<HXAppBar> createState() => _HXAppBarState();
}

class _HXAppBarState extends State<HXAppBar> {
  @override
  Widget build(BuildContext context) {
    return AppBar(
      // title居左
      centerTitle: false,
      titleSpacing: 0,
      shadowColor: Colors.transparent,
      leading: BackButton(),
      title: HXText(widget.title),
      actions: [
        InkWell(
          onTap: widget.rightButtonClick,
          child: Container(
            padding: EdgeInsets.symmetric(horizontal: 15),
            alignment: Alignment.center,
            child: HXText(widget.rightTitle ?? "", fontSize: 18,align: TextAlign.center, ),
          ),
        )
      ],
    );
  }
}

class HXNormalButton extends StatelessWidget {
  final String? title;
  final bool? enable;
  final VoidCallback? onPressed;
  const HXNormalButton({this.title, this.enable, this.onPressed, Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return FractionallySizedBox(
      widthFactor: 1,
      child: MaterialButton(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
        height: 45,
        onPressed: enable == true ? onPressed : null,
        disabledColor: ColorsUtil.c69,
        color: Color(0xff3EC3CF).toMaterialColor(),
        child: HXText(title ?? ""),

      ),
    );
  }
}
