import 'package:flutter/material.dart';
import 'package:aitesseract/utils/ui_utils/hx_table/extension.dart';
import 'package:aitesseract/utils/ui_utils/hx_text.dart';
import 'package:aitesseract/utils/spatial_design_ref.dart';

// tabele cell

class HxTableCell extends StatelessWidget {
  final String? name;
  final Color? colors;
  final Color? borderColor;
  final Color? itemColor;
  final EdgeInsetsGeometry? margin;
  final EdgeInsetsGeometry? padding;
  final double fontSize;
  final double? cellHeight;
  final int? flex;
  final Widget? child;
  final Function? callCack;
  final TextDecoration? decoration;

  const HxTableCell({
    Key? key,
    this.name,
    this.colors,
    this.borderColor,
    this.itemColor,
    this.margin,
    this.fontSize = 14,
    this.cellHeight = 40,
    this.flex,
    this.child,
    this.padding,
    this.callCack,
    this.decoration,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final SpatialThemeData spatial = context.spatial;
    final Color resolvedTextColor =
        colors ?? spatial.palette.textSecondary.withValues(alpha: 0.4);
    final Color resolvedBorderColor =
        borderColor ?? spatial.palette.textPrimary.withValues(alpha: 0.1);

    return Expanded(
        flex: flex ?? 1,
        child: InkWell(
          onTap: () {
            callCack?.call();
          },
          child: Container(
            margin: margin,
            height: cellHeight,
            decoration: BoxDecoration(
              color: itemColor,
              border: Border(
                right: BorderSide(color: resolvedBorderColor, width: 1),
              ),
            ),
            child: Padding(
                padding:
                    padding ?? EdgeInsets.only(left: 10, top: 10, bottom: 10),
                child: child ??
                    HXText(
                      "$name",
                      fontSize: fontSize,
                      decoration: decoration,
                      color: resolvedTextColor,
                      maxLines: 1,
                    )),
          ),
        ));
  }
}

class HxTableTitleCell extends StatelessWidget {
  final String? name;
  final Color? itemColor;
  final EdgeInsetsGeometry? margin;
  final EdgeInsetsGeometry? padding;
  final double fontSize;
  final double? cellHeight;
  final int? flex;
  final Widget? child;
  final Function? handleClick;

  const HxTableTitleCell({
    Key? key,
    this.name,
    this.itemColor,
    this.margin,
    this.fontSize = 14,
    this.cellHeight = 40,
    this.flex,
    this.child,
    this.padding,
    this.handleClick,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Expanded(
        flex: flex ?? 1,
        child: Container(
                margin: margin,
                height: cellHeight,
                child: Container(
                    child: Padding(
                        padding: EdgeInsets.only(left: 10, top: 10, bottom: 10),
                        child: HXText(name!,
                            color: spatial.palette.textSecondary,
                            isBold: false,
                            fontSize: 14))))
            .onTap(() {
          handleClick?.call();
        }));
  }
}
