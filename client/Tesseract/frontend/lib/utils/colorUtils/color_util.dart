/*
 * @Author: yangrongxin
 * @Date: 2022-05-17 15:57:47
 * @LastEditors: yangrongxin
 * @LastEditTime: 2022-05-23 17:28:16
 */

import 'package:flutter/material.dart';

class ColorsUtil {
  /// 十六进制颜色，
  /// hex, 十六进制值，例如：0xffffff,
  /// alpha, 透明度 [0.0,1.0]
  static Color hexColor(int hex, {double alpha = 1}) {
    if (alpha < 0) {
      alpha = 0;
    } else if (alpha > 1) {
      alpha = 1;
    }
    return Color.fromRGBO((hex & 0xFF0000) >> 16, (hex & 0x00FF00) >> 8,
        (hex & 0x0000FF) >> 0, alpha);
  }

  static Color? hexToColor(String? code) {
    if (code == null || code == "") return null;
    return new Color(int.parse(code.substring(1, 7), radix: 16) + 0xFF000000);
  }

  static Color c63 = const Color(0xff000000);
  static Color c62 = const Color(0xff000000);
  static Color c69 = hexColor(0x999999);
  static Color c66 = const Color(0xff000000);
  static const Color color_white = const Color(0xFFFFFFFF);
  static const Color color_EEEEEE = const Color(0xffEEEEEE);
  static const Color color_333333 = const Color(0xFF333333);
  static const Color color_d3e2f0 = const Color(0xffd3e2f0);
  static const Color color_324A5E = const Color(0xff324A5E);
  static const Color color_e0e0e0 = const Color(0xffe0e0e0);
  static const Color color_F2F6FA = const Color(0xffF2F6FA);
  static const Color color_242e38 = const Color(0xff242e38);
  static const Color color_323233 = const Color(0xff323233);
  static const Color color_dfe5eb = const Color(0xffdfe5eb);
  static const Color color_DCDCDC = const Color(0xffDCDCDC);
  static const Color color_black = const Color(0xff000000);
  static const Color color_f4f4f4 = const Color(0xfff4f4f4);
  static const Color color_d8d8d8 = const Color(0xffd8d8d8);
  static const Color color_C5EDF1 = const Color(0xffC5EDF1);
  static const Color color_c0c7cd = const Color(0xffc0c7cd);
  static const Color color_EDEFF1 = const Color(0xffEDEFF1);
  static const Color color_00000000 = const Color(0x0);
  static const Color color_66000000 = const Color(0x66000000);
  static const Color color_FFF1F2F6 = const Color(0xFFF1F2F6);
  static const Color color_FFF2F6FA = const Color(0xFFF2F6FA);
  static const Color color_FFFFF5EA = const Color(0xFFCFFF5EA);
  static const Color color_FF4ECDF5 = const Color(0xFF4ECDF5);
  static const Color color_FF464666 = const Color(0xFF464666);

