import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:aitesseract/utils/ui_utils/hx_text.dart';

/// 简单的FormItem包装 用于简化表单的构建
class HxFormItem extends StatelessWidget {
  const HxFormItem(
      {Key? key,
      this.title,
      this.child,
      this.children,
      this.inline,
      this.labelSpan,
      this.labelWidth,
      this.font,
      this.required})
      : super(key: key);

  final String? title;
  final Widget? child;
  final List<Widget>? children;
  final bool? inline;
  final int? labelSpan;
  final double? labelWidth;
  final bool? required;
  final double? font;

  @override
  Widget build(BuildContext context) {
    if (inline == true)
      return Row(
        // crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (title != null && title is String)
            Container(
                width: labelWidth ?? 120,
                child: Align(
                  alignment: Alignment.centerLeft,
                  child: Row(
                    children: [
                      if (required == true)
                        HXText("* ", fontSize: 14.sp, color: Color(0xffF57878)),
                      HXText(
                        "$title：",
                        fontSize: font ?? 14,
                      )
                    ],
                  ),
                )),
          if (child != null && child is Widget)
            Expanded(child: child as Widget),
          ...children ?? []
        ],
      );
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (title != null && title is String)
          Row(
            children: [
              if (required == true)
                HXText("* ", fontSize: 14.sp, color: Color(0xffF57878)),
              HXText(
                title as String,
                isBold: true,
                fontSize: font ?? 16.sp,
              )
            ],
          ),
        if (title != null && title is String)
          SizedBox(
            height: 10,
          ),
        if (child != null && child is Widget) child as Widget,
        ...children ?? []
      ],
    );
  }
}
