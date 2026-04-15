import 'dart:ui';

import 'package:flutter/material.dart';

///
/// create_user: zhengzaihong
/// email:1096877329@qq.com
/// create_date: 2022/6/20
/// create_time: 9:51
/// describe: 绘制表格的组件，使用此组件一定要注意每行的权重比
/// 此组件用于通用性表格，
/// 表格存在各种合并的单元格 需根据行号单独处理
/// 待优化
///

typedef BuildTableHeaderStyle<T> = Widget Function(T data);
typedef BuildRowStyle<T> = Widget Function(T data, int index);
typedef PreDealData<T> = List<T> Function();
class TableView<T> extends StatefulWidget {
  final List<T>? tableDatas;
  final BuildRowStyle buildRowStyle;
  final bool enableTopDivider;
  final bool enableBottomDivider;
  final PreDealData? preDealData;
  final bool shrinkWrap;

  final bool enableDivider;
  final Color dividerColor;
  final double dividerHeight;

  final Axis scrollDirection;
  final bool reverse;
  final ScrollController? controller;
  final ScrollPhysics? physics;
  final EdgeInsetsGeometry? padding;
  final bool addAutomaticKeepAlives;
  final bool addRepaintBoundaries;
  final bool addSemanticIndexes;
  final double? cacheExtent;
  final bool doubleScroll;
  final ScrollBehavior? behavior;
  final BuildTableHeaderStyle? buildTableHeaderStyle;

  const TableView(
      {this.tableDatas = const [],
        required this.buildRowStyle,
        this.enableTopDivider = false,
        this.enableBottomDivider = false,
        this.enableDivider = false,
        this.preDealData,
        this.shrinkWrap = true,
        this.dividerColor = Colors.black,
        this.dividerHeight = 1,
        this.scrollDirection = Axis.vertical,
        this.reverse = false,
        this.controller,
        this.physics,
        this.padding,
        this.addAutomaticKeepAlives = true,
        this.addRepaintBoundaries = true,
        this.addSemanticIndexes = true,
        this.cacheExtent,
        this.doubleScroll = false,
        this.behavior,
        this.buildTableHeaderStyle,
        Key? key})
      : super(key: key);

  @override
  State<TableView> createState() => _TableViewState();
}

class _TableViewState<T> extends State<TableView> {
  List<dynamic> datas = [];

  int _itemCount = 0;

  @override
  void initState() {
    super.initState();
    datas = widget.tableDatas ?? [];
    if (widget.preDealData != null) {
      datas = widget.preDealData!.call();
    }
    _itemCount = datas.length;

    if (widget.enableTopDivider && widget.enableBottomDivider) {
      _itemCount = datas.length + 2;
    } else if (widget.enableTopDivider) {
      _itemCount = datas.length + 1;
    } else if (widget.enableBottomDivider) {
      _itemCount = datas.length + 1;
    }
  }

  List<Widget> _buildRowLines() {
    List<Widget> rows = [];
    for (int index = 0; index < _itemCount; index++) {
      List<Widget> lines = [];
      if ((widget.enableTopDivider && index == 0) ||
          (widget.enableBottomDivider && index == _itemCount - 1)) {
        lines.add(const SizedBox());
      } else {
        lines.add(widget.buildRowStyle(
            widget.enableTopDivider ? datas[index - 1] : datas[index],
            widget.enableTopDivider ? index : index + 1));
      }


      final divider = Container(
        height: widget.dividerHeight,
        color: widget.dividerColor,
      );
      if (widget.enableBottomDivider && index == _itemCount) {
        lines.add(divider);
      } else {
        lines.add(widget.enableDivider ? divider : const SizedBox());
      }
      rows.add(Column(
          mainAxisAlignment: MainAxisAlignment.start,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: lines));
    }
    return rows;
  }

