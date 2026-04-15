import 'package:flutter/material.dart';
import 'package:aitesseract/utils/ui_utils/hx_columns_adapt.dart';

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
          style:
              TextStyle(color: Color(0xffffffff), fontWeight: FontWeight.bold),
        ),
      )));
    }
    return list;
  }

  // 生成对应行的数据
  List<DataRow> _rows() {
    List<DataRow> list = [];
    for (var model in widget.listData) {
      list.add(DataRow(
          color: MaterialStateProperty.resolveWith<Color?>(
              (Set<MaterialState> states) {
            if (states.contains(MaterialState.selected)) {
              return Color(0xffFFF5EA);
            }
            return Color(0xffF2F6FA);
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
      list.add(DataCell(model['render'](rowData),));
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
              return Color(0xff242E38);
            }),
            headingRowHeight: 40,
            headingTextStyle: TextStyle(
              wordSpacing: 10,
              color: Color(0xffffffff),
            ),
            decoration: BoxDecoration(
                border: Border.all(width: 1, color: Color(0xffF1F2F6)),
                borderRadius: BorderRadius.all(Radius.circular(10))),
            columns: _columns(),
            rows: _rows(),
          ),
        ),
      );
    });
  }
}
