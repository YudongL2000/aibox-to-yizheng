import 'package:flutter/material.dart';

// 字体的适应组件
class HxFontAdapt extends StatelessWidget {
  const HxFontAdapt({Key? key, required this.child}) : super(key: key);

  final Widget child;

  // 获取当前页面的字体大小
  double _getTextScaleFactor(BuildContext context) {
    // 得到当前设备的媒体分辨率
    final MediaQueryData media = MediaQuery.of(context);
    final Size mediaSize = media.size;
    /* 
     * 这里存在三种场景
     * 1. 1920 * 1080 的场景 使用1.0的倍率
     * 2. 小于这个分辨率的时候 字体应该是变小
     * 3. 大于这个分辨率的时候 字体应该是变大
     */
    double fontRatio = mediaSize.width / 1920;
    // 限制字体的最大和最小的分辨率
    if (fontRatio > 1.2) {
      fontRatio = 1.2;
    }
    if (fontRatio < 1) {
      fontRatio = 1;
    }
    // log('当前字体的分辨率是 $fontRatio');
    return fontRatio;
  }

  @override
  Widget build(BuildContext context) {
    // const
    return MediaQuery(
      child: child,
      data: MediaQuery.of(context)
          .copyWith(textScaleFactor: _getTextScaleFactor(context)),
    );
  }
}
