import 'package:flutter/material.dart';

extension WidgetExt on Widget {
  Widget onTap(Function()? onTap) {
    return InkWell(
      onTap: onTap,
      child: this,
    );
  }
}