  static const Color color_FF3EC3CF = const Color(0xFF3EC3CF);
  static const Color color_FFA263 = const Color(0xFFFFA263);
  static const Color color_407CF5 = const Color(0xFF407CF5);
  static const Color color_5ACB9D = const Color(0xFF5ACB9D);
  static const Color color_A6ABB5 = const Color(0xFFA6ABB5);
  static const Color color_F3F5F7 = const Color(0xFFF3F5F7);
  static const Color color_7FCEDF = const Color(0xFF7FCEDF);
  static const Color color_F57878 = const Color(0xFFF57878);
  static const Color color_FCE3E3 = const Color(0xFFFCE3E3);
  static const Color color_D9D9D9 = const Color(0xFFD9D9D9);
  static const Color color_DDDDDD = const Color(0xFFDDDDDD);
  static const Color color_E6E6E6 = const Color(0xFFE6E6E6);
  static const Color color_EBF9FA = const Color(0xFFEBF9FA);
  static const Color color_53D7E2 = const Color(0xFF53D7E2);
  static const Color color_EB4672 = const Color(0xFFEB4672);
  static const Color color_FFCCD8 = const Color(0xffFFCCD8);
  static const Color color_86909b = const Color(0xff86909b);
  static const Color color_CCDEFF = const Color(0xffCCDEFF);
  static const Color color_CCCCCC = const Color(0xffCCCCCC);
  static const Color color_f0f1f5 = const Color(0xFFF0F1F5);
  static const Color color_ff562e = const Color(0xFFff562e);
  static const Color color_fe5353 = const Color(0xFFfe5353);
  static const Color color_3EC3CF = const Color(0xff3EC3CF);
  static const Color color_1D2128 = const Color(0xff1d2128);
  static const Color color_E4E6EA = const Color(0xffE4E6EA);
  static const Color color_424152 = const Color(0xff424152);
  static const Color color_EBEBEB = const Color(0xffEBEBEB);
  static const Color color_34CC9E = const Color(0xff34CC9E);
  static const Color color_BF7A4B = const Color(0xffBF7A4B);
  static const Color color_F4DBBD = const Color(0xffF4DBBD);
  static const Color color_DEE9ED = const Color(0xffDEE9ED);
  static const Color color_E7E7E7 = const Color(0xffE7E7E7);
  static const Color color_BCA675 = const Color(0xFFBCA675);
  static const Color color_75BCA1 = const Color(0xFF75BCA1);
  static const Color color_75ABBC = const Color(0xFF75ABBC);
  static const Color color_ADDBF4 = const Color(0xFFADDBF4);
  static const Color color_B2CCD6 = const Color(0xFFB2CCD6);
  static const Color color_F2F3D5 = const Color(0xFFF2F3D5);
  static const Color color_FBFBFB = const Color(0xFFFBFBFB);
  static const Color color_F6F7F9 = const Color(0xFFF6F7F9);
  static const Color color_5282A4 = const Color(0xFF5282A4);
  static const Color color_887962 = const Color(0xFF887962);
  static const Color color_73828F = const Color(0xFF73828F);
  static const Color color_AEB6D1 = const Color(0xFFAEB6D1);
  static const Color color_e9f2fa = const Color(0xFFe9f2fa);
  static const Color color_F4E7AD = const Color(0xFFF4E7AD);
  static const Color color_FFDAA8 = const Color(0xFFFFDAA8);
  static const Color color_FAF4EE = const Color(0xFFFAF4EE);
  static const Color color_72C6A4 = const Color(0xFF72C6A4);
  static const Color color_BFBFBF = const Color(0xFFBFBFBF);
  static const Color color_999999 = const Color(0xff999999);
  static const Color color_151619 = const Color(0xFF151619);
  static const Color color_666666 = const Color(0xff666666);
  static const Color color_3ACC68 = const Color(0xFF3ACC68);
  static const Color color_BBBFC3 = const Color(0xFFBBBFC3);
  static const Color color_48BAF8 = const Color(0xFF48BAF8);
  static const Color color_77869e = const Color(0xFF77869e);

  static Color dataRowFocusColor(Set<MaterialState> states) {
    const Set<MaterialState> interactiveStates = <MaterialState>{
      MaterialState.pressed,
      MaterialState.hovered,
      MaterialState.focused,
    };

    if (states.any(interactiveStates.contains)) {
      return Colors.red;
    }
    //return Colors.green; // Use the default value.
    return Colors.white;
  }

  static Color dataHeaderFocusColor(Set<MaterialState> states) {
    const Set<MaterialState> interactiveStates = <MaterialState>{
      MaterialState.pressed,
      MaterialState.hovered,
      MaterialState.focused,
    };

    if (states.any(interactiveStates.contains)) {
      return hexColor(0x96c6f3);
    }
    //return Colors.green; // Use the default value.
    return Colors.transparent;
  }
}

extension ThemeNormalColor on Color {
  MaterialColor toMaterialColor() {
    List strengths = <double>[.05];
    Map<int, Color> swatch = <int, Color>{};
    final int r = this.red, g = this.green, b = this.blue;

    for (int i = 1; i < 10; i++) {
      strengths.add(0.1 * i);
    }
    strengths.forEach((strength) {
      final double ds = 0.5 - strength;
      swatch[(strength * 1000).round()] = Color.fromRGBO(
        r + ((ds < 0 ? r : (255 - r)) * ds).round(),
        g + ((ds < 0 ? g : (255 - g)) * ds).round(),
        b + ((ds < 0 ? b : (255 - b)) * ds).round(),
        1,
      );
    });
    return MaterialColor(this.value, swatch);
  }
}