  @override
  Widget build(BuildContext context) {
    if (widget.doubleScroll) {
      return SingleChildScrollView(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.start,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ScrollConfiguration(
                behavior: widget.behavior ??
                    ScrollConfiguration.of(context).copyWith(
                      dragDevices: {
                        PointerDeviceKind.touch,
                        PointerDeviceKind.mouse,
                      },
                    ),
                child: SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  controller: widget.controller,
                  physics: widget.physics,
                  reverse: widget.reverse,
                  padding: widget.padding,
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.start,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      widget.buildTableHeaderStyle?.call(context)??const SizedBox(),
                      ..._buildRowLines(),
                    ],
                  ),
                ))
          ],
        ),
      );
    }

    return Column(
      children: [
        widget.buildTableHeaderStyle?.call(context)??const SizedBox(),
        Expanded(child: ListView.separated(
            shrinkWrap: widget.shrinkWrap,
            scrollDirection: widget.scrollDirection,
            reverse: widget.reverse,
            physics: widget.physics,
            controller: widget.controller,
            padding: widget.padding,
            addAutomaticKeepAlives: widget.addAutomaticKeepAlives,
            addRepaintBoundaries: widget.addRepaintBoundaries,
            addSemanticIndexes: widget.addSemanticIndexes,
            cacheExtent: widget.cacheExtent,
            itemCount: _itemCount,
            itemBuilder: (context, index) {
              if ((widget.enableTopDivider && index == 0) ||
                  (widget.enableBottomDivider && index == _itemCount - 1)) {
                return const SizedBox();
              }

              /// 外部处理的行的下标都从 1 第一行开始
              return widget.buildRowStyle(
                  widget.enableTopDivider ? datas[index - 1] : datas[index],
                  widget.enableTopDivider ? index : index + 1);
            },
            separatorBuilder: (context, index) {
              final divider = Container(
                ///修复 web html 像素丢失问题
                height: widget.dividerHeight,
                color: widget.dividerColor,
              );
              if (widget.enableBottomDivider && index == _itemCount) {
                return divider;
              }
              return widget.enableDivider ? divider : const SizedBox();
            }))
      ],
    );
  }
}

class TabRow extends StatelessWidget {
  final bool enableDivider;
  final List<int> cellWidget;
  final double? rowDividerHeight;
  final double rowDividerWidth;
  final Color? dividerColor;
  final CellItem cellItem;
  final double? rowHeight;

  final MainAxisAlignment mainAxisAlignment;
  final MainAxisSize mainAxisSize;
  final CrossAxisAlignment crossAxisAlignment;
  final TextDirection? textDirection;
  final VerticalDirection verticalDirection;
  final bool fixRowHeight;

  const TabRow(
      {this.enableDivider = true,
        this.rowDividerHeight,
        this.rowDividerWidth = 0.5,
        required this.cellWidget,
        required this.cellItem,
        this.rowHeight,
        this.mainAxisAlignment = MainAxisAlignment.start,
        this.mainAxisSize = MainAxisSize.max,
        this.crossAxisAlignment = CrossAxisAlignment.center,
        this.verticalDirection = VerticalDirection.down,
        this.textDirection,
        this.dividerColor = Colors.red,
        this.fixRowHeight = false,
        Key? key})
      : super(key: key);

  @override
  Widget build(BuildContext context) {
    return _buildRow();
  }

  Widget _buildRow() {
    return IntrinsicHeight(
      child: Row(
          mainAxisSize: mainAxisSize,
          mainAxisAlignment: mainAxisAlignment,
          crossAxisAlignment: crossAxisAlignment,
          verticalDirection: verticalDirection,
          textDirection: textDirection,
          children: _buildCells(cellWidget)),
    );
  }

  Widget _createRowLine() {
    if (!fixRowHeight && rowHeight != null) {
      return SizedBox(
        width: rowDividerWidth,
        height: rowHeight,
        child: Row(
          children: [
            Expanded(
                child: Container(
                  width: rowDividerWidth,
                  color: dividerColor,
                ))
          ],
        ),
      );
    }
    return Container(
      width: rowDividerWidth,
      height: rowDividerHeight,
      color: dividerColor,
    );
  }

  List<Widget> _buildCells(List<int> cellWidget) {
    List<Widget> cells = [];

    for (var i = 0; i < cellWidget.length; i++) {
      var widget = cellItem.buildCell(cellItem, i);
      cells.add(Expanded(
          flex: cellWidget[i],
          child: Row(children: [
            if (enableDivider) _createRowLine(),
            Expanded(
                child: Container(
                  color: cellItem.background,
                  padding: cellItem.padding,
                  alignment: cellItem.alignment,
                  child: widget,
                ))
          ])));
    }
    if (enableDivider) {
      cells.add(_createRowLine());
    }

    return cells;
  }
}
typedef BuildCell = Widget Function(CellItem cellItem, int index);

class CellItem {
  AlignmentGeometry alignment;
  EdgeInsetsGeometry padding;
  Color background;

  final BuildCell buildCell;

  CellItem(
      {this.alignment = Alignment.center,
        this.background = Colors.transparent,
        this.padding = const EdgeInsets.all(0),
        required this.buildCell});
}

class CellBean {
  String? name;
  int? rowIndex;
  int? cellIndex;
  final bool isTitle;

  dynamic obj;

  CellBean(
      {this.rowIndex,
        required this.name,
        this.cellIndex,
        this.obj,
        this.isTitle = false});

}

class RowBean {
  final List<CellBean> cells;

  RowBean({required this.cells});
}
