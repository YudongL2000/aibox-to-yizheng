import 'package:flutter/material.dart';
import 'package:aitesseract/utils/spatial_design_ref.dart';
import 'package:aitesseract/utils/ui_utils/hx_text.dart';

class HXAppBar extends StatefulWidget {
  final String title;
  final String? rightTitle;
  final VoidCallback? rightButtonClick;

  HXAppBar(
    this.title, {
    this.rightTitle,
    this.rightButtonClick,
    Key? key,
  }) : super(key: key);

  @override
  State<HXAppBar> createState() => _HXAppBarState();
}

class _HXAppBarState extends State<HXAppBar> {
  @override
  Widget build(BuildContext context) {
    final SpatialThemeData spatial = context.spatial;
    return AppBar(
      // title居左
      centerTitle: false,
      titleSpacing: 0,
      shadowColor: spatial.palette.textPrimary.withValues(alpha: 0),
      leading: BackButton(),
      title: HXText(widget.title),
      actions: [
        InkWell(
          onTap: widget.rightButtonClick,
          child: Container(
            padding: EdgeInsets.symmetric(horizontal: 15),
            alignment: Alignment.center,
            child: HXText(
              widget.rightTitle ?? "",
              fontSize: 18,
              align: TextAlign.center,
            ),
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
  const HXNormalButton({this.title, this.enable, this.onPressed, Key? key})
      : super(key: key);

  @override
  Widget build(BuildContext context) {
    return FractionallySizedBox(
      widthFactor: 1,
      child: MaterialButton(
        color: context.spatial.status(SpatialStatusTone.info),
        disabledColor: context.spatial
            .status(SpatialStatusTone.neutral)
            .withValues(alpha: 0.2),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
        height: 45,
        onPressed: enable == true ? onPressed : null,
        textColor: context.spatial.palette.textInverse,
        child: HXText(title ?? ""),
      ),
    );
  }
}
