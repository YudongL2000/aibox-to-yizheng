import 'package:flutter/material.dart';

class HxColumnsAdapt {
  static var MediaSize;
  static double MediaWidth = 0.00;
  static int ColumnsLength = 0;

  // 当前checkbox的大小 左右16px 加上元素本身16px
  static int checkboxWidth = 48;

  /* 
   * 初始化当前的类 获取对应的设备参数
   * context 是建造的上下文
   * constraints 是盒子模型的大小
   * columnsLength 是当前表格的列数
   */
  static init(
      BuildContext context, BoxConstraints constraints, int columnsLength) {
    MediaSize = constraints;
    MediaWidth = constraints.maxWidth;
    ColumnsLength = columnsLength;
  }

  // 根据当前表格的长宽获取对应的columnsItem宽度
  static double space(double space) {
    // 减去
    return MediaWidth / (ColumnsLength * 2) * space;
  }

  // 根据当前widget的宽度 拆分留下来最后checkbox的宽度
  static double splitColumn() {
    double countWidth = (MediaWidth - checkboxWidth) / ColumnsLength;
    return countWidth;
  }
}
