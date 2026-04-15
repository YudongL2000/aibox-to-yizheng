import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_easyloading/flutter_easyloading.dart';
import 'package:aitesseract/utils/colorUtils/color_util.dart';
import 'package:aitesseract/utils/platform_utils.dart';

class HXText extends StatelessWidget {
  // 标题
  final String title;

  // 字体大小 默认14
  final double fontSize;

  // 字体颜色 默认c66
  final Color? color;

  final Color? decorationColor;
  // 是否加粗
  final bool isBold;

  // 最大行数 默认1
  final int? maxLines;

  // 对齐方式 默认左对齐
  final TextAlign? align;

  // 删除线效果
  final bool? isDelete;

  // 传入的textStyle
  final TextStyle? textStyle;

  // 截断方式
  final TextOverflow? overflow;

  // 下划线--删除线
  final TextDecoration? decoration;

  final double? letterSpacing;

  final double? height;

  const HXText(this.title,
      {Key? key,
      this.fontSize = 14, // 字体默认大小为14
      this.color,
      this.isBold = false,
      this.align,
      this.maxLines = 1,
      this.textStyle,
      this.decoration,
      this.decorationColor,
      this.overflow = TextOverflow.ellipsis,
      this.letterSpacing,
      this.height,
      this.isDelete = false})
      : super(key: key);

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onLongPress: () {
        Clipboard.setData(ClipboardData(text: title))
            .catchError((e) {})
            .whenComplete(() {
          EasyLoading.showSuccess("已复制");
        });
      },
      child: Text(
        title,
        textAlign: this.align ?? TextAlign.left,
        maxLines: maxLines,
        softWrap: true,
        overflow: overflow,
        style: textStyle ??
            TextStyle(
                // 谷歌默认字体最小为12 如果字体小于12按照12进行设置
                fontSize: PlatformUtils.isWeb
                    ? fontSize < 12
                        ? 12
                        : fontSize
                    : fontSize,
                decoration: decoration == null
                    ? isDelete == true
                        ? TextDecoration.lineThrough
                        : TextDecoration.none
                    : decoration,
                decorationColor: decorationColor ?? ColorsUtil.color_black,
                overflow: overflow,
                color: color ?? ColorsUtil.c66,
                fontWeight: isBold ? FontWeight.bold : FontWeight.normal,
                letterSpacing: letterSpacing,
                height: height,
                fontFamily: "PingFang"),
      ),
    );
  }
}
