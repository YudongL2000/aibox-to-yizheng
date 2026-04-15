import 'package:flutter/material.dart';
import 'package:aitesseract/utils/ui_utils/hx_columns_adapt.dart';
import 'package:aitesseract/utils/spatial_design_ref.dart';

// 这个组件用于同步当前组件中用到的样式
class HxTable extends StatefulWidget {
  HxTable(
      {Key? key,
      required this.columns,
      required this.listData,
      this.onSelect,
      this.checkcolumns})
      : super(key: key);

  // 所有的列数据
  List columns = [];
  // 当前表格数据
  List listData = [];

  Function? onSelect;

  String? checkcolumns;

  @override
  State<HxTable> createState() => _HxTableState();
}

class _HxTableState extends State<HxTable> {
  // 生成columns组件
  List<DataColumn> _columns() {
    List<DataColumn> list = [];
    for (var model in widget.columns) {
      list.add(DataColumn(
          label: SizedBox(
        width: HxColumnsAdapt.splitColumn(),
        child: Text(
          model['title'],
          style: TextStyle(
              color:
                  context.spatial.palette.textPrimary.withValues(alpha: 0.96),
              fontWeight: FontWeight.bold),
        ),
      )));
    }
    return list;
  }

  // 生成对应行的数据
  List<DataRow> _rows() {
    List<DataRow> list = [];
    final SpatialThemeData spatial = context.spatial;
    final Color selectedRowColor = spatial.surface(SpatialSurfaceTone.elevated);
    final Color unselectedRowColor =
        spatial.palette.textPrimary.withValues(alpha: 0.02);

    for (var model in widget.listData) {
      list.add(DataRow(
          color: MaterialStateProperty.resolveWith<Color?>(
              (Set<MaterialState> states) {
            if (states.contains(MaterialState.selected)) {
              return selectedRowColor;
            }
            return unselectedRowColor;
          }),
          selected: widget.checkcolumns == 'isChecked'
              ? model.isChecked ?? false
              : model.isChose ?? false,
          // selected: false,
          onSelectChanged: (value) {
            widget.onSelect?.call(value, model);
          },
          cells: _cells(model)));
    }
    return list;
  }

  // 获取cell元素
  List<DataCell> _cells(rowData) {
    List<DataCell> list = [];
    for (var model in widget.columns) {
      list.add(DataCell(
        model['render'](rowData),
      ));
    }
    return list;
  }

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
        builder: (BuildContext context, BoxConstraints constraints) {
      HxColumnsAdapt.init(context, constraints, widget.columns.length);
      return SingleChildScrollView(
        controller: ScrollController(),
        child: SizedBox(
          width: double.infinity,
          child: DataTable(
            checkboxHorizontalMargin: 16,
            columnSpacing: 0,
            horizontalMargin: 0,
            dividerThickness: 1,
            headingRowColor: MaterialStateProperty.resolveWith<Color>(
                (Set<MaterialState> states) {
              return spatial.surface(SpatialSurfaceTone.elevated);
            }),
            headingRowHeight: 40,
            headingTextStyle: TextStyle(
              wordSpacing: 10,
              color: spatial.palette.textPrimary.withValues(alpha: 0.96),
            ),
            decoration: BoxDecoration(
                border: Border.all(
                  width: 1,
                  color: spatial.palette.borderSolid.withValues(alpha: 0.35),
                ),
                borderRadius: BorderRadius.all(Radius.circular(10))),
            columns: _columns(),
            rows: _rows(),
          ),
        ),
      );
    });
  }
}
